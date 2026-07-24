import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const XPS_SYSTEM_PROMPT = `You are the XPS AI Takeoff Engine, built on 12 years of contractor intelligence from Xtreme Polishing Systems / National Concrete Polishing / National Epoxy Pros.

You generate complete, professional, legally sound flooring proposals with accurate material takeoffs, real labor calculations, and proper scope language.

WAGE RATES (XPS actual internal rates):
- Field Super: $41.80/hr regular, $62.70 OT — billing rate with 50% markup: $83.60/hr
- Team Super: $38.00/hr regular, $57.00 OT — billing rate: $76.00/hr
- Field Tech: $34.20/hr regular, $51.30 OT — billing rate: $68.40/hr

PREP MULTIPLIERS (cost adders per sqft):
- Crack Repair: $0.00625/sqft (add to line items)
- Spalled Joint Repair: $0.0075/sqft
- Surface Defect (pop-outs): $0.00375/sqft
- Adhesive Removal: add 20% to base price
- Grout Coat: add $0.85/sqft
- Mobilization: $350 flat (always include)
- Minimum job: $1,500

SCOPE LANGUAGE LIBRARY:

GRIND & SEAL: Mechanically grind concrete slab using 40G metal bonded diamond abrasives to achieve the approved surface profile. Continue to hone concrete slab using 80G diamond abrasives on both field and edges, in preparation for the sealing process, per manufacturer specifications. Apply sealer per manufacturer specifications. Once installed, flush entire slab surface thoroughly with water with an auto scrubber to remove excess material, until the slab is completely dry.

POLISHED CONCRETE (CREAM/STANDARD): Mechanically grind concrete slab using 50 and 100G resin bonded diamond systems to achieve the approved surface profile. Continue to hone concrete slab using Transitional, 200, & 400G diamond abrasives on both field and edges in preparation for the densification process per manufacturer specifications. Apply DYE & densifier/hardener per manufacturer specifications. Continue to hone concrete slab using 800G diamond abrasives on both field and edges, while removing scratches from previous steps. Install polished concrete guard according to manufacturer specifications. Complete the process by using a diamond impregnated twister pad affixed to a high speed burnisher.

POLISHED CONCRETE (FULL MIRROR/HIGH GLOSS): Mechanically grind concrete slab using 40 and 80G metal bonded diamond abrasives to achieve the approved surface profile. Continue to hone using Transitional, 200, & 400G diamond abrasives. Apply densifier/hardener per manufacturer specifications. Continue to hone using 800, 1500G abrasives while removing scratches from previous steps. Apply DYE & densifier/hardener per manufacturer specifications. Install two coats of guard/sealer in accordance with manufacturer specifications. Complete the process by using a diamond impregnated twister pad affixed to a high speed burnisher.

SOLID COLOR EPOXY: Mechanically grind concrete slab using 16 grit metal bonded diamonds to achieve surface profile CSP 3/4. Vacuum slab until dust free, in preparation for the epoxy primer installation per manufacturer specifications. Apply primer coat per manufacturer specifications, while broadcasting sand to primed area. Apply finish coat(s) of epoxy per manufacturer specifications. Once epoxy has cured, apply polyaspartic topcoat for UV protection and durability.

METALLIC EPOXY: Mechanically grind concrete slab using 16 grit metal bonded diamonds to achieve surface profile CSP 3/4. Vacuum slab until dust free. Apply primer coat per manufacturer specifications. Apply metallic epoxy base coat while broadcasting metallic pigment. Manipulate metallic effect using alcohol and heat gun technique. Once cured, apply 2 coats of clear polyaspartic topcoat per manufacturer specifications.

STANDARD EXCLUSIONS (always include ALL of these):
1. Sloping to drains, ramps or other elevation changes — Additional cost will apply if performed by NCP
2. Excessive slab remediation, un-sound legacy flooring removal and or cracking of more than 25 LF per every 1,000 SF
3. Slab remediation of oil, grease, sealers, curing compounds or other concrete contaminates
4. Temperature control, heating, cooling or ventilation of space where our work is being performed
5. Cleaning or protection of the final product, once our contracted scope of work is complete
Note: NCP is not responsible for soft concrete. Soft concrete is due to excessive water or poor placement by the original concrete placement company. Soft concrete cannot be determined prior to floor installation. In the event that soft concrete has been exposed, extra densification and grout coating will be needed which will require a change order.

PRICING (National Premium Tier — we do NOT low-ball):
- Grind & Seal: $4.50-6.00/sqft
- Polished Concrete Standard: $5.50-7.50/sqft
- Polished Concrete Mirror/High Gloss: $8.00-12.00/sqft
- Solid Color Epoxy: $7.00-9.00/sqft
- Metallic Epoxy: $10.00-14.00/sqft
- Overlay/Microtopping: $9.00-13.00/sqft

RETURN a JSON object with this exact structure:
{
  "client_name": "string",
  "client_email": "string or empty",
  "client_phone": "string or empty",
  "client_company": "string or empty",
  "job_address": "string",
  "job_city": "string",
  "job_state": "string",
  "job_type": "grind_seal|polished_concrete_standard|polished_concrete_mirror|solid_color_epoxy|metallic_epoxy|overlay|other",
  "sqft": number,
  "scope_description": "string — 2-3 sentence summary of the project",
  "scope_language": "string — full professional scope paragraph from library above",
  "urgency": "low|medium|high|emergency",
  "line_items": [
    {"id": 1, "description": "string", "qty": "string", "unit": "string", "unit_price": number, "total": number}
  ],
  "subtotal": number,
  "total": number,
  "price_per_sqft": number,
  "confidence": number,
  "notes": "string — any assumptions made"
}

Line items should include:
1. Surface Preparation (grinding/cleaning based on scope)
2. [Main system name] Application
3. Materials & Supplies
4. Equipment & Dust Collection
5. Mobilization ($350 flat)
And any relevant prep add-ons (crack repair, adhesive removal, etc.) if mentioned.

IMPORTANT: Minimum total is $1,500. Always include mobilization. Be accurate and realistic with pricing. Do not low-ball.`

