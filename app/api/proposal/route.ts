import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AI_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'

const PARSE_PROMPT = `You are a forensic bid analyst. Extract structured job data from a contractor bid request email.
Respond ONLY with valid JSON:
{
  "client_name": string,
  "client_email": string,
  "client_phone": string,
  "client_company": string,
  "job_address": string,
  "job_city": string,
  "job_state": string,
  "job_type": "epoxy"|"polished_concrete"|"painting"|"hvac"|"roofing"|"flooring"|"other",
  "job_description": string,
  "sqft_mentioned": number|null,
  "timeline_mentioned": string,
  "budget_mentioned": string,
  "materials_mentioned": string[],
  "urgency_level": "low"|"medium"|"high"|"emergency",
  "ai_confidence": number
}
Never hallucinate square footage. Only extract what is explicitly stated. ai_confidence is 0-100.`

const MATRIX: Record<string, {mps:number,lps:number,mu:string,md:string,ds:number,prep:string,mc:number}> = {
  epoxy:             {mps:0.012,lps:0.008,mu:'gallon',md:'Epoxy coating system (primer + color + topcoat)',ds:500,prep:'Diamond grind surface prep + crack repair',mc:42},
  polished_concrete: {mps:0.005,lps:0.015,mu:'gallon',md:'Concrete densifier + guard sealer',ds:1000,prep:'Multi-step diamond grinding (30–1500 grit)',mc:28},
  painting:          {mps:0.008,lps:0.006,mu:'gallon',md:'Premium paint — 2 coats',ds:800,prep:'Surface prep + masking + primer coat',mc:38},
  roofing:           {mps:0.003,lps:0.012,mu:'square',md:'Architectural shingles + underlayment + ridge cap',ds:1500,prep:'Tear-off existing material + felt paper install',mc:180},
  flooring:          {mps:1.05, lps:0.010,mu:'sqft', md:'LVP/tile/hardwood + underlayment',ds:600,prep:'Subfloor prep + leveling + moisture barrier',mc:3.5},
  hvac:              {mps:0.001,lps:0.020,mu:'unit', md:'HVAC equipment + ductwork + fittings',ds:2000,prep:'Load calculation + equipment selection',mc:2200},
  other:             {mps:0.010,lps:0.010,mu:'unit', md:'Materials and supplies',ds:500,prep:'Site prep and mobilization',mc:45},
}

function cur(n:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n)}

