import {
  contractorSelectionWeights,
  nationalStates,
  promotionRules,
  subcontractorLifecycle
} from '@/lib/national.mjs'

const GOLD = '#C9A84C'
const regions = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West'] as const

function Card({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E9E4D8', borderRadius: 14, padding: 20 }}>
      <div style={{ color: '#7A7468', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</div>
      <div style={{ color: '#111', fontSize: 30, fontWeight: 850, marginTop: 6 }}>{value}</div>
      <div style={{ color: '#8D887E', fontSize: 12, marginTop: 4 }}>{note}</div>
    </div>
  )
}

export default function NationalOperationsPage() {
  return (
    <div style={{ padding: 'clamp(20px,4vw,40px)', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: GOLD, fontWeight: 800, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' }}>XTREME AI SYSTEMS</div>
        <h1 style={{ margin: '6px 0', fontSize: 'clamp(25px,4vw,30px)', letterSpacing: -0.8 }}>National Contractor Operations</h1>
        <p style={{ margin: 0, color: '#777', maxWidth: 780, lineHeight: 1.6 }}>
          One governed 50-state layer built on the existing BidGenius contractor and opportunity source tables. Scraped records remain candidates until identity, consent, compliance, capacity and approval gates pass.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
        <Card title="State lanes" value="50" note="Commercial and government" />
        <Card title="Source authority" value="1" note="Canonical BidGenius tables" />
        <Card title="Promotion mode" value="Gated" note="No automatic assignment" />
        <Card title="Outbound mode" value="Off" note="Approval receipt required" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 20, alignItems: 'start' }}>
        <section style={{ background: '#fff', border: '1px solid #E9E4D8', borderRadius: 14, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #EEE9DF' }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>50-State Registry</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap: 10, padding: 16 }}>
            {regions.map(region => {
              const states = nationalStates.filter(state => state.region === region)
              return (
                <div key={region} style={{ border: '1px solid #F0ECE4', borderRadius: 12, padding: 14, background: '#FCFBF8', minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{region} · {states.length}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {states.map(state => (
                      <span key={state.code} title={state.name} style={{ border: `1px solid ${GOLD}55`, background: '#FFF9EC', color: '#6E571C', borderRadius: 7, padding: '4px 7px', fontSize: 11, fontWeight: 750 }}>
                        {state.code}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section style={{ background: '#fff', border: '1px solid #E9E4D8', borderRadius: 14, padding: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 15 }}>Promotion Guardrails</h2>
            {promotionRules.map(rule => (
              <div key={rule} style={{ display: 'flex', gap: 9, marginBottom: 10, color: '#59554E', fontSize: 12, lineHeight: 1.5 }}>
                <span style={{ color: GOLD, fontWeight: 900 }}>✓</span><span>{rule}</span>
              </div>
            ))}
          </section>

          <section style={{ background: '#fff', border: '1px solid #E9E4D8', borderRadius: 14, padding: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 15 }}>Contractor Selection Model</h2>
            {Object.entries(contractorSelectionWeights).map(([label, weight]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: '#68635B', marginBottom: 4 }}>
                  <span>{label.replace(/([A-Z])/g, ' $1')}</span><b>{Math.round(weight * 100)}%</b>
                </div>
                <div style={{ height: 5, borderRadius: 999, background: '#EEEAE0', overflow: 'hidden' }}>
                  <div style={{ width: `${weight * 100}%`, height: '100%', background: GOLD }} />
                </div>
              </div>
            ))}
          </section>

          <section style={{ background: '#111', color: '#fff', borderRadius: 14, padding: 18 }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 15 }}>Subcontractor Lifecycle</h2>
            <div style={{ color: '#D5D1C8', fontSize: 11, lineHeight: 1.7, overflowWrap: 'anywhere' }}>
              {subcontractorLifecycle.join(' → ')}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
