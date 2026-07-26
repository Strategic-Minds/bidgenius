'use client'

import { Suspense, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const GOLD = '#C9A84C'
const GOLD_LIGHT = '#E8C96A'
const GOLD_BG = '#FFF8EC'
const MAX_FILE_BYTES = 10 * 1024 * 1024

interface LineItem {
  num?: string
  description?: string
  unit?: string
  qty?: number
  unit_price?: number
  total?: number
}

interface ProposalData {
  proposal_number?: string
  client_name?: string
  client_email?: string
  job_address?: string
  job_city?: string
  job_state?: string
  job_type?: string
  gloss_level?: string
  sqft?: number
  scope_narrative?: string
  line_items?: LineItem[]
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total_price?: number
  payment_schedule?: Array<{ stage?: string; pct?: number; amount?: number }>
  exclusions?: string[]
  estimated_labor_hours?: number
  estimated_duration_days?: string
  validity_days?: number
  notes?: string
  confidence?: number
}

const SAMPLES = [
  { label: 'Warehouse polish', text: 'Polish approximately 8,500 square feet of warehouse concrete in Atlanta, Georgia. Existing slab has surface scratches. Requested finish is high gloss.' },
  { label: 'Garage metallic epoxy', text: 'Install metallic epoxy in an approximately 850 square foot three-car garage in Charlotte, North Carolina. Requested completion is before the end of the month.' },
  { label: 'Commercial kitchen', text: 'Price approximately 1,200 square feet of commercial kitchen flooring in Miami, Florida. Concrete is rough with grease staining and visible cracks. Requested system is commercial resinous flooring.' }
]

function money(value: unknown): string {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00'
}

function ProposalPreview({ data, company }: { data: ProposalData; company: 'ncp' | 'nep' }) {
  const companyName = company === 'ncp' ? 'National Concrete Polishing' : 'National Epoxy Pros'
  return (
    <article style={{ background: '#fff', maxWidth: 900, margin: '0 auto', padding: 'clamp(24px,5vw,60px)', color: '#111', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 24, paddingBottom: 24, borderBottom: `3px solid ${GOLD}` }}>
        <div>
          <div style={{ color: GOLD, fontWeight: 850, letterSpacing: 1, fontSize: 12 }}>PROTECTED DRAFT</div>
          <h2 style={{ margin: '8px 0 0', fontSize: 25 }}>{companyName}</h2>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#666', lineHeight: 1.7 }}>
          <div><strong>Proposal:</strong> {data.proposal_number || 'Pending'}</div>
          <div><strong>Status:</strong> Review required</div>
          <div><strong>Validity:</strong> {data.validity_days || 30} days</div>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18, margin: '28px 0' }}>
        {[
          ['Client', data.client_name || 'Not provided'],
          ['Project', data.job_type || 'Not classified'],
          ['Area', data.sqft ? `${Number(data.sqft).toLocaleString()} SF` : 'Not confirmed'],
          ['Location', [data.job_city, data.job_state].filter(Boolean).join(', ') || 'Not provided'],
          ['Finish', data.gloss_level || 'Not provided'],
          ['Duration', data.estimated_duration_days || 'To be reviewed']
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#FAF9F6', border: '1px solid #EEE9DF', borderRadius: 10, padding: 14 }}>
            <div style={{ color: '#918B80', fontSize: 10, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.7 }}>{label}</div>
            <div style={{ marginTop: 5, fontSize: 13, fontWeight: 650 }}>{value}</div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, color: GOLD, borderBottom: '1px solid #E8E0D0', paddingBottom: 8 }}>Scope of Work</h3>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: '#3D3933', whiteSpace: 'pre-wrap' }}>{data.scope_narrative || 'Scope requires review.'}</p>
      </section>

      <section style={{ marginBottom: 28, overflowX: 'auto' }}>
        <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, color: GOLD, borderBottom: '1px solid #E8E0D0', paddingBottom: 8 }}>Pricing Schedule</h3>
        <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#111', color: '#fff' }}>
            {['Item', 'Description', 'Unit', 'Qty', 'Unit Price', 'Total'].map(label => <th key={label} style={{ padding: '10px 12px', textAlign: label === 'Description' || label === 'Item' ? 'left' : 'right' }}>{label}</th>)}
          </tr></thead>
          <tbody>
            {(data.line_items || []).map((item, index) => (
              <tr key={`${item.num || index}-${item.description || ''}`} style={{ borderBottom: '1px solid #EEE9DF' }}>
                <td style={{ padding: '10px 12px' }}>{item.num || String(index + 1).padStart(2, '0')}</td>
                <td style={{ padding: '10px 12px' }}>{item.description || 'Line item'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.unit || ''}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{Number(item.qty || 0).toLocaleString()}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{money(item.unit_price)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 750 }}>{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{ background: '#111', color: '#fff' }}>
            <td colSpan={5} style={{ padding: '12px', textAlign: 'right', color: '#E7CB79', fontWeight: 800 }}>TOTAL</td>
            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 850 }}>{money(data.total_price)}</td>
          </tr></tfoot>
        </table>
      </section>

      {(data.exclusions || []).length > 0 && (
        <section>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, color: GOLD, borderBottom: '1px solid #E8E0D0', paddingBottom: 8 }}>Exclusions</h3>
          <ol style={{ color: '#555', fontSize: 13, lineHeight: 1.8, paddingLeft: 22 }}>{data.exclusions?.map(item => <li key={item}>{item}</li>)}</ol>
        </section>
      )}

      <footer style={{ marginTop: 34, paddingTop: 18, borderTop: '1px solid #EEE9DF', color: '#8A857C', fontSize: 11, lineHeight: 1.6 }}>
        This is an internal draft. It is not approved for delivery until a named reviewer records a signed decision and the outbound safety gates pass.
      </footer>
    </article>
  )
}

