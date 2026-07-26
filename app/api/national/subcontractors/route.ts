import { NextRequest, NextResponse } from 'next/server'
import { pipelineAuthorized } from '@/lib/pipeline/auth'
import {
  minimumCompliance,
  subcontractorBlockers,
  subcontractorLifecycle,
  subcontractorSelectionWeights
} from '@/lib/national.mjs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!pipelineAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    mode: 'verification_required',
    live_outreach_enabled: process.env.OUTBOUND_ENABLED === 'true',
    lifecycle: subcontractorLifecycle,
    assignment_blockers: subcontractorBlockers,
    minimum_compliance: minimumCompliance,
    selection_weights: subcontractorSelectionWeights,
    assignment_rule: 'An assignment requires verified identity, active compliance, capacity evidence and an approval receipt.'
  }, { headers: { 'Cache-Control': 'no-store' } })
}
