import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
const AI_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'
const PROMPT = `You are the XPS AI Plan Reader — an expert construction document analyst. Extract ALL of the following from the document:
1. project_name, client_name, gc_name, project_address, city, state
2. total_sqft (calculate from dimensions if needed), sqft_breakdown by area/room
3. finish_system (polished concrete, epoxy, etc.), gloss_level, concrete_condition
4. special_requirements (array), timeline, contact_info, csi_section
5. confidence (high/medium/low), confidence_notes, raw_text_preview (first 300 chars)
Return ONLY valid JSON. No markdown.`
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File|null
    const jobContext = formData.get('job_context') as string||''
    if(!file) return NextResponse.json({ok:false,error:'No file uploaded'},{status:400})
    if(file.size > 20*1024*1024) return NextResponse.json({ok:false,error:'File too large. Max 20MB.'},{status:400})
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let extractedText = ''
    let isImage = false
    let b64Image = ''
    if(file.type==='application/pdf'||file.name.endsWith('.pdf')) {
      try { const p=require('pdf-parse'); const d=await p(buffer); extractedText=d.text||'' } catch { extractedText='[PDF text extraction failed]' }
    } else if(file.type.startsWith('image/')) {
      isImage=true; b64Image=buffer.toString('base64')
    } else {
      extractedText=buffer.toString('utf-8',0,50000)
    }
    const messages: any[] = [{ role:'system', content:PROMPT }]
    if(isImage) {
      messages.push({role:'user',content:[{type:'text',text:`Analyze this construction document. File: ${file.name}${jobContext?'
Context: '+jobContext:''}`},{type:'image_url',image_url:{url:`data:${file.type};base64,${b64Image}`}}]})
    } else {
      messages.push({role:'user',content:`Analyze this construction document and extract takeoff data.
File: ${file.name}${jobContext?'
Context: '+jobContext:''}

DOCUMENT TEXT:
\`\`\`
${extractedText.slice(0,15000)}
\`\`\``})
    }
    const aiRes = await fetch(AI_URL, {method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.AI_GATEWAY_API_KEY||''}`},body:JSON.stringify({model:'gpt-4o',messages,temperature:0.1,max_tokens:2000,response_format:{type:'json_object'}})})
    if(!aiRes.ok) throw new Error(`AI error: ${await aiRes.text()}`)
    const ai = await aiRes.json()
    const parsed = JSON.parse(ai.choices[0].message.content)
    return NextResponse.json({ok:true,file_name:file.name,file_type:file.type,file_size_kb:Math.round(file.size/1024),takeoff:parsed})
  } catch(e:any) {
    return NextResponse.json({ok:false,error:e.message},{status:500})
  }
}
