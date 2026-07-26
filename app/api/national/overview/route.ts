import { NextRequest, NextResponse } from 'next/server'
import { getNationalOverview } from '@/lib/national/server'
import { pipelineAuthorized } from '@/lib/pipeline/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!pipelineAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const overview = await getNationalOverview()
  return NextResponse.json(overview, {
    status: overview.ok ? 200 : overview.status === 'not_configured' ? 503 : 502,
    headers: { 'Cache-Control': 'no-store' }
  })
}
