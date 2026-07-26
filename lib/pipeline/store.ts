const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const REQUEST_TIMEOUT_MS = Math.max(1000, Math.min(Number(process.env.SUPABASE_REQUEST_TIMEOUT_MS || 30000), 120000))

export function storeConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

function assertIdentifier(value: string, label = 'identifier'): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error(`Invalid ${label}`)
  return value
}

function tableUrl(table: string, query = ''): string {
  const safeTable = assertIdentifier(table, 'table name')
  return `${SUPABASE_URL}/rest/v1/${safeTable}${query ? `?${query}` : ''}`
}

function headers(prefer?: string): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  }
}

async function request<T>(table: string, query = '', init: RequestInit = {}): Promise<T> {
  if (!storeConfigured()) throw new Error('Pipeline store is not configured')
  const response = await fetch(tableUrl(table, query), {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
    cache: 'no-store',
    signal: init.signal || AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status})`)
  }
  return text ? JSON.parse(text) as T : ([] as T)
}

export async function selectRows<T>(table: string, query = '', limit = 50): Promise<T[]> {
  const safeLimit = Math.max(1, Math.min(limit, 500))
  const fullQuery = `select=*&${query}${query ? '&' : ''}limit=${safeLimit}`
  return request<T[]>(table, fullQuery)
}

export async function countRows(table: string, query = ''): Promise<number> {
  if (!storeConfigured()) return 0
  const fullQuery = `select=id${query ? `&${query}` : ''}`
  const response = await fetch(tableUrl(table, fullQuery), {
    method: 'HEAD',
    headers: {
      ...headers('count=exact'),
      Range: '0-0',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Supabase count failed (${response.status})`)
  const contentRange = response.headers.get('content-range') || ''
  const total = contentRange.split('/').at(-1)
  if (!total || total === '*') return 0
  const parsed = Number(total)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function latestRow<T>(table: string, timestampColumn = 'updated_at'): Promise<T | null> {
  const column = assertIdentifier(timestampColumn, 'timestamp column')
  const rows = await selectRows<T>(table, `order=${column}.desc`, 1)
  return rows[0] || null
}

export async function insertRows<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  options: { upsert?: boolean; onConflict?: string } = {}
): Promise<T[]> {
  if (!rows.length) return []
  const conflict = options.onConflict
    ? `on_conflict=${encodeURIComponent(assertIdentifier(options.onConflict, 'conflict column'))}`
    : ''
  const prefer = options.upsert
    ? 'return=representation,resolution=merge-duplicates'
    : 'return=representation'
  return request<T[]>(table, conflict, {
    method: 'POST',
    headers: headers(prefer),
    body: JSON.stringify(rows),
  })
}

export async function updateRows<T extends Record<string, unknown>>(
  table: string,
  query: string,
  values: Partial<T>
): Promise<T[]> {
  return request<T[]>(table, query, {
    method: 'PATCH',
    headers: headers('return=representation'),
    body: JSON.stringify(values),
  })
}

export async function deleteRows(table: string, query: string): Promise<void> {
  await request<unknown>(table, query, {
    method: 'DELETE',
    headers: headers('return=minimal'),
  })
}

export async function recordRun(receipt: Record<string, unknown>): Promise<void> {
  if (!storeConfigured()) return
  await insertRows('bidgenius_pipeline_runs', [receipt], { upsert: true, onConflict: 'run_id' })
}