function generateProposalNumber(): string {
  const date = new Date()
  const ymd = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random()*9000)+1000
  return `${ymd}-${rand}`
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n)
}

function buildProposalHTML(parsed: Record<string, unknown>, companyChoice: string, proposalNum: string, validUntil: string): string {
  const isNCP = companyChoice === 'ncp'
  const companyName = isNCP ? 'National Concrete Polishing' : 'National Epoxy Pros'
  const companyTagline = isNCP ? 'Elite Polished Concrete Systems · NCP' : 'Premium Epoxy Floor Systems · NEP'
  const repName = isNCP ? 'Chris Lavin' : 'Kevin Topel'
  const repPhone = isNCP ? '(561) 239-5597' : '(561) 757-0937'
  const repEmail = isNCP ? 'carblade@aol.com' : 'ktopel@xtremepolishingsystems.com'
  const companyEmail = isNCP ? 'info@nationalconcretepolishing.com' : 'support@nationalepoxypros.com'

  const ncpLogoUrl = 'https://media.base44.com/images/public/69db047707a15d69135e3de9/74e6f6539_NATIONALCONCRRETEPOLISHING.jpg'

  const logoHtml = isNCP
    ? `<img src="${ncpLogoUrl}" alt="National Concrete Polishing" style="height:72px;width:auto;object-fit:contain" />`
    : `<div style="font-size:26px;font-weight:900;color:#111;letter-spacing:-1px">National <span style="color:#C9A84C">Epoxy</span> Pros</div><div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9CA3AF">Premium Epoxy Floor Systems</div>`

  const lineItems = (parsed.line_items as Array<{description:string,qty:string,unit:string,unit_price:number,total:number}>) || []
  const itemsHtml = lineItems.map((item, i) =>
    `<tr style="background:${i%2===0?'#fff':'#FAFAFA'}">
      <td style="padding:12px 16px;font-size:13px;color:#111;border-bottom:1px solid #F3F4F6">${item.description}</td>
      <td style="padding:12px 16px;font-size:13px;color:#555;text-align:center;border-bottom:1px solid #F3F4F6">${item.qty}</td>
      <td style="padding:12px 16px;font-size:13px;color:#555;text-align:center;border-bottom:1px solid #F3F4F6">${item.unit}</td>
      <td style="padding:12px 16px;font-size:13px;color:#555;text-align:right;border-bottom:1px solid #F3F4F6">${formatCurrency(item.unit_price)}</td>
      <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#111;text-align:right;border-bottom:1px solid #F3F4F6">${formatCurrency(item.total)}</td>
    </tr>`
  ).join('')

  const gold = (s: string) => `<div style="height:3px;background:linear-gradient(90deg,#C9A84C,#E8C96A,#B8960C,#C9A84C)"></div>`
  const _ = gold

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#111}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}@page{margin:0.5in}</style></head><body>
${_('')}
<div style="background:#fff;padding:32px 48px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <div>${logoHtml}</div>
    <div style="text-align:right">
      <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:800">PROPOSAL</div>
      <div style="font-size:24px;font-weight:900;color:#111">#${proposalNum}</div>
      <div style="font-size:11px;color:#9CA3AF">Valid until ${validUntil}</div>
    </div>
  </div>
</div>
${_('')}
<div style="padding:28px 48px;display:flex;gap:40px">
  <div style="flex:1">
    <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:800;margin-bottom:10px">FROM</div>
    <div style="font-size:15px;font-weight:800">${companyName}</div>
    <div style="font-size:12px;color:#C9A84C;font-weight:600;margin-bottom:6px">${companyTagline}</div>
    <div style="font-size:12px;color:#555;line-height:1.7">Serving All 50 States<br>${companyEmail}</div>
    <div style="margin-top:10px;padding:8px 12px;background:#FFF8E7;border-left:3px solid #C9A84C">
      <div style="font-size:10px;color:#92400E;font-weight:700">YOUR REPRESENTATIVE</div>
      <div style="font-size:13px;font-weight:800;margin-top:2px">${repName}</div>
      <div style="font-size:12px;color:#555">${repPhone} · ${repEmail}</div>
    </div>
  </div>
  <div style="flex:1">
    <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:800;margin-bottom:10px">PREPARED FOR</div>
    <div style="font-size:15px;font-weight:800">${parsed.client_name || 'Valued Client'}</div>
    ${parsed.client_company ? `<div style="font-size:12px;color:#555;margin-bottom:4px">${parsed.client_company}</div>` : ''}
    <div style="font-size:12px;color:#555;line-height:1.7">${parsed.client_email || ''}<br>${parsed.client_phone || ''}</div>
    <div style="margin-top:10px;padding:8px 12px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px">
      <div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase">Project Location</div>
      <div style="font-size:12px;font-weight:600;margin-top:3px">${parsed.job_address || `${parsed.job_city || ''}, ${parsed.job_state || ''}`}</div>
    </div>
  </div>
</div>
${_('')}
<div style="padding:24px 48px">
  <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:800;margin-bottom:14px">SCOPE OF WORK</div>
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px 20px">
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">${((parsed.job_type as string)||'').replace(/_/g,' ').toUpperCase()}</div>
    <div style="font-size:13px;color:#555;line-height:1.8">${parsed.scope_language || parsed.scope_description}</div>
    ${parsed.sqft ? `<div style="margin-top:12px;display:inline-block;background:#FFF8E7;border:1px solid #C9A84C;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:700;color:#92400E">${(parsed.sqft as number).toLocaleString()} Square Feet · $${parsed.price_per_sqft}/SF</div>` : ''}
  </div>
</div>
<div style="padding:0 48px 28px">
  <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:800;margin-bottom:14px">ITEMIZED ESTIMATE</div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
    <thead><tr style="background:#111">
      <th style="padding:11px 16px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;text-align:left">Description</th>
      <th style="padding:11px 16px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;text-align:center">Qty</th>
      <th style="padding:11px 16px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;text-align:center">Unit</th>
      <th style="padding:11px 16px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;text-align:right">Unit Price</th>
      <th style="padding:11px 16px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;text-align:right">Total</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-top:16px">
    <div style="width:280px">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F3F4F6"><span style="font-size:13px;color:#555">Subtotal</span><span style="font-size:13px;font-weight:600">${formatCurrency(parsed.subtotal as number || parsed.total as number)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:14px 0">
        <span style="font-size:16px;font-weight:900">TOTAL</span>
        <span style="font-size:22px;font-weight:900;color:#C9A84C">${formatCurrency(parsed.total as number || 0)}</span>
      </div>
    </div>
  </div>
</div>
${_('')}
<div style="padding:20px 48px;background:#FFF8E7">
  <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:800;margin-bottom:10px">PAYMENT TERMS</div>
  <div style="font-size:14px;color:#111;font-weight:700">✓ NO DEPOSIT REQUIRED</div>
  <div style="font-size:12px;color:#555;margin-top:4px">Full balance due upon satisfactory project completion. We stand behind our work.</div>
</div>
${_('')}
<div style="padding:20px 48px">
  <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:800;margin-bottom:12px">STANDARD EXCLUSIONS</div>
  <div style="font-size:12px;color:#555;line-height:1.9">
    1. Sloping to drains, ramps or other elevation changes — Additional cost will apply if performed by ${companyName}<br>
    2. Excessive slab remediation, un-sound legacy flooring removal and/or cracking of more than 25 LF per every 1,000 SF<br>
    3. Slab remediation of oil, grease, sealers, curing compounds or other concrete contaminates<br>
    4. Temperature control, heating, cooling or ventilation of space where our work is being performed<br>
    5. Cleaning or protection of the final product, once our contracted scope of work is complete<br>
    <em style="color:#9CA3AF">*${companyName} is not responsible for soft concrete. Soft concrete cannot be determined prior to floor installation. Any required additional densification or grout coating will require a change order.</em>
  </div>
</div>
${_('')}
<div style="padding:24px 48px;display:flex;gap:40px">
  <div style="flex:1">
    <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#9CA3AF;margin-bottom:20px">CLIENT ACCEPTANCE</div>
    <div style="height:1px;background:#111;margin-bottom:6px"></div>
    <div style="font-size:11px;color:#9CA3AF">Client Signature</div>
    <div style="height:1px;background:#E5E7EB;margin:20px 0 6px"></div>
    <div style="font-size:11px;color:#9CA3AF">Printed Name &amp; Date</div>
  </div>
  <div style="flex:1">
    <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#9CA3AF;margin-bottom:20px">AUTHORIZED BY</div>
    <div style="height:1px;background:#C9A84C;margin-bottom:6px"></div>
    <div style="font-size:13px;font-weight:700">${repName} — ${companyName}</div>
    <div style="font-size:11px;color:#9CA3AF;margin-top:4px">${repPhone}</div>
  </div>
</div>
${_('')}
<div style="padding:14px 48px;display:flex;justify-content:space-between;align-items:center">
  <div style="font-size:10px;color:#9CA3AF">${companyName} · Proposal #${proposalNum} · Valid Until ${validUntil}</div>
  <div style="font-size:10px;color:#D1D5DB">Powered by AI Takeoff · XTREME AI SYSTEMS</div>
</div>
${_('')}
</body></html>`
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const { job_text, company = 'ncp' } = await req.json()
    if (!job_text?.trim()) return NextResponse.json({ ok: false, error: 'Job description required' }, { status: 400 })

    const AI_KEY = process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || ''
    const AI_URL = process.env.AI_GATEWAY_API_KEY ? 'https://ai-gateway.vercel.sh/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'

    const aiRes = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: XPS_SYSTEM_PROMPT },
          { role: 'user', content: `Generate a complete proposal for this job:\n\n${job_text}\n\nCompany: ${company === 'ncp' ? 'National Concrete Polishing' : 'National Epoxy Pros'}` }
        ]
      })
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      throw new Error(`AI error: ${err.slice(0,200)}`)
    }

    const aiData = await aiRes.json() as { choices: Array<{ message: { content: string } }> }
    const parsed = JSON.parse(aiData.choices[0].message.content)

    const proposalNum = generateProposalNumber()
    const validUntil = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
    const html = buildProposalHTML(parsed, company, proposalNum, validUntil)

    return NextResponse.json({
      ok: true,
      proposal_number: proposalNum,
      parsed,
      html,
      total: parsed.total,
      generation_ms: Date.now() - start
    })
  } catch (err) {
    console.error('[takeoff]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
