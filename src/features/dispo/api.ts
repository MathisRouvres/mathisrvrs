/**
 * Accès aux tables Supabase `dispo_people` et `dispo_slots` (voir docs/dispo) par PostgREST,
 * sans charger supabase-js. Clé publique : les droits sont fixés côté base (RLS + grants).
 */

export interface Person {
  id: string
  name: string
  avatar: string | null
}

export interface SlotRow {
  personId: string
  start: string
}

export type DispoErrorKind = 'not-configured' | 'not-installed' | 'duplicate' | 'full' | 'invalid' | 'network'

export class DispoError extends Error {
  readonly kind: DispoErrorKind

  constructor(kind: DispoErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

function config() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
  if (!url || !anonKey) throw new DispoError('not-configured', 'Supabase n’est pas configuré pour ce build.')
  return { url, anonKey }
}

async function request(path: string, init: RequestInit & { prefer?: string } = {}): Promise<Response> {
  const { url, anonKey } = config()
  const headers: Record<string, string> = { apikey: anonKey, 'Content-Type': 'application/json' }
  if (init.prefer) headers.Prefer = init.prefer

  let response: Response
  try {
    response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers })
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new DispoError('network', 'Connexion impossible. Vérifie ta connexion internet.')
  }
  if (response.ok) return response

  const body = (await response.json().catch(() => ({}))) as { code?: string }
  if (body.code === '42P01' || body.code === 'PGRST205' || response.status === 404) {
    throw new DispoError('not-installed', 'Le calendrier n’est pas encore installé dans Supabase.')
  }
  if (body.code === '23505') throw new DispoError('duplicate', 'Ce prénom existe déjà : choisis-le dans la liste.')
  if (body.code === 'P0001') throw new DispoError('full', 'Nombre maximum de profils atteint.')
  if (body.code === '23514' || response.status === 400 || response.status === 403) {
    throw new DispoError('invalid', 'Modification refusée.')
  }
  throw new DispoError('network', `Le serveur a répondu ${response.status}.`)
}

export async function listPeople(signal?: AbortSignal): Promise<Person[]> {
  const response = await request('dispo_people?select=id,name,avatar&order=created_at.asc', { signal })
  return (await response.json()) as Person[]
}

export async function createPerson(name: string, avatar: string | null): Promise<Person> {
  const response = await request('dispo_people?select=id,name,avatar', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({ name, avatar }),
  })
  const [person] = (await response.json()) as Person[]
  if (!person) throw new DispoError('network', 'Profil non créé.')
  return person
}

export async function updateAvatar(id: string, avatar: string | null): Promise<void> {
  await request(`dispo_people?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ avatar }),
  })
}

export async function listSlots(from: Date, to: Date, signal?: AbortSignal): Promise<SlotRow[]> {
  const query =
    `select=person_id,slot_start&slot_start=gte.${encodeURIComponent(from.toISOString())}` +
    `&slot_start=lt.${encodeURIComponent(to.toISOString())}&limit=20000`
  const response = await request(`dispo_slots?${query}`, { signal })
  const rows = (await response.json()) as Array<{ person_id: string; slot_start: string }>
  return rows.map((row) => ({ personId: row.person_id, start: row.slot_start }))
}

export async function addSlots(personId: string, starts: string[]): Promise<void> {
  if (starts.length === 0) return
  await request('dispo_slots', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: JSON.stringify(starts.map((slot_start) => ({ person_id: personId, slot_start }))),
  })
}

export async function removeSlots(personId: string, starts: string[]): Promise<void> {
  if (starts.length === 0) return
  const list = starts.map((start) => `"${start}"`).join(',')
  await request(
    `dispo_slots?person_id=eq.${encodeURIComponent(personId)}&slot_start=in.(${encodeURIComponent(list)})`,
    { method: 'DELETE', prefer: 'return=minimal' },
  )
}
