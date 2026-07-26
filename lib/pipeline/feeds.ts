import type { FeedConfig, OpportunityRecord } from './types'
import { opportunityFromUnknown, normalizeText } from './normalize'

const MAX_FEED_BYTES = Math.max(100_000, Math.min(Number(process.env.PUBLIC_BID_FEED_MAX_BYTES || 5_000_000), 10_000_000))
const SAFE_HEADER_NAMES = new Set(['authorization', 'x-api-key', 'api-key'])

function publicHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    if (
      host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host === '0.0.0.0' || host === '::1' || host.startsWith('127.') || host.startsWith('10.') ||
      host.startsWith('192.168.') || host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return null
    url.username = ''
    url.password = ''
    return url.toString()
  } catch {
    return null
  }
}

function safeHeaders(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const headers: Record<string, string> = {}
  for (const [name, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const normalized = name.toLowerCase()
    if (!SAFE_HEADER_NAMES.has(normalized) || typeof rawValue !== 'string' || rawValue.length > 4096) continue
    headers[name] = rawValue
  }
  return Object.keys(headers).length ? headers : undefined
}

export function configuredFeeds(): FeedConfig[] {
  const raw = process.env.PUBLIC_BID_FEEDS_JSON || '[]'
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, 100).flatMap((candidate): FeedConfig[] => {
      if (!candidate || typeof candidate !== 'object') return []
      const feed = candidate as Record<string, unknown>
      const url = publicHttpsUrl(feed.url)
      const format = feed.format
      const name = typeof feed.name === 'string' ? feed.name.trim().slice(0, 120) : ''
      const state = typeof feed.state === 'string' && /^[A-Za-z]{2}$/.test(feed.state) ? feed.state.toUpperCase() : undefined
      if (!url || !name || !['json', 'rss', 'atom'].includes(String(format))) return []
      return [{
        name,
        url,
        format: format as FeedConfig['format'],
        state,
        headers: safeHeaders(feed.headers)
      }]
    })
  } catch {
    return []
  }
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(block: string, names: string[]): string {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))
    if (match?.[1]) return decodeXml(match[1])
  }
  return ''
}

function linkFromAtom(block: string): string {
  const href = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]
  return href || tag(block, ['link', 'guid'])
}

function parseXmlFeed(xml: string, feed: FeedConfig): OpportunityRecord[] {
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) || []
  return blocks.slice(0, 10_000)
    .map(block => opportunityFromUnknown({
      title: tag(block, ['title']),
      description: tag(block, ['description', 'summary', 'content']),
      link: linkFromAtom(block),
      posted_date: tag(block, ['pubDate', 'published', 'updated']),
      due_date: tag(block, ['deadline', 'dueDate', 'responseDate']),
      agency: tag(block, ['author', 'dc:creator', 'organization']),
      state: feed.state
    }, feed.name, feed.state))
    .filter((item): item is OpportunityRecord => Boolean(item))
}

function findJsonItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(item => item && typeof item === 'object').slice(0, 10_000) as Record<string, unknown>[]
  if (!payload || typeof payload !== 'object') return []
  const object = payload as Record<string, unknown>
  for (const key of ['opportunities', 'results', 'items', 'data', 'records', 'notices']) {
    if (Array.isArray(object[key])) return (object[key] as Record<string, unknown>[]).slice(0, 10_000)
  }
  return [object]
}

export async function pullFeed(feed: FeedConfig): Promise<OpportunityRecord[]> {
  const safeUrl = publicHttpsUrl(feed.url)
  if (!safeUrl) throw new Error('invalid_feed_url')

  const response = await fetch(safeUrl, {
    headers: {
      Accept: feed.format === 'json' ? 'application/json' : 'application/rss+xml, application/atom+xml, text/xml',
      'User-Agent': 'BidGenius/2.1',
      ...(feed.headers || {})
    },
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000)
  })
  if (!response.ok) throw new Error('feed_request_failed')

  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (declaredLength > MAX_FEED_BYTES) throw new Error('feed_too_large')
  const body = await response.text()
  if (Buffer.byteLength(body, 'utf8') > MAX_FEED_BYTES) throw new Error('feed_too_large')

  if (feed.format === 'json') {
    let payload: unknown
    try {
      payload = JSON.parse(body)
    } catch {
      throw new Error('invalid_feed_json')
    }
    return findJsonItems(payload)
      .map(item => opportunityFromUnknown(item, feed.name, feed.state))
      .filter((item): item is OpportunityRecord => Boolean(item))
  }

  return parseXmlFeed(body, feed)
}

export function opportunityJobText(opportunity: OpportunityRecord): string {
  return [
    `Bid opportunity: ${opportunity.title}`,
    opportunity.agency ? `Issuing organization: ${opportunity.agency}` : '',
    opportunity.location ? `Project location: ${opportunity.location}` : '',
    opportunity.city || opportunity.state ? `City/State: ${normalizeText(opportunity.city)}, ${normalizeText(opportunity.state)}` : '',
    opportunity.due_date ? `Bid due: ${opportunity.due_date}` : '',
    opportunity.contact_name ? `Contact: ${opportunity.contact_name}` : '',
    opportunity.contact_email ? `Contact email: ${opportunity.contact_email}` : '',
    opportunity.description ? `Scope: ${opportunity.description}` : '',
    opportunity.source_url ? `Source: ${opportunity.source_url}` : ''
  ].filter(Boolean).join('\n').slice(0, 50_000)
}
