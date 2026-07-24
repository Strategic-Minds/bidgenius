'use client'
import { useState } from 'react'

const SAMPLE_JOBS = [
  "Hi, I need a quote for polishing the concrete floors in my warehouse. It's about 8,500 square feet in Atlanta GA. The floors are in decent condition, just some surface scratches. We want a high gloss mirror finish.",
  "We have a 3-car garage, approximately 850 sqft in Charlotte NC. Looking for metallic epoxy flooring. Want it done before the end of the month.",
  "Need pricing for our restaurant kitchen floor, 1,200 sqft in Miami FL. Concrete is in rough shape, has some grease staining and a few cracks. We need a commercial grade epoxy system.",
]

export default function Home() {
  const [jobText, setJobText] = useState('')
  const [company, setCompany] = useState<'ncp'|'nep'>('ncp')
  const [loading, setLoading] = useState(false)
  const [proposal, setProposal] = useState<any>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [clientEmail, setClientEmail] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)

  async function generate() {
    if (!jobText.trim()) return
    setLoading(true); setError(''); setProposal(null); setSent(false)
    try {
      const res = await fetch('/api/takeoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_text: jobText, company })
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Generation failed')
      setProposal(data)
    } catch(e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function sendEmail() {
    if (!clientEmail || !proposal) return
    setSending(true)
    try {
      const res = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_html: proposal.html, client_email: clientEmail, client_name: proposal.parsed?.client_name || 'Valued Client', proposal_number: proposal.proposal_number, company })
      })
      const d = await res.json()
      if (d.ok) { setSent(true); setShowEmailForm(false) }
      else throw new Error(d.error)
    } catch(e: any) { setError(e.message) }
    finally { setSending(false) }
  }

  const cfg = {
    ncp: { name: 'National Concrete Polishing', short: 'NCP', specialty: 'Polished Concrete · Grind & Seal · Overlay Systems' },
    nep: { name: 'National Epoxy Pros', short: 'NEP', specialty: 'Epoxy Systems · Metallic · Flake · Polyaspartic' },
  }[company]

  return (
    <div className="root-wrap">
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; height:100%; background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111; overflow-x:hidden; }

        .root-wrap { min-height:100vh; display:flex; flex-direction:column; background:#ffffff; }

        /* HEADER */
        .header { width:100%; background:#ffffff; border-bottom:2px solid #F6B800; display:flex; align-items:center; justify-content:space-between; padding:0 40px; height:64px; flex-shrink:0; box-shadow:0 1px 12px rgba(0,0,0,0.06); }
        .logo-text { font-size:24px; font-weight:900; letter-spacing:-0.5px; color:#111; }
        .logo-text span { color:#F6B800; }
        .logo-sub { font-size:10px; color:#999; letter-spacing:3px; text-transform:uppercase; margin-top:1px; }
        .header-right { display:flex; align-items:center; gap:16px; }
        .company-tabs { display:flex; gap:6px; }
        .company-tab { padding:7px 20px; border-radius:6px; border:1.5px solid #E5E7EB; background:#fff; font-weight:700; font-size:11px; cursor:pointer; color:#999; letter-spacing:1.5px; text-transform:uppercase; transition:all 0.15s; }
        .company-tab.active { border-color:#F6B800; background:#FFFBEB; color:#92400E; }
        .status-dot { width:8px; height:8px; border-radius:50%; background:#22C55E; box-shadow:0 0 6px rgba(34,197,94,0.5); }
        .status-label { font-size:11px; color:#aaa; }

        /* GOLD RULE */
        .gold-rule { height:3px; background:linear-gradient(90deg,#F6B800,#FFD700,#F6B800); flex-shrink:0; }

        /* MAIN SPLIT */
        .main { flex:1; display:grid; grid-template-columns:460px 1fr; min-height:calc(100vh - 130px); }

        /* LEFT PANEL */
        .left-panel { background:#FAFAFA; border-right:1px solid #E5E7EB; display:flex; flex-direction:column; overflow-y:auto; }
        .left-inner { padding:36px 40px; flex:1; display:flex; flex-direction:column; gap:28px; }

        /* HERO */
        .hero-badge { display:inline-flex; align-items:center; gap:8px; background:#FFFBEB; border:1px solid #F6B800; border-radius:4px; padding:5px 14px; font-size:10px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; color:#92400E; width:fit-content; }
        .hero-h1 { font-size:34px; font-weight:900; line-height:1.08; letter-spacing:-0.8px; color:#111; }
        .hero-h1 span { color:#F6B800; display:block; }
        .hero-sub { font-size:14px; color:#666; line-height:1.65; }

        /* INPUT */
        .input-label { font-size:10px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; color:#F6B800; margin-bottom:10px; }
        .job-textarea { width:100%; min-height:180px; background:#fff; border:1.5px solid #E5E7EB; border-radius:8px; padding:16px; font-size:14px; font-family:inherit; resize:vertical; outline:none; color:#111; line-height:1.65; transition:border-color 0.15s; box-shadow:inset 0 1px 3px rgba(0,0,0,0.04); }
        .job-textarea:focus { border-color:#F6B800; box-shadow:0 0 0 3px rgba(246,184,0,0.12); }
        .job-textarea::placeholder { color:#bbb; }

        /* SAMPLES */
        .samples-row { display:flex; flex-wrap:wrap; gap:8px; }
        .sample-btn { font-size:11px; padding:6px 14px; border-radius:20px; border:1px solid #E5E7EB; background:#fff; cursor:pointer; color:#666; font-weight:500; transition:all 0.15s; }
        .sample-btn:hover { border-color:#F6B800; color:#92400E; background:#FFFBEB; }

        /* GENERATE BTN */
        .gen-btn { width:100%; padding:18px; border-radius:8px; border:none; font-size:16px; font-weight:900; cursor:pointer; letter-spacing:-0.2px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:10px; }
        .gen-btn.ready { background:#F6B800; color:#000; box-shadow:0 4px 14px rgba(246,184,0,0.35); }
        .gen-btn.ready:hover { background:#FFCA00; transform:translateY(-1px); box-shadow:0 6px 20px rgba(246,184,0,0.4); }
        .gen-btn.disabled { background:#F3F4F6; color:#bbb; cursor:not-allowed; }
        .spinner { width:18px; height:18px; border:2px solid #ddd; border-top-color:#F6B800; border-radius:50%; animation:spin 0.7s linear infinite; flex-shrink:0; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* RIGHT PANEL */
        .right-panel { background:#ffffff; display:flex; flex-direction:column; overflow-y:auto; }
        .right-inner { padding:36px 48px; flex:1; display:flex; flex-direction:column; gap:24px; }

        /* EMPTY STATE */
        .empty-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:80px 40px; }
        .empty-icon { font-size:72px; margin-bottom:24px; opacity:0.15; }
        .empty-h { font-size:22px; font-weight:800; color:#ccc; margin-bottom:12px; }
        .empty-sub { font-size:14px; color:#ddd; line-height:1.6; max-width:340px; }

        /* STATS GRID */
        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .stat-card { background:#fff; border:1.5px solid #E5E7EB; border-radius:10px; padding:18px 20px; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
        .stat-label { font-size:9px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; color:#bbb; margin-bottom:8px; }
        .stat-value { font-size:20px; font-weight:900; color:#111; }
        .stat-value.gold { color:#F6B800; }

        /* ACTIONS */
        .actions-row { display:flex; gap:10px; flex-wrap:wrap; }
        .act-btn { flex:1; min-width:140px; padding:13px 16px; border-radius:8px; border:none; font-size:13px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.15s; }
        .act-btn.primary { background:#F6B800; color:#000; box-shadow:0 2px 8px rgba(246,184,0,0.3); }
        .act-btn.primary:hover { background:#FFCA00; }
        .act-btn.dark { background:#111; color:#fff; }
        .act-btn.dark:hover { background:#333; }
        .act-btn.outline { background:#fff; color:#666; border:1.5px solid #E5E7EB; }
        .act-btn.outline:hover { border-color:#999; color:#111; }

        /* EMAIL FORM */
        .email-form { background:#FAFAFA; border:1.5px solid #E5E7EB; border-radius:10px; padding:20px 24px; display:flex; gap:10px; align-items:center; }
        .email-input { flex:1; background:#fff; border:1.5px solid #E5E7EB; border-radius:6px; padding:10px 14px; font-size:14px; color:#111; font-family:inherit; outline:none; }
        .email-input:focus { border-color:#F6B800; }
        .send-btn { padding:10px 20px; background:#F6B800; border:none; border-radius:6px; font-weight:800; font-size:13px; cursor:pointer; color:#000; white-space:nowrap; }

        /* PROPOSAL FRAME */
        .proposal-wrap { background:#fff; border:1.5px solid #E5E7EB; border-radius:10px; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,0.06); flex:1; min-height:600px; }
        .proposal-frame { width:100%; height:100%; min-height:600px; border:none; }

        /* ALERTS */
        .error-box { background:#FEF2F2; border:1.5px solid #FECACA; border-radius:8px; padding:14px 18px; font-size:13px; color:#DC2626; }
        .success-box { background:#F0FDF4; border:1.5px solid #BBF7D0; border-radius:8px; padding:14px 18px; font-size:13px; color:#16A34A; }

        /* FOOTER */
        .footer { border-top:1px solid #E5E7EB; padding:12px 40px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; background:#FAFAFA; }
        .footer-text { font-size:11px; color:#bbb; }

        @media (max-width:900px) {
          .main { grid-template-columns:1fr; }
          .left-panel { border-right:none; border-bottom:1px solid #E5E7EB; }
          .header { padding:0 20px; }
          .left-inner, .right-inner { padding:24px 20px; }
          .stats-grid { grid-template-columns:repeat(2,1fr); }
          .hero-h1 { font-size:26px; }
        }
      `}</style>

      {/* HEADER */}
      <header className="header">
        <div>
          <div className="logo-text">Bid<span>Genius</span></div>
          <div className="logo-sub">AI Proposal Engine · by XPS</div>
        </div>
        <div className="header-right">
          <div className="company-tabs">
            {(['ncp','nep'] as const).map(c => (
              <button key={c} className={`company-tab${company===c?' active':''}`} onClick={()=>setCompany(c)}>
                {c.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div className="status-dot"/>
            <span className="status-label">AI ONLINE</span>
          </div>
        </div>
      </header>

      {/* MAIN SPLIT */}
      <div className="main">

        {/* LEFT */}
        <div className="left-panel">
          <div className="left-inner">
            <div>
              <div className="hero-badge">⚡ {cfg.short} · AI Takeoff</div>
              <div style={{height:16}}/>
              <h1 className="hero-h1">
                Paste a job.<br/>
                <span>Get a proposal.</span>
              </h1>
              <div style={{height:12}}/>
              <p className="hero-sub">
                Describe the project or paste a client email.<br/>
                {cfg.specialty}
              </p>
            </div>

            <div>
              <div className="input-label">Job Description or Client Email</div>
              <textarea
                className="job-textarea"
                value={jobText}
                onChange={e=>setJobText(e.target.value)}
                placeholder={"Paste a client email or describe the job...\n\nExample: '2,400 sqft warehouse in Nashville. Concrete decent shape. High gloss polished finish. Start within 2 weeks.'"}
              />
            </div>

            <div>
              <div style={{fontSize:10,color:'#bbb',marginBottom:10,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase'}}>Try a Sample</div>
              <div className="samples-row">
                {['Warehouse Polish · Atlanta','Metallic Garage · Charlotte','Restaurant Epoxy · Miami'].map((label,i)=>(
                  <button key={i} className="sample-btn" onClick={()=>setJobText(SAMPLE_JOBS[i])}>{label}</button>
                ))}
              </div>
            </div>

            <button
              className={`gen-btn${loading||!jobText.trim()?' disabled':' ready'}`}
              onClick={generate}
              disabled={loading||!jobText.trim()}
            >
              {loading ? (<><div className="spinner"/><span>Generating Proposal...</span></>) : '⚡ Generate Proposal →'}
            </button>

            {error && <div className="error-box">⚠ {error}</div>}
            {sent && <div className="success-box">✓ Proposal sent to client successfully.</div>}
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-panel">
          {!proposal ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-h">Your proposal will appear here</div>
              <p className="empty-sub">Describe a job on the left and hit Generate. AI Takeoff builds a complete branded proposal in under 60 seconds.</p>
            </div>
          ) : (
            <div className="right-inner">
              <div className="stats-grid">
                {[
                  {label:'Job Type', value:(proposal.parsed?.job_type||'FLOORING').replace(/_/g,' ').toUpperCase()},
                  {label:'Square Footage', value:`${(proposal.parsed?.sqft||0).toLocaleString()} SF`},
                  {label:'Proposal Total', value:`$${(proposal.total||0).toLocaleString(undefined,{minimumFractionDigits:2})}`, gold:true},
                  {label:'Generated In', value:`${proposal.generation_ms||0}ms`},
                ].map(s=>(
                  <div key={s.label} className="stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className={`stat-value${s.gold?' gold':''}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="actions-row">
                <button className="act-btn primary" onClick={()=>{
                  const w=window.open('','_blank')
                  if(w){w.document.write(proposal.html);w.document.close();setTimeout(()=>w.print(),500)}
                }}>🖨 Print / PDF</button>
                <button className="act-btn dark" onClick={()=>setShowEmailForm(!showEmailForm)}>📧 Email Client</button>
                <button className="act-btn outline" onClick={generate}>↻ Regenerate</button>
              </div>

              {showEmailForm && (
                <div className="email-form">
                  <input className="email-input" type="email" placeholder="client@email.com" value={clientEmail} onChange={e=>setClientEmail(e.target.value)}/>
                  <button className="send-btn" onClick={sendEmail} disabled={sending}>{sending?'Sending...':'Send →'}</button>
                  <button onClick={()=>setShowEmailForm(false)} style={{background:'none',border:'none',color:'#ccc',cursor:'pointer',fontSize:22}}>×</button>
                </div>
              )}

              <div className="proposal-wrap">
                <iframe className="proposal-frame" srcDoc={proposal.html} title="AI-Generated Proposal"/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <span className="footer-text">BidGenius AI · Powered by 12 years of XPS contractor intelligence</span>
        <span className="footer-text">© 2026 Strategic Minds Advisory · {cfg.name}</span>
      </footer>
    </div>
  )
}
