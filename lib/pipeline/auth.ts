import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function pipelineAuthorized(req: NextRequest): boolean {
  const expected = process.env.PIPELINE_SECRET || process.env.CRON_SECRET || ''
  if (!expected) return process.env.NODE_ENV !== 'production'
  const supplied =
    req.headers.get('x-pipeline-secret') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''
  return constantTimeEqual(supplied, expected)
}

export function reviewAuthorized(req: NextRequest): boolean {
  const expected = process.env.KEVIN_REVIEW_SECRET || ''
  if (!expected) return process.env.NODE_ENV !== 'production'
  const supplied = req.headers.get('x-review-secret') || ''
  return constantTimeEqual(supplied, expected)
}

export function createApprovalSignature(id: string, approvedAt: string): string {
  const secret = process.env.KEVIN_REVIEW_SECRET || process.env.PIPELINE_SECRET || ''
  if (!secret) return ''
  return createHmac('sha256', secret).update(`${id}|${approvedAt}`).digest('hex')
}

export function verifyApprovalSignature(id: string, approvedAt: string, signature: string): boolean {
  if (!signature) return false
  const expected = createApprovalSignature(id, approvedAt)
  return !!expected && constantTimeEqual(signature, expected)
}
