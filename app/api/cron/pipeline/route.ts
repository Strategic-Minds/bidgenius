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
  const response = await fetch(new URL(path, req.nextUrl.origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-pipeline-secret': secret } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(290000),
  })
  const data = await response.json().catch(() => ({}))
  return { status: response.status, data }
}

export async function GET(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const requested = req.nextUrl.searchParams.get('phase') as Phase | null
  const phase = requested && PHASES.includes(requested) ? requested : phaseForHour(new Date().getUTCHours())
  const execute = process.env.PIPELINE_EXECUTION_ENABLED === 'true'
  const cursor = Number(req.nextUrl.searchParams.get('cursor') || process.env.PIPELINE_TERRITORY_CURSOR || 0)

  if (phase === 'contractors') {
    const result = await callInternal(req, '/api/pipeline/discover', {
      cursor,
      dry_run: !execute,
      limit_per_industry: execute ? 100 : 10,
    })
    return NextResponse.json({ ok: result.status < 400, phase, execute, result: result.data }, { status: result.status })
  }

  if (phase === 'opportunities') {
    const result = await callInternal(req, '/api/pipeline/opportunities/discover', {
      dry_run: !execute,
      max_feeds: execute ? 20 : 3,
    })
    return NextResponse.json({ ok: result.status < 400, phase, execute, result: result.data }, { status: result.status })
  }

  if (phase === 'fulfill') {
    const result = await callInternal(req, '/api/pipeline/fulfill', {
      dry_run: !execute,
      batch_size: execute ? 5 : 1,
    })
    return NextResponse.json({ ok: result.status < 400, phase, execute, result: result.data }, { status: result.status })
  }

  const result = await callInternal(req, '/api/pipeline/send-approved', { batch_size: 10 })
  return NextResponse.json({
    ok: result.status < 400,
    phase,
    execute,
    outbound_enabled: process.env.OUTBOUND_ENABLED === 'true',
    result: result.data,
  }, { status: result.status })
}
