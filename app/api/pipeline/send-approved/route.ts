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
  return normalizeEmail(parsed.client_email || parsed.contact_email || parsed.email || '')
}

export async function POST(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const started = Date.now()
  const id = runId()

  if (process.env.PIPELINE_EXECUTION_ENABLED !== 'true') {
    await recordRun({ run_id: id, phase: 'approved_outbound', status: 'blocked', error: 'pipeline_execution_disabled' })
    return NextResponse.json({ ok: false, blocked: true, gate: 'PIPELINE_EXECUTION_ENABLED' }, { status: 423 })
  }
  if (process.env.OUTBOUND_ENABLED !== 'true') {
    await recordRun({ run_id: id, phase: 'approved_outbound', status: 'blocked', error: 'outbound_disabled' })
    return NextResponse.json({ ok: false, blocked: true, gate: 'OUTBOUND_ENABLED' }, { status: 423 })
  }
  if (!storeConfigured()) return NextResponse.json({ ok: false, error: 'store_not_configured' }, { status: 503 })

  const pipelineSecret = process.env.PIPELINE_SECRET || process.env.CRON_SECRET || ''
  if (!pipelineSecret) return NextResponse.json({ ok: false, error: 'pipeline_secret_not_configured' }, { status: 503 })

  try {
    const body = await req.json().catch(() => ({})) as { batch_size?: number }
    const batchSize = Math.max(1, Math.min(Number(body.batch_size) || 10, 20))
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
        blocked.push({ id: item.id, reason: 'invalid_approval_signature' })
        continue
      }
      if (!recipient) {
        blocked.push({ id: item.id, reason: 'invalid_recipient' })
        continue
      }

      const [suppressed, priorOutbound] = await Promise.all([
        selectRows<{ email: string }>('bidgenius_suppression', `email=eq.${encodeURIComponent(recipient)}`, 1),
        selectRows<{ id: string; status: string }>('bidgenius_outbound', `fulfillment_id=eq.${encodeURIComponent(item.id)}&status=in.(queued,sent,delivered)`, 1)
      ])
      if (suppressed.length) {
        blocked.push({ id: item.id, reason: 'suppressed' })
        continue
      }
      if (priorOutbound.length) {
        blocked.push({ id: item.id, reason: 'already_claimed_or_sent' })
        continue
      }

      try {
        const queuedAt = new Date().toISOString()
        await insertRows('bidgenius_outbound', [{
          fulfillment_id: item.id,
          recipient_email: recipient,
          provider: 'resend',
          provider_message_id: null,
          status: 'queued',
          sent_at: null,
          approved_by: item.approved_by,
          approval_signature: signature,
          metadata: { run_id: id, queued_at: queuedAt }
        }])

        const response = await fetch(new URL('/api/send-proposal', req.nextUrl.origin), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-pipeline-secret': pipelineSecret
          },
          body: JSON.stringify({
            fulfillment_id: item.id,
            approved_at: approvedAt,
            approval_signature: signature,
            proposal_html: item.proposal_html,
            client_email: recipient,
            proposal_number: item.proposal_number,
            company: item.company
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(60_000)
        })
        const data = await response.json().catch(() => ({})) as { ok?: boolean; id?: string }
        if (!response.ok || !data.ok || !data.id) throw new Error('provider_send_failed')

        const sentAt = new Date().toISOString()
        await updateRows('bidgenius_outbound', `fulfillment_id=eq.${encodeURIComponent(item.id)}&status=eq.queued`, {
          provider_message_id: data.id,
          status: 'sent',
          sent_at: sentAt,
          metadata: { run_id: id, queued_at: queuedAt, sent_at: sentAt }
        })
        await updateRows('bidgenius_fulfillments', `id=eq.${encodeURIComponent(item.id)}&status=eq.approved`, {
          status: 'sent',
          sent_at: sentAt,
          last_error: null,
          updated_at: sentAt
        })
        sent.push({ id: item.id, provider_message_id: data.id })
      } catch {
        failed.push({ id: item.id, error: 'provider_or_claim_failed' })
        await updateRows('bidgenius_outbound', `fulfillment_id=eq.${encodeURIComponent(item.id)}&status=eq.queued`, {
          status: 'failed',
          metadata: { run_id: id, failed_at: new Date().toISOString(), error: 'provider_or_claim_failed' }
        }).catch(() => [])
        await updateRows('bidgenius_fulfillments', `id=eq.${encodeURIComponent(item.id)}&status=eq.approved`, {
          last_error: 'provider_or_claim_failed',
          updated_at: new Date().toISOString()
        }).catch(() => [])
      }
    }

    await recordRun({
      run_id: id,
      phase: 'approved_outbound',
      status: failed.length && !sent.length ? 'failed' : 'complete',
      sent: sent.length,
      duration_ms: Date.now() - started,
      metadata: { blocked, failed }
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
      duration_ms: Date.now() - started
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    await recordRun({ run_id: id, phase: 'approved_outbound', status: 'failed', duration_ms: Date.now() - started, error: 'outbound_worker_failed' })
    return NextResponse.json({ ok: false, run_id: id, error: 'outbound_worker_failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!pipelineAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({
    ok: true,
    endpoint: '/api/pipeline/send-approved',
    execution_enabled: process.env.PIPELINE_EXECUTION_ENABLED === 'true',
    outbound_enabled: process.env.OUTBOUND_ENABLED === 'true',
    gates: ['master execution', 'outbound switch', 'approval decision', 'valid HMAC signature', 'verified recipient', 'suppression check', 'atomic claim', 'provider idempotency']
  }, { headers: { 'Cache-Control': 'no-store' } })
}
