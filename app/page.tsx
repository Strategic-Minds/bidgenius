'use client'
import { useState } from 'react'

type LineItem = {category:string;description:string;quantity:number;unit:string;unit_cost:number;total:number}
type Job = {client_name:string;client_email:string;client_phone:string;client_company:string;job_address:string;job_city:string;job_state:string;job_type:string;sqft_mentioned:number|null;timeline_mentioned:string;urgency_level:string;ai_confidence:number;materials_mentioned:string[]}
type Takeoff = {sqft:number;sqft_source:string;labor_hours:number;material_cost:number;subtotal:number;line_items:LineItem[]}
type Pricing = {subtotal:number;overhead_amount:number;overhead_pct:number;margin_amount:number;margin_pct:number;tax_rate:number;tax_amount:number;total:number;price_per_sqft:number}
type Result = {ok:boolean;proposal_number:string;duration_ms:number;job:Job;takeoff:Takeoff;pricing:Pricing;html:string;error?:string}

const JL:Record<string,string>={epoxy:'Epoxy Floor Coating',polished_concrete:'Polished Concrete',painting:'Painting',roofing:'Roofing',flooring:'Flooring',hvac:'HVAC',other:'General Services'}
const UR:Record<string,{bg:string;color:string;label:string}>={emergency:{bg:'#FEE2E2',color:'#DC2626',label:'🚨 Emergency'},high:{bg:'#FEF3C7',color:'#D97706',label:'⚡ High Priority'},medium:{bg:'#FEF9C3',color:'#CA8A04',label:'📋 Medium'},low:{bg:'#DCFCE7',color:'#16A34A',label:'✓ Low'}}
const CC:Record<string,{bg:string;color:string}>={material:{bg:'#DBEAFE',color:'#1D4ED8'},labor:{bg:'#F3F4F6',color:'#374151'},equipment:{bg:'#FEF3C7',color:'#D97706'},misc:{bg:'#EDE9FE',color:'#7C3AED'}}

const SAMPLE=`Hi,

I need epoxy flooring installed in my 3-car garage. The space is approximately 850 square feet. Located at 4821 W Camelback Rd, Phoenix AZ 85031.

We'd like a metallic flake finish in gray. Hoping to get this done by end of the month. Budget around $3,500–$4,500.

Thanks,
Mike Johnson
Owner, Johnson Properties LLC
mike@johnsonproperties.com
(602) 555-0142`

function cur(n:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n)}

