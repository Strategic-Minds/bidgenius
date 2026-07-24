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

async function generateFromOpportunity(req: NextRequest, opportunity: OpportunityRecord) {
  const jobText = opportunityJobText(opportunity)
  const scraperUrl = (process.env.XTREME_SCRAPER_URL || '').replace(/\/$/, '')
  const scraperSecret = process.env.XTREME_SCRAPER_SECRET || process.env.PIPELINE_SECRET || ''

  if (scraperUrl) {
    const response = await fetch(`${scraperUrl}/api/bid/proposal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(scraperSecret ? { 'x-pipeline-secret': scraperSecret } : {}),
      },
      body: JSON.stringify({
        email_text: jobText,
        contractor: companyFor(opportunity) === 'nep'
          ? { business_name: 'National Epoxy Pros', email: 'support@nationalepoxypros.com' }
          : { business_name: 'National Concrete Polishing', email: 'info@nationalconcretepolishing.com' },
      }),
      signal: AbortSignal.timeout(90000),
    })
    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok || !data.ok) throw new Error(`XTREME-SCRAPER fulfillment failed: ${String(data.error || response.status)}`)
    return data
  }

  const local = await fetch(new URL('/api/takeoff', req.nextUrl.origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_text: jobText, company: companyFor(opportunity) }),
    signal: AbortSignal.timeout(90000),
  })
  const data = await local.json().catch(() => ({})) as Record<string, unknown>
  if (!local.ok || !data.ok) throw new Error(`Local fulfillment failed: ${String(data.error || local.status)}`)
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
      return NextResponse.json({ ok: true, run_id: id, dry_run: dryRun, message: 'No qualified opportunities queued', fulfilled: 0 })
    }

    const fulfilled: FulfillmentRecord[] = []
    const failures: Array<Record<string, unknown>> = []

    for (const opportunity of opportunities) {
      try {
        if (!dryRun && opportunity.id && storeConfigured()) {
          await updateRows('bidgenius_opportunities', `id=eq.${encodeURIComponent(opportunity.id)}`, { status: 'fulfilling' })
        }

        const generated = await generateFromOpportunity(req, opportunity)
        const parsed = (generated.parsed || generated.job || {}) as Record<string, unknown>
        const record: FulfillmentRecord = {
          opportunity_id: opportunity.id,
          opportunity_fingerprint: opportunity.fingerprint,
          company: companyFor(opportunity),
          proposal_number: String(generated.proposal_number || ''),
          proposal_html: String(generated.html || ''),
          parsed,
          total: Number(generated.total || (generated.pricing as Record<string, unknown> | undefined)?.total || 0),
          confidence: Number(parsed.confidence || 0),
          status: 'review_pending',
        }
        fulfilled.push(record)

        if (!dryRun && storeConfigured()) {
          await insertRows('bidgenius_fulfillments', [{ ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
          if (opportunity.id) {
            await updateRows('bidgenius_opportunities', `id=eq.${encodeURIComponent(opportunity.id)}`, { status: 'review_pending' })
          }
        }
      } catch (error) {
        failures.push({ fingerprint: opportunity.fingerprint, error: String(error) })
        if (!dryRun && opportunity.id && storeConfigured()) {
          await updateRows('bidgenius_opportunities', `id=eq.${encodeURIComponent(opportunity.id)}`, { status: 'failed', last_error: String(error) })
        }
      }
    }

    await recordRun({
      run_id: id,
      phase: 'fulfillment',
      status: failures.length && !fulfilled.length ? 'failed' : 'complete',
      fulfilled: fulfilled.length,
      duration_ms: Date.now() - started,
      metadata: { dry_run: dryRun, failures },
    })

    return NextResponse.json({
      ok: failures.length === 0,
      run_id: id,
      dry_run: dryRun,
      attempted: opportunities.length,
      fulfilled: fulfilled.length,
      failed: failures.length,
      fulfillments: fulfilled,
      failures,
      duration_ms: Date.now() - started,
    })
  } catch (error) {
    await recordRun({ run_id: id, phase: 'fulfillment', status: 'failed', duration_ms: Date.now() - started, error: String(error) })
    return NextResponse.json({ ok: false, run_id: id, error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/pipeline/fulfill',
    default_mode: 'dry_run',
    output_gate: 'review_pending',
    outbound_gate: 'Kevin approval required',
  })
}
