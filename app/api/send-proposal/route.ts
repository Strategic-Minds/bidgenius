import { NextRequest, NextResponse } from 'next/server'
import { pipelineAuthorized, verifyApprovalSignature } from '@/lib/pipeline/auth'
import { normalizeEmail } from '@/lib/pipeline/normalize'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function safeText(value: unknown, max: number): string {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)
}

export async function POST(req: NextRequest) {
  if (!pipelineAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  if (process.env.OUTBOUND_ENABLED !== 'true') {
    return NextResponse.json({ ok: false, blocked: true, gate: 'OUTBOUND_ENABLED' }, { status: 423 })
  }

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const fulfillmentId = safeText(body.fulfillment_id, 100)
    const approvedAt = safeText(body.approved_at, 64)
    const approvalSignature = safeText(body.approval_signature, 256)
    if (!fulfillmentId || !verifyApprovalSignature(fulfillmentId, approvedAt, approvalSignature)) {
      return NextResponse.json({ ok: false, error: 'invalid_approval_signature' }, { status: 403 })
    }

    const clientEmail = normalizeEmail(body.client_email)
    const clientName = safeText(body.client_name, 120) || 'Project Contact'
    const proposalNumber = safeText(body.proposal_number, 80)
    const company = body.company === 'ncp' ? 'ncp' : 'nep'
    const proposalHtml = String(body.proposal_html || '')

    if (!clientEmail) return NextResponse.json({ ok: false, error: 'invalid_recipient' }, { status: 400 })
    if (!proposalHtml || proposalHtml.length > 1_000_000) {
      return NextResponse.json({ ok: false, error: 'invalid_proposal_html' }, { status: 400 })
    }

    const resendKey = process.env.RESEND_API_KEY || ''
    const fromEmail = normalizeEmail(process.env.EMAIL_FROM)
    const replyTo = normalizeEmail(process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM)
    const ccEmail = normalizeEmail(process.env.EMAIL_CC)
    if (!resendKey || !fromEmail) {
      return NextResponse.json({ ok: false, error: 'email_provider_not_configured' }, { status: 503 })
    }

    const companyName = company === 'ncp' ? 'National Concrete Polishing' : 'National Epoxy Pros'
    const payload: Record<string, unknown> = {
      from: `${companyName} <${fromEmail}>`,
      to: [clientEmail],
      subject: `Your Flooring Proposal${proposalNumber ? ` #${proposalNumber}` : ''} - ${companyName}`,
      html: proposalHtml
    }
    if (replyTo) payload.reply_to = replyTo
    if (ccEmail) payload.cc = [ccEmail]

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `bidgenius-${fulfillmentId}-${approvalSignature.slice(0, 16)}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000)
    })
    const data = await response.json().catch(() => ({})) as { id?: string }
    if (!response.ok || !data.id) {
      return NextResponse.json({ ok: false, error: 'provider_send_failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, id: data.id }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, error: 'outbound_request_failed' }, { status: 500 })
  }
}