export default function BidGenius(){
  const [view,setView]=useState<'upload'|'loading'|'review'>('upload')
  const [email,setEmail]=useState('')
  const [result,setResult]=useState<Result|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [loadMsg,setLoadMsg]=useState('Reading email...')
  const [toast,setToast]=useState<string|null>(null)
  const [showModal,setShowModal]=useState(false)
  const [sendTo,setSendTo]=useState('')
  const [sendSub,setSendSub]=useState('')

  function showToast(m:string){setToast(m);setTimeout(()=>setToast(null),4000)}

  async function generate(e:React.FormEvent){
    e.preventDefault()
    if(!email||email.trim().length<20){setError('Please paste a client email first.');return}
    setError(null);setView('loading')
    const msgs=['Reading your email...','Identifying client and job details...','Running AI takeoff calculation...','Building line items...','Calculating materials and labor...','Applying pricing rules...','Generating branded proposal...']
    let i=0;const iv=setInterval(()=>{i++;setLoadMsg(msgs[i%msgs.length])},1800)
    try{
      const res=await fetch('/api/proposal',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email_text:email.trim(),config:{labor_rate:65,material_markup_pct:25,overhead_pct:15,margin_pct:20,tax_rate:0},
          contractor:{business_name:'Xtreme Polishing Systems',email:'info@xpsxpress.com',phone:'(623) 555-0100',city:'Phoenix',state:'AZ',license_number:'ROC-298441',default_payment_terms:'50% deposit to schedule. Balance due upon completion.'}})})
      const data=await res.json() as Result
      clearInterval(iv)
      if(!data.ok)throw new Error(data.error||'Generation failed')
      setResult(data);setSendTo(data.job.client_email||'');setSendSub(`Your Project Proposal #${data.proposal_number}`);setView('review')
    }catch(err:unknown){clearInterval(iv);setError(err instanceof Error?err.message:'Something went wrong.');setView('upload')}
  }

  function download(){
    if(!result)return
    const blob=new Blob([result.html],{type:'text/html'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download=`proposal-${result.proposal_number}.html`;a.click()
    URL.revokeObjectURL(url)
    showToast('📄 Downloaded — open in browser and print to PDF')
  }

  const hdr=(right:React.ReactNode)=>(
    <div style={{borderBottom:'1px solid #E5E7EB',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#fff',zIndex:50}}>
      <span style={{fontSize:20,fontWeight:900,color:'#111',letterSpacing:'-0.5px'}}>BidGenius</span>
      {right}
    </div>
  )

  if(view==='loading')return(
    <div style={{minHeight:'100vh',background:'#fff'}}>
      {hdr(<span style={{fontSize:12,color:'#9CA3AF'}}>Working...</span>)}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh'}}>
        <div style={{width:56,height:56,border:'4px solid #F3F4F6',borderTopColor:'#FFBE00',borderRadius:'50%',animation:'spin 0.8s linear infinite',marginBottom:24}}/>
        <div style={{fontSize:18,fontWeight:700,color:'#111',marginBottom:8}}>{loadMsg}</div>
        <div style={{fontSize:13,color:'#9CA3AF'}}>AI is working — usually done in 30–60 seconds</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if(view==='review'&&result){
    const {job,takeoff,pricing}=result
    const urg=UR[job.urgency_level]||UR.low
    return(
      <div style={{minHeight:'100vh',background:'#fff'}}>
        {toast&&<div style={{position:'fixed',top:20,right:20,zIndex:200,background:'#111',color:'#fff',padding:'12px 20px',borderRadius:10,fontSize:14,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}}>{toast}</div>}
        {hdr(<span style={{background:'#DCFCE7',color:'#16A34A',fontSize:12,fontWeight:700,padding:'4px 12px',borderRadius:20}}>✓ Proposal Ready</span>)}
        <div style={{maxWidth:900,margin:'0 auto',padding:'32px 24px'}}>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28,flexWrap:'wrap',gap:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'#FFBE00',marginBottom:4}}>Proposal Ready</div>
              <div style={{fontSize:28,fontWeight:900,color:'#111',letterSpacing:'-0.5px'}}>#{result.proposal_number}</div>
              <div style={{fontSize:13,color:'#9CA3AF',marginTop:2}}>Done in {(result.duration_ms/1000).toFixed(1)}s · {takeoff.sqft.toLocaleString()} sqft · {JL[job.job_type]||job.job_type}</div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button onClick={()=>{setView('upload');setResult(null)}} style={{padding:'10px 16px',border:'1px solid #E5E7EB',borderRadius:8,background:'#fff',color:'#6B7280',fontSize:13,fontWeight:600,cursor:'pointer'}}>← Start Over</button>
              <button onClick={download} style={{padding:'10px 20px',border:'1.5px solid #111',borderRadius:8,background:'#fff',color:'#111',fontSize:13,fontWeight:700,cursor:'pointer'}}>⬇ Download</button>
              <button onClick={()=>setShowModal(true)} style={{padding:'10px 24px',background:'#FFBE00',border:'none',borderRadius:8,color:'#111',fontSize:13,fontWeight:800,cursor:'pointer'}}>Send to Client →</button>
            </div>
          </div>

          {/* Job Summary */}
          <div style={{border:'1px solid #E5E7EB',borderRadius:14,padding:'24px 28px',marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'#FFBE00',marginBottom:16}}>Job Summary</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'14px 28px',marginBottom:16}}>
              {([['Client',job.client_name||'—'],['Email',job.client_email||'—'],['Phone',job.client_phone||'—'],['Company',job.client_company||'—'],['Address',`${job.job_address||''}, ${job.job_city||''} ${job.job_state||''}`],['Job Type',JL[job.job_type]||job.job_type],['Timeline',job.timeline_mentioned||'Not specified']] as [string,string][]).map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'1px',marginBottom:2}}>{l}</div><div style={{fontSize:14,color:'#111',fontWeight:500}}>{v}</div></div>
              ))}
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{background:urg.bg,color:urg.color,fontSize:12,fontWeight:700,padding:'4px 12px',borderRadius:20}}>{urg.label}</span>
              <span style={{background:'#F3F4F6',color:'#374151',fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:20}}>{takeoff.sqft.toLocaleString()} sqft · {takeoff.sqft_source==='stated'?'Client stated':'AI estimated'}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:12,color:'#6B7280',fontWeight:600}}>AI Confidence</span>
                <div style={{width:80,height:6,background:'#F3F4F6',borderRadius:3,overflow:'hidden'}}><div style={{width:`${job.ai_confidence}%`,height:'100%',background:job.ai_confidence>=70?'#16A34A':job.ai_confidence>=40?'#D97706':'#DC2626',borderRadius:3}}/></div>
                <span style={{fontSize:12,fontWeight:700,color:'#111'}}>{job.ai_confidence}%</span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div style={{border:'1px solid #E5E7EB',borderRadius:14,marginBottom:20,overflow:'hidden'}}>
            <div style={{padding:'16px 28px',borderBottom:'1px solid #F3F4F6',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'#FFBE00'}}>Itemized Takeoff</span>
              <span style={{fontSize:12,color:'#9CA3AF'}}>{takeoff.line_items.length} items · {takeoff.labor_hours.toFixed(1)} labor hours</span>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#111'}}>{['Type','Description','Qty','Unit Price','Total'].map((h,i)=><th key={h} style={{padding:'10px 16px',fontSize:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#fff',textAlign:i>1?'right':'left'}}>{h}</th>)}</tr></thead>
              <tbody>{takeoff.line_items.map((it,idx)=>{const cat=CC[it.category]||CC.misc;return(<tr key={idx} style={{background:idx%2===0?'#fff':'#FAFAFA'}}><td style={{padding:'10px 16px'}}><span style={{background:cat.bg,color:cat.color,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:12,whiteSpace:'nowrap'}}>{it.category}</span></td><td style={{padding:'10px 16px',fontSize:13,color:'#111'}}>{it.description}</td><td style={{padding:'10px 16px',fontSize:13,color:'#555',textAlign:'right'}}>{it.quantity} {it.unit}</td><td style={{padding:'10px 16px',fontSize:13,color:'#555',textAlign:'right'}}>{cur(it.unit_cost)}</td><td style={{padding:'10px 16px',fontSize:13,fontWeight:700,color:'#111',textAlign:'right'}}>{cur(it.total)}</td></tr>)})}</tbody>
            </table>
          </div>

          {/* Pricing */}
          <div style={{border:'1px solid #E5E7EB',borderRadius:14,padding:'24px 28px',marginBottom:32}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'#FFBE00',marginBottom:20}}>Final Pricing</div>
            <div style={{maxWidth:340,marginLeft:'auto'}}>
              {([['Subtotal',pricing.subtotal],[`Overhead (${pricing.overhead_pct}%)`,pricing.overhead_amount],[`Margin (${pricing.margin_pct}%)`,pricing.margin_amount],[`Tax (${pricing.tax_rate}%)`,pricing.tax_amount]] as [string,number][]).map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F3F4F6',fontSize:14,color:'#555'}}><span>{l}</span><span>{cur(v)}</span></div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#FFBE00',borderRadius:10,padding:'14px 18px',marginTop:10}}>
                <span style={{fontSize:16,fontWeight:900,color:'#111'}}>TOTAL</span>
                <span style={{fontSize:24,fontWeight:900,color:'#111'}}>{cur(pricing.total)}</span>
              </div>
              <div style={{textAlign:'right',fontSize:12,color:'#9CA3AF',marginTop:8}}>{cur(pricing.price_per_sqft)}/sqft</div>
            </div>
          </div>
        </div>

        {showModal&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
            <div style={{background:'#fff',borderRadius:16,padding:36,width:'100%',maxWidth:480,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
              <h2 style={{fontSize:20,fontWeight:900,color:'#111',marginBottom:6}}>Send Proposal</h2>
              <p style={{fontSize:13,color:'#6B7280',marginBottom:24}}>Confirm details then send directly to your client.</p>
              <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#6B7280',marginBottom:6}}>To</label>
              <input value={sendTo} onChange={e=>setSendTo(e.target.value)} style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:8,padding:'10px 14px',fontSize:14,marginBottom:16,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
              <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#6B7280',marginBottom:6}}>Subject</label>
              <input value={sendSub} onChange={e=>setSendSub(e.target.value)} style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:8,padding:'10px 14px',fontSize:14,marginBottom:20,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
              <div style={{fontSize:12,color:'#6B7280',marginBottom:16,background:'#FEF9C3',padding:'10px 14px',borderRadius:8}}>💡 Email delivery requires RESEND_API_KEY. Download works now.</div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowModal(false)} style={{flex:1,padding:'12px',border:'1px solid #E5E7EB',borderRadius:8,background:'#fff',color:'#374151',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
                <button onClick={download} style={{flex:2,padding:'12px',background:'#FFBE00',border:'none',borderRadius:8,color:'#111',fontSize:14,fontWeight:800,cursor:'pointer'}}>⬇ Download Instead</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return(
    <div style={{minHeight:'100vh',background:'#fff'}}>
      {hdr(<span style={{background:'#FFBE00',color:'#111',fontSize:11,fontWeight:700,letterSpacing:'1px',padding:'4px 12px',borderRadius:20,textTransform:'uppercase'}}>AI Bid System · XTREME AI</span>)}
      <div style={{maxWidth:800,margin:'0 auto',padding:'48px 24px'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <div style={{display:'inline-block',background:'#FFBE00',color:'#111',fontSize:11,fontWeight:700,letterSpacing:'2px',padding:'4px 14px',borderRadius:20,textTransform:'uppercase',marginBottom:16}}>AI-Powered · Under 60 Seconds</div>
          <h1 style={{fontSize:40,fontWeight:900,color:'#111',letterSpacing:'-1.5px',lineHeight:1.1,marginBottom:12}}>Paste Email.<br/>Get a Proposal.</h1>
          <p style={{fontSize:16,color:'#6B7280',maxWidth:460,margin:'0 auto',lineHeight:1.6}}>Drop in any client bid request. AI reads it, calculates the takeoff, prices the job, and generates a complete branded proposal in under 60 seconds.</p>
        </div>

        <div style={{border:'1px solid #E5E7EB',borderRadius:16,padding:'36px',boxShadow:'0 1px 8px rgba(0,0,0,0.06)'}}>
          <form onSubmit={generate}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <label style={{fontSize:12,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6B7280'}}>Client Bid Request Email</label>
              <button type="button" onClick={()=>setEmail(SAMPLE)} style={{background:'none',border:'none',fontSize:12,color:'#FFBE00',fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Load Sample Email</button>
            </div>
            <textarea value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Paste the full email from your client here — name, address, job type, square footage, timeline, budget..."
              style={{width:'100%',minHeight:220,border:'2px solid #E5E7EB',borderRadius:10,padding:'16px 18px',fontSize:14,fontFamily:'inherit',color:'#111',resize:'vertical',outline:'none',lineHeight:1.6}}
              onFocus={e=>{e.target.style.borderColor='#FFBE00'}} onBlur={e=>{e.target.style.borderColor='#E5E7EB'}}
            />
            {error&&<div style={{marginTop:12,background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#DC2626',fontWeight:500}}>⚠ {error}</div>}
            <div style={{marginTop:20,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <button type="submit" style={{background:'#FFBE00',color:'#111',border:'none',borderRadius:10,padding:'14px 36px',fontSize:15,fontWeight:900,cursor:'pointer'}}>Generate Proposal →</button>
              <span style={{fontSize:12,color:'#9CA3AF'}}>Powered by XTREME AI · GPT-4o · ~45 seconds</span>
            </div>
          </form>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:16,marginTop:40}}>
          {[['1','Paste Email','Drop in the raw client email as received.'],['2','AI Reads It','Extracts client, address, sqft, materials, urgency.'],['3','Auto Takeoff','Calculates labor, materials, and equipment.'],['4','Proposal Done','Branded PDF ready to download or send.']].map(([s,t,d])=>(
            <div key={s} style={{padding:'20px',border:'1px solid #F3F4F6',borderRadius:12,background:'#FAFAFA'}}>
              <div style={{width:30,height:30,borderRadius:'50%',background:'#FFBE00',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:13,color:'#111',marginBottom:10}}>{s}</div>
              <div style={{fontWeight:700,fontSize:14,color:'#111',marginBottom:4}}>{t}</div>
              <div style={{fontSize:13,color:'#6B7280',lineHeight:1.5}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