function buildHTML(job:Record<string,unknown>,takeoff:Record<string,unknown>,pricing:Record<string,unknown>,contractor:Record<string,unknown>,pNum:string):string{
  const items=takeoff.line_items as {category:string,description:string,quantity:number,unit:string,unit_cost:number,total:number}[]
  const labels:Record<string,string>={epoxy:'Epoxy Floor Coating',polished_concrete:'Polished Concrete',painting:'Interior/Exterior Painting',roofing:'Roofing',flooring:'Flooring Installation',hvac:'HVAC Services',other:'General Services'}
  const logo=contractor.logo_url?`<img src="${contractor.logo_url}" style="max-height:70px;max-width:220px;object-fit:contain">`:`<div style="font-size:22px;font-weight:900;color:#111">${contractor.business_name||'Your Company'}</div>`
  const validUntil=new Date(Date.now()+30*864e5).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})
  const p=pricing as Record<string,number>
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Proposal ${pNum}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#fff;color:#111;padding:48px 40px;max-width:820px;margin:0 auto}.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:3px solid #FFBE00;margin-bottom:32px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:32px}.plbl{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#FFBE00;margin-bottom:6px}.pnm{font-size:15px;font-weight:700;margin-bottom:4px}.pi{font-size:13px;color:#555;line-height:1.6}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#111}th{padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;text-align:left}td{padding:10px 14px;font-size:13px;border-bottom:1px solid #F3F4F6}.ttl{margin-left:auto;width:280px}.tr{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;color:#555;border-bottom:1px solid #F3F4F6}.tm{background:#FFBE00;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#111;margin-top:8px}.sc{background:#F9FAFB;border-left:4px solid #FFBE00;padding:16px 20px;border-radius:0 8px 8px 0;font-size:14px;color:#374151;line-height:1.7;margin-bottom:28px}.sl{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#FFBE00;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #F3F4F6}.sgs{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px}.sgl{border-top:1px solid #D1D5DB;padding-top:8px;font-size:12px;color:#6B7280;margin-top:40px}.ft{margin-top:40px;padding-top:20px;border-top:1px solid #E5E7EB;text-align:center;font-size:11px;color:#9CA3AF}</style></head><body>
<div class="hdr">${logo}<div style="text-align:right"><div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6B7280">Proposal</div><div style="font-size:20px;font-weight:900">#${pNum}</div><div style="font-size:12px;color:#6B7280;margin-top:4px">Date: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div><div style="font-size:12px;color:#6B7280;margin-top:2px">Valid Until: ${validUntil}</div><div style="margin-top:8px;background:#111;color:#FFBE00;font-size:10px;font-weight:700;letter-spacing:1px;padding:3px 10px;border-radius:4px;display:inline-block">AI-GENERATED</div></div></div>
<div class="parties"><div><div class="plbl">Prepared By</div><div class="pnm">${contractor.business_name||'Your Company'}</div><div class="pi">${contractor.email||''}<br>${contractor.phone||''}<br>${contractor.city||''}, ${contractor.state||''}<br>${contractor.license_number?'Lic: '+contractor.license_number:''}</div></div><div><div class="plbl">Prepared For</div><div class="pnm">${job.client_name||'Client'}</div><div class="pi">${job.client_company?job.client_company+'<br>':''}${job.client_email||''}<br>${job.client_phone||''}<br>${job.job_address||''}, ${job.job_city||''}, ${job.job_state||''}</div></div></div>
<div class="sl">Scope of Work</div><div class="sc">Supply and install ${labels[job.job_type as string]||'services'} at ${job.job_address||'the project location'}, ${job.job_city||''} ${job.job_state||''}. Estimated area: ${takeoff.sqft} sq ft. ${job.timeline_mentioned?'Target completion: '+job.timeline_mentioned+'.':''}</div>
<div class="sl">Itemized Estimate</div><table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${items.map((it,i)=>`<tr style="background:${i%2===0?'#fff':'#FAFAFA'}"><td>${it.description}</td><td style="text-align:center">${it.quantity} ${it.unit}</td><td style="text-align:right">${cur(it.unit_cost)}</td><td style="text-align:right;font-weight:600">${cur(it.total)}</td></tr>`).join('')}</tbody></table>
<div class="ttl"><div class="tr"><span>Subtotal</span><span>${cur(p.subtotal)}</span></div><div class="tr"><span>Overhead (${p.overhead_pct}%)</span><span>${cur(p.overhead_amount)}</span></div><div class="tr"><span>Margin (${p.margin_pct}%)</span><span>${cur(p.margin_amount)}</span></div>${p.tax_rate>0?`<div class="tr"><span>Tax (${p.tax_rate}%)</span><span>${cur(p.tax_amount)}</span></div>`:''}<div class="tm"><span>TOTAL</span><span>${cur(p.total)}</span></div><div style="text-align:right;font-size:11px;color:#9CA3AF;margin-top:6px">${cur(p.price_per_sqft)}/sqft</div></div>
<div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:24px"><div style="background:#F9FAFB;border-radius:8px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6B7280;margin-bottom:6px">Payment Terms</div><div style="font-size:13px;color:#374151">${contractor.default_payment_terms||'50% deposit to schedule. Balance due on completion.'}</div></div><div style="background:#F9FAFB;border-radius:8px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6B7280;margin-bottom:6px">Project Timeline</div><div style="font-size:13px;color:#374151">${job.timeline_mentioned||'To be confirmed upon signed agreement.'}</div></div></div>
<div class="sgs"><div><div class="sgl">Contractor Signature & Date</div><div style="font-size:12px;color:#6B7280;margin-top:4px">${contractor.business_name||''}</div></div><div><div class="sgl">Client Signature & Date</div><div style="font-size:12px;color:#6B7280;margin-top:4px">${job.client_name||'Client'}</div></div></div>
<div class="ft">This proposal is valid for 30 days. All work guaranteed per industry standards.<br><span style="color:#FFBE00;font-weight:700">Powered by BidGenius · XTREME AI SYSTEMS</span></div>
</body></html>`
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const body = await req.json().catch(()=>({}))
    const email_text: string = body.email_text || ''
    if (!email_text || email_text.trim().length < 20) {
      return NextResponse.json({ok:false,error:'email_text required (min 20 chars)'},{status:400})
    }
    const AI_KEY = process.env.AI_GATEWAY_API_KEY || ''
    if (!AI_KEY) return NextResponse.json({ok:false,error:'AI_GATEWAY_API_KEY not set'},{status:500})

    const aiRes = await fetch(AI_URL,{
      method:'POST',
      headers:{'Authorization':`Bearer ${AI_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4o',temperature:0.1,messages:[{role:'system',content:PARSE_PROMPT},{role:'user',content:`Parse this bid request email:\n\n${email_text.slice(0,6000)}`}]})
    })
    if (!aiRes.ok) throw new Error(`AI failed: ${aiRes.status}`)
    const aiData = await aiRes.json() as {choices:{message:{content:string}}[]}
    const raw = aiData.choices[0].message.content.trim().replace(/^```json\n?|```$/g,'').trim()
    const job = JSON.parse(raw) as Record<string,unknown>

    const matrix = MATRIX[job.job_type as string] || MATRIX.other
    const cfg = {labor_rate:65,material_markup_pct:25,overhead_pct:15,margin_pct:20,tax_rate:0,...(body.config||{})}
    const sqft = (job.sqft_mentioned as number|null) || matrix.ds
    const sqft_source = job.sqft_mentioned ? 'stated' : 'estimated'
    const markup = 1 + cfg.material_markup_pct/100
    const prep_hrs = sqft * 0.003
    const mat_qty = parseFloat((sqft*matrix.mps).toFixed(2))
    const app_hrs = parseFloat((sqft*matrix.lps).toFixed(1))
    const equip = Math.max(150, sqft*0.08)
    const line_items = [
      {category:'labor',description:matrix.prep,quantity:parseFloat(prep_hrs.toFixed(1)),unit:'hour',unit_cost:cfg.labor_rate,total:parseFloat((prep_hrs*cfg.labor_rate).toFixed(2))},
      {category:'material',description:matrix.md,quantity:mat_qty,unit:matrix.mu,unit_cost:parseFloat((matrix.mc*markup).toFixed(2)),total:parseFloat((mat_qty*matrix.mc*markup).toFixed(2))},
      {category:'labor',description:'Application / installation labor',quantity:app_hrs,unit:'hour',unit_cost:cfg.labor_rate,total:parseFloat((app_hrs*cfg.labor_rate).toFixed(2))},
      {category:'equipment',description:'Equipment mobilization + tool rental',quantity:1,unit:'job',unit_cost:parseFloat(equip.toFixed(2)),total:parseFloat(equip.toFixed(2))},
      {category:'labor',description:'Final cleanup, QC inspection, client walkthrough',quantity:2,unit:'hour',unit_cost:cfg.labor_rate,total:cfg.labor_rate*2},
    ]
    const subtotal = line_items.reduce((s,i)=>s+i.total,0)
    const labor_hours = line_items.filter(i=>i.category==='labor').reduce((s,i)=>s+i.quantity,0)
    const material_cost = line_items.filter(i=>i.category==='material').reduce((s,i)=>s+i.total,0)
    const takeoff = {sqft,sqft_source,line_items,labor_hours:parseFloat(labor_hours.toFixed(1)),material_cost:parseFloat(material_cost.toFixed(2)),subtotal:parseFloat(subtotal.toFixed(2))}

    const oa=subtotal*(cfg.overhead_pct/100),wo=subtotal+oa,ma=wo*(cfg.margin_pct/100),pt=wo+ma,ta=pt*(cfg.tax_rate/100),total=pt+ta
    const pricing={subtotal:parseFloat(subtotal.toFixed(2)),overhead_amount:parseFloat(oa.toFixed(2)),overhead_pct:cfg.overhead_pct,margin_amount:parseFloat(ma.toFixed(2)),margin_pct:cfg.margin_pct,pretax_total:parseFloat(pt.toFixed(2)),tax_rate:cfg.tax_rate,tax_amount:parseFloat(ta.toFixed(2)),total:parseFloat(total.toFixed(2)),price_per_sqft:parseFloat((total/sqft).toFixed(2))}

    const contractor = body.contractor || {business_name:'Xtreme Polishing Systems',email:'info@xpsxpress.com',phone:'(623) 555-0100',city:'Phoenix',state:'AZ',license_number:'ROC-298441',default_payment_terms:'50% deposit to schedule. Balance due upon completion.'}
    const pNum = `BG-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`
    const html = buildHTML(job,takeoff,pricing,contractor,pNum)

    return NextResponse.json({ok:true,proposal_number:pNum,job,takeoff,pricing,html,duration_ms:Date.now()-start})
  } catch(err) {
    console.error('[proposal]',err)
    return NextResponse.json({ok:false,error:String(err)},{status:500})
  }
}
