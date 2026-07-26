import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { operatorAuthorized } from '@/lib/pipeline/auth'
import { insertRows, recordRun, selectRows, storeConfigured } from '@/lib/pipeline/store'
import type { FulfillmentRecord } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'

type StoredFulfillment = FulfillmentRecord & {
  id?: string
  created_at: string
  updated_at: string
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function number(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeProposal(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const lineItems = Array.isArray(raw.line_items) ? raw.line_items.slice(0, 200).map((item, index) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    return {
      num: text(row.num, 20) || String(index + 1).padStart(2, '0'),
      description: text(row.description, 500),
      unit: text(row.unit, 20),
      qty: number(row.qty),
      unit_price: number(row.unit_price),
      total: number(row.total)
    }
  }) : []
  const exclusions = Array.isArray(raw.exclusions) ? raw.exclusions.slice(0, 100).map(item => text(item, 500)).filter(Boolean) : []
  const paymentSchedule = Array.isArray(raw.payment_schedule) ? raw.payment_schedule.slice(0, 20).map(item => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    return { stage: text(row.stage, 100), pct: number(row.pct), amount: number(row.amount) }
  }) : []

  return {
    proposal_number: text(raw.proposal_number, 100),
    client_name: text(raw.client_name, 200),
    client_email: text(raw.client_email, 320),
    job_address: text(raw.job_address, 300),
    job_city: text(raw.job_city, 100),
    job_state: text(raw.job_state, 50),
    job_type: text(raw.job_type, 150),
    gloss_level: text(raw.gloss_level, 100),
    sqft: number(raw.sqft),
    scope_narrative: text(raw.scope_narrative, 20_000),
    line_items: lineItems,
    subtotal: number(raw.subtotal),
    tax_rate: number(raw.tax_rate),
    tax_amount: number(raw.tax_amount),
    total_price: number(raw.total_price),
    payment_schedule: paymentSchedule,
    exclusions,
    estimated_labor_hours: number(raw.estimated_labor_hours),
    estimated_duration_days: text(raw.estimated_duration_days, 100),
    validity_days: Math.min(number(raw.validity_days) || 30, 365),
    notes: text(raw.notes, 5_000),
    confidence: number(raw.confidence)
  }
}

function proposalHtml(company: 'ncp' | 'nep', proposal: Record<string, unknown>): string {
  const companyName = company === 'ncp' ? 'National Concrete Polishing' : 'National Epoxy Pros'
  const items = (proposal.line_items as Array<Record<string, unknown>>).map(item => `
    <tr>
      <td>${escapeHtml(item.num)}</td>
      <td>${escapeHtml(item.description)}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(item.qty)}</td>
      <td>${escapeHtml(item.unit_price)}</td>
      <td>${escapeHtml(item.total)}</td>
    </tr>`).join('')
  const exclusions = (proposal.exclusions as string[]).map(item => `<li>${escapeHtml(item)}</li>`).join('')

  return `<!doctype html><html><body>
    <h1>${escapeHtml(companyName)} Proposal</h1>
    <p><strong>Proposal:</strong> ${escapeHtml(proposal.proposal_number)}</p>
    <p><strong>Client:</strong> ${escapeHtml(proposal.client_name)}</p>
    <p><strong>Project:</strong> ${escapeHtml(proposal.job_type)} | ${escapeHtml(proposal.sqft)} SF</p>
    <h2>Scope</h2><p>${escapeHtml(proposal.scope_narrative)}</p>
    <h2>Pricing</h2><table><thead><tr><th>Item</th><th>Description</th><th>Unit</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
    <p><strong>Total:</strong> ${escapeHtml(proposal.total_price)}</p>
    <h2>Exclusions</h2><ol>${exclusions}</ol>
  </body></html>`.slice(0, 1_000_000)
}

export async function POST(req: NextRequest) {
  if (!operatorAuthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!storeConfigured()) return NextResponse.json({ ok: false, error: 'store_not_configured' }, { status: 503 })

  const runId = `DRAFT-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`
  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    const company = body?.company === 'nep' ? 'nep' : 'ncp'
    const proposal = normalizeProposal(body?.proposal)
    if (!proposal || !(proposal.line_items as unknown[]).length || !proposal.scope_narrative) {
      return NextResponse.json({ ok: false, error: 'invalid_proposal' }, { status: 400 })
    }

    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ company, proposal_number: proposal.proposal_number, proposal }))
      .digest('hex')

    const existing = await selectRows<{ id: string; status: string }>(
      'bidgenius_fulfillments',
      `opportunity_fingerprint=eq.${fingerprint}`,
      1
    )
    if (existing.length) {
      return NextResponse.json({ ok: true, duplicate: true, id: existing[0].id, status: existing[0].status }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const record: StoredFulfillment = {
      opportunity_fingerprint: fingerprint,
      company,
      proposal_number: text(proposal.proposal_number, 100),
      proposal_html: proposalHtml(company, proposal),
      parsed: proposal,
      total: number(proposal.total_price),
      confidence: number(proposal.confidence),
      status: 'review_pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    const saved = await insertRows<StoredFulfillment>('bidgenius_fulfillments', [record])
    const id = saved[0]?.id || ''

    await recordRun({
      run_id: runId,
      phase: 'manual_proposal_submission',
      status: 'complete',
      fulfilled: 1,
      metadata: { company, fulfillment_id: id, source: 'operator_ui' }
    })

    return NextResponse.json({ ok: true, id, status: 'review_pending', run_id: runId }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    await recordRun({ run_id: runId, phase: 'manual_proposal_submission', status: 'failed', error: 'proposal_submission_failed' })
    return NextResponse.json({ ok: false, error: 'proposal_submission_failed' }, { status: 500 })
  }
}
