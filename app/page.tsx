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
    <div className="wrap">
      <style>{`
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { background:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#111; }

        /* ── HEADER ── */
        .header {
          background:#fff;
          border-bottom:3px solid #F6B800;
          padding:0 48px;
          height:68px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          box-shadow:0 2px 12px rgba(0,0,0,0.07);
          position:sticky;
          top:0;
          z-index:100;
        }
        .logo { font-size:26px; font-weight:900; color:#111; letter-spacing:-0.5px; }
        .logo em { color:#F6B800; font-style:normal; }
        .logo-sub { font-size:10px; color:#aaa; letter-spacing:3px; text-transform:uppercase; }
        .header-right { display:flex; align-items:center; gap:20px; }
        .tabs { display:flex; gap:6px; }
        .tab { padding:8px 22px; border-radius:6px; border:1.5px solid #E5E7EB; background:#fff; font-weight:700; font-size:11px; cursor:pointer; color:#aaa; letter-spacing:1.5px; text-transform:uppercase; transition:all .15s; }
        .tab.on { border-color:#F6B800; background:#FFFBEB; color:#92400E; }
        .ai-badge { display:flex; align-items:center; gap:6px; }
        .dot { width:8px; height:8px; border-radius:50%; background:#22C55E; box-shadow:0 0 8px rgba(34,197,94,.6); }
        .ai-label { font-size:11px; color:#bbb; font-weight:600; letter-spacing:1px; }

        /* ── PAGE BODY ── */
        .wrap { min-height:100vh; background:#f5f5f5; }
        .page { max-width:860px; margin:0 auto; padding:48px 24px 80px; display:flex; flex-direction:column; gap:32px; }

        /* ── HERO ── */
        .hero { text-align:center; padding:16px 0 8px; }
        .hero-badge {
          display:inline-flex; align-items:center; gap:8px;
          background:#FFFBEB; border:1px solid #F6B800; border-radius:4px;
          padding:5px 16px; font-size:10px; font-weight:800;
          letter-spacing:2.5px; text-transform:uppercase; color:#92400E; margin-bottom:20px;
        }
        .hero h1 { font-size:42px; font-weight:900; line-height:1.08; letter-spacing:-1.2px; color:#111; margin-bottom:12px; }
        .hero h1 span { color:#F6B800; }
        .hero p { font-size:15px; color:#777; line-height:1.65; max-width:520px; margin:0 auto; }

        /* ── CARD ── */
        .card {
          background:#fff;
          border-radius:12px;
          border:1.5px solid #E5E7EB;
          padding:32px 36px;
          box-shadow:0 2px 12px rgba(0,0,0,0.05);
        }
        .card-label { font-size:10px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; color:#F6B800; margin-bottom:12px; }

        /* ── TEXTAREA ── */
        .textarea {
          width:100%; min-height:160px;
          background:#FAFAFA; border:1.5px solid #E5E7EB; border-radius:8px;
          padding:16px; font-size:14px; font-family:inherit; resize:vertical;
          outline:none; color:#111; line-height:1.7; transition:border-color .15s;
          margin-bottom:16px;
        }
        .textarea:focus { border-color:#F6B800; background:#fff; box-shadow:0 0 0 3px rgba(246,184,0,.1); }
        .textarea::placeholder { color:#ccc; }

        /* ── SAMPLES ── */
        .samples { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:24px; }
        .sample { font-size:12px; padding:7px 16px; border-radius:20px; border:1px solid #E5E7EB; background:#fff; cursor:pointer; color:#666; font-weight:500; transition:all .15s; }
        .sample:hover { border-color:#F6B800; color:#92400E; background:#FFFBEB; }

        /* ── GEN BUTTON ── */
        .gen-btn {
          width:100%; padding:18px;
          border-radius:8px; border:none;
          font-size:16px; font-weight:900;
          cursor:pointer; letter-spacing:-.2px;
          transition:all .2s;
          display:flex; align-items:center; justify-content:center; gap:10px;
        }
        .gen-btn.ready { background:#F6B800; color:#000; box-shadow:0 4px 16px rgba(246,184,0,.4); }
        .gen-btn.ready:hover { background:#FFCA00; transform:translateY(-1px); }
        .gen-btn.off { background:#F3F4F6; color:#bbb; cursor:not-allowed; }
        .spinner { width:18px; height:18px; border:2px solid #ddd; border-top-color:#F6B800; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* ── ALERTS ── */
        .err { background:#FEF2F2; border:1.5px solid #FECACA; border-radius:8px; padding:14px 18px; font-size:13px; color:#DC2626; }
        .ok  { background:#F0FDF4; border:1.5px solid #BBF7D0; border-radius:8px; padding:14px 18px; font-size:13px; color:#16A34A; }

        /* ── STATS GRID ── */
        .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .stat { background:#FAFAFA; border:1.5px solid #E5E7EB; border-radius:10px; padding:18px 20px; }
        .stat-lbl { font-size:9px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; color:#bbb; margin-bottom:8px; }
        .stat-val { font-size:22px; font-weight:900; color:#111; }
        .stat-val.gold { color:#F6B800; }

        /* ── ACTIONS ── */
        .actions { display:flex; gap:10px; flex-wrap:wrap; }
        .act { flex:1; min-width:130px; padding:14px 16px; border-radius:8px; border:none; font-size:13px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .15s; }
        .act.gold { background:#F6B800; color:#000; box-shadow:0 2px 8px rgba(246,184,0,.35); }
        .act.gold:hover { background:#FFCA00; }
        .act.black { background:#111; color:#fff; }
        .act.black:hover { background:#333; }
        .act.outline { background:#fff; color:#666; border:1.5px solid #E5E7EB; }
        .act.outline:hover { border-color:#999; color:#111; }

        /* ── EMAIL FORM ── */
        .email-row { display:flex; gap:10px; align-items:center; background:#FAFAFA; border:1.5px solid #E5E7EB; border-radius:8px; padding:16px 20px; }
        .email-in { flex:1; background:#fff; border:1.5px solid #E5E7EB; border-radius:6px; padding:10px 14px; font-size:14px; color:#111; outline:none; }
        .email-in:focus { border-color:#F6B800; }
        .send-btn { padding:10px 22px; background:#F6B800; border:none; border-radius:6px; font-weight:800; font-size:13px; cursor:pointer; color:#000; }
        .close-btn { background:none; border:none; color:#ccc; cursor:pointer; font-size:22px; line-height:1; }

        /* ── PROPOSAL IFRAME ── */
        .proposal-frame { width:100%; height:900px; border:none; border-radius:8px; display:block; }

        @media(max-width:640px){
          .header { padding:0 20px; }
          .page { padding:24px 16px 60px; }
          .hero h1 { font-size:30px; }
          .card { padding:24px 20px; }
          .stats { grid-template-columns:repeat(2,1fr); }
        }
      `}</style>

      {/* HEADER */}
      <header className="header">
        <div>
          <div className="logo">Bid<em>Genius</em></div>
          <div className="logo-sub">AI Proposal Engine · by XPS</div>
        </div>
        <div className="header-right">
          <div className="tabs">
            {(['ncp','nep'] as const).map(c=>(
              <button key={c} className={`tab${company===c?' on':''}`} onClick={()=>setCompany(c)}>
                {c.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="ai-badge">
            <div className="dot"/>
            <span className="ai-label">AI ONLINE</span>
          </div>
        </div>
      </header>

      {/* PAGE */}
      <div className="page">

        {/* HERO */}
        <div className="hero">
          <div className="hero-badge">⚡ {cfg.short} · AI Takeoff</div>
          <h1>Paste a job.<br/><span>Get a proposal.</span></h1>
          <p>{cfg.specialty}<br/>AI-generated in under 60 seconds.</p>
        </div>

        {/* INPUT CARD */}
        <div className="card">
          <div className="card-label">Job Description or Client Email</div>
          <textarea
            className="textarea"
            value={jobText}
            onChange={e=>setJobText(e.target.value)}
            placeholder={"Paste a client email or describe the job...\n\nExample: '2,400 sqft warehouse in Nashville. Concrete in decent shape. High gloss polished finish. Start within 2 weeks.'"}
          />

          <div style={{marginBottom:8,fontSize:10,color:'#bbb',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase'}}>Try a Sample</div>
          <div className="samples">
            {['Warehouse Polish · Atlanta','Metallic Garage · Charlotte','Restaurant Epoxy · Miami'].map((lbl,i)=>(
              <button key={i} className="sample" onClick={()=>setJobText(SAMPLE_JOBS[i])}>{lbl}</button>
            ))}
          </div>

          <button
            className={`gen-btn${loading||!jobText.trim()?' off':' ready'}`}
            onClick={generate}
            disabled={loading||!jobText.trim()}
          >
            {loading
              ? <><div className="spinner"/><span>Generating Proposal...</span></>
              : '⚡ Generate Proposal →'}
          </button>
        </div>

        {error && <div className="err">⚠ {error}</div>}
        {sent  && <div className="ok">✓ Proposal sent to client successfully.</div>}

        {/* PROPOSAL OUTPUT */}
        {proposal && (
          <>
            {/* Stats */}
            <div className="stats">
              {[
                {lbl:'Job Type',        val:(proposal.parsed?.job_type||'FLOORING').replace(/_/g,' ').toUpperCase()},
                {lbl:'Square Footage',  val:`${(proposal.parsed?.sqft||0).toLocaleString()} SF`},
                {lbl:'Proposal Total',  val:`$${(proposal.total||0).toLocaleString(undefined,{minimumFractionDigits:2})}`, gold:true},
                {lbl:'Generated In',    val:`${proposal.generation_ms||0}ms`},
              ].map(s=>(
                <div key={s.lbl} className="stat">
                  <div className="stat-lbl">{s.lbl}</div>
                  <div className={`stat-val${s.gold?' gold':''}`}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="actions">
              <button className="act gold" onClick={()=>{
                const w=window.open('','_blank')
                if(w){w.document.write(proposal.html);w.document.close();setTimeout(()=>w.print(),500)}
              }}>🖨 Print / PDF</button>
              <button className="act black" onClick={()=>setShowEmailForm(!showEmailForm)}>📧 Email Client</button>
              <button className="act outline" onClick={generate}>↻ Regenerate</button>
            </div>

            {showEmailForm && (
              <div className="email-row">
                <input className="email-in" type="email" placeholder="client@email.com" value={clientEmail} onChange={e=>setClientEmail(e.target.value)}/>
                <button className="send-btn" onClick={sendEmail} disabled={sending}>{sending?'Sending...':'Send →'}</button>
                <button className="close-btn" onClick={()=>setShowEmailForm(false)}>×</button>
              </div>
            )}

            {/* Proposal preview */}
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <iframe className="proposal-frame" srcDoc={proposal.html} title="Proposal Preview"/>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
