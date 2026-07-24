'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
const GOLD='#C9A84C', GL='#E8C96A', GBG='#FFF8EC'
export default function Dashboard() {
  const [proposals,setProposals]=useState<any[]>([])
  const [time,setTime]=useState('')
  useEffect(()=>{
    try{const s=JSON.parse(localStorage.getItem('bidgenius_proposals')||'[]');setProposals(s)}catch{}
    const tick=()=>setTime(new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}))
    tick();const t=setInterval(tick,60000);return()=>clearInterval(t)
  },[])
  const week=proposals.filter(p=>{if(!p.date)return false;return(new Date().getTime()-new Date(p.date).getTime())/(864e5)<=7})
  const avg=proposals.length?Math.round(proposals.reduce((s,p)=>s+(p.total||0),0)/proposals.length):0
  const hr=new Date().getHours()
  const greeting=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening'
  const stats=[
    {label:'Total Proposals',value:proposals.length.toString(),sub:'all time'},
    {label:'This Week',value:week.length.toString(),sub:'last 7 days'},
    {label:'Avg Value',value:avg?'$'+avg.toLocaleString():'—',sub:'per proposal'},
    {label:'Hours Saved',value:(proposals.length*2.5).toFixed(0)+'h',sub:'vs manual bidding'},
  ]
  return(
    <div style={{padding:'36px 40px',maxWidth:1200,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:32}}>
        <div>
          <h1 style={{margin:0,fontSize:28,fontWeight:800,color:'#0A0A0A',letterSpacing:'-0.5px'}}>{greeting}, Kevin</h1>
          <p style={{margin:'4px 0 0',color:'#888',fontSize:14}}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · {time}</p>
        </div>
        <Link href="/bid" style={{display:'inline-flex',alignItems:'center',gap:8,background:`linear-gradient(135deg,${GOLD},${GL})`,color:'#fff',padding:'13px 26px',borderRadius:12,textDecoration:'none',fontWeight:700,fontSize:15,boxShadow:`0 4px 16px ${GOLD}40`,letterSpacing:'0.2px'}}>
          + New Bid
        </Link>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:32}}>
        {stats.map(s=>(
          <div key={s.label} style={{background:'#fff',borderRadius:14,padding:'22px 24px',border:'1px solid #EBEBEB',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:30,fontWeight:800,color:'#0A0A0A',letterSpacing:'-0.5px'}}>{s.value}</div>
            <div style={{fontSize:13,fontWeight:600,color:'#333',marginTop:4}}>{s.label}</div>
            <div style={{fontSize:11,color:'#aaa',marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:24}}>
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #EBEBEB',overflow:'hidden'}}>
          <div style={{padding:'18px 24px',borderBottom:'1px solid #F0EBE0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h2 style={{margin:0,fontSize:15,fontWeight:700,color:'#0A0A0A'}}>Recent Proposals</h2>
            <Link href="/proposals" style={{fontSize:13,color:GOLD,textDecoration:'none',fontWeight:600}}>View all</Link>
          </div>
          {proposals.length===0?(
            <div style={{padding:'56px 24px',textAlign:'center'}}>
              <div style={{fontSize:13,color:'#aaa',marginBottom:16}}>No proposals yet</div>
              <Link href="/bid" style={{display:'inline-block',padding:'10px 20px',background:GBG,color:GOLD,borderRadius:8,textDecoration:'none',fontWeight:600,fontSize:13}}>Generate your first bid</Link>
            </div>
          ):(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#FAFAF8'}}>
                {['Proposal #','Client','Job Type','Sqft','Total','Brand','Date'].map(h=>(
                  <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:600,color:'#999',borderBottom:'1px solid #F0EBE0',textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {proposals.slice(-5).reverse().map((p,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #F8F8F8'}}>
                    <td style={{padding:'12px 16px',fontSize:12,color:'#aaa',fontWeight:600}}>{p.proposal_number||'—'}</td>
                    <td style={{padding:'12px 16px',fontSize:13,color:'#0A0A0A',fontWeight:600}}>{p.client_name||'Unknown'}</td>
                    <td style={{padding:'12px 16px',fontSize:13,color:'#555'}}>{p.job_type||'—'}</td>
                    <td style={{padding:'12px 16px',fontSize:13,color:'#555'}}>{p.sqft?p.sqft.toLocaleString():'—'}</td>
                    <td style={{padding:'12px 16px',fontSize:13,fontWeight:700,color:'#0A0A0A'}}>{p.total?'$'+p.total.toLocaleString():'—'}</td>
                    <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:6,background:GBG,color:GOLD}}>{(p.company||'NCP').toUpperCase()}</span></td>
                    <td style={{padding:'12px 16px',fontSize:12,color:'#aaa'}}>{p.date?new Date(p.date).toLocaleDateString():'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #EBEBEB',padding:20}}>
            <h3 style={{margin:'0 0 14px',fontSize:12,fontWeight:700,color:'#0A0A0A',textTransform:'uppercase',letterSpacing:0.6}}>System Status</h3>
            {[['AI Takeoff Engine','Online'],['PDF Plan Reader','Online'],['Gmail Auto-Pilot','Paused'],['SE Lead Scraper','Active']].map(([l,s])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #F8F8F8'}}>
                <span style={{fontSize:13,color:'#555'}}>{l}</span>
                <span style={{fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:20,background:s==='Online'||s==='Active'?'#EFFFEF':'#FFF8E0',color:s==='Online'||s==='Active'?'#2A8A2A':'#B87A00'}}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #EBEBEB',padding:20}}>
            <h3 style={{margin:'0 0 14px',fontSize:12,fontWeight:700,color:'#0A0A0A',textTransform:'uppercase',letterSpacing:0.6}}>Quick Actions</h3>
            {[{href:'/bid',label:'Generate New Bid',primary:true},{href:'/bid?mode=plans',label:'Upload PDF Plans'},{href:'/proposals',label:'View All Proposals'}].map(a=>(
              <Link key={a.href} href={a.href} style={{display:'block',padding:'10px 14px',borderRadius:8,marginBottom:6,textDecoration:'none',fontSize:13,fontWeight:a.primary?700:500,background:a.primary?`linear-gradient(135deg,${GOLD},${GL})`:GBG,color:a.primary?'#fff':GOLD}}>{a.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
