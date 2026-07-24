export type PipelineStage =
  | 'discovered'
  | 'qualified'
  | 'fulfilling'
  | 'review_pending'
  | 'approved'
  | 'revision_requested'
  | 'rejected'
  | 'sent'
  | 'failed'

export type ReviewDecision = 'approve' | 'revise' | 'reject'

export interface TerritoryTarget {
  state: string
  city: string
  industries: string[]
}

export interface ContractorRecord {
  fingerprint: string
  company_name: string
  email?: string
  phone?: string
  website?: string
  address?: string
  city?: string
  state?: string
  category?: string
  source?: string
  source_url?: string
  score: number
  status: PipelineStage
  raw?: Record<string, unknown>
}

export interface OpportunityRecord {
  fingerprint: string
  source_name: string
  source_url?: string
  title: string
  description?: string
  agency?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  location?: string
  city?: string
  state?: string
  due_date?: string
  posted_date?: string
  estimated_value?: number
  documents?: string[]
  score: number
  status: PipelineStage
  raw?: Record<string, unknown>
}

export interface FulfillmentRecord {
  id?: string
  opportunity_id?: string
  opportunity_fingerprint: string
  company: 'ncp' | 'nep'
  proposal_number?: string
  proposal_html: string
  parsed?: Record<string, unknown>
  total?: number
  confidence?: number
  status: PipelineStage
  approved_by?: string
  approved_at?: string
  approval_signature?: string
  sent_at?: string
  last_error?: string
}

export interface FeedConfig {
  name: string
  url: string
  format: 'json' | 'rss' | 'atom'
  state?: string
  headers?: Record<string, string>
}

export interface PipelineRunReceipt {
  run_id: string
  phase: string
  status: 'running' | 'complete' | 'failed' | 'blocked'
  territory?: string
  discovered?: number
  qualified?: number
  fulfilled?: number
  reviewed?: number
  sent?: number
  duration_ms?: number
  error?: string
  metadata?: Record<string, unknown>
}
