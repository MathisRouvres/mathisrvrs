/**
 * Accès à l'API du calendrier (`public/dispo-api.php`, MySQL du VPS), même origine que le site.
 * En dev, `VITE_DISPO_ENDPOINT` peut viser un serveur PHP local.
 */

export interface Person {
  id: string
  name: string
  avatar: string | null
}

export interface WeeklyRuleRow {
  weekday: number
  minute: number
}

/** Ce qu'une semaine contient : créneaux ponctuels, règles hebdomadaires (toutes), exceptions. */
export interface WeekRows {
  slots: Array<{ personId: string; start: string }>
  weekly: Array<{ personId: string } & WeeklyRuleRow>
  skips: Array<{ personId: string; start: string }>
}

/** Modifications de mes disponibilités, enregistrées ensemble (transaction). */
export interface SlotChanges {
  add: string[]
  remove: string[]
  weeklyAdd: WeeklyRuleRow[]
  weeklyRemove: WeeklyRuleRow[]
  skipAdd: Array<{ start: string } & WeeklyRuleRow>
  skipRemove: Array<{ start: string } & WeeklyRuleRow>
}

export type DispoErrorKind = 'unavailable' | 'duplicate' | 'full' | 'invalid' | 'not-found' | 'network'

export class DispoError extends Error {
  readonly kind: DispoErrorKind

  constructor(kind: DispoErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

const ENDPOINT = import.meta.env.VITE_DISPO_ENDPOINT || '/dispo-api.php'
const KINDS: DispoErrorKind[] = ['unavailable', 'duplicate', 'full', 'invalid', 'not-found']

async function call<T>(action: string, init: { query?: Record<string, string>; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const params = new URLSearchParams({ action, ...init.query })
  let response: Response
  try {
    response = await fetch(`${ENDPOINT}?${params}`, {
      method: init.body === undefined ? 'GET' : 'POST',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    })
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new DispoError('network', 'Connexion impossible. Vérifie ta connexion internet.')
  }

  const data = (await response.json().catch(() => null)) as (T & { error?: string; message?: string }) | null
  if (response.ok && data) return data
  const kind = KINDS.find((k) => k === data?.error) ?? (response.status >= 500 ? 'unavailable' : 'network')
  throw new DispoError(kind, data?.message || `Le serveur a répondu ${response.status}.`)
}

export async function listPeople(signal?: AbortSignal): Promise<Person[]> {
  return (await call<{ people: Person[] }>('people', { signal })).people
}

export async function createPerson(name: string, avatar: string | null): Promise<Person> {
  return (await call<{ person: Person }>('people', { body: { name, avatar } })).person
}

export async function updateAvatar(id: string, avatar: string | null): Promise<void> {
  await call('avatar', { body: { id, avatar } })
}

export async function listSlots(from: Date, to: Date, signal?: AbortSignal): Promise<WeekRows> {
  const query = { from: from.toISOString(), to: to.toISOString() }
  const rows = await call<Partial<WeekRows>>('slots', { query, signal })
  return { slots: rows.slots ?? [], weekly: rows.weekly ?? [], skips: rows.skips ?? [] }
}

export async function saveSlots(personId: string, changes: SlotChanges): Promise<void> {
  if (Object.values(changes).every((list) => list.length === 0)) return
  await call('slots', { body: { personId, ...changes } })
}
