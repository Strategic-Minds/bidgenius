import { NextRequest, NextResponse } from 'next/server'
import { createApprovalSignature, reviewAuthorized } from '@/lib/pipeline/auth'
import { insertRows, selectRows, storeConfigured, updateRows } from '@/lib/pipeline/store'
import type { FulfillmentRecord, ReviewDecision } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'

const REVIEWABLE_STATUSES = ['review_pending', 'revision_requested']
const LISTABLE_STATUSES = ['review_pending', 'approved', 'revision_requested', 'rejected', 'sent', 'failed']

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(req: NextRequest) {
  if (!reviewAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!storeConfigured()) return NextResponse.json({ ok: false, error: 'store_not_configured' }, { status: 503 })

  try {
    const requested = req.nextUrl.searchParams.get('status') || 'review_pending'
    const status = LISTABLE_STATUSES.includes(requested) ? requested : 'review_pending'
    const rows = await selectRows<FulfillmentRecord & { id: string }>(
      'bidgenius_fulfillments',
      `status=eq.${encodeURIComponent(status)}&order=created_at.desc`,
      100
    )
    return NextResponse.json({ ok: true, status, count: rows.length, items: rows }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, error: 'review_queue_unavailable' }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  if (!reviewAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!storeConfigured()) return NextResponse.json({ ok: false, error: 'store_not_configured' }, { status: 503 })

  try {
    const body = await req.json().catch(() => ({})) as {
      id?: string
      decision?: ReviewDecision
      notes?: string
    }
    if (!body.id || !validUuid(body.id) || !body.decision || !['approve', 'revise', 'reject'].includes(body.decision)) {
      return NextResponse.json({ ok: false, error: 'valid_id_and_decision_required' }, { status: 400 })
    }

    const reviewer = (process.env.REVIEWER_IDENTITY || 'authorized_reviewer').trim().slice(0, 120)
    const notes = String(body.notes || '').trim().slice(0, 4000)
    const decidedAt = new Date().toISOString()
    const status = body.decision === 'approve'
      ? 'approved'
      : body.decision === 'revise'
        ? 'revision_requested'
        : 'rejected'
    const signature = body.decision === 'approve' ? createApprovalSignature(body.id, decidedAt) : ''
    if (body.decision === 'approve' && !signature) {
      return NextResponse.json({ ok: false, error: 'approval_signing_not_configured' }, { status: 503 })
    }

    const updated = await updateRows<FulfillmentRecord & { id: string }>(
      'bidgenius_fulfillments',
      `id=eq.${encodeURIComponent(body.id)}&status=in.(${REVIEWABLE_STATUSES.join(',')})`,
      {
        status,
        approved_by: body.decision === 'approve' ? reviewer : undefined,
        approved_at: body.decision === 'approve' ? decidedAt : undefined,
        approval_signature: signature || undefined,
        updated_at: decidedAt
      } as Partial<FulfillmentRecord & { id: string }>
    )

    if (!updated.length) {
      return NextResponse.json({ ok: false, error: 'fulfillment_not_reviewable' }, { status: 409 })
    }

    await insertRows('bidgenius_reviews', [{
      fulfillment_id: body.id,
      decision: body.decision,
      reviewer,
      notes,
      decided_at: decidedAt,
      approval_signature: signature || null
    }])

    return NextResponse.json({
      ok: true,
      id: body.id,
      decision: body.decision,
      status,
      reviewer,
      decided_at: decidedAt,
      approved_for_outbound: body.decision === 'approve' && Boolean(signature)
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, error: 'review_operation_failed' }, { status: 500 })
  }
}
