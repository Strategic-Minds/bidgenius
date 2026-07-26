import { NextRequest, NextResponse } from 'next/server'
import { pipelineAuthorized } from '@/lib/pipeline/auth'
import { opportunityJobText } from '@/lib/pipeline/feeds'
import { opportunityFromUnknown } from '@/lib/pipeline/normalize'
import { insertRows, recordRun, selectRows, storeConfigured, updateRows } from '@/lib/pipeline/store'
import type { FulfillmentRecord, OpportunityRecord } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function runId() {
  return `FUL-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`
}

function companyFor(opportunity: OpportunityRecord): 'ncp' | 'nep' {
  const text = `${opportunity.title} ${opportunity.description || ''}`.toLowerCase()
  return /epoxy|coating|resin|polyaspartic|flake|metallic/.test(text) ? 'nep' : 'ncp'
}

function contractorIdentity(company: 'ncp' | 'nep') {
  return company === 'nep'
    ? { business_name: process.env.NEP_BUSINESS_NAME || 'National Epoxy Pros' }
    : { business_name: process.env.NCP_BUSINESS_NAME || 'National Concrete Polishing' }
}

async function generateFromOpportunity(req: NextRequest, opportunity: OpportunityRecord) {
  const jobText = opportunityJobText(opportunity).slice(0, 50_000)
  const company = companyFor(opportunity)
  const scraperUrl = (process.env.XTREME_SCRAPER_URL || '').replace(/\/$/, '')
  const scraperSecret = process.env.XTREME_SCRAPER_SECRET || process.env.PIPELINE_SECRET || ''

  if (scraperUrl) {
    const response = await fetch(`${scraperUrl}/api/bid/proposal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(scraperSecret ? { 'x-pipeline-secret': scraperSecret } : {})
      },
      body: JSON.stringify({ email_text: jobText, contractor: contractorIdentity(company) }),
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000)
    })
    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok || !data.ok) throw new Error('scraper_fulfillment_failed')
    return data
  }

  const pipelineSecret = process.env.PIPELINE_SECRET || process.env.CRON_SECRET || ''
  const response = await fetch(new URL('/api/takeoff', req.nextUrl.origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(pipelineSecret ? { 'x-pipeline-secret': pipelineSecret } : {})
    },
    body: JSON.stringify({ job_text: jobText, company }),
    cache: 'no-store',
    signal: AbortSignal.timeout(90_000)
  })
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok || !data.ok) throw new Error('local_fulfillment_failed')
  return data
}

export async function POST(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const started = Date.now()
  const id = runId()

  try {
    const body = await req.json().catch(() => ({})) as {
      dry_run?: boolean
      batch_size?: number
      opportunities?: Record<string, unknown>[]
    }
    const dryRun = body.dry_run !== false
    const executionEnabled = process.env.PIPELINE_EXECUTION_ENABLED === 'true'
    if (!dryRun && !executionEnabled) {
      await recordRun({ run_id: id, phase: 'fulfillment', status: 'blocked', error: 'pipeline_execution_disabled' })
      return NextResponse.json({ ok: false, blocked: true, gate: 'PIPELINE_EXECUTION_ENABLED' }, { status: 423 })
    }

    const batchSize = Math.max(1, Math.min(body.batch_size || 5, 20))
    let opportunities: Array<OpportunityRecord & { id?: string }> = []

    if (Array.isArray(body.opportunities) && body.opportunities.length) {
      opportunities = body.opportunities
        .map(item => opportunityFromUnknown(item, String(item.source_name || 'manual_ingest'), String(item.state || '')))
        .filter((item): item is OpportunityRecord => Boolean(item))
        .slice(0, batchSize)
    } else if (storeConfigured()) {
      opportunities = await selectRows<OpportunityRecord & { id: string }>(
        'bidgenius_opportunities',
        'status=eq.qualified&order=score.desc',
        batchSize
      )
    }

    if (!opportunities.length) {
      return NextResponse.json({ ok: true, run_id: id, dry_run: dryRun, message: 'no_qualified_opportunities', fulfilled: 0 })
    }

    if (dryRun) {
      const candidates = opportunities.map(opportunity => ({
        fingerprint: opportunity.fingerprint,
        title: opportunity.title,
        company: companyFor(opportunity),
        score: opportunity.score,
        state: opportunity.state,
        would_generate_proposal: true,
        would_persist: storeConfigured()
      }))
      await recordRun({
        run_id: id,
        phase: 'fulfillment',
        status: 'complete',
        fulfilled: 0,
        duration_ms: Date.now() - started,
        metadata: { dry_run: true, candidates: candidates.length, ai_invoked: false }
      })
      return NextResponse.json({
        ok: true,
        run_id: id,
        dry_run: true,
        ai_invoked: false,
        attempted: candidates.length,
        candidates,
        duration_ms: Date.now() - started
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const fulfilled: Array<{ fingerprint: string; proposal_number: string; company: string; total: number }> = []
    const failures: Array<Record<string, unknown>> = []

    for (const opportunity of opportunities) {
      try {
        if (opportunity.id && storeConfigured()) {
          const existing = await selectRows<{ id: string; status: string }>(
            'bidgenius_fulfillments',
            `opportunity_fingerprint=eq.${encodeURIComponent(opportunity.fingerprint)}&status=neq.failed`,
            1
          )
          if (existing.length) {
            failures.push({ fingerprint: opportunity.fingerprint, error: 'fulfillment_already_exists' })
            continue
          }
          await updateRows('bidgenius_opportunities', `id=eq.${encodeURIComponent(opportunity.id)}&status=eq.qualified`, { status: 'fulfilling' })
        }

        const generated = await generateFromOpportunity(req, opportunity)
        const parsed = (generated.parsed || generated.job || generated) as Record<string, unknown>
        const company = companyFor(opportunity)
        const record: FulfillmentRecord = {
          opportunity_id: opportunity.id,
          opportunity_fingerprint: opportunity.fingerprint,
          company,
          proposal_number: String(generated.proposal_number || '').slice(0, 100),
          proposal_html: String(generated.html || generated.proposal_html || '').slice(0, 1_000_000),
          parsed,
          total: Number(generated.total || generated.total_price || (generated.pricing as Record<string, unknown> | undefined)?.total || 0),
          confidence: Number(parsed.confidence || 0),
          status: 'review_pending'
        }
        if (!record.proposal_html) throw new Error('proposal_html_missing')

        if (storeConfigured()) {
          await insertRows('bidgenius_fulfillments', [{ ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
          if (opportunity.id) {
            await updateRows('bidgenius_opportunities', `id=eq.${encodeURIComponent(opportunity.id)}`, { status: 'review_pending', last_error: null })
          }
        }
        fulfilled.push({ fingerprint: opportunity.fingerprint, proposal_number: record.proposal_number || '', company, total: Number(record.total || 0) })
      } catch {
        failures.push({ fingerprint: opportunity.fingerprint, error: 'fulfillment_failed' })
        if (opportunity.id && storeConfigured()) {
          await updateRows('bidgenius_opportunities', `id=eq.${encodeURIComponent(opportunity.id)}`, { status: 'failed', last_error: 'fulfillment_failed' })
        }
      }
    }

    await recordRun({
      run_id: id,
      phase: 'fulfillment',
      status: failures.length && !fulfilled.length ? 'failed' : 'complete',
      fulfilled: fulfilled.length,
      duration_ms: Date.now() - started,
      metadata: { dry_run: false, failures }
    })

    return NextResponse.json({
      ok: failures.length === 0,
      run_id: id,
      dry_run: false,
      attempted: opportunities.length,
      fulfilled: fulfilled.length,
      failed: failures.length,
      fulfillments: fulfilled,
      failures,
      duration_ms: Date.now() - started
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    await recordRun({ run_id: id, phase: 'fulfillment', status: 'failed', duration_ms: Date.now() - started, error: 'fulfillment_worker_failed' })
    return NextResponse.json({ ok: false, run_id: id, error: 'fulfillment_worker_failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({
    ok: true,
    endpoint: '/api/pipeline/fulfill',
    default_mode: 'dry_run',
    dry_run_invokes_ai: false,
    output_gate: 'review_pending',
    outbound_gate: 'signed approval required'
  }, { headers: { 'Cache-Control': 'no-store' } })
}
