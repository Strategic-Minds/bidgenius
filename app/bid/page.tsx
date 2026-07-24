'use client'
import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const GOLD='#C9A84C', GL='#E8C96A', GBG='#FFF8EC'
const NCP_LOGO='https://media.base44.com/images/public/69db047707a15d69135e3de9/49a3239f1_NATIONALCONCRRETEPOLISHING.jpg'
const NCP_ADDR='2200 NW 32nd St #600, Pompano Beach, FL 33069'
const NCP_PHONE='(877) 661-7562'

const SAMPLES=[
  {label:'Warehouse Polish — 8,500 sqft',text:'Hi, I need a quote for polishing the concrete floors in my warehouse. It is about 8,500 square feet in Atlanta GA. The floors are in decent condition with surface scratches. We want a high gloss mirror finish.'},
  {label:'Garage Metallic Epoxy — 850 sqft',text:'We have a 3-car garage, approximately 850 sqft in Charlotte NC. Looking for metallic epoxy flooring. Want it done before end of month.'},
  {label:'Restaurant Kitchen — 1,200 sqft',text:'Need pricing for our restaurant kitchen floor, 1,200 sqft in Miami FL. Concrete is rough with grease staining and a few cracks. Need commercial grade epoxy.'},
]

const STEPS=['Parsing job details...','Running AI Takeoff Engine...','Calculating pricing...','Generating proposal...']

// 3-stage validation labels
const STAGES=['Stage 1 — AI Takeoff','Stage 2 — Review & Edit','Stage 3 — Approve & Send']

