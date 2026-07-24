import { NextRequest, NextResponse } from 'next/server'
import { pipelineAuthorized } from '@/lib/pipeline/auth'
import { configuredFeeds, pullFeed } from '@/lib/pipeline/feeds'
import { insertRows, recordRun, storeConfigured } from '@/lib/pipeline/store'
import type { OpportunityRecord } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function runId() {
  return `OPP-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const started = Date.now()
  const id = runId()

  try {
    const body = await req.json().catch(() => ({})) as { dry_run?: boolean; state?: string; max_feeds?: number }
    const dryRun = body.dry_run !== false
    const feeds = configuredFeeds()
      .filter(feed => !body.state || !feed.state || feed.state.toUpperCase() === body.state.toUpperCase())
      .slice(0, Math.max(1, Math.min(body.max_feeds || 20, 50)))

    if (!feeds.length) {
      return NextResponse.json({
        ok: false,
        error: 'No public bid feeds configured',
        environment_variable: 'PUBLIC_BID_FEEDS_JSON',
        dry_run: dryRun,
      }, { status: 503 })
    }

    const found: OpportunityRecord[] = []
    const feedResults: Array<Record<string, unknown>> = []

    for (const feed of feeds) {
      try {
        const opportunities = await pullFeed(feed)
        found.push(...opportunities)
        feedResults.push({ name: feed.name, ok: true, found: opportunities.length })
      } catch (error) {
        feedResults.push({ name: feed.name, ok: false, error: String(error) })
      }
    }

    const unique = [...new Map(found.map(item => [item.fingerprint, item])).values()]
    let persisted = 0
    if (!dryRun && storeConfigured() && unique.length) {
      const rows = unique.map(item => ({ ...item, updated_at: new Date().toISOString() }))
      const saved = await insertRows('bidgenius_opportunities', rows, { upsert: true, onConflict: 'fingerprint' })
      persisted = saved.length
    }

    await recordRun({
      run_id: id,
      phase: 'opportunity_discovery',
      status: 'complete',
      territory: body.state || 'configured feeds',
      discovered: unique.length,
      qualified: unique.filter(item => item.status === 'qualified').length,
      duration_ms: Date.now() - started,
      metadata: { dry_run: dryRun, persisted, feeds: feedResults },
    })

    return NextResponse.json({
      ok: true,
      run_id: id,
      dry_run: dryRun,
      feeds_checked: feeds.length,
      discovered: unique.length,
      qualified: unique.filter(item => item.status === 'qualified').length,
      persisted,
      feed_results: feedResults,
      opportunities: unique,
      store_configured: storeConfigured(),
      duration_ms: Date.now() - started,
    })
  } catch (error) {
    await recordRun({ run_id: id, phase: 'opportunity_discovery', status: 'failed', duration_ms: Date.now() - started, error: String(error) })
    return NextResponse.json({ ok: false, run_id: id, error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/pipeline/opportunities/discover',
    default_mode: 'dry_run',
    feed_config_example: [{ name: 'Public procurement feed', url: 'https://example.gov/feed.json', format: 'json', state: 'FL' }],
  })
}
