'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const GOLD = '#C9A84C'
const GOLD_LIGHT = '#E8C96A'
const GOLD_BG = '#FFF8EC'
const NAV = [
  { href: '/', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { href: '/bid', label: 'New Bid', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z', highlight: true },
  { href: '/national', label: 'National Ops', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm6.92 6h-3.01a15.7 15.7 0 00-1.38-3.56A8.04 8.04 0 0118.92 8zM12 4c.83 1.2 1.47 2.54 1.86 4h-3.72A13.7 13.7 0 0112 4zM9.47 4.44A15.7 15.7 0 008.09 8H5.08a8.04 8.04 0 014.39-3.56zM4.26 10h3.49a16.8 16.8 0 000 4H4.26a7.9 7.9 0 010-4zm.82 6h3.01c.3 1.27.77 2.47 1.38 3.56A8.04 8.04 0 015.08 16zM12 20a13.7 13.7 0 01-1.86-4h3.72A13.7 13.7 0 0112 20zm2.53-.44A15.7 15.7 0 0015.91 16h3.01a8.04 8.04 0 01-4.39 3.56zM16.25 14h-8.5a14.7 14.7 0 010-4h8.5a14.7 14.7 0 010 4zM16.25 14a16.8 16.8 0 000-4h3.49a7.9 7.9 0 010 4h-3.49z' },
  { href: '/proposals', label: 'Proposals', icon: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
  { href: '/settings', label: 'Settings', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6-3.6z' },
]

export default function Sidebar() {
  const path = usePathname()
  const [mobile, setMobile] = useState(false)
  const active = (href: string) => path === href || (href !== '/' && path.startsWith(`${href}/`))

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (mobile) {
    return (
      <nav aria-label="Primary navigation" style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100,background:'#fff',borderTop:'1px solid #E8E0D0',display:'flex',padding:'8px 0 env(safe-area-inset-bottom,8px)',boxShadow:'0 -2px 12px rgba(0,0,0,0.08)'}}>
        {NAV.map(item => {
          const selected = active(item.href)
          return (
            <Link key={item.href} href={item.href} aria-current={selected ? 'page' : undefined} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,textDecoration:'none',color:selected?GOLD:'#888',fontSize:10,fontWeight:selected?700:400,padding:'4px 0'}}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill={selected?GOLD:'#888'}><path d={item.icon}/></svg>
              <span>{item.label}</span>
            </Link>
          )
        })}
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
            <div style={{fontSize:11,color:'#999',fontWeight:500}}>XTREME AI SYSTEMS</div>
          </div>
        </div>
      </div>
      <nav aria-label="Primary navigation" style={{flex:1,padding:'14px 10px'}}>
        {NAV.map(item => {
          const selected = active(item.href)
          return (
            <Link key={item.href} href={item.href} aria-current={selected ? 'page' : undefined} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:10,marginBottom:3,textDecoration:'none',background:selected?GOLD_BG:item.highlight?`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`:'transparent',color:selected?GOLD:item.highlight?'#fff':'#555',fontWeight:selected||item.highlight?700:500,border:selected?`1px solid ${GOLD}50`:'1px solid transparent',fontSize:14,transition:'all 0.15s'}}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill={selected?GOLD:item.highlight?'#fff':'#888'}><path d={item.icon}/></svg>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div style={{padding:'16px 20px',borderTop:'1px solid #F0EBE0'}}>
        <div style={{fontSize:10,color:'#aaa',fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>Operating posture</div>
        <div style={{fontSize:12,color:'#666',fontWeight:600,marginTop:3}}>Approval-gated automation</div>
        <div style={{fontSize:11,marginTop:7,display:'flex',alignItems:'center',gap:6}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:GOLD,display:'inline-block'}}/>
          <span style={{color:'#8A6A18',fontWeight:700}}>Protected mode</span>
        </div>
      </div>
    </aside>
  )
}
