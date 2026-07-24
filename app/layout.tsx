import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWARegister from '@/components/PWARegister'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import Sidebar from '@/components/Sidebar'
export const metadata: Metadata = {
  title: 'BidGenius — AI Bid System',
  description: 'Turn any client email or plans into a professional proposal in 60 seconds.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'BidGenius' },
  icons: {
    icon: [{ url: '/icons/icon-32.png', sizes: '32x32' }, { url: '/icons/icon-96.png', sizes: '96x96' }],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180' }],
  },
}
export const viewport: Viewport = {
  themeColor: '#C9A84C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
      </head>
      <body style={{ margin:0, fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,sans-serif', background:'#F4F4F4', color:'#0A0A0A' }}>
        <PWARegister />
        <div style={{ display:'flex', minHeight:'100vh' }}>
          <Sidebar />
          <main style={{ flex:1, marginLeft:260, minHeight:'100vh' }} id="main-content">
            {children}
          </main>
        </div>
        <PWAInstallPrompt />
      </body>
    </html>
  )
}
