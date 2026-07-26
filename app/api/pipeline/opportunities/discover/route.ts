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
    const executionEnabled = process.env.PIPELINE_EXECUTION_ENABLED === 'true'
    const state = typeof body.state === 'string' && /^[A-Za-z]{2}$/.test(body.state) ? body.state.toUpperCase() : ''
    const maxFeeds = Math.max(1, Math.min(Number(body.max_feeds) || 20, 50))
    const feeds = configuredFeeds()
      .filter(feed => !state || !feed.state || feed.state === state)
      .slice(0, maxFeeds)

    if (!feeds.length) {
      return NextResponse.json({ ok: false, error: 'no_valid_public_bid_feeds_configured', dry_run: dryRun }, { status: 503 })
    }

    if (dryRun) {
      const plan = feeds.map(feed => ({ name: feed.name, format: feed.format, state: feed.state || null }))
      await recordRun({
        run_id: id,
        phase: 'opportunity_discovery',
        status: 'complete',
        territory: state || 'configured_feeds',
        discovered: 0,
        qualified: 0,
        duration_ms: Date.now() - started,
        metadata: { dry_run: true, external_feeds_invoked: false, feed_count: feeds.length }
      })
      return NextResponse.json({
        ok: true,
        run_id: id,
        dry_run: true,
        external_feeds_invoked: false,
        feeds_planned: plan,
        would_persist: storeConfigured(),
        duration_ms: Date.now() - started
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (!executionEnabled) {
      await recordRun({ run_id: id, phase: 'opportunity_discovery', status: 'blocked', error: 'pipeline_execution_disabled' })
      return NextResponse.json({ ok: false, blocked: true, gate: 'PIPELINE_EXECUTION_ENABLED' }, { status: 423 })
    }

    const found: OpportunityRecord[] = []
    const feedResults: Array<Record<string, unknown>> = []
    for (const feed of feeds) {
      try {
        const opportunities = await pullFeed(feed)
        found.push(...opportunities)
        feedResults.push({ name: feed.name, ok: true, found: opportunities.length })
      } catch {
        feedResults.push({ name: feed.name, ok: false, error: 'feed_collection_failed' })
      }
    }

    const unique = [...new Map(found.map(item => [item.fingerprint, item])).values()]
    let persisted = 0
    if (storeConfigured() && unique.length) {
      const rows = unique.map(item => ({ ...item, updated_at: new Date().toISOString() }))
      const saved = await insertRows('bidgenius_opportunities', rows, { upsert: true, onConflict: 'fingerprint' })
      persisted = saved.length
    }

    const successfulFeeds = feedResults.filter(result => result.ok).length
    await recordRun({
      run_id: id,
      phase: 'opportunity_discovery',
      status: successfulFeeds ? 'complete' : 'failed',
      territory: state || 'configured_feeds',
      discovered: unique.length,
      qualified: unique.filter(item => item.status === 'qualified').length,
      duration_ms: Date.now() - started,
      metadata: { dry_run: false, persisted, feed_results: feedResults }
    })

    return NextResponse.json({
      ok: successfulFeeds > 0,
      run_id: id,
      dry_run: false,
      feeds_checked: feeds.length,
      feeds_succeeded: successfulFeeds,
      discovered: unique.length,
      qualified: unique.filter(item => item.status === 'qualified').length,
      persisted,
      feed_results: feedResults,
      opportunities: unique,
      store_configured: storeConfigured(),
      duration_ms: Date.now() - started
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    await recordRun({ run_id: id, phase: 'opportunity_discovery', status: 'failed', duration_ms: Date.now() - started, error: 'opportunity_discovery_failed' })
    return NextResponse.json({ ok: false, run_id: id, error: 'opportunity_discovery_failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({
    ok: true,
    endpoint: '/api/pipeline/opportunities/discover',
    default_mode: 'dry_run',
    dry_run_invokes_feeds: false,
    feed_requirements: ['HTTPS only', 'public host', 'bounded response size', 'JSON/RSS/Atom']
  }, { headers: { 'Cache-Control': 'no-store' } })
}
