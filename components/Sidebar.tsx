'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
const GOLD = '#C9A84C'
const GOLD_LIGHT = '#E8C96A'
const GOLD_BG = '#FFF8EC'
const NAV = [
  { href: '/', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { href: '/bid', label: 'New Bid', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z', highlight: true },
  { href: '/proposals', label: 'Proposals', icon: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
  { href: '/settings', label: 'Settings', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
]
export default function Sidebar() {
  const path = usePathname()
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  if (mobile) {
    return (
      <nav style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100,background:'#fff',borderTop:'1px solid #E8E0D0',display:'flex',padding:'8px 0 env(safe-area-inset-bottom,8px)',boxShadow:'0 -2px 12px rgba(0,0,0,0.08)'}}>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,textDecoration:'none',color:path===n.href?GOLD:'#888',fontSize:10,fontWeight:path===n.href?700:400,padding:'4px 0'}}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill={path===n.href?GOLD:'#888'}><path d={n.icon}/></svg>
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    )
  }
  return (
    <aside style={{position:'fixed',left:0,top:0,bottom:0,width:260,background:'#fff',borderRight:'1px solid #F0EBE0',display:'flex',flexDirection:'column',zIndex:100,boxShadow:'2px 0 12px rgba(0,0,0,0.04)'}}>
      <div style={{padding:'24px 20px',borderBottom:'1px solid #F0EBE0'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:42,height:42,borderRadius:10,background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:18}}>B</div>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:'#0A0A0A',letterSpacing:'-0.3px'}}>BidGenius</div>
            <div style={{fontSize:11,color:'#999',fontWeight:500}}>AI Bid System</div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:'14px 10px'}}>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:10,marginBottom:3,textDecoration:'none',background:path===n.href?GOLD_BG:n.highlight&&path!==n.href?`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`:'transparent',color:path===n.href?GOLD:n.highlight&&path!==n.href?'#fff':'#555',fontWeight:path===n.href?700:n.highlight?700:500,border:path===n.href?`1px solid ${GOLD}50`:'1px solid transparent',fontSize:14,transition:'all 0.15s'}}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill={path===n.href?GOLD:n.highlight&&path!==n.href?'#fff':'#888'}><path d={n.icon}/></svg>
            {n.label}
          </Link>
        ))}
      </nav>
      <div style={{padding:'16px 20px',borderTop:'1px solid #F0EBE0'}}>
        <div style={{fontSize:10,color:'#ccc',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Powered by</div>
        <div style={{fontSize:12,color:'#888',fontWeight:600,marginTop:2}}>XPS AI Takeoff Engine</div>
        <div style={{fontSize:11,marginTop:6,display:'flex',alignItems:'center',gap:6}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#4CAF50',display:'inline-block'}}/>
          <span style={{color:'#4CAF50',fontWeight:600}}>System Online</span>
        </div>
      </div>
    </aside>
  )
}
