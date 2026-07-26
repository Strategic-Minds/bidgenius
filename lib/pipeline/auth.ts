import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function bearerValue(req: NextRequest): string {
  const authorization = req.headers.get('authorization') || ''
  return authorization.replace(/^Bearer\s+/i, '')
}

export function pipelineAuthorized(req: NextRequest): boolean {
  const expected = process.env.PIPELINE_SECRET || process.env.CRON_SECRET || ''
  if (!expected) return process.env.NODE_ENV !== 'production'
  const supplied = req.headers.get('x-pipeline-secret') || bearerValue(req)
  return constantTimeEqual(supplied, expected)
}

export function adminBasicAuthorized(req: NextRequest): boolean {
  if (process.env.ADMIN_UI_AUTH_ENABLED !== 'true') return false
  const expectedUser = process.env.ADMIN_UI_AUTH_USER || ''
  const expectedPassword = process.env.ADMIN_UI_AUTH_PASSWORD || ''
  if (!expectedUser || !expectedPassword) return false

  const authorization = req.headers.get('authorization') || ''
  if (!authorization.startsWith('Basic ')) return false

  try {
    const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8')
    const separator = decoded.indexOf(':')
    if (separator < 1) return false
    const suppliedUser = decoded.slice(0, separator)
    const suppliedPassword = decoded.slice(separator + 1)
    return constantTimeEqual(
      sha256(`${suppliedUser}\u0000${suppliedPassword}`),
      sha256(`${expectedUser}\u0000${expectedPassword}`)
    )
  } catch {
    return false
  }
}

export function operatorAuthorized(req: NextRequest): boolean {
  return pipelineAuthorized(req) || adminBasicAuthorized(req)
}

export function reviewAuthorized(req: NextRequest): boolean {
  const expected = process.env.KEVIN_REVIEW_SECRET || ''
  if (!expected) return process.env.NODE_ENV !== 'production'
  const supplied = req.headers.get('x-review-secret') || bearerValue(req)
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
  return Boolean(expected) && constantTimeEqual(signature, expected)
}
