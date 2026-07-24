import type { ContractorRecord, OpportunityRecord } from './types'

export function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function simpleHash(input: string): string {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function normalizeEmail(value: unknown): string {
  const email = normalizeText(value).toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

export function normalizePhone(value: unknown): string {
  const digits = normalizeText(value).replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return ''
}

export function scoreContractor(input: Record<string, unknown>): number {
  let score = 20
  if (normalizeEmail(input.email)) score += 25
  if (normalizePhone(input.phone)) score += 15
  if (normalizeText(input.website)) score += 15
  if (normalizeText(input.address)) score += 10
  if (normalizeText(input.category || input.industry).toLowerCase().match(/epoxy|concrete|floor|general contractor/)) score += 15
  return Math.min(score, 100)
}

export function contractorFromLead(
  lead: Record<string, unknown>,
  fallback: { city: string; state: string; industry: string; source: string }
): ContractorRecord | null {
  const companyName = normalizeText(lead.company_name || lead.name || lead.business_name)
  if (!companyName) return null
  const email = normalizeEmail(lead.email)
  const phone = normalizePhone(lead.phone)
  const website = normalizeText(lead.website || lead.url)
  const city = normalizeText(lead.city) || fallback.city
  const state = (normalizeText(lead.state) || fallback.state).toUpperCase()
  const address = normalizeText(lead.address || lead.street_address)
  const fingerprint = simpleHash([companyName.toLowerCase(), email, phone, city.toLowerCase(), state].join('|'))
  const score = scoreContractor({ ...lead, email, phone, website, address, category: lead.category || fallback.industry })

  return {
    fingerprint,
    company_name: companyName,
    email: email || undefined,
    phone: phone || undefined,
    website: website || undefined,
    address: address || undefined,
    city,
    state,
    category: normalizeText(lead.category || lead.industry || fallback.industry),
    source: normalizeText(lead.source || fallback.source),
    source_url: normalizeText(lead.source_url) || undefined,
    score,
    status: score >= 55 ? 'qualified' : 'discovered',
    raw: lead,
  }
}

export function opportunityFromUnknown(
  input: Record<string, unknown>,
  sourceName: string,
  fallbackState?: string
): OpportunityRecord | null {
  const title = normalizeText(input.title || input.name || input.solicitation_title)
  if (!title) return null
  const sourceUrl = normalizeText(input.source_url || input.url || input.link)
  const agency = normalizeText(input.agency || input.organization || input.buyer)
  const dueDate = normalizeText(input.due_date || input.deadline || input.response_deadline)
  const state = (normalizeText(input.state) || fallbackState || '').toUpperCase()
  const fingerprint = simpleHash([sourceName, title.toLowerCase(), agency.toLowerCase(), dueDate, sourceUrl].join('|'))
  const description = normalizeText(input.description || input.summary || input.scope)
  const relevant = `${title} ${description}`.toLowerCase().match(/concrete|epoxy|floor|polish|coating|resin|overlay|surface prep/)
  let score = relevant ? 60 : 20
  if (dueDate) score += 10
  if (sourceUrl) score += 10
  if (state) score += 10
  if (normalizeEmail(input.contact_email || input.email)) score += 10

  return {
    fingerprint,
    source_name: sourceName,
    source_url: sourceUrl || undefined,
    title,
    description: description || undefined,
    agency: agency || undefined,
    contact_name: normalizeText(input.contact_name) || undefined,
    contact_email: normalizeEmail(input.contact_email || input.email) || undefined,
    contact_phone: normalizePhone(input.contact_phone || input.phone) || undefined,
    location: normalizeText(input.location || input.job_address) || undefined,
    city: normalizeText(input.city) || undefined,
    state: state || undefined,
    due_date: dueDate || undefined,
    posted_date: normalizeText(input.posted_date || input.publish_date) || undefined,
    estimated_value: Number(input.estimated_value || input.value || 0) || undefined,
    documents: Array.isArray(input.documents) ? input.documents.map(String) : undefined,
    score: Math.min(score, 100),
    status: score >= 55 ? 'qualified' : 'discovered',
    raw: input,
  }
}
