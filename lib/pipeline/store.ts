const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function storeConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

function headers(prefer?: string): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!storeConfigured()) throw new Error('Pipeline store is not configured')
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
    cache: 'no-store',
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) as T : ([] as T)
}

export async function selectRows<T>(table: string, query = '', limit = 50): Promise<T[]> {
  return request<T[]>(`${table}?select=*&${query}${query ? '&' : ''}limit=${Math.max(1, Math.min(limit, 500))}`)
}

export async function insertRows<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  options: { upsert?: boolean; onConflict?: string } = {}
): Promise<T[]> {
  if (!rows.length) return []
  const conflict = options.onConflict ? `?on_conflict=${encodeURIComponent(options.onConflict)}` : ''
  const prefer = options.upsert
    ? 'return=representation,resolution=merge-duplicates'
    : 'return=representation'
  return request<T[]>(`${table}${conflict}`, {
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
  return request<T[]>(`${table}?${query}`, {
    method: 'PATCH',
    headers: headers('return=representation'),
    body: JSON.stringify(values),
  })
}

export async function deleteRows(table: string, query: string): Promise<void> {
  await request<unknown>(`${table}?${query}`, {
    method: 'DELETE',
    headers: headers('return=minimal'),
  })
}

export async function recordRun(receipt: Record<string, unknown>): Promise<void> {
  if (!storeConfigured()) return
  await insertRows('bidgenius_pipeline_runs', [receipt], { upsert: true, onConflict: 'run_id' })
}
