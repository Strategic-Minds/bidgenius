import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'BidGenius — AI Bid System', description: 'Turn any client email into a professional proposal in 60 seconds.' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
