import Link from 'next/link'
import { getNationalOverview } from '@/lib/national/server'
import { countRows, storeConfigured } from '@/lib/pipeline/store'
import { readinessReport } from '@/lib/system/config'

const GOLD = '#C9A84C'
const GOLD_LIGHT = '#E8C96A'
const GOLD_BG = '#FFF8EC'

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '22px 24px', border: '1px solid #EBEBEB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 30, fontWeight: 850, color: '#0A0A0A', letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{note}</div>
    </div>
  )
}

export default async function Dashboard() {
  const [overview, readiness, fulfillmentCount] = await Promise.all([
    getNationalOverview(),
    Promise.resolve(readinessReport()),
    storeConfigured() ? countRows('bidgenius_fulfillments').catch(() => 0) : Promise.resolve(0)
  ])

  const contractorCount = overview.ok && 'contractors' in overview ? overview.contractors.candidates : 0
  const opportunityCount = overview.ok && 'opportunities' in overview ? overview.opportunities.total : 0
  const reviewPending = overview.ok && 'approvals' in overview ? overview.approvals.review_pending : 0
  const checkedAt = overview.checked_at ? new Date(overview.checked_at).toLocaleString('en-US') : 'Unavailable'

  const services = [
    ['Database', readiness.config.database],
    ['Pipeline authentication', readiness.config.pipelineAuth],
    ['Review authentication', readiness.config.reviewAuth],
    ['XTREME-SCRAPER bridge', readiness.config.scraperBridge && readiness.config.scraperBridgeAuth],
    ['Outbound provider', readiness.config.outboundProvider]
  ] as const

  return (
    <div style={{ padding: 'clamp(20px,4vw,40px)', maxWidth: 1220, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>XTREME AI SYSTEMS</div>
          <h1 style={{ margin: '6px 0', fontSize: 30, fontWeight: 850, color: '#0A0A0A', letterSpacing: -0.7 }}>BidGenius Command Center</h1>
          <p style={{ margin: 0, color: '#777', fontSize: 13 }}>Canonical ingestion, guarded fulfillment, signed approvals, and national contractor operations.</p>
        </div>
        <Link href="/bid" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, color: '#fff', padding: '13px 26px', borderRadius: 12, textDecoration: 'none', fontWeight: 750, fontSize: 14, boxShadow: `0 4px 16px ${GOLD}40` }}>
          + New Bid
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 16, marginBottom: 26 }}>
        <Metric label="Contractor Candidates" value={contractorCount.toLocaleString()} note="Canonical discovered records" />
        <Metric label="Bid Opportunities" value={opportunityCount.toLocaleString()} note="Canonical opportunity records" />
        <Metric label="Review Queue" value={reviewPending.toLocaleString()} note="Awaiting authorized decision" />
        <Metric label="Fulfillments" value={fulfillmentCount.toLocaleString()} note="All proposal fulfillment records" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 20 }}>
        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #EBEBEB', padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 15 }}>Operating Posture</h2>
            <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '4px 9px', background: readiness.ok ? '#EEF9EF' : '#FFF0E8', color: readiness.ok ? '#287A35' : '#9A4C25' }}>
              {readiness.status.toUpperCase()}
            </span>
          </div>
          {services.map(([label, configured]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid #F4F1EA' }}>
              <span style={{ fontSize: 13, color: '#555' }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 750, color: configured ? '#287A35' : '#9A6A17' }}>{configured ? 'Configured' : 'Required'}</span>
            </div>
          ))}
          <div style={{ color: '#999', fontSize: 10, marginTop: 14 }}>Metrics checked: {checkedAt}</div>
        </section>

        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #EBEBEB', padding: 22 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 15 }}>Execution Gates</h2>
          {[
            ['Pipeline execution', readiness.config.gates.pipelineExecutionEnabled],
            ['Outbound delivery', readiness.config.gates.outboundEnabled],
            ['Administrative UI auth', readiness.config.gates.adminUiAuthEnabled]
          ].map(([label, enabled]) => (
            <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid #F4F1EA' }}>
              <span style={{ fontSize: 13, color: '#555' }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '3px 8px', background: enabled ? '#EEF9EF' : '#F2F0EB', color: enabled ? '#287A35' : '#716C63' }}>{enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          ))}
          <p style={{ color: '#777', fontSize: 11, lineHeight: 1.6, margin: '14px 0 0' }}>
            Disabled execution is safe mode. Scheduled routes return their plan without invoking scraper, feed, AI, or email providers.
          </p>
        </section>

        <section style={{ background: '#111', color: '#fff', borderRadius: 14, padding: 22 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 15 }}>Operator Actions</h2>
          {[
            { href: '/bid', label: 'Create a protected bid' },
            { href: '/proposals', label: 'Review proposal workspace' },
            { href: '/national', label: 'Open national operations' },
            { href: '/settings', label: 'View configuration posture' }
          ].map(action => (
            <Link key={action.href} href={action.href} style={{ display: 'block', textDecoration: 'none', color: '#F4E4B4', background: '#1B1B1B', border: '1px solid #2D2D2D', borderRadius: 9, padding: '11px 12px', marginBottom: 8, fontSize: 12, fontWeight: 700 }}>
              {action.label}
            </Link>
          ))}
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: GOLD_BG, color: '#6D571C', fontSize: 11, lineHeight: 1.55 }}>
            Production deployment, database migration, secret changes, and live outbound remain separate approval gates.
          </div>
        </section>
      </div>
    </div>
  )
}
