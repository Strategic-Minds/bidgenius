import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const AI_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'

const PLAN_READER_PROMPT = `You are the XPS AI Plan Reader — an expert construction document analyst with 15 years of flooring contractor experience. Extract ALL of the following from this document and return ONLY valid JSON:

{
  "project_name": "",
  "client_name": "",
  "gc_name": "",
  "project_address": "",
  "city": "",
  "state": "",
  "total_sqft": 0,
  "sqft_breakdown": [{"area": "Lobby", "sqft": 2400}],
  "finish_system": "",
  "gloss_level": "",
  "concrete_condition": "",
  "special_requirements": [],
  "timeline": "",
  "contact_info": "",
  "csi_section": "",
  "confidence": "high",
  "confidence_notes": "",
  "raw_text_preview": ""
}

Rules:
- Calculate sqft from dimensions (e.g., 40ft x 60ft = 2400 sqft)
- If a value is not found, use empty string or 0
- Look for finish schedules, room schedules, spec sections
- Return ONLY the JSON object, no markdown`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const jobContext = (formData.get('job_context') as string) || ''

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'File too large. Max 20MB.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let extractedText = ''
    let isImage = false
    let b64Image = ''

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const pdfParse = require('pdf-parse')
        const pdfData = await pdfParse(buffer)
        extractedText = pdfData.text || ''
      } catch {
        extractedText = '[PDF text extraction failed — AI will analyze structurally]'
      }
    } else if (file.type.startsWith('image/')) {
      isImage = true
      b64Image = buffer.toString('base64')
    } else {
      extractedText = buffer.toString('utf-8', 0, 50000)
    }

    const messages: any[] = [{ role: 'system', content: PLAN_READER_PROMPT }]

    if (isImage) {
      const userText = 'Analyze this construction document image and extract all takeoff data. File: ' + file.name + (jobContext ? '. Context: ' + jobContext : '')
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: 'data:' + file.type + ';base64,' + b64Image } }
        ]
      })
    } else {
      const userText = 'Analyze this construction document and extract all takeoff data.\nFile: ' + file.name + (jobContext ? '\nContext: ' + jobContext : '') + '\n\nDOCUMENT TEXT:\n' + extractedText.slice(0, 15000)
      messages.push({ role: 'user', content: userText })
    }

    const aiRes = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (process.env.AI_GATEWAY_API_KEY || '')
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    })

    if (!aiRes.ok) {
      throw new Error('AI error: ' + (await aiRes.text()))
    }

    const ai = await aiRes.json()
    const parsed = JSON.parse(ai.choices[0].message.content)

    return NextResponse.json({
      ok: true,
      file_name: file.name,
      file_type: file.type,
      file_size_kb: Math.round(file.size / 1024),
      takeoff: parsed
    })

  } catch (e: any) {
    console.error('[parse-plans]', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
