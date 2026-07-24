import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { proposal_html, client_email, client_name, proposal_number, company } = await req.json()
    const RESEND_KEY = process.env.RESEND_API_KEY
    if (!RESEND_KEY) return NextResponse.json({ ok: false, error: 'Email not configured' }, { status: 500 })

    const fromEmail = 'support@nationalepoxypros.com'
    const ccEmail = 'jeremy@shopxps.com'
    const companyName = company === 'ncp' ? 'National Concrete Polishing' : 'National Epoxy Pros'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${companyName} <${fromEmail}>`,
        to: [client_email],
        cc: [ccEmail],
        reply_to: ccEmail,
        subject: `Your Flooring Proposal #${proposal_number} — ${companyName}`,
        html: proposal_html
      })
    })
    const d = await res.json()
    if (!res.ok) throw new Error((d as { message?: string }).message || 'Send failed')
    return NextResponse.json({ ok: true, id: (d as { id: string }).id })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
