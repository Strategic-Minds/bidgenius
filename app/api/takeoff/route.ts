import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AI_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'

const XPS_SYSTEM = `You are the XPS AI Takeoff Engine — built on 12 years of Xtreme Polishing Systems contractor intelligence.

WAGE RATES (internal billing rates with 50% markup):
- Field Super: $83.60/hr
- Team Super: $76.00/hr  
- Field Tech: $68.40/hr

PREP MULTIPLIERS (per sqft add-ons):
- Crack Repair: $0.0063/sqft
- Spalled Joint Repair: $0.0075/sqft
- Surface Defect Pop-outs: $0.0038/sqft
- Adhesive Removal: +20% to base price
- Grout Coat: +$0.85/sqft
- Mobilization: $350 flat (always include)
- Minimum job: $1,500

SCOPE LANGUAGE LIBRARY:
GRIND & SEAL: Mechanically grind concrete slab using 40G metal bonded diamond abrasives to achieve the approved surface profile. Continue to hone concrete slab using 80G diamond abrasives on both field and edges, in preparation for the sealing process, per manufacturer specifications. Apply sealer per manufacturer specifications. Flush entire slab surface thoroughly with water using an auto scrubber to remove excess material until the slab is completely dry.

POLISHED CONCRETE (CREAM/STANDARD): Mechanically grind concrete slab using 50 and 100G resin bonded diamond systems. Continue to hone using Transitional, 200 & 400G diamond abrasives. Apply DYE and densifier/hardener per manufacturer specifications. Continue to hone using 800G abrasives. Install polished concrete guard per manufacturer specifications. Complete using a diamond impregnated twister pad affixed to a high speed burnisher.

POLISHED CONCRETE (FULL MIRROR/HIGH GLOSS): Mechanically grind using 40 and 80G metal bonded diamond abrasives. Continue to hone using Transitional, 200 and 400G diamond abrasives. Apply densifier/hardener. Continue to hone using 800 and 1500G abrasives. Apply DYE and densifier/hardener. Install two coats of guard/sealer per manufacturer specifications. Complete using a diamond impregnated twister pad.

SOLID COLOR EPOXY: Mechanically grind using 16 grit metal bonded diamonds to achieve CSP 3 surface profile. Apply epoxy primer coat. Install two coats of 100% solids epoxy per manufacturer specifications. Apply broadcast anti-slip aggregate as required. Install polyaspartic topcoat per manufacturer specifications.

METALLIC EPOXY: Mechanically grind using 16 grit metal bonded diamonds. Apply epoxy primer. Install metallic pigmented epoxy base coat. Manipulate with air to create desired metallic effect. Install clear polyaspartic topcoat per manufacturer specifications.

FLAKE EPOXY: Mechanically grind using 16 grit metal bonded diamonds. Apply primer coat. Install base epoxy coat and broadcast vinyl color flake to rejection. Scrape and recoat. Install polyaspartic topcoat per manufacturer specifications.

EXCLUSIONS (always include):
1. Sloping to drains, ramps or other elevation changes — additional cost will apply if performed.
2. Excessive slab remediation, unsound legacy flooring removal, or cracking of more than 25 LF per 1,000 SF.
3. Slab remediation of oil, grease, sealers, curing compounds or other concrete contaminates.
4. Temperature control, heating, cooling or ventilation of space where work is being performed.
5. Cleaning or protection of the final product once contracted scope of work is complete.

PAYMENT TERMS (NCP): 10% upon agreement, 40% upon arrival, 50% upon completion.
PAYMENT TERMS (NEP): 50% upon arrival, 50% upon completion.

OUTPUT: Return ONLY valid JSON. No markdown.
{
  "proposal_number": "NCP-2026-XXXX",
  "company": "ncp",
  "client_name": "",
  "client_email": "",
  "job_address": "",
  "job_city": "",
  "job_state": "",
  "job_type": "Polished Concrete | Grind & Seal | Epoxy | Metallic Epoxy | Flake Epoxy",
  "gloss_level": "Cream Polish | Standard Polish | High Gloss | Mirror | N/A",
  "sqft": 0,
  "scope_narrative": "Full paragraph scope of work from library above",
  "line_items": [
    { "num": "01", "description": "Mobilization & Equipment Setup", "unit": "LS", "qty": 1, "unit_price": 350, "total": 350 },
    { "num": "02", "description": "Surface Preparation — 40G Metal Bond Diamond Grind", "unit": "SF", "qty": 0, "unit_price": 0, "total": 0 },
    { "num": "03", "description": "Primary System Application", "unit": "SF", "qty": 0, "unit_price": 0, "total": 0 }
  ],
  "subtotal": 0,
  "tax_rate": 0,
  "tax_amount": 0,
  "total_price": 0,
  "payment_schedule": [
    { "stage": "Upon Agreement", "pct": 10, "amount": 0 },
    { "stage": "Upon Arrival", "pct": 40, "amount": 0 },
    { "stage": "Upon Completion", "pct": 50, "amount": 0 }
  ],
  "exclusions": [
    "Sloping to drains, ramps or other elevation changes",
    "Excessive slab remediation or cracking exceeding 25 LF per 1,000 SF",
    "Slab remediation of oil, grease, sealers, curing compounds or contaminates",
    "Temperature control, heating, cooling or ventilation of space",
    "Cleaning or protection of final product once scope is complete"
  ],
  "estimated_labor_hours": 0,
  "estimated_duration_days": "",
  "validity_days": 30,
  "notes": ""
}`

export async function POST(req: NextRequest) {
  try {
    const { job_text, company = 'ncp', plan_data } = await req.json()
    let enriched = job_text || ''
    if (plan_data) {
      const pd = plan_data
      enriched = `PROJECT FROM CONSTRUCTION PLANS:\nProject: ${pd.project_name||''}\nClient: ${pd.client_name||pd.gc_name||''}\nAddress: ${pd.project_address||''}\nTotal Sqft: ${pd.total_sqft||''}\nFinish: ${pd.finish_system||''}\nGloss: ${pd.gloss_level||''}\nCondition: ${pd.concrete_condition||''}\nSpecial: ${(pd.special_requirements||[]).join(', ')}\nTimeline: ${pd.timeline||''}\nExtra context: ${job_text||''}`
    }
    const num = `${company.toUpperCase()}-2026-${String(Math.floor(1000+Math.random()*9000))}`
    const messages = [
      { role: 'system', content: XPS_SYSTEM + `\n\nCompany context: ${company==='ncp'?'National Concrete Polishing (NCP) — polished concrete specialist':'National Epoxy Pros (NEP) — epoxy flooring specialist'}. Proposal number: ${num}` },
      { role: 'user', content: `Generate a complete professional proposal from this job information:\n\n${enriched}` }
    ]
    const resp = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY||''}` },
      body: JSON.stringify({ model: 'gpt-4o', messages, temperature: 0.1, max_tokens: 3000, response_format: { type: 'json_object' } })
    })
    if (!resp.ok) throw new Error(`AI error ${resp.status}: ${await resp.text()}`)
    const ai = await resp.json()
    const parsed = JSON.parse(ai.choices[0].message.content)
    return NextResponse.json({ ok: true, ...parsed, proposal_number: parsed.proposal_number || num })
  } catch(e:any) {
    console.error('[takeoff]', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
