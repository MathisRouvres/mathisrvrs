/**
 * Accès à l'API du calendrier (`public/dispo-api.php`, MySQL du VPS), même origine que le site.
 * En dev, `VITE_DISPO_ENDPOINT` peut viser un serveur PHP local.
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

export async function listSlots(from: Date, to: Date, signal?: AbortSignal): Promise<SlotRow[]> {
  const query = { from: from.toISOString(), to: to.toISOString() }
  return (await call<{ slots: SlotRow[] }>('slots', { query, signal })).slots
}

/** Ajouts et retraits de créneaux d'une personne, enregistrés ensemble (transaction). */
export async function saveSlots(personId: string, add: string[], remove: string[]): Promise<void> {
  if (add.length === 0 && remove.length === 0) return
  await call('slots', { body: { personId, add, remove } })
}
