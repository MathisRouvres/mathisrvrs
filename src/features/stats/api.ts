/** Lecture des statistiques : fonction Supabase `analytics_stats` (voir docs/analytics). */

export interface Totals {
  pageViews: number
  visitors: number
  sessions: number
  gameStarts: number
}

export interface Stats {
  days: number
  timezone: string
  generatedAt: string
  totals: Totals & { timeMs: number; avgSessionMs: number }
  previous: Totals
  daily: Array<{ day: string; pageViews: number; visitors: number }>
  heatmap: Array<{ dow: number; hour: number; n: number }>
  sections: Array<{ section: string; pageViews: number; visitors: number; timeMs: number }>
  games: Array<{ game: string; starts: number; visitors: number; rooms: number; timeMs: number }>
  devices: Array<{ device: string; visitors: number }>
  referrers: Array<{ referrer: string; visits: number }>
  recent: Array<{ at: string; event: string; path: string; section: string; game: string | null; device: string | null }>
}

export type StatsErrorKind = 'invalid-key' | 'not-installed' | 'not-configured' | 'network'

export class StatsError extends Error {
  readonly kind: StatsErrorKind

  constructor(kind: StatsErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

export async function fetchStats(key: string, days: number, signal?: AbortSignal): Promise<Stats> {
  const url = import.meta.env.VITE_SUPABASE_URL ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
  if (!url || !anonKey) throw new StatsError('not-configured', 'Supabase n’est pas configuré pour ce build.')

  let response: Response
  try {
    response = await fetch(`${url}/rest/v1/rpc/analytics_stats`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key: key, p_days: days }),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new StatsError('network', 'Connexion à Supabase impossible.')
  }

  if (response.ok) return (await response.json()) as Stats

  const body = (await response.json().catch(() => ({}))) as { code?: string }
  if (body.code === '28000' || response.status === 401 || response.status === 403) {
    throw new StatsError('invalid-key', 'Clé incorrecte.')
  }
  if (body.code === 'PGRST202' || response.status === 404) {
    throw new StatsError('not-installed', 'La fonction analytics_stats n’existe pas encore dans Supabase.')
  }
  throw new StatsError('network', `Supabase a répondu ${response.status}.`)
}
