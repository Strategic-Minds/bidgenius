'use client'
import { useState } from 'react'

// Gold gradient divider component
const GoldBar = () => <div style={{height:3,background:'linear-gradient(90deg,#C9A84C,#E8C96A,#B8960C,#C9A84C)',margin:'0'}} />

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
    setLoading(true)
    setError('')
    setProposal(null)
    setSent(false)
    try {
      const res = await fetch('/api/takeoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_text: jobText, company })
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Generation failed')
      setProposal(data)
    } catch(e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendEmail() {
    if (!clientEmail || !proposal) return
    setSending(true)
    try {
      const res = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          proposal_html: proposal.html,
          client_email: clientEmail,
          client_name: proposal.parsed?.client_name || 'Valued Client',
          proposal_number: proposal.proposal_number,
          company
        })
      })
      const d = await res.json()
      if (d.ok) { setSent(true); setShowEmailForm(false) }
      else throw new Error(d.error)
    } catch(e: any) {
      setError(e.message)
    } finally {
      setSending(false) }
  }

  const companyConfig = {
    ncp: { name: 'National Concrete Polishing', short: 'NCP', color: '#C9A84C', specialty: 'Polished Concrete · Grind & Seal · Overlay Systems' },
    nep: { name: 'National Epoxy Pros', short: 'NEP', color: '#C9A84C', specialty: 'Epoxy Systems · Metallic · Flake · Polyaspartic' },
  }
  const cfg = companyConfig[company]

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {/* HEADER */}
      <GoldBar />
      <div style={{padding:'20px 40px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #F3F4F6'}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:'#111',letterSpacing:'-0.5px'}}>
            AI<span style={{color:'#C9A84C'}}>Takeoff</span>
            <span style={{fontSize:11,fontWeight:600,letterSpacing:'3px',textTransform:'uppercase',color:'#9CA3AF',marginLeft:12}}>by XPS</span>
          </div>
          <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>Powered by 12 years of XPS contractor intelligence</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {(['ncp','nep'] as const).map(c => (
            <button key={c} onClick={()=>setCompany(c)} style={{padding:'8px 18px',borderRadius:8,border:`2px solid ${company===c?'#C9A84C':'#E5E7EB'}`,background:company===c?'#FFF8E7':'#fff',fontWeight:700,fontSize:12,cursor:'pointer',color:company===c?'#92400E':'#6B7280',letterSpacing:'1px',textTransform:'uppercase',transition:'all 0.15s'}}>
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <GoldBar />

      <div style={{maxWidth:900,margin:'0 auto',padding:'48px 24px'}}>
        {/* HERO */}
        <div style={{textAlign:'center',marginBottom:48}}>
          <div style={{display:'inline-block',background:'#FFF8E7',border:'1px solid #C9A84C',borderRadius:20,padding:'4px 16px',fontSize:11,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'#92400E',marginBottom:16}}>
            {cfg.name} · {cfg.specialty}
          </div>
          <h1 style={{fontSize:42,fontWeight:900,color:'#111',letterSpacing:'-1.5px',lineHeight:1.1,marginBottom:16}}>
            Describe a job.<br/>
            <span style={{color:'#C9A84C'}}>Get a professional proposal.</span>
          </h1>
          <p style={{fontSize:16,color:'#6B7280',maxWidth:520,margin:'0 auto'}}>
            Paste an email, type a job description, or use a sample below.
            AI Takeoff generates a complete branded proposal in under 60 seconds.
          </p>
        </div>

        {/* INPUT CARD */}
        <div style={{border:'1.5px solid #E5E7EB',borderRadius:16,padding:'32px',marginBottom:24,boxShadow:'0 4px 24px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'#C9A84C',marginBottom:12}}>JOB DESCRIPTION OR CLIENT EMAIL</div>
          <textarea
            value={jobText}
            onChange={e=>setJobText(e.target.value)}
            placeholder="Paste a client email or describe the job... \n\nExample: 'Need a quote for 2,400 sqft warehouse floor in Nashville. Concrete is in decent shape. Want polished concrete, high gloss finish. Job needs to start within 2 weeks.'"
            style={{width:'100%',minHeight:160,border:'1.5px solid #E5E7EB',borderRadius:10,padding:'14px 16px',fontSize:14,fontFamily:'inherit',resize:'vertical',outline:'none',color:'#111',lineHeight:1.6,boxSizing:'border-box'}}
          />

          {/* Sample buttons */}
          <div style={{marginTop:12,marginBottom:20}}>
            <div style={{fontSize:11,color:'#9CA3AF',marginBottom:8,fontWeight:600,letterSpacing:'1px',textTransform:'uppercase'}}>Try a sample:</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['Warehouse Polish (Atlanta)', 'Metallic Garage (Charlotte)', 'Restaurant Epoxy (Miami)'].map((label,i) => (
                <button key={i} onClick={()=>setJobText(SAMPLE_JOBS[i])} style={{fontSize:12,padding:'6px 14px',borderRadius:20,border:'1px solid #E5E7EB',background:'#F9FAFB',cursor:'pointer',color:'#374151',fontWeight:500}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading||!jobText.trim()}
            style={{width:'100%',background:loading||!jobText.trim()?'#E5E7EB':'#111',border:'none',borderRadius:12,padding:'16px',fontSize:16,fontWeight:900,cursor:loading||!jobText.trim()?'not-allowed':'pointer',color:loading||!jobText.trim()?'#9CA3AF':'#fff',letterSpacing:'-0.3px',transition:'all 0.15s',position:'relative'}}
          >
            {loading ? (
              <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                <span style={{display:'inline-block',width:18,height:18,border:'2px solid #9CA3AF',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
                Generating proposal...
              </span>
            ) : '⚡ Generate Proposal →'}
          </button>
        </div>

        {error && (
          <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'14px 18px',marginBottom:20,fontSize:14,color:'#DC2626'}}>⚠ {error}</div>
        )}

        {/* PROPOSAL OUTPUT */}
        {proposal && (
          <div>
            {/* Stats bar */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
              {[
                {label:'JOB TYPE', value: proposal.parsed?.job_type?.replace(/_/g,' ').toUpperCase() || 'FLOORING'},
                {label:'ESTIMATED SQFT', value: (proposal.parsed?.sqft||0).toLocaleString() + ' SF'},
                {label:'PROPOSAL TOTAL', value: `$${(proposal.total||0).toLocaleString(undefined,{minimumFractionDigits:2})}`},
                {label:'GENERATED IN', value: `${proposal.generation_ms || 0}ms`},
              ].map(s=>(
                <div key={s.label} style={{border:'1px solid #E5E7EB',borderRadius:12,padding:'16px',background:'#FAFAFA'}}>
                  <div style={{fontSize:9,fontWeight:800,letterSpacing:'2px',textTransform:'uppercase',color:'#9CA3AF',marginBottom:6}}>{s.label}</div>
                  <div style={{fontSize:18,fontWeight:900,color:'#111'}}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap'}}>
              <button onClick={()=>{
                const w=window.open('','_blank')
                if(w){w.document.write(proposal.html);w.document.close();setTimeout(()=>w.print(),500)}
              }} style={{flex:1,minWidth:160,background:'#C9A84C',border:'none',borderRadius:10,padding:'13px',fontSize:14,fontWeight:800,cursor:'pointer',color:'#111'}}>
                🖨 Print / Save PDF
              </button>
              <button onClick={()=>setShowEmailForm(!showEmailForm)} style={{flex:1,minWidth:160,background:'#111',border:'none',borderRadius:10,padding:'13px',fontSize:14,fontWeight:800,cursor:'pointer',color:'#fff'}}>
                📧 Email to Client
              </button>
              <button onClick={generate} style={{flex:1,minWidth:160,background:'#fff',border:'1.5px solid #E5E7EB',borderRadius:10,padding:'13px',fontSize:14,fontWeight:700,cursor:'pointer',color:'#374151'}}>
                ↺ Regenerate
              </button>
            </div>

            {/* Email form */}
            {showEmailForm && !sent && (
              <div style={{border:'1.5px solid #C9A84C',borderRadius:12,padding:'20px',marginBottom:20,background:'#FFF8E7'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#92400E',marginBottom:10,letterSpacing:'1px',textTransform:'uppercase'}}>Send Proposal to Client</div>
                <div style={{display:'flex',gap:10}}>
                  <input type='email' value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder='client@company.com' style={{flex:1,border:'1.5px solid #E5E7EB',borderRadius:8,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none'}} />
                  <button onClick={sendEmail} disabled={sending||!clientEmail} style={{background:'#C9A84C',border:'none',borderRadius:8,padding:'10px 24px',fontSize:14,fontWeight:800,cursor:'pointer',color:'#111'}}>Send →</button>
                </div>
                <div style={{fontSize:11,color:'#92400E',marginTop:8}}>Sends from support@nationalepoxypros.com · CC: jeremy@shopxps.com</div>
              </div>
            )}

            {sent && <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'14px',marginBottom:20,fontSize:14,color:'#166534',fontWeight:600}}>✓ Proposal sent successfully to {clientEmail}</div>}

            {/* Proposal Preview */}
            <div style={{border:'1.5px solid #E5E7EB',borderRadius:12,overflow:'hidden',boxShadow:'0 8px 40px rgba(0,0,0,0.08)'}}>
              <div style={{background:'#111',padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#fff',letterSpacing:'1px'}}>PROPOSAL PREVIEW — #{proposal.proposal_number}</div>
                <div style={{fontSize:11,color:'#C9A84C',fontWeight:600}}>NO DEPOSIT REQUIRED</div>
              </div>
              <iframe
                srcDoc={proposal.html}
                style={{width:'100%',height:900,border:'none',display:'block'}}
                title='Proposal Preview'
              />
            </div>
          </div>
        )}

        {/* HOW IT WORKS — shown when no proposal yet */}
        {!proposal && !loading && (
          <div style={{borderTop:'1px solid #F3F4F6',paddingTop:40,marginTop:24}}>
            <div style={{textAlign:'center',marginBottom:32}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',color:'#9CA3AF'}}>HOW IT WORKS</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
              {[
                {step:'01',title:'Describe the Job',desc:'Paste a client email, type a job description, or use a sample. Any format works.'},
                {step:'02',title:'AI Builds the Takeoff',desc:'The engine reads 12 years of XPS scope language, wage rates, and material pricing to calculate everything automatically.'},
                {step:'03',title:'Professional Proposal',desc:'A complete branded proposal with scope, line items, exclusions, and payment terms. Print it or email it in one click.'},
              ].map(s=>(
                <div key={s.step} style={{padding:'24px',border:'1px solid #F3F4F6',borderRadius:12}}>
                  <div style={{fontSize:28,fontWeight:900,color:'#C9A84C',marginBottom:12}}>{s.step}</div>
                  <div style={{fontSize:15,fontWeight:800,color:'#111',marginBottom:8}}>{s.title}</div>
                  <div style={{fontSize:13,color:'#6B7280',lineHeight:1.7}}>{s.desc}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:32,padding:'20px 24px',background:'#F9FAFB',borderRadius:12,border:'1px solid #E5E7EB',textAlign:'center'}}>
              <div style={{fontSize:12,color:'#374151',fontWeight:600}}>Built on 12 years of XPS contractor knowledge · Scope language from the original XPS Bid Template · Premium national pricing</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:6}}>National Concrete Polishing · National Epoxy Pros · Powered by XTREME AI SYSTEMS</div>
            </div>
          </div>
        )}
      </div>
      <GoldBar />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
