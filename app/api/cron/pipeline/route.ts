import { NextRequest, NextResponse } from 'next/server'
import { pipelineAuthorized } from '@/lib/pipeline/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PHASES = ['contractors', 'opportunities', 'fulfill', 'send'] as const
type Phase = typeof PHASES[number]

function phaseForHour(hour: number): Phase {
  if (hour < 6) return 'contractors'
  if (hour < 12) return 'opportunities'
  if (hour < 18) return 'fulfill'
  return 'send'
}

async function callInternal(req: NextRequest, path: string, body: Record<string, unknown>) {
  const secret = process.env.PIPELINE_SECRET || process.env.CRON_SECRET || ''
  if (!secret) return { status: 503, data: { ok: false, error: 'pipeline_secret_not_configured' } }

  const response = await fetch(new URL(path, req.nextUrl.origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pipeline-secret': secret
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(290_000)
  })
  const data = await response.json().catch(() => ({ ok: false, error: 'invalid_internal_response' }))
  return { status: response.status, data }
}

export async function GET(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const requested = req.nextUrl.searchParams.get('phase') as Phase | null
  const phase = requested && PHASES.includes(requested) ? requested : phaseForHour(new Date().getUTCHours())
  const execute = process.env.PIPELINE_EXECUTION_ENABLED === 'true'
  const outboundEnabled = process.env.OUTBOUND_ENABLED === 'true'
  const rawCursor = Number(req.nextUrl.searchParams.get('cursor') || process.env.PIPELINE_TERRITORY_CURSOR || 0)
  const cursor = Number.isFinite(rawCursor) ? Math.max(0, Math.floor(rawCursor)) : 0

  if (!execute) {
    return NextResponse.json({
      ok: true,
      phase,
      execute: false,
      outbound_enabled: outboundEnabled,
      external_work_invoked: false,
      plan: phase === 'contractors'
        ? { cursor, limit_per_industry: 100 }
        : phase === 'opportunities'
          ? { max_feeds: 20 }
          : phase === 'fulfill'
            ? { batch_size: 5 }
            : { batch_size: 10, blocked_by: 'PIPELINE_EXECUTION_ENABLED' }
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (phase === 'contractors') {
    const result = await callInternal(req, '/api/pipeline/discover', {
      cursor,
      dry_run: false,
      limit_per_industry: 100
    })
    return NextResponse.json({ ok: result.status < 400, phase, execute, result: result.data }, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
  }

  if (phase === 'opportunities') {
    const result = await callInternal(req, '/api/pipeline/opportunities/discover', {
      dry_run: false,
      max_feeds: 20
    })
    return NextResponse.json({ ok: result.status < 400, phase, execute, result: result.data }, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
  }

  if (phase === 'fulfill') {
    const result = await callInternal(req, '/api/pipeline/fulfill', {
      dry_run: false,
      batch_size: 5
    })
    return NextResponse.json({ ok: result.status < 400, phase, execute, result: result.data }, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!outboundEnabled) {
    return NextResponse.json({
      ok: false,
      phase,
      execute,
      outbound_enabled: false,
      blocked: true,
      gate: 'OUTBOUND_ENABLED'
    }, { status: 423, headers: { 'Cache-Control': 'no-store' } })
  }

  const result = await callInternal(req, '/api/pipeline/send-approved', { batch_size: 10 })
  return NextResponse.json({
    ok: result.status < 400,
    phase,
    execute,
    outbound_enabled: true,
    result: result.data
  }, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}
