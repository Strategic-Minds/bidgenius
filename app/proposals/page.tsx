import Link from 'next/link'
import { selectRows, storeConfigured } from '@/lib/pipeline/store'
import type { FulfillmentRecord } from '@/lib/pipeline/types'

const GOLD = '#C9A84C'
const GOLD_BG = '#FFF8EC'

interface StoredFulfillment extends FulfillmentRecord {
  id: string
  created_at?: string
  updated_at?: string
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export default async function ProposalsPage() {
  const protectedUi = process.env.ADMIN_UI_AUTH_ENABLED === 'true'
  if (!protectedUi) {
    return (
      <div style={{ padding: 'clamp(24px,5vw,54px)', maxWidth: 820, margin: '0 auto' }}>
        <div style={{ background: '#111', color: '#fff', borderRadius: 16, padding: 28 }}>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Workspace locked</div>
          <h1 style={{ margin: '8px 0', fontSize: 26 }}>Proposal records require administrative authentication</h1>
          <p style={{ color: '#C9C5BC', lineHeight: 1.7, fontSize: 13 }}>
            Client names, project locations, pricing, and review status are protected operational data. Enable the approved administrative authentication layer before this page reads proposal records.
          </p>
          <Link href="/settings" style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', borderRadius: 9, background: GOLD_BG, color: '#6D571C', textDecoration: 'none', fontWeight: 750, fontSize: 12 }}>View configuration posture</Link>
        </div>
      </div>
    )
  }

  let rows: StoredFulfillment[] = []
  let error = ''
  if (!storeConfigured()) {
    error = 'Database is not configured.'
  } else {
    try {
      rows = await selectRows<StoredFulfillment>('bidgenius_fulfillments', 'order=created_at.desc', 100)
    } catch {
      error = 'Proposal records are temporarily unavailable.'
    }
  }

  return (
    <div style={{ padding: 'clamp(20px,4vw,40px)', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Protected records</div>
          <h1 style={{ margin: '6px 0 2px', fontSize: 26 }}>Proposal Review Workspace</h1>
          <p style={{ margin: 0, color: '#888', fontSize: 12 }}>{rows.length} most recent records, server-side only</p>
        </div>
        <Link href="/bid" style={{ background: GOLD_BG, color: '#755B18', border: `1px solid ${GOLD}55`, borderRadius: 9, padding: '10px 15px', textDecoration: 'none', fontWeight: 750, fontSize: 12 }}>Create Draft</Link>
      </div>

      {error ? (
        <div role="alert" style={{ padding: 18, borderRadius: 12, background: '#FFF2F2', border: '1px solid #F1BABA', color: '#922B2B' }}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '70px 24px', border: '1px dashed #D7CDBB', borderRadius: 14, textAlign: 'center', background: '#FAF9F6' }}>
          <div style={{ fontWeight: 750, color: '#444' }}>No proposal records are available</div>
          <p style={{ color: '#888', fontSize: 12 }}>Generate a draft and submit it to the review queue.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E9E4D8', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#FAF9F6' }}>
              {['Proposal', 'Client', 'System', 'Total', 'Brand', 'Status', 'Created'].map(label => (
                <th key={label} style={{ padding: '12px 15px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: '#8C867C', borderBottom: '1px solid #EEE9DF' }}>{label}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map(row => {
                const parsed = row.parsed || {}
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #F2EEE7' }}>
                    <td style={{ padding: '12px 15px', fontSize: 12, fontWeight: 750 }}>{row.proposal_number || 'Pending'}</td>
                    <td style={{ padding: '12px 15px', fontSize: 12 }}>{text(parsed.client_name) || 'Not provided'}</td>
                    <td style={{ padding: '12px 15px', fontSize: 12, color: '#666' }}>{text(parsed.job_type) || 'Unclassified'}</td>
                    <td style={{ padding: '12px 15px', fontSize: 12, fontWeight: 750 }}>{Number(row.total || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td style={{ padding: '12px 15px' }}><span style={{ fontSize: 10, fontWeight: 800, background: GOLD_BG, color: '#755B18', borderRadius: 6, padding: '4px 8px' }}>{row.company.toUpperCase()}</span></td>
                    <td style={{ padding: '12px 15px', fontSize: 11, fontWeight: 750 }}>{row.status.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '12px 15px', fontSize: 11, color: '#888' }}>{row.created_at ? new Date(row.created_at).toLocaleString('en-US') : 'Unavailable'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 18, color: '#8A857C', fontSize: 11, lineHeight: 1.6 }}>
        This page does not approve or send proposals. Decisions are recorded through the authenticated review workflow, and delivery requires a valid signature, suppression check, idempotency check, and enabled outbound gate.
      </div>
    </div>
  )
}