function ProposalDoc({data,company}:{data:any,company:string}) {
  if(!data) return null
  const cfg={
    ncp:{name:'National Concrete Polishing',short:'NCP',logo:NCP_LOGO},
    nep:{name:'National Epoxy Pros',short:'NEP',logo:NCP_LOGO},
  }[company]||{name:'National Concrete Polishing',short:'NCP',logo:NCP_LOGO}

  const today=new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
  const valid=new Date(Date.now()+(data.validity_days||30)*864e5).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})

  return(
    <div style={{fontFamily:'Georgia,serif',color:'#0A0A0A',background:'#fff',maxWidth:900,margin:'0 auto',padding:'48px 60px',minHeight:'100vh'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:40,paddingBottom:28,borderBottom:'3px solid #C9A84C'}}>
        <div>
          <img src={cfg.logo} alt={cfg.name} style={{height:100,width:'auto',objectFit:'contain'}}/>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:28,fontWeight:700,color:'#0A0A0A',fontFamily:'system-ui,sans-serif',letterSpacing:'-0.5px'}}>PROPOSAL</div>
          <div style={{fontSize:13,color:'#666',marginTop:6,fontFamily:'system-ui,sans-serif'}}>
            <div><strong style={{color:'#0A0A0A'}}>No.:</strong> {data.proposal_number}</div>
            <div><strong style={{color:'#0A0A0A'}}>Date:</strong> {today}</div>
            <div><strong style={{color:'#0A0A0A'}}>Valid Until:</strong> {valid}</div>
          </div>
        </div>
      </div>

      {/* Company + Client Info */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginBottom:36}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8,fontFamily:'system-ui,sans-serif'}}>Prepared By</div>
          <div style={{fontSize:15,fontWeight:700}}>{cfg.name}</div>
          <div style={{fontSize:13,color:'#555',marginTop:4,lineHeight:1.8}}>{NCP_ADDR}<br/>Tel: {NCP_PHONE}<br/>Kevin Topel, Project Manager<br/>561-757-0937 · Ext. 224</div>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8,fontFamily:'system-ui,sans-serif'}}>Prepared For</div>
          <div style={{fontSize:15,fontWeight:700}}>{data.client_name||'Client Name'}</div>
          <div style={{fontSize:13,color:'#555',marginTop:4,lineHeight:1.8}}>
            {data.client_email&&<div>{data.client_email}</div>}
            {data.job_address&&<div>{data.job_address}</div>}
            {(data.job_city||data.job_state)&&<div>{[data.job_city,data.job_state].filter(Boolean).join(', ')}</div>}
          </div>
        </div>
      </div>

      {/* Project Details Bar */}
      <div style={{background:'#0A0A0A',color:'#fff',borderRadius:8,padding:'14px 20px',marginBottom:36,display:'flex',gap:40,fontFamily:'system-ui,sans-serif'}}>
        {[
          ['System',data.job_type||'—'],
          ['Area',data.sqft?data.sqft.toLocaleString()+' SF':'—'],
          ['Finish',data.gloss_level||'—'],
          ['Duration',data.estimated_duration_days||'TBD'],
        ].map(([k,v])=>(
          <div key={k}>
            <div style={{fontSize:9,color:'#C9A84C',textTransform:'uppercase',letterSpacing:1.2,fontWeight:700}}>{k}</div>
            <div style={{fontSize:14,fontWeight:600,marginTop:2}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Scope of Work */}
      <div style={{marginBottom:36}}>
        <div style={{fontSize:12,fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:1.2,marginBottom:12,fontFamily:'system-ui,sans-serif',borderBottom:'1px solid #E8E0D0',paddingBottom:8}}>Scope of Work</div>
        <p style={{fontSize:14,lineHeight:1.9,color:'#333',margin:0}}>{data.scope_narrative||'Scope to be determined.'}</p>
      </div>

      {/* Line Items */}
      <div style={{marginBottom:36}}>
        <div style={{fontSize:12,fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:1.2,marginBottom:12,fontFamily:'system-ui,sans-serif',borderBottom:'1px solid #E8E0D0',paddingBottom:8}}>Pricing Schedule</div>
        <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'system-ui,sans-serif',fontSize:13}}>
          <thead>
            <tr style={{background:'#0A0A0A',color:'#fff'}}>
              <th style={{padding:'10px 14px',textAlign:'left',width:40}}>Item</th>
              <th style={{padding:'10px 14px',textAlign:'left'}}>Description</th>
              <th style={{padding:'10px 14px',textAlign:'center',width:50}}>Unit</th>
              <th style={{padding:'10px 14px',textAlign:'right',width:70}}>Qty</th>
              <th style={{padding:'10px 14px',textAlign:'right',width:90}}>Unit Price</th>
              <th style={{padding:'10px 14px',textAlign:'right',width:100}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(data.line_items||[]).map((li:any,i:number)=>(
              <tr key={i} style={{borderBottom:'1px solid #F0EBE0',background:i%2===0?'#fff':'#FAFAF8'}}>
                <td style={{padding:'11px 14px',color:'#aaa',fontWeight:600}}>{li.num||String(i+1).padStart(2,'0')}</td>
                <td style={{padding:'11px 14px',color:'#0A0A0A'}}>{li.description}</td>
                <td style={{padding:'11px 14px',textAlign:'center',color:'#777'}}>{li.unit}</td>
                <td style={{padding:'11px 14px',textAlign:'right',color:'#555'}}>{li.qty?.toLocaleString()}</td>
                <td style={{padding:'11px 14px',textAlign:'right',color:'#555'}}>{li.unit_price?'$'+li.unit_price.toLocaleString(undefined,{minimumFractionDigits:2}):'—'}</td>
                <td style={{padding:'11px 14px',textAlign:'right',fontWeight:600,color:'#0A0A0A'}}>{li.total?'$'+Number(li.total).toLocaleString(undefined,{minimumFractionDigits:2}):'—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {data.tax_amount>0&&<tr style={{borderTop:'1px solid #E0D8C8'}}><td colSpan={5} style={{padding:'10px 14px',textAlign:'right',color:'#777',fontFamily:'system-ui,sans-serif',fontSize:12}}>Tax ({data.tax_rate}%)</td><td style={{padding:'10px 14px',textAlign:'right',fontWeight:600}}>${Number(data.tax_amount).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>}
            <tr style={{background:'#0A0A0A'}}><td colSpan={5} style={{padding:'13px 14px',textAlign:'right',color:'#C9A84C',fontWeight:700,fontSize:14,fontFamily:'system-ui,sans-serif'}}>TOTAL CONTRACT PRICE</td><td style={{padding:'13px 14px',textAlign:'right',fontWeight:800,color:'#fff',fontSize:16,fontFamily:'system-ui,sans-serif'}}>${Number(data.total_price||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>
          </tfoot>
        </table>
      </div>

      {/* Payment Schedule */}
      {data.payment_schedule&&data.payment_schedule.length>0&&(
        <div style={{marginBottom:36}}>
          <div style={{fontSize:12,fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:1.2,marginBottom:12,fontFamily:'system-ui,sans-serif',borderBottom:'1px solid #E8E0D0',paddingBottom:8}}>Payment Schedule</div>
          <div style={{display:'flex',gap:12}}>
            {data.payment_schedule.map((ps:any,i:number)=>(
              <div key={i} style={{flex:1,background:'#FAFAF8',border:'1px solid #E8E0D0',borderRadius:8,padding:'14px 16px',fontFamily:'system-ui,sans-serif'}}>
                <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:0.5}}>{ps.stage}</div>
                <div style={{fontSize:22,fontWeight:800,color:'#0A0A0A',marginTop:4}}>{ps.pct}%</div>
                <div style={{fontSize:14,color:'#C9A84C',fontWeight:600,marginTop:2}}>{ps.amount?'$'+Number(ps.amount).toLocaleString(undefined,{minimumFractionDigits:2}):'—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exclusions */}
      <div style={{marginBottom:40}}>
        <div style={{fontSize:12,fontWeight:700,color:'#C9A84C',textTransform:'uppercase',letterSpacing:1.2,marginBottom:12,fontFamily:'system-ui,sans-serif',borderBottom:'1px solid #E8E0D0',paddingBottom:8}}>This Proposal Excludes the Following</div>
        <ol style={{margin:0,paddingLeft:20,color:'#555',fontSize:13,lineHeight:2,fontFamily:'system-ui,sans-serif'}}>
          {(data.exclusions||[]).map((ex:string,i:number)=><li key={i}>{ex}</li>)}
        </ol>
      </div>

      {/* Notes */}
      {data.notes&&<div style={{background:'#FFF8EC',border:'1px solid #E8C96A',borderRadius:8,padding:'14px 18px',marginBottom:36,fontSize:13,color:'#555',fontFamily:'system-ui,sans-serif'}}><strong>Note:</strong> {data.notes}</div>}

      {/* Signature Block */}
      <div style={{borderTop:'2px solid #C9A84C',paddingTop:32,marginTop:8}}>
        <div style={{fontSize:12,color:'#555',fontFamily:'system-ui,sans-serif',marginBottom:24,lineHeight:1.7}}>
          Person authorizing the work has agreed to the terms and conditions of this proposal including Scope of Work, Schedule, Pricing, and Payment Schedule.
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48}}>
          {['Authorized Signature','Print Name & Title'].map(label=>(
            <div key={label}>
              <div style={{borderBottom:'1px solid #0A0A0A',height:40,marginBottom:8}}/>
              <div style={{fontSize:11,color:'#888',fontFamily:'system-ui,sans-serif',textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
            </div>
          ))}
          {['Date','Company'].map(label=>(
            <div key={label}>
              <div style={{borderBottom:'1px solid #0A0A0A',height:40,marginBottom:8}}/>
              <div style={{fontSize:11,color:'#888',fontFamily:'system-ui,sans-serif',textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:36,textAlign:'center',fontSize:11,color:'#aaa',fontFamily:'system-ui,sans-serif',borderTop:'1px solid #F0EBE0',paddingTop:20}}>
        {cfg.name} · {NCP_ADDR} · {NCP_PHONE} · Generated by BidGenius AI Takeoff System
      </div>
    </div>
  )
}

function BidPageInner() {
  const searchParams=useSearchParams()
  const startMode=searchParams.get('mode')
  const [mode,setMode]=useState<'text'|'file'>(startMode==='plans'?'file':'text')
  const [stage,setStage]=useState(0) // 0=input, 1=review, 2=approve
  const [company,setCompany]=useState<'ncp'|'nep'>('ncp')
  const [jobText,setJobText]=useState('')
  const [loading,setLoading]=useState(false)
  const [stepIdx,setStepIdx]=useState(0)
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState('')
  const [clientEmail,setClientEmail]=useState('')
  const [sending,setSending]=useState(false)
  const [sent,setSent]=useState(false)
  const [file,setFile]=useState<File|null>(null)
  const [parsedPlan,setParsedPlan]=useState<any>(null)
  const [parsing,setParsing]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{
    if(!loading){setStepIdx(0);return}
    const t=setInterval(()=>setStepIdx(i=>Math.min(i+1,STEPS.length-1)),9000)
    return()=>clearInterval(t)
  },[loading])

  const handleFile=async(f:File)=>{
    setFile(f);setParsedPlan(null);setParsing(true)
    try{
      const fd=new FormData();fd.append('file',f);if(jobText)fd.append('job_context',jobText)
      const res=await fetch('/api/parse-plans',{method:'POST',body:fd})
      const d=await res.json()
      if(d.ok){
        setParsedPlan(d.takeoff)
        const t=d.takeoff
        const s=[t.project_name&&`Project: ${t.project_name}`,t.project_address&&`Address: ${t.project_address}`,t.total_sqft&&`Sqft: ${t.total_sqft.toLocaleString()}`,t.finish_system&&`System: ${t.finish_system}`,t.gloss_level&&`Gloss: ${t.gloss_level}`].filter(Boolean).join('\n')
        if(s)setJobText(prev=>(prev?prev+'\n\n':'')+`[From Plans: ${f.name}]\n`+s)
      }
    }catch{}finally{setParsing(false)}
  }

  const generate=async()=>{
    if(!jobText.trim()&&!parsedPlan)return
    setLoading(true);setError('');setData(null);setSent(false)
    try{
      const body:any={job_text:jobText,company}
      if(parsedPlan)body.plan_data=parsedPlan
      const res=await fetch('/api/takeoff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const d=await res.json()
      if(!d.ok)throw new Error(d.error||'Generation failed')
      setData(d)
      setStage(1) // auto-advance to Stage 2: Review
      try{
        const saved=JSON.parse(localStorage.getItem('bidgenius_proposals')||'[]')
        saved.push({proposal_number:d.proposal_number,client_name:d.client_name,job_type:d.job_type,sqft:d.sqft,total:d.total_price,company,date:new Date().toISOString()})
        localStorage.setItem('bidgenius_proposals',JSON.stringify(saved))
      }catch{}
    }catch(e:any){setError(e.message)}finally{setLoading(false)}
  }

  const sendProposal=async()=>{
    if(!clientEmail||!data)return
    setSending(true)
    try{
      const proposalHtml=document.getElementById('proposal-doc')?.innerHTML||''
      const res=await fetch('/api/send-proposal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proposal_html:proposalHtml,client_email:clientEmail,client_name:data.client_name||'Valued Client',proposal_number:data.proposal_number,company})})
      const d=await res.json()
      if(d.ok){setSent(true);setStage(2)}
      else throw new Error(d.error)
    }catch(e:any){setError(e.message)}finally{setSending(false)}
  }

  const stageColor=(s:number)=>s===stage?GOLD:s<stage?'#4CAF50':'#ccc'

  return(
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#F4F4F4'}}>
      {/* LEFT INPUT PANEL */}
      <div style={{width:440,minWidth:440,background:'#fff',borderRight:'1px solid #EBEBEB',display:'flex',flexDirection:'column',overflowY:'auto'}}>
        <div style={{padding:'28px 28px 24px',borderBottom:'1px solid #F0EBE0'}}>
          <h1 style={{margin:'0 0 4px',fontSize:20,fontWeight:800,color:'#0A0A0A'}}>New Bid</h1>
          <p style={{margin:0,color:'#888',fontSize:13}}>Paste an email, describe the job, or upload plans</p>
        </div>

        {/* 3-Stage Validation Bar */}
        <div style={{padding:'16px 28px',background:'#FAFAF8',borderBottom:'1px solid #F0EBE0'}}>
          <div style={{display:'flex',alignItems:'center',gap:0}}>
            {STAGES.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',flex:1}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:stage>=i?'pointer':'default'}} onClick={()=>stage>=i&&setStage(i)}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:stageColor(i),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:12,transition:'all 0.2s'}}>
                    {stage>i?<svg viewBox="0 0 24 24" width="14" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>:i+1}
                  </div>
                  <div style={{fontSize:9,fontWeight:600,color:stageColor(i),textTransform:'uppercase',letterSpacing:0.4,textAlign:'center',whiteSpace:'nowrap'}}>{['AI Takeoff','Review','Approve'][i]}</div>
                </div>
                {i<2&&<div style={{flex:1,height:2,background:stage>i?'#4CAF50':'#E8E0D0',margin:'0 6px',marginBottom:14,transition:'all 0.3s'}}/>}
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:'20px 28px',flex:1}}>
          {/* Stage 0 — Input */}
          {stage===0&&(
            <>
              <div style={{display:'flex',gap:6,marginBottom:18,background:'#F5F5F5',padding:4,borderRadius:10}}>
                {([['text','Type / Paste'],['file','Upload Plans']] as const).map(([m,label])=>(
                  <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'9px 0',border:'none',cursor:'pointer',borderRadius:7,fontSize:13,fontWeight:600,background:mode===m?'#fff':'transparent',color:mode===m?'#0A0A0A':'#888',boxShadow:mode===m?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>{label}</button>
                ))}
              </div>
              <div style={{marginBottom:18}}>
                <label style={{fontSize:11,fontWeight:700,color:'#999',textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:8}}>Brand</label>
                <div style={{display:'flex',gap:8}}>
                  {([['ncp','NCP — Polishing'],['nep','NEP — Epoxy']] as const).map(([v,label])=>(
                    <button key={v} onClick={()=>setCompany(v)} style={{flex:1,padding:'10px 0',border:`2px solid ${company===v?GOLD:'#E8E0D0'}`,borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:700,background:company===v?GBG:'#fff',color:company===v?GOLD:'#999',transition:'all 0.15s'}}>{label}</button>
                  ))}
                </div>
              </div>
              {mode==='text'?(
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <label style={{fontSize:11,fontWeight:700,color:'#999',textTransform:'uppercase',letterSpacing:0.5}}>Job Description</label>
                    <select onChange={e=>{if(e.target.value)setJobText(e.target.value);e.target.value=''}} style={{fontSize:11,border:'none',color:GOLD,background:'transparent',cursor:'pointer',fontWeight:600}}>
                      <option value="">Load sample</option>
                      {SAMPLES.map(s=><option key={s.label} value={s.text}>{s.label}</option>)}
                    </select>
                  </div>
                  <textarea value={jobText} onChange={e=>setJobText(e.target.value)} placeholder="Paste the client email or describe the job here..." style={{width:'100%',height:200,padding:14,borderRadius:10,border:`2px solid ${jobText?GOLD+'60':'#E8E0D0'}`,fontSize:14,color:'#0A0A0A',resize:'vertical',fontFamily:'inherit',lineHeight:1.6,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ):(
                <div>
                  <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f)}} onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${file?GOLD:'#D8D0C0'}`,borderRadius:12,padding:'36px 20px',textAlign:'center',cursor:'pointer',background:file?GBG:'#FAFAF8',marginBottom:12}}>
                    <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.txt" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}}/>
                    {parsing?<div style={{color:GOLD,fontWeight:600,fontSize:14}}>Reading document...</div>:file?(
                      <div>
                        <div style={{fontWeight:700,color:'#0A0A0A',fontSize:14}}>{file.name}</div>
                        <div style={{color:'#aaa',fontSize:12,marginTop:4}}>{Math.round(file.size/1024)}KB {parsedPlan?' — Plans parsed successfully':''}</div>
                      </div>
                    ):(
                      <div>
                        <div style={{fontWeight:700,color:'#0A0A0A',fontSize:14}}>Drop plans here or click to browse</div>
                        <div style={{color:'#aaa',fontSize:12,marginTop:6}}>PDF, PNG, JPG, DOCX — up to 20MB</div>
                      </div>
                    )}
                  </div>
                  {parsedPlan&&(
                    <div style={{background:GBG,border:`1px solid ${GOLD}40`,borderRadius:10,padding:14,marginBottom:12}}>
                      <div style={{fontSize:11,fontWeight:700,color:GOLD,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Plans Parsed</div>
                      {[['Project',parsedPlan.project_name],['Address',parsedPlan.project_address],['Sqft',parsedPlan.total_sqft?parsedPlan.total_sqft.toLocaleString()+' SF':null],['System',parsedPlan.finish_system]].filter(([,v])=>v).map(([k,v])=>(
                        <div key={k as string} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:'1px solid #F0E8D0'}}>
                          <span style={{color:'#888'}}>{k}</span>
                          <span style={{color:'#0A0A0A',fontWeight:600}}>{v as string}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea value={jobText} onChange={e=>setJobText(e.target.value)} placeholder="Additional notes (optional)..." style={{width:'100%',height:80,padding:12,borderRadius:10,border:'2px solid #E8E0D0',fontSize:13,color:'#0A0A0A',fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box'}}/>
                </div>
              )}
              {error&&<div style={{background:'#FFF0F0',border:'1px solid #FFD0D0',borderRadius:8,padding:12,marginTop:12,color:'#C00',fontSize:13}}>{error}</div>}
              <button onClick={generate} disabled={loading||(!jobText.trim()&&!parsedPlan)} style={{width:'100%',marginTop:16,padding:'14px 0',border:'none',cursor:'pointer',borderRadius:12,fontSize:15,fontWeight:800,background:loading?'#E8E0D0':`linear-gradient(135deg,${GOLD},${GL})`,color:loading?'#aaa':'#fff',boxShadow:loading?'none':`0 4px 16px ${GOLD}40`}}>
                {loading?STEPS[stepIdx]:'Generate Proposal'}
              </button>
              {loading&&<div style={{marginTop:10}}><div style={{height:4,background:'#F0EBE0',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:`linear-gradient(90deg,${GOLD},${GL})`,width:`${((stepIdx+1)/STEPS.length)*100}%`,transition:'width 1s ease'}}/></div><div style={{fontSize:11,color:'#aaa',marginTop:4,textAlign:'center'}}>Step {stepIdx+1} of {STEPS.length}</div></div>}
            </>
          )}

          {/* Stage 1 — Review */}
          {stage===1&&data&&(
            <div>
              <div style={{background:GBG,border:`1px solid ${GOLD}40`,borderRadius:12,padding:16,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:GOLD,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>Proposal Ready — Review Required</div>
                {[['Proposal',data.proposal_number],['Client',data.client_name],['System',data.job_type],['Area',data.sqft?data.sqft.toLocaleString()+' SF':'—'],['Total','$'+Number(data.total_price||0).toLocaleString(undefined,{minimumFractionDigits:2})]].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #F0E8D0',fontSize:13}}>
                    <span style={{color:'#888',fontWeight:500}}>{k}</span>
                    <span style={{color:'#0A0A0A',fontWeight:k==='Total'?800:600}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,color:'#888',marginBottom:12}}>Review the proposal on the right. Confirm scope, pricing, and details are correct before approving.</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setStage(0)} style={{flex:1,padding:'11px 0',border:'1px solid #E0D8C8',borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:600,color:'#555',background:'#fff'}}>Back — Revise</button>
                <button onClick={()=>setStage(2)} style={{flex:2,padding:'11px 0',border:'none',borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:800,background:`linear-gradient(135deg,${GOLD},${GL})`,color:'#fff'}}>Approve Proposal</button>
              </div>
            </div>
          )}

          {/* Stage 2 — Approve & Send */}
          {stage===2&&data&&(
            <div>
              <div style={{background:'#EFFFEF',border:'1px solid #B0DFB0',borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:'#1A6A1A',fontWeight:600}}>Proposal Approved — Ready to Send</div>
              {!sent?(
                <>
                  <div style={{fontSize:12,fontWeight:700,color:'#999',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Send to Client</div>
                  <input type="email" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder="client@email.com" style={{width:'100%',padding:'11px 14px',border:'1px solid #E0D8C8',borderRadius:8,fontSize:14,color:'#0A0A0A',marginBottom:10,boxSizing:'border-box',outline:'none'}}/>
                  <button onClick={sendProposal} disabled={sending||!clientEmail} style={{width:'100%',padding:'13px 0',border:'none',cursor:'pointer',borderRadius:10,fontSize:14,fontWeight:800,background:`linear-gradient(135deg,${GOLD},${GL})`,color:'#fff'}}>{sending?'Sending...':'Send Proposal Email'}</button>
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button onClick={()=>window.print()} style={{flex:1,padding:'10px 0',border:'1px solid #E0D8C8',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,color:'#555',background:'#fff'}}>Print / PDF</button>
                    <button onClick={()=>{const w=window.open('','_blank');if(w){w.document.write(document.getElementById('proposal-doc')?.innerHTML||'');w.document.close()}}} style={{flex:1,padding:'10px 0',border:'1px solid #E0D8C8',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,color:'#555',background:'#fff'}}>Open Full View</button>
                  </div>
                  {error&&<div style={{background:'#FFF0F0',border:'1px solid #FFD0D0',borderRadius:8,padding:12,marginTop:10,color:'#C00',fontSize:13}}>{error}</div>}
                </>
              ):(
                <div style={{textAlign:'center',padding:'24px 0'}}>
                  <div style={{fontSize:16,fontWeight:700,color:'#1A6A1A',marginBottom:8}}>Proposal Sent</div>
                  <div style={{fontSize:13,color:'#555',marginBottom:20}}>Delivered to {clientEmail}</div>
                  <button onClick={()=>{setStage(0);setData(null);setJobText('');setFile(null);setParsedPlan(null);setSent(false);setClientEmail('')}} style={{padding:'11px 24px',border:'none',borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:700,background:`linear-gradient(135deg,${GOLD},${GL})`,color:'#fff'}}>New Bid</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Proposal Preview */}
      <div style={{flex:1,overflowY:'auto',background:'#F4F4F4'}}>
        {data&&stage>0?(
          <div>
            <div style={{position:'sticky',top:0,background:'#fff',borderBottom:'1px solid #EBEBEB',padding:'12px 24px',display:'flex',gap:10,alignItems:'center',zIndex:10,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
              <div style={{flex:1,fontSize:13,fontWeight:600,color:'#0A0A0A'}}>{data.proposal_number} — {data.client_name||'Proposal Preview'}</div>
              <div style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20,background:stage===2?'#EFFFEF':GBG,color:stage===2?'#1A6A1A':GOLD}}>{STAGES[stage]}</div>
              <button onClick={()=>window.print()} style={{padding:'7px 14px',border:'1px solid #E0D8C8',borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:'#555'}}>Print</button>
            </div>
            <div style={{padding:32}}>
              <div id="proposal-doc" style={{background:'#fff',borderRadius:8,boxShadow:'0 4px 24px rgba(0,0,0,0.08)',overflow:'hidden'}}>
                <ProposalDoc data={data} company={company}/>
              </div>
            </div>
          </div>
        ):(
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',minHeight:500}}>
            <div style={{border:`2px dashed ${GOLD}60`,borderRadius:16,padding:'56px 48px',textAlign:'center',maxWidth:380}}>
              <div style={{fontSize:14,fontWeight:700,color:'#0A0A0A',marginBottom:8}}>Proposal preview will appear here</div>
              <div style={{fontSize:13,color:'#aaa',lineHeight:1.7}}>Enter job details and hit Generate.<br/>Your professional proposal renders live.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BidPage() {
  return <Suspense fallback={<div style={{padding:40,color:'#888'}}>Loading...</div>}><BidPageInner/></Suspense>
}
