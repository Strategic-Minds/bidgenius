'use client'
import { useState, useEffect } from 'react'
const GOLD='#C9A84C',GL='#E8C96A',GBG='#FFF8EC'
const defaults={business_name:'National Concrete Polishing',contact_name:'Kevin Topel',email:'ktopel@xtremepolishingsystems.com',phone:'561-757-0937',address:'2200 NW 32nd St #600',city:'Pompano Beach',state:'FL',zip:'33069',default_company:'ncp',labor_rate:65,material_markup:25,overhead:15,margin:20,payment_terms:'Net 30',validity_days:30}
export default function Settings() {
  const [s,setS]=useState(defaults)
  const [saved,setSaved]=useState(false)
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem('bidgenius_settings')||'{}');if(Object.keys(v).length)setS(p=>({...p,...v}))}catch{}},[])
  const save=()=>{localStorage.setItem('bidgenius_settings',JSON.stringify(s));setSaved(true);setTimeout(()=>setSaved(false),2500)}
  const F=({label,field,type='text'}:{label:string,field:string,type?:string})=>(
    <div style={{marginBottom:16}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'#777',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <input type={type} value={(s as any)[field]} onChange={e=>setS(p=>({...p,[field]:type==='number'?Number(e.target.value):e.target.value}))} style={{width:'100%',padding:'10px 14px',border:'1px solid #E0D8C8',borderRadius:8,fontSize:14,color:'#0A0A0A',boxSizing:'border-box' as any,outline:'none'}}/>
    </div>
  )
  const base=3500,mat=base*(1+s.material_markup/100),oh=mat*(1+s.overhead/100),final=oh/(1-s.margin/100)
  return(
    <div style={{padding:'36px 40px',maxWidth:940}}>
      <h1 style={{margin:'0 0 8px',fontSize:24,fontWeight:800,color:'#0A0A0A'}}>Settings</h1>
      <p style={{margin:'0 0 32px',color:'#888',fontSize:13}}>Contractor profile and default pricing</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:28}}>
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #EBEBEB',padding:24}}>
          <h2 style={{margin:'0 0 20px',fontSize:15,fontWeight:700,color:'#0A0A0A'}}>Business Info</h2>
          <F label="Business Name" field="business_name"/>
          <F label="Contact Name" field="contact_name"/>
          <F label="Email" field="email"/>
          <F label="Phone" field="phone"/>
          <F label="Address" field="address"/>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:8}}><F label="City" field="city"/><F label="State" field="state"/><F label="Zip" field="zip"/></div>
        </div>
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #EBEBEB',padding:24}}>
          <h2 style={{margin:'0 0 20px',fontSize:15,fontWeight:700,color:'#0A0A0A'}}>Pricing Defaults</h2>
          <F label="Labor Rate ($/hr)" field="labor_rate" type="number"/>
          <F label="Material Markup (%)" field="material_markup" type="number"/>
          <F label="Overhead (%)" field="overhead" type="number"/>
          <F label="Margin (%)" field="margin" type="number"/>
          <F label="Payment Terms" field="payment_terms"/>
          <F label="Quote Valid (days)" field="validity_days" type="number"/>
          <div style={{background:GBG,border:`1px solid ${GOLD}40`,borderRadius:10,padding:14,marginTop:8}}>
            <div style={{fontSize:11,fontWeight:700,color:GOLD,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>Sample: 1,000 SF at $3.50 base</div>
            {[['Base cost','$3,500'],['w/ Material Markup','$'+mat.toFixed(0)],['w/ Overhead','$'+oh.toFixed(0)],['Final Price','$'+final.toFixed(0)]].map(([k,v],i)=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'4px 0',borderBottom:i<3?'1px solid #F0E8D0':'none'}}>
                <span style={{color:'#888'}}>{k}</span>
                <span style={{fontWeight:i===3?800:500,color:i===3?'#0A0A0A':'#555',fontSize:i===3?15:12}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button onClick={save} style={{marginTop:24,padding:'13px 36px',border:'none',cursor:'pointer',borderRadius:12,fontSize:15,fontWeight:800,background:`linear-gradient(135deg,${GOLD},${GL})`,color:'#fff',boxShadow:`0 4px 16px ${GOLD}40`}}>{saved?'Saved!':'Save Settings'}</button>
    </div>
  )
}
