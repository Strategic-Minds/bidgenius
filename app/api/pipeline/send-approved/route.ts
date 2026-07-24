import { NextRequest, NextResponse } from 'next/server'
import { pipelineAuthorized, verifyApprovalSignature } from '@/lib/pipeline/auth'
import { normalizeEmail } from '@/lib/pipeline/normalize'
import { insertRows, recordRun, selectRows, storeConfigured, updateRows } from '@/lib/pipeline/store'
import type { FulfillmentRecord } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function runId() {
  return `SEND-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`
}

function recipientFor(item: FulfillmentRecord): string {
  const parsed = item.parsed || {}
  return normalizeEmail(
    parsed.client_email ||
    parsed.contact_email ||
    parsed.email ||
    ''
  )
}

export async function POST(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const started = Date.now()
  const id = runId()

  if (process.env.OUTBOUND_ENABLED !== 'true') {
    await recordRun({ run_id: id, phase: 'approved_outbound', status: 'blocked', error: 'OUTBOUND_ENABLED is not true' })
    return NextResponse.json({
      ok: false,
      blocked: true,
      gate: 'OUTBOUND_ENABLED',
      message: 'Approved outbound is installed but disabled. No email was sent.',
    }, { status: 423 })
  }
  if (!storeConfigured()) return NextResponse.json({ ok: false, error: 'Pipeline store is not configured' }, { status: 503 })

  try {
    const body = await req.json().catch(() => ({})) as { batch_size?: number }
    const batchSize = Math.max(1, Math.min(body.batch_size || 10, 20))
    const approved = await selectRows<FulfillmentRecord & { id: string }>(
      'bidgenius_fulfillments',
      'status=eq.approved&order=approved_at.asc',
      batchSize
    )

    const sent: Array<Record<string, unknown>> = []
    const blocked: Array<Record<string, unknown>> = []
    const failed: Array<Record<string, unknown>> = []

    for (const item of approved) {
      const approvedAt = item.approved_at || ''
      const signature = item.approval_signature || ''
      const recipient = recipientFor(item)

      if (!verifyApprovalSignature(item.id, approvedAt, signature)) {
        blocked.push({ id: item.id, reason: 'invalid approval signature' })
        continue
      }
      if (!recipient) {
        blocked.push({ id: item.id, reason: 'no verified recipient email' })
        continue
      }

      const suppressed = await selectRows<{ email: string }>(
        'bidgenius_suppression',
        `email=eq.${encodeURIComponent(recipient)}`,
        1
      )
      if (suppressed.length) {
        blocked.push({ id: item.id, recipient, reason: 'suppressed' })
        continue
      }

      try {
        const response = await fetch(new URL('/api/send-proposal', req.nextUrl.origin), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposal_html: item.proposal_html,
            client_email: recipient,
            client_name: String(item.parsed?.client_name || item.parsed?.contact_name || 'Project Contact'),
            proposal_number: item.proposal_number,
            company: item.company,
          }),
          signal: AbortSignal.timeout(60000),
        })
        const data = await response.json().catch(() => ({})) as Record<string, unknown>
        if (!response.ok || !data.ok) throw new Error(String(data.error || response.status))

        const sentAt = new Date().toISOString()
        await updateRows('bidgenius_fulfillments', `id=eq.${encodeURIComponent(item.id)}`, {
          status: 'sent',
          sent_at: sentAt,
          updated_at: sentAt,
        })
        await insertRows('bidgenius_outbound', [{
          fulfillment_id: item.id,
          recipient_email: recipient,
          provider: 'resend',
          provider_message_id: String(data.id || ''),
          status: 'sent',
          sent_at: sentAt,
          approved_by: item.approved_by,
          approval_signature: signature,
        }])
        sent.push({ id: item.id, recipient, provider_message_id: data.id })
      } catch (error) {
        failed.push({ id: item.id, recipient, error: String(error) })
        await updateRows('bidgenius_fulfillments', `id=eq.${encodeURIComponent(item.id)}`, {
          last_error: String(error),
          updated_at: new Date().toISOString(),
        })
      }
    }

    await recordRun({
      run_id: id,
      phase: 'approved_outbound',
      status: failed.length && !sent.length ? 'failed' : 'complete',
      sent: sent.length,
      duration_ms: Date.now() - started,
      metadata: { blocked, failed },
    })

    return NextResponse.json({
      ok: failed.length === 0,
      run_id: id,
      attempted: approved.length,
      sent: sent.length,
      blocked: blocked.length,
      failed: failed.length,
      sent_items: sent,
      blocked_items: blocked,
      failed_items: failed,
      duration_ms: Date.now() - started,
    })
  } catch (error) {
    await recordRun({ run_id: id, phase: 'approved_outbound', status: 'failed', duration_ms: Date.now() - started, error: String(error) })
    return NextResponse.json({ ok: false, run_id: id, error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/pipeline/send-approved',
    outbound_enabled: process.env.OUTBOUND_ENABLED === 'true',
    gates: ['Kevin approval', 'valid HMAC approval signature', 'verified recipient', 'suppression check'],
  })
}
