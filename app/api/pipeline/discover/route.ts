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

function safeIndustry(value: string): string {
  return value.replace(/[^a-zA-Z0-9 &/().-]/g, '').trim().slice(0, 120)
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

    const cursor = Number.isFinite(Number(body.cursor)) ? Math.max(0, Math.floor(Number(body.cursor))) : 0
    const selected = territoryByStateCity(body.state, body.city) || territoryAt(cursor).target
    const cursorResult = territoryAt(cursor)
    const requestedIndustries = Array.isArray(body.industries) ? body.industries.map(safeIndustry).filter(Boolean).slice(0, 20) : []
    const industries = requestedIndustries.length ? requestedIndustries : selected.industries
    const dryRun = body.dry_run !== false
    const executionEnabled = process.env.PIPELINE_EXECUTION_ENABLED === 'true'
    const limit = Math.max(10, Math.min(Number(body.limit_per_industry) || 100, 250))

    if (dryRun) {
      await recordRun({
        run_id: id,
        phase: 'contractor_discovery',
        status: 'complete',
        territory: `${selected.city}, ${selected.state}`,
        discovered: 0,
        qualified: 0,
        duration_ms: Date.now() - started,
        metadata: { dry_run: true, external_scraper_invoked: false, industries, limit, next_cursor: cursorResult.nextCursor }
      })
      return NextResponse.json({
        ok: true,
        run_id: id,
        dry_run: true,
        external_scraper_invoked: false,
        target: selected,
        industries,
        limit_per_industry: limit,
        next_cursor: cursorResult.nextCursor,
        territory_cycle_complete: cursorResult.complete,
        would_persist: storeConfigured(),
        duration_ms: Date.now() - started
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (!executionEnabled) {
      await recordRun({ run_id: id, phase: 'contractor_discovery', status: 'blocked', error: 'pipeline_execution_disabled' })
      return NextResponse.json({ ok: false, blocked: true, gate: 'PIPELINE_EXECUTION_ENABLED' }, { status: 423 })
    }

    const scraperUrl = (process.env.XTREME_SCRAPER_URL || '').replace(/\/$/, '')
    const scraperSecret = process.env.XTREME_SCRAPER_SECRET || process.env.PIPELINE_SECRET || ''
    if (!scraperUrl || !scraperSecret) {
      return NextResponse.json({ ok: false, error: 'scraper_bridge_not_configured' }, { status: 503 })
    }

    const contractors: ContractorRecord[] = []
    const sourceResults: Array<Record<string, unknown>> = []
    for (const industry of industries) {
      try {
        const response = await fetch(`${scraperUrl}/api/scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-pipeline-secret': scraperSecret
          },
          body: JSON.stringify({
            industry,
            city: selected.city,
            state: selected.state,
            limit,
            mode: 'max'
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(90_000)
        })
        const data = await response.json().catch(() => ({})) as Record<string, unknown>
        sourceResults.push({ industry, ok: response.ok, status: response.status, leads: Array.isArray(data.leads) ? data.leads.length : 0 })
        if (!response.ok) continue
        const leads = Array.isArray(data.leads) ? data.leads as Record<string, unknown>[] : []
        for (const lead of leads.slice(0, limit)) {
          const normalized = contractorFromLead(lead, {
            city: selected.city,
            state: selected.state,
            industry,
            source: 'xtreme_scraper'
          })
          if (normalized) contractors.push(normalized)
        }
      } catch {
        sourceResults.push({ industry, ok: false, error: 'scraper_request_failed' })
      }
    }

    const unique = [...new Map(contractors.map(item => [item.fingerprint, item])).values()]
    let persisted = 0
    if (storeConfigured() && unique.length) {
      const rows = unique.map(item => ({ ...item, updated_at: new Date().toISOString() }))
      const saved = await insertRows('bidgenius_contractors', rows, { upsert: true, onConflict: 'fingerprint' })
      persisted = saved.length
    }

    await recordRun({
      run_id: id,
      phase: 'contractor_discovery',
      status: sourceResults.some(result => result.ok) ? 'complete' : 'failed',
      territory: `${selected.city}, ${selected.state}`,
      discovered: unique.length,
      qualified: unique.filter(item => item.status === 'qualified').length,
      duration_ms: Date.now() - started,
      metadata: { dry_run: false, persisted, next_cursor: cursorResult.nextCursor, source_results: sourceResults }
    })

    return NextResponse.json({
      ok: sourceResults.some(result => result.ok),
      run_id: id,
      dry_run: false,
      target: selected,
      discovered: unique.length,
      qualified: unique.filter(item => item.status === 'qualified').length,
      persisted,
      next_cursor: cursorResult.nextCursor,
      territory_cycle_complete: cursorResult.complete,
      source_results: sourceResults,
      store_configured: storeConfigured(),
      duration_ms: Date.now() - started
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    await recordRun({ run_id: id, phase: 'contractor_discovery', status: 'failed', duration_ms: Date.now() - started, error: 'contractor_discovery_failed' })
    return NextResponse.json({ ok: false, run_id: id, error: 'contractor_discovery_failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({
    ok: true,
    endpoint: '/api/pipeline/discover',
    default_mode: 'dry_run',
    dry_run_invokes_scraper: false,
    requires: ['XTREME_SCRAPER_URL', 'XTREME_SCRAPER_SECRET', 'PIPELINE_EXECUTION_ENABLED'],
    persistence_requires: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'pipeline migration']
  }, { headers: { 'Cache-Control': 'no-store' } })
}
