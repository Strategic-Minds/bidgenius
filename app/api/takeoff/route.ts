import { NextRequest, NextResponse } from 'next/server'
import { operatorAuthorized } from '@/lib/pipeline/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AI_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'
const MAX_JOB_TEXT = 50_000
const MAX_PLAN_DATA = 25_000

const XPS_SYSTEM = `You are the XPS AI Takeoff Engine built on Xtreme Polishing Systems contractor intelligence.

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
1. Sloping to drains, ramps or other elevation changes. Additional cost will apply if performed.
2. Excessive slab remediation, unsound legacy flooring removal, or cracking of more than 25 LF per 1,000 SF.
3. Slab remediation of oil, grease, sealers, curing compounds or other concrete contaminants.
4. Temperature control, heating, cooling or ventilation of the work space.
5. Cleaning or protection of the final product once contracted work is complete.

PAYMENT TERMS (NCP): 10% upon agreement, 40% upon arrival, 50% upon completion.
PAYMENT TERMS (NEP): 50% upon arrival, 50% upon completion.

Return only a valid JSON object matching this structure:
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
  "scope_narrative": "",
  "line_items": [{ "num": "01", "description": "Mobilization & Equipment Setup", "unit": "LS", "qty": 1, "unit_price": 350, "total": 350 }],
  "subtotal": 0,
  "tax_rate": 0,
  "tax_amount": 0,
  "total_price": 0,
  "payment_schedule": [{ "stage": "Upon Agreement", "pct": 10, "amount": 0 }],
  "exclusions": [],
  "estimated_labor_hours": 0,
  "estimated_duration_days": "",
  "validity_days": 30,
  "notes": ""
}`

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function validAiObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export async function POST(req: NextRequest) {
  if (!operatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY || ''
  if (!apiKey) return NextResponse.json({ ok: false, error: 'ai_gateway_not_configured' }, { status: 503 })

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })

    const company = body.company === 'nep' ? 'nep' : 'ncp'
    const jobText = cleanText(body.job_text, MAX_JOB_TEXT)
    const planData = validAiObject(body.plan_data) ? body.plan_data : null
    if (!jobText && !planData) {
      return NextResponse.json({ ok: false, error: 'job_text_or_plan_data_required' }, { status: 400 })
    }

    let enriched = jobText
    if (planData) {
      const serialized = JSON.stringify(planData).slice(0, MAX_PLAN_DATA)
      enriched = `PROJECT FROM CONSTRUCTION PLANS:\n${serialized}\n\nEXTRA CONTEXT:\n${jobText}`
    }

    const year = new Date().getUTCFullYear()
    const proposalNumber = `${company.toUpperCase()}-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const messages = [
      {
        role: 'system',
        content: `${XPS_SYSTEM}\n\nCompany context: ${company === 'ncp' ? 'National Concrete Polishing' : 'National Epoxy Pros'}. Proposal number: ${proposalNumber}`
      },
      { role: 'user', content: `Generate a complete professional proposal from this job information:\n\n${enriched}` }
    ]

    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o',
        messages,
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(50_000)
    })
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: 'ai_gateway_request_failed' }, { status: 502 })
    }

    const payload = await response.json().catch(() => null) as Record<string, any> | null
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || content.length > 250_000) {
      return NextResponse.json({ ok: false, error: 'invalid_ai_response' }, { status: 502 })
    }
    const parsed = JSON.parse(content) as unknown
    if (!validAiObject(parsed)) {
      return NextResponse.json({ ok: false, error: 'invalid_ai_payload' }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      ...parsed,
      company,
      proposal_number: cleanText(parsed.proposal_number, 100) || proposalNumber
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, error: 'takeoff_generation_failed' }, { status: 500 })
  }
}
