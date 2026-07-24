import { NextRequest, NextResponse } from 'next/server'
import { pipelineAuthorized } from '@/lib/pipeline/auth'
import { contractorFromLead } from '@/lib/pipeline/normalize'
import { insertRows, recordRun, storeConfigured } from '@/lib/pipeline/store'
import { territoryAt, territoryByStateCity } from '@/lib/pipeline/territories'
import type { ContractorRecord } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function runId() {
  return `DISC-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const started = Date.now()
  const id = runId()
  try {
    const body = await req.json().catch(() => ({})) as {
      state?: string
      city?: string
      cursor?: number
      industries?: string[]
      dry_run?: boolean
      limit_per_industry?: number
    }

    const selected = territoryByStateCity(body.state, body.city) || territoryAt(body.cursor || 0).target
    const cursorResult = territoryAt(body.cursor || 0)
    const industries = body.industries?.length ? body.industries : selected.industries
    const dryRun = body.dry_run !== false
    const limit = Math.max(10, Math.min(body.limit_per_industry || 100, 250))
    const scraperUrl = (process.env.XTREME_SCRAPER_URL || '').replace(/\/$/, '')
    const scraperSecret = process.env.XTREME_SCRAPER_SECRET || process.env.PIPELINE_SECRET || ''

    if (!scraperUrl) {
      return NextResponse.json({
        ok: false,
        error: 'XTREME_SCRAPER_URL is not configured',
        target: selected,
        dry_run: dryRun,
      }, { status: 503 })
    }

    const contractors: ContractorRecord[] = []
    const sourceResults: Array<Record<string, unknown>> = []

    for (const industry of industries) {
      const response = await fetch(`${scraperUrl}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(scraperSecret ? { 'x-pipeline-secret': scraperSecret } : {}),
        },
        body: JSON.stringify({
          industry,
          city: selected.city,
          state: selected.state,
          limit,
          mode: 'max',
        }),
        signal: AbortSignal.timeout(90000),
      })
      const data = await response.json().catch(() => ({})) as Record<string, unknown>
      sourceResults.push({ industry, status: response.status, ...data })
      const leads = Array.isArray(data.leads) ? data.leads as Record<string, unknown>[] : []
      for (const lead of leads) {
        const normalized = contractorFromLead(lead, {
          city: selected.city,
          state: selected.state,
          industry,
          source: 'xtreme_scraper',
        })
        if (normalized) contractors.push(normalized)
      }
    }

    const unique = [...new Map(contractors.map(item => [item.fingerprint, item])).values()]
    let persisted = 0
    if (!dryRun && storeConfigured() && unique.length) {
      const rows = unique.map(item => ({ ...item, updated_at: new Date().toISOString() }))
      const saved = await insertRows('bidgenius_contractors', rows, { upsert: true, onConflict: 'fingerprint' })
      persisted = saved.length
    }

    await recordRun({
      run_id: id,
      phase: 'contractor_discovery',
      status: 'complete',
      territory: `${selected.city}, ${selected.state}`,
      discovered: unique.length,
      qualified: unique.filter(item => item.status === 'qualified').length,
      duration_ms: Date.now() - started,
      metadata: { dry_run: dryRun, persisted, next_cursor: cursorResult.nextCursor, source_results: sourceResults },
    })

    return NextResponse.json({
      ok: true,
      run_id: id,
      dry_run: dryRun,
      target: selected,
      discovered: unique.length,
      qualified: unique.filter(item => item.status === 'qualified').length,
      persisted,
      next_cursor: cursorResult.nextCursor,
      territory_cycle_complete: cursorResult.complete,
      contractors: unique,
      source_results: sourceResults,
      store_configured: storeConfigured(),
      duration_ms: Date.now() - started,
    })
  } catch (error) {
    await recordRun({ run_id: id, phase: 'contractor_discovery', status: 'failed', duration_ms: Date.now() - started, error: String(error) })
    return NextResponse.json({ ok: false, run_id: id, error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/pipeline/discover',
    default_mode: 'dry_run',
    requires: ['XTREME_SCRAPER_URL', 'PIPELINE_SECRET'],
    persistence_requires: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'pipeline migration'],
  })
}
