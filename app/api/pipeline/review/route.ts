import { NextRequest, NextResponse } from 'next/server'
import { createApprovalSignature, reviewAuthorized } from '@/lib/pipeline/auth'
import { insertRows, selectRows, storeConfigured, updateRows } from '@/lib/pipeline/store'
import type { FulfillmentRecord, ReviewDecision } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!reviewAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!storeConfigured()) return NextResponse.json({ ok: false, error: 'Pipeline store is not configured' }, { status: 503 })

  const status = req.nextUrl.searchParams.get('status') || 'review_pending'
  const rows = await selectRows<FulfillmentRecord & { id: string }>(
    'bidgenius_fulfillments',
    `status=eq.${encodeURIComponent(status)}&order=created_at.desc`,
    100
  )
  return NextResponse.json({ ok: true, status, count: rows.length, items: rows })
}

export async function POST(req: NextRequest) {
  if (!reviewAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!storeConfigured()) return NextResponse.json({ ok: false, error: 'Pipeline store is not configured' }, { status: 503 })

  const body = await req.json().catch(() => ({})) as {
    id?: string
    decision?: ReviewDecision
    notes?: string
    reviewer?: string
  }
  if (!body.id || !body.decision || !['approve', 'revise', 'reject'].includes(body.decision)) {
    return NextResponse.json({ ok: false, error: 'id and decision are required' }, { status: 400 })
  }

  const reviewer = body.reviewer?.trim() || 'Kevin Topel'
  const decidedAt = new Date().toISOString()
  const status = body.decision === 'approve'
    ? 'approved'
    : body.decision === 'revise'
      ? 'revision_requested'
      : 'rejected'
  const signature = body.decision === 'approve' ? createApprovalSignature(body.id, decidedAt) : ''

  const updated = await updateRows<FulfillmentRecord & { id: string }>(
    'bidgenius_fulfillments',
    `id=eq.${encodeURIComponent(body.id)}`,
    {
      status,
      approved_by: body.decision === 'approve' ? reviewer : undefined,
      approved_at: body.decision === 'approve' ? decidedAt : undefined,
      approval_signature: signature || undefined,
      updated_at: decidedAt,
    } as Partial<FulfillmentRecord & { id: string }>
  )

  if (!updated.length) return NextResponse.json({ ok: false, error: 'fulfillment not found' }, { status: 404 })

  await insertRows('bidgenius_reviews', [{
    fulfillment_id: body.id,
    decision: body.decision,
    reviewer,
    notes: body.notes || '',
    decided_at: decidedAt,
    approval_signature: signature || null,
  }])

  return NextResponse.json({
    ok: true,
    id: body.id,
    decision: body.decision,
    status,
    reviewer,
    decided_at: decidedAt,
    approved_for_outbound: body.decision === 'approve' && Boolean(signature),
  })
}