function BidPageInner() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'text' | 'file'>(searchParams.get('mode') === 'plans' ? 'file' : 'text')
  const [company, setCompany] = useState<'ncp' | 'nep'>('ncp')
  const [jobText, setJobText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [parsedPlan, setParsedPlan] = useState<Record<string, unknown> | null>(null)
  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [queued, setQueued] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(selected: File) {
    setError('')
    if (selected.size > MAX_FILE_BYTES) {
      setError('The file exceeds the 10 MB limit.')
      return
    }
    setFile(selected)
    setParsedPlan(null)
    setParsing(true)
    try {
      const formData = new FormData()
      formData.append('file', selected)
      if (jobText) formData.append('job_context', jobText)
      const response = await fetch('/api/parse-plans', { method: 'POST', body: formData, cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || 'Plan analysis failed')
      setParsedPlan(data.takeoff)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Plan analysis failed')
    } finally {
      setParsing(false)
    }
  }

  async function generate() {
    if (!jobText.trim() && !parsedPlan) return
    setError('')
    setLoading(true)
    setProposal(null)
    setQueued(false)
    try {
      const response = await fetch('/api/takeoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_text: jobText, company, plan_data: parsedPlan || undefined }),
        cache: 'no-store'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || 'Proposal generation failed')
      setProposal(data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Proposal generation failed')
    } finally {
      setLoading(false)
    }
  }

  async function submitForReview() {
    if (!proposal) return
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/proposals/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, proposal }),
        cache: 'no-store'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || 'Queue submission failed')
      setQueued(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Queue submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setJobText('')
    setFile(null)
    setParsedPlan(null)
    setProposal(null)
    setQueued(false)
    setError('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F4', padding: 'clamp(14px,3vw,28px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,390px),1fr))', gap: 20, maxWidth: 1500, margin: '0 auto', alignItems: 'start' }}>
        <section style={{ background: '#fff', border: '1px solid #E8E3DA', borderRadius: 16, overflow: 'hidden' }}>
          <header style={{ padding: 24, borderBottom: '1px solid #EEE9DF' }}>
            <div style={{ color: GOLD, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9 }}>Protected generation</div>
            <h1 style={{ margin: '5px 0 4px', fontSize: 23 }}>New Bid Draft</h1>
            <p style={{ margin: 0, color: '#7D786F', fontSize: 12, lineHeight: 1.6 }}>Generate a structured draft, inspect it, then submit it to the signed review queue. This page cannot send proposals directly.</p>
          </header>

          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 7, background: '#F4F2EE', padding: 4, borderRadius: 10, marginBottom: 18 }}>
              {([['text', 'Type or paste'], ['file', 'Upload plans']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setMode(value)} style={{ flex: 1, padding: 9, border: 0, borderRadius: 7, cursor: 'pointer', background: mode === value ? '#fff' : 'transparent', fontWeight: 700, color: mode === value ? '#111' : '#888' }}>{label}</button>
              ))}
            </div>

            <fieldset style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
              <legend style={{ fontSize: 11, fontWeight: 750, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Brand</legend>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['ncp', 'NCP | Polishing'], ['nep', 'NEP | Resinous']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setCompany(value)} style={{ flex: 1, padding: 10, border: `2px solid ${company === value ? GOLD : '#E6E0D6'}`, borderRadius: 9, cursor: 'pointer', background: company === value ? GOLD_BG : '#fff', color: company === value ? '#7A5C12' : '#777', fontWeight: 750 }}>{label}</button>
                ))}
              </div>
            </fieldset>

            {mode === 'text' ? (
              <div>
                <label htmlFor="job-text" style={{ display: 'block', fontSize: 11, fontWeight: 750, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Project information</label>
                <select aria-label="Load a sample project" defaultValue="" onChange={event => { if (event.target.value) setJobText(event.target.value); event.target.value = '' }} style={{ width: '100%', marginBottom: 8, padding: 9, border: '1px solid #DDD6CA', borderRadius: 8, background: '#fff' }}>
                  <option value="">Load a non-customer sample</option>
                  {SAMPLES.map(sample => <option key={sample.label} value={sample.text}>{sample.label}</option>)}
                </select>
                <textarea id="job-text" maxLength={50_000} value={jobText} onChange={event => setJobText(event.target.value)} placeholder="Paste project information or describe the job. Remove unnecessary personal information." style={{ width: '100%', minHeight: 210, resize: 'vertical', border: '2px solid #E6E0D6', borderRadius: 10, padding: 13, font: 'inherit', lineHeight: 1.55, boxSizing: 'border-box' }} />
              </div>
            ) : (
              <div>
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" hidden onChange={event => { const selected = event.target.files?.[0]; if (selected) void handleFile(selected) }} />
                <button type="button" onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '34px 18px', border: `2px dashed ${file ? GOLD : '#D8D0C4'}`, borderRadius: 12, background: file ? GOLD_BG : '#FAF9F6', cursor: 'pointer' }}>
                  <strong>{parsing ? 'Reading document...' : file ? file.name : 'Choose construction document'}</strong>
                  <span style={{ display: 'block', color: '#888', fontSize: 11, marginTop: 6 }}>PDF, PNG, JPG, WEBP, or TXT. Maximum 10 MB.</span>
                </button>
                {parsedPlan && <div style={{ marginTop: 10, border: `1px solid ${GOLD}55`, background: GOLD_BG, borderRadius: 9, padding: 12, color: '#725A1C', fontSize: 12 }}>Document facts extracted. Review all quantities before submission.</div>}
                <label htmlFor="plan-notes" style={{ display: 'block', fontSize: 11, fontWeight: 750, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, margin: '14px 0 8px' }}>Additional context</label>
                <textarea id="plan-notes" maxLength={50_000} value={jobText} onChange={event => setJobText(event.target.value)} style={{ width: '100%', minHeight: 100, resize: 'vertical', border: '2px solid #E6E0D6', borderRadius: 10, padding: 13, font: 'inherit', boxSizing: 'border-box' }} />
              </div>
            )}

            {error && <div role="alert" style={{ marginTop: 12, padding: 12, border: '1px solid #F1BABA', borderRadius: 9, background: '#FFF2F2', color: '#9B2424', fontSize: 12 }}>{error}</div>}

            {!proposal ? (
              <button type="button" onClick={() => void generate()} disabled={loading || parsing || (!jobText.trim() && !parsedPlan)} style={{ width: '100%', marginTop: 16, padding: 14, border: 0, borderRadius: 11, cursor: loading ? 'wait' : 'pointer', background: loading ? '#DED9CF' : `linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, color: '#fff', fontWeight: 850 }}>
                {loading ? 'Generating protected draft...' : 'Generate Draft'}
              </button>
            ) : queued ? (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 11, background: '#EEF9EF', border: '1px solid #BFE0C3', color: '#286A32', fontSize: 12, lineHeight: 1.6 }}>
                <strong>Submitted to review queue.</strong><br />No proposal has been sent. A named reviewer must approve it before outbound becomes eligible.
                <button type="button" onClick={reset} style={{ display: 'block', width: '100%', marginTop: 12, padding: 10, border: '1px solid #A7D0AD', borderRadius: 8, background: '#fff', color: '#286A32', fontWeight: 750, cursor: 'pointer' }}>Create Another Draft</button>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <button type="button" onClick={() => void submitForReview()} disabled={submitting} style={{ width: '100%', padding: 14, border: 0, borderRadius: 11, background: `linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, color: '#fff', fontWeight: 850, cursor: submitting ? 'wait' : 'pointer' }}>
                  {submitting ? 'Submitting...' : 'Submit to Review Queue'}
                </button>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={() => setProposal(null)} style={{ flex: 1, padding: 10, border: '1px solid #DCD5C9', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Revise Input</button>
                  <button type="button" onClick={() => window.print()} style={{ flex: 1, padding: 10, border: '1px solid #DCD5C9', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Print Draft</button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section style={{ minWidth: 0 }}>
          {proposal ? <ProposalPreview data={proposal} company={company} /> : (
            <div style={{ minHeight: 520, display: 'grid', placeItems: 'center', border: `2px dashed ${GOLD}55`, borderRadius: 16, background: '#F9F8F5', padding: 30, textAlign: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#222' }}>Draft preview appears here</div>
                <p style={{ maxWidth: 420, color: '#8A857C', fontSize: 13, lineHeight: 1.7 }}>The AI extracts and structures project information. An operator must verify quantities, scope, pricing, terms, and recipient information before submitting the record to review.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default function BidPage() {
  return <Suspense fallback={<div style={{ padding: 40, color: '#777' }}>Loading protected bid workspace...</div>}><BidPageInner /></Suspense>
}
