'use client'
import { useState, useEffect } from 'react'
const GOLD='#C9A84C',GBG='#FFF8EC'
export default function Proposals() {
  const [proposals,setProposals]=useState<any[]>([])
  const [filter,setFilter]=useState('all')
  const [preview,setPreview]=useState<any>(null)
  useEffect(()=>{try{setProposals(JSON.parse(localStorage.getItem('bidgenius_proposals')||'[]').reverse())}catch{}},[])
  const filtered=filter==='all'?proposals:proposals.filter(p=>p.company===filter)
  return(
    <div style={{padding:'36px 40px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#0A0A0A'}}>Proposals</h1>
          <p style={{margin:'4px 0 0',color:'#888',fontSize:13}}>{filtered.length} total</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          {['all','ncp','nep'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${filter===f?GOLD:'#E0D8C8'}`,background:filter===f?GBG:'#fff',color:filter===f?GOLD:'#555',fontWeight:filter===f?700:500,fontSize:13,cursor:'pointer'}}>{f==='all'?'All':f.toUpperCase()}</button>
          ))}
        </div>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'80px 0',color:'#aaa'}}>
          <div style={{fontSize:15,fontWeight:600,color:'#555',marginBottom:16}}>No proposals yet</div>
          <a href="/bid" style={{display:'inline-block',padding:'10px 22px',background:GBG,color:GOLD,borderRadius:8,textDecoration:'none',fontWeight:700,fontSize:13}}>Generate your first bid</a>
        </div>
      ):(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #EBEBEB',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#FAFAF8'}}>
              {['Proposal #','Client','Job Type','Sqft','Total','Brand','Date',''].map(h=>(
                <th key={h} style={{padding:'11px 16px',textAlign:'left',fontSize:11,fontWeight:600,color:'#999',borderBottom:'1px solid #F0EBE0',textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((p,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #F8F8F8'}}>
                  <td style={{padding:'12px 16px',fontSize:12,color:'#aaa',fontWeight:600}}>{p.proposal_number||'—'}</td>
                  <td style={{padding:'12px 16px',fontSize:13,color:'#0A0A0A',fontWeight:600}}>{p.client_name||'Unknown'}</td>
                  <td style={{padding:'12px 16px',fontSize:13,color:'#555'}}>{p.job_type||'—'}</td>
                  <td style={{padding:'12px 16px',fontSize:13,color:'#555'}}>{p.sqft?p.sqft.toLocaleString():'—'}</td>
                  <td style={{padding:'12px 16px',fontSize:13,fontWeight:700,color:'#0A0A0A'}}>{p.total?'$'+Number(p.total).toLocaleString(undefined,{minimumFractionDigits:2}):'—'}</td>
                  <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:6,background:GBG,color:GOLD}}>{(p.company||'NCP').toUpperCase()}</span></td>
                  <td style={{padding:'12px 16px',fontSize:12,color:'#aaa'}}>{p.date?new Date(p.date).toLocaleDateString():'—'}</td>
                  <td style={{padding:'12px 16px'}}><button onClick={()=>setPreview(p)} style={{padding:'5px 13px',fontSize:12,fontWeight:600,border:`1px solid ${GOLD}60`,borderRadius:6,background:GBG,color:GOLD,cursor:'pointer'}}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview&&(
        <div onClick={()=>setPreview(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,padding:28,maxWidth:480,width:'90%'}}>
            <h3 style={{margin:'0 0 16px',color:'#0A0A0A'}}>{preview.proposal_number||'Proposal'}</h3>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              {[['Client',preview.client_name],['Job',preview.job_type],['Area',preview.sqft?preview.sqft.toLocaleString()+' SF':'—'],['Total',preview.total?'$'+Number(preview.total).toLocaleString(undefined,{minimumFractionDigits:2}):'—']].map(([k,v])=>(
                <tr key={k}><td style={{padding:'7px 0',color:'#888',width:80}}>{k}</td><td style={{fontWeight:k==='Total'?700:500,color:'#0A0A0A'}}>{v}</td></tr>
              ))}
            </table>
            <button onClick={()=>setPreview(null)} style={{marginTop:20,width:'100%',padding:11,border:'1px solid #E0D8C8',borderRadius:8,cursor:'pointer',color:'#555',background:'#fff',fontWeight:600,fontSize:13}}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
