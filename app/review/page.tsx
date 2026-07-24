'use client'

import { useCallback, useEffect, useState } from 'react'

type ReviewItem = {
  id: string
  proposal_number?: string
  company: 'ncp' | 'nep'
  proposal_html: string
  parsed?: Record<string, unknown>
  total?: number
  confidence?: number
  status: string
  created_at?: string
}

type Decision = 'approve' | 'revise' | 'reject'

export default function KevinReviewPage() {
  const [secret, setSecret] = useState('')
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Enter the Kevin review secret to load the queue.')
  const [selected, setSelected] = useState<ReviewItem | null>(null)
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    if (!secret) return
    setLoading(true)
    try {
      const response = await fetch('/api/pipeline/review?status=review_pending', {
        headers: { 'x-review-secret': secret },
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to load review queue')
      setItems(data.items || [])
      setSelected(current => current && (data.items || []).some((item: ReviewItem) => item.id === current.id) ? current : (data.items?.[0] || null))
      setMessage(`${data.count || 0} package${data.count === 1 ? '' : 's'} awaiting review.`)
    } catch (error) {
      setMessage(String(error))
    } finally {
      setLoading(false)
    }
  }, [secret])

  useEffect(() => {
    if (secret) void load()
  }, [secret, load])

  async function decide(decision: Decision) {
    if (!selected || !secret) return
    setLoading(true)
    try {
      const response = await fetch('/api/pipeline/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-review-secret': secret },
        body: JSON.stringify({ id: selected.id, decision, reviewer: 'Kevin Topel', notes }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'Review action failed')
      setMessage(`${selected.proposal_number || selected.id} marked ${data.status}.`)
      setNotes('')
      await load()
    } catch (error) {
      setMessage(String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', color: '#111', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>
      <header style={{ height: 68, background: '#fff', borderBottom: '3px solid #F6B800', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>Bid<span style={{ color: '#F6B800' }}>Genius</span></div>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: '#999' }}>KEVIN REVIEW COMMAND CENTER</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={secret} onChange={event => setSecret(event.target.value)} type="password" placeholder="Review secret" style={{ border: '1px solid #ddd', borderRadius: 7, padding: '10px 12px', minWidth: 220 }} />
          <button onClick={() => void load()} disabled={loading || !secret} style={{ border: 0, borderRadius: 7, background: '#111', color: '#fff', padding: '10px 16px', fontWeight: 800, cursor: 'pointer' }}>{loading ? 'Working...' : 'Refresh'}</button>
        </div>
      </header>

      <section style={{ maxWidth: 1500, margin: '0 auto', padding: 24 }}>
        <div style={{ background: '#FFF8E7', border: '1px solid #F6B800', borderRadius: 9, padding: '12px 16px', marginBottom: 18, fontSize: 13 }}>{message}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.length === 0 && <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 22, color: '#777' }}>No packages are waiting for review.</div>}
            {items.map(item => {
              const active = selected?.id === item.id
              return (
                <button key={item.id} onClick={() => setSelected(item)} style={{ textAlign: 'left', background: active ? '#FFF8E7' : '#fff', border: `1.5px solid ${active ? '#F6B800' : '#e5e7eb'}`, borderRadius: 10, padding: 16, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
                    <strong>{item.proposal_number || item.id.slice(0, 8)}</strong>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#92400E' }}>{item.company.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{String(item.parsed?.client_company || item.parsed?.client_name || item.parsed?.job_city || 'Bid package')}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#777', fontSize: 12 }}>
                    <span>{item.total ? `$${item.total.toLocaleString()}` : 'Price pending'}</span>
                    <span>{item.confidence ? `${item.confidence}% confidence` : 'Review required'}</span>
                  </div>
                </button>
              )
            })}
          </aside>

          <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', minHeight: 700 }}>
            {!selected ? (
              <div style={{ padding: 40, color: '#777' }}>Select a bid package to review.</div>
            ) : (
              <>
                <div style={{ padding: 18, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#999', letterSpacing: 1.5 }}>PROPOSAL</div>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{selected.proposal_number || selected.id}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => void decide('reject')} disabled={loading} style={{ border: '1px solid #ef4444', color: '#b91c1c', background: '#fff', borderRadius: 7, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}>Reject</button>
                    <button onClick={() => void decide('revise')} disabled={loading} style={{ border: '1px solid #d97706', color: '#92400E', background: '#fff', borderRadius: 7, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}>Request Revision</button>
                    <button onClick={() => void decide('approve')} disabled={loading} style={{ border: 0, color: '#000', background: '#F6B800', borderRadius: 7, padding: '10px 18px', fontWeight: 900, cursor: 'pointer' }}>Approve for Send</button>
                  </div>
                </div>
                <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
                  <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Kevin's review notes, pricing corrections, assumptions, or revision instructions..." style={{ width: '100%', minHeight: 80, resize: 'vertical', border: '1px solid #ddd', borderRadius: 8, padding: 12, fontFamily: 'inherit' }} />
                </div>
                <iframe title="Proposal preview" srcDoc={selected.proposal_html} style={{ width: '100%', height: 950, border: 0, background: '#fff' }} />
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
