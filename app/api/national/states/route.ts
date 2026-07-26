import { NextRequest, NextResponse } from 'next/server'
import { pipelineAuthorized } from '@/lib/pipeline/auth'
import { nationalStates, promotionRules } from '@/lib/national.mjs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!pipelineAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    count: nationalStates.length,
    mode: 'governed_internal',
    promotion_rules: promotionRules,
    states: nationalStates
  }, { headers: { 'Cache-Control': 'no-store' } })
}
