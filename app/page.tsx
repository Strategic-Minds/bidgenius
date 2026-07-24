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
        html, body { width:100%; height:100%; background:#0D0D0D; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#fff; }
        .root-wrap { min-height:100vh; display:flex; flex-direction:column; background:#0D0D0D; }

        /* ── HEADER ─────────────────────── */
        .header { width:100%; background:#111; border-bottom:1px solid #222; display:flex; align-items:center; justify-content:space-between; padding:0 40px; height:64px; flex-shrink:0; }
        .logo-text { font-size:24px; font-weight:900; letter-spacing:-0.5px; color:#fff; }
        .logo-text span { color:#F6B800; }
        .logo-sub { font-size:10px; color:#555; letter-spacing:3px; text-transform:uppercase; margin-top:2px; }
        .header-right { display:flex; align-items:center; gap:16px; }
        .company-tabs { display:flex; gap:6px; }
        .company-tab { padding:7px 20px; border-radius:6px; border:1.5px solid #333; background:transparent; font-weight:700; font-size:11px; cursor:pointer; color:#666; letter-spacing:1.5px; text-transform:uppercase; transition:all 0.15s; }
        .company-tab.active { border-color:#F6B800; background:#1C1600; color:#F6B800; }
        .status-dot { width:8px; height:8px; border-radius:50%; background:#22C55E; box-shadow:0 0 6px #22C55E; }
        .status-label { font-size:11px; color:#555; }

        /* ── GOLD RULE ───────────────────── */
        .gold-rule { height:2px; background:linear-gradient(90deg,transparent,#F6B800 20%,#F6B800 80%,transparent); flex-shrink:0; }

        /* ── MAIN LAYOUT ─────────────────── */
        .main { flex:1; display:grid; grid-template-columns:480px 1fr; min-height:0; }
        
        /* ── LEFT PANEL ──────────────────── */
        .left-panel { background:#111; border-right:1px solid #1E1E1E; display:flex; flex-direction:column; overflow-y:auto; }
        .left-inner { padding:36px 40px; flex:1; display:flex; flex-direction:column; gap:28px; }

        /* ── HERO TEXT ───────────────────── */
        .hero-badge { display:inline-flex; align-items:center; gap:8px; background:#1C1600; border:1px solid #F6B800; border-radius:4px; padding:5px 14px; font-size:10px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; color:#F6B800; width:fit-content; }
        .hero-h1 { font-size:36px; font-weight:900; line-height:1.05; letter-spacing:-1px; color:#fff; }
        .hero-h1 span { color:#F6B800; display:block; }
        .hero-sub { font-size:14px; color:#666; line-height:1.65; }

        /* ── INPUT BLOCK ─────────────────── */
        .input-label { font-size:10px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; color:#F6B800; margin-bottom:10px; }
        .job-textarea { width:100%; min-height:180px; background:#0A0A0A; border:1.5px solid #2A2A2A; border-radius:8px; padding:16px; font-size:14px; font-family:inherit; resize:vertical; outline:none; color:#E5E5E5; line-height:1.65; transition:border-color 0.15s; }
        .job-textarea:focus { border-color:#F6B800; }
        .job-textarea::placeholder { color:#444; }

        /* ── SAMPLES ─────────────────────── */
        .samples-row { display:flex; flex-wrap:wrap; gap:8px; }
        .sample-btn { font-size:11px; padding:6px 14px; border-radius:20px; border:1px solid #2A2A2A; background:#1A1A1A; cursor:pointer; color:#888; font-weight:500; transition:all 0.15s; }
        .sample-btn:hover { border-color:#F6B800; color:#F6B800; }

        /* ── GENERATE BTN ────────────────── */
        .gen-btn { width:100%; padding:18px; border-radius:8px; border:none; font-size:16px; font-weight:900; cursor:pointer; letter-spacing:-0.2px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:10px; }
        .gen-btn.ready { background:#F6B800; color:#000; }
        .gen-btn.ready:hover { background:#FFD000; transform:translateY(-1px); }
        .gen-btn.disabled { background:#1E1E1E; color:#444; cursor:not-allowed; }
        .spinner { width:18px; height:18px; border:2px solid #444; border-top-color:#F6B800; border-radius:50%; animation:spin 0.7s linear infinite; flex-shrink:0; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* ── RIGHT PANEL ─────────────────── */
        .right-panel { background:#0D0D0D; display:flex; flex-direction:column; overflow-y:auto; }
        .right-inner { padding:36px 48px; flex:1; display:flex; flex-direction:column; gap:24px; }

        /* ── EMPTY STATE ─────────────────── */
        .empty-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:60px 40px; }
        .empty-icon { font-size:64px; margin-bottom:24px; opacity:0.4; }
        .empty-h { font-size:22px; font-weight:800; color:#333; margin-bottom:12px; }
        .empty-sub { font-size:14px; color:#444; line-height:1.6; max-width:340px; }

        /* ── STATS GRID ──────────────────── */
        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .stat-card { background:#111; border:1px solid #222; border-radius:8px; padding:18px 20px; }
        .stat-label { font-size:9px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; color:#555; margin-bottom:8px; }
        .stat-value { font-size:22px; font-weight:900; color:#fff; }
        .stat-value.gold { color:#F6B800; }

        /* ── ACTIONS ─────────────────────── */
        .actions-row { display:flex; gap:10px; flex-wrap:wrap; }
        .act-btn { flex:1; min-width:140px; padding:13px 16px; border-radius:8px; border:none; font-size:13px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.15s; }
        .act-btn.primary { background:#F6B800; color:#000; }
        .act-btn.primary:hover { background:#FFD000; }
        .act-btn.dark { background:#1E1E1E; color:#fff; border:1px solid #333; }
        .act-btn.dark:hover { border-color:#F6B800; color:#F6B800; }
        .act-btn.outline { background:transparent; color:#888; border:1px solid #2A2A2A; }
        .act-btn.outline:hover { border-color:#555; color:#ccc; }

        /* ── EMAIL FORM ──────────────────── */
        .email-form { background:#111; border:1px solid #222; border-radius:8px; padding:20px 24px; display:flex; gap:10px; align-items:center; }
        .email-input { flex:1; background:#0A0A0A; border:1.5px solid #2A2A2A; border-radius:6px; padding:10px 14px; font-size:14px; color:#fff; font-family:inherit; outline:none; }
        .email-input:focus { border-color:#F6B800; }
        .send-btn { padding:10px 20px; background:#F6B800; border:none; border-radius:6px; font-weight:800; font-size:13px; cursor:pointer; color:#000; white-space:nowrap; }

        /* ── PROPOSAL FRAME ──────────────── */
        .proposal-wrap { background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,0.05); flex:1; min-height:600px; }
        .proposal-frame { width:100%; height:100%; min-height:600px; border:none; }

        /* ── ERROR ───────────────────────── */
        .error-box { background:#1C0000; border:1px solid #7F1D1D; border-radius:8px; padding:14px 18px; font-size:13px; color:#FCA5A5; }

        /* ── SUCCESS ─────────────────────── */
        .success-box { background:#042009; border:1px solid #166534; border-radius:8px; padding:14px 18px; font-size:13px; color:#86EFAC; }

        /* ── FOOTER ──────────────────────── */
        .footer { border-top:1px solid #1A1A1A; padding:12px 40px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
        .footer-left { font-size:11px; color:#3A3A3A; }
        .footer-right { font-size:11px; color:#3A3A3A; }

        @media (max-width:900px) {
          .main { grid-template-columns:1fr; }
          .left-panel { border-right:none; border-bottom:1px solid #1E1E1E; }
          .header { padding:0 20px; }
          .left-inner, .right-inner { padding:24px 20px; }
          .stats-grid { grid-template-columns:repeat(2,1fr); }
          .hero-h1 { font-size:28px; }
        }
      `}</style>

      {/* ── HEADER ── */}
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
      <div className="gold-rule"/>

      {/* ── MAIN SPLIT ── */}
      <div className="main">

        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          <div className="left-inner">
            <div>
              <div className="hero-badge">⚡ {cfg.short} · AI Takeoff</div>
              <div style={{height:16}}/>
              <h1 className="hero-h1">
                Paste a job.<br/>
                <span>Get a proposal.</span>
              </h1>
              <div style={{height:14}}/>
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
              <div style={{fontSize:10,color:'#555',marginBottom:10,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase'}}>Try a Sample</div>
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

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          {!proposal ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-h">Your proposal will appear here</div>
              <p className="empty-sub">Describe a job on the left and click Generate Proposal. AI Takeoff will build a complete professional quote in under 60 seconds.</p>
            </div>
          ) : (
            <div className="right-inner">
              {/* Stats */}
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

              {/* Actions */}
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
                  <input
                    className="email-input"
                    type="email"
                    placeholder="client@email.com"
                    value={clientEmail}
                    onChange={e=>setClientEmail(e.target.value)}
                  />
                  <button className="send-btn" onClick={sendEmail} disabled={sending}>
                    {sending ? 'Sending...' : 'Send →'}
                  </button>
                  <button onClick={()=>setShowEmailForm(false)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:20,lineHeight:1}}>×</button>
                </div>
              )}

              {/* Proposal iframe */}
              <div className="proposal-wrap">
                <iframe
                  className="proposal-frame"
                  srcDoc={proposal.html}
                  title="AI-Generated Proposal"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="gold-rule"/>
      <footer className="footer">
        <span className="footer-left">BidGenius AI · Powered by 12 years of XPS contractor intelligence</span>
        <span className="footer-right">© 2026 Strategic Minds Advisory · {cfg.name}</span>
      </footer>
    </div>
  )
}
