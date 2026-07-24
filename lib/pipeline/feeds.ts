import type { FeedConfig, OpportunityRecord } from './types'
import { opportunityFromUnknown, normalizeText } from './normalize'

export function configuredFeeds(): FeedConfig[] {
  const raw = process.env.PUBLIC_BID_FEEDS_JSON || '[]'
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(feed => feed && feed.name && feed.url && ['json', 'rss', 'atom'].includes(feed.format))
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
  return blocks
    .map(block => opportunityFromUnknown({
      title: tag(block, ['title']),
      description: tag(block, ['description', 'summary', 'content']),
      link: linkFromAtom(block),
      posted_date: tag(block, ['pubDate', 'published', 'updated']),
      due_date: tag(block, ['deadline', 'dueDate', 'responseDate']),
      agency: tag(block, ['author', 'dc:creator', 'organization']),
      state: feed.state,
    }, feed.name, feed.state))
    .filter((item): item is OpportunityRecord => Boolean(item))
}

function findJsonItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
  if (!payload || typeof payload !== 'object') return []
  const object = payload as Record<string, unknown>
  for (const key of ['opportunities', 'results', 'items', 'data', 'records', 'notices']) {
    if (Array.isArray(object[key])) return object[key] as Record<string, unknown>[]
  }
  return [object]
}

export async function pullFeed(feed: FeedConfig): Promise<OpportunityRecord[]> {
  const response = await fetch(feed.url, {
    headers: {
      Accept: feed.format === 'json' ? 'application/json' : 'application/rss+xml, application/atom+xml, text/xml',
      'User-Agent': 'BidGenius/1.0 (+https://bidgenius-strategic-minds-advisory.vercel.app)',
      ...(feed.headers || {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) throw new Error(`${feed.name} returned ${response.status}`)

  if (feed.format === 'json') {
    const payload = await response.json()
    return findJsonItems(payload)
      .map(item => opportunityFromUnknown(item, feed.name, feed.state))
      .filter((item): item is OpportunityRecord => Boolean(item))
  }

  return parseXmlFeed(await response.text(), feed)
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
    opportunity.source_url ? `Source: ${opportunity.source_url}` : '',
  ].filter(Boolean).join('\n')
}
