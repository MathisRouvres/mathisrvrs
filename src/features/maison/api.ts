/**
 * Accès à l'API des tâches maison (`public/maison-api.php`, MySQL du VPS), même origine que le
 * site. L'API ne répond que sur maison.mathis-rvrs.fr, derrière la connexion de l'espace privé.
 * En dev, `VITE_MAISON_ENDPOINT` peut viser un autre serveur.
 */
import type { Mark, Task } from './recurrence'

export interface Person {
  id: string
  name: string
  /** Couleur « #rrggbb ». */
  color: string
  avatar: string | null
}

export interface MaisonState {
  people: Person[]
  tasks: Task[]
  marks: Mark[]
}

/** Champs envoyés pour créer (sans id) ou modifier (avec id) une tâche. */
export type TaskInput = Omit<Task, 'id'> & { id?: string }

export type MaisonErrorKind = 'unavailable' | 'duplicate' | 'full' | 'invalid' | 'not-found' | 'forbidden' | 'network'

export class MaisonError extends Error {
  readonly kind: MaisonErrorKind

  constructor(kind: MaisonErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

const ENDPOINT = import.meta.env.VITE_MAISON_ENDPOINT || '/maison-api.php'
const KINDS: MaisonErrorKind[] = ['unavailable', 'duplicate', 'full', 'invalid', 'not-found', 'forbidden']

async function call<T>(action: string, init: { query?: Record<string, string>; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const params = new URLSearchParams({ action, ...init.query })
  let response: Response
  try {
    response = await fetch(`${ENDPOINT}?${params}`, {
      method: init.body === undefined ? 'GET' : 'POST',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
      credentials: 'same-origin',
    })
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new MaisonError('network', 'Connexion impossible. Vérifie ta connexion internet.')
  }

  const data = (await response.json().catch(() => null)) as (T & { error?: string; message?: string }) | null
  if (response.ok && data) return data
  const kind = KINDS.find((k) => k === data?.error) ?? (response.status >= 500 ? 'unavailable' : 'network')
  throw new MaisonError(kind, data?.message || `Le serveur a répondu ${response.status}.`)
}

/** Personnes, tâches et marques (fait / sauté) des dates `from` à `to` incluses. */
export async function loadState(from: string, to: string, signal?: AbortSignal): Promise<MaisonState> {
  const data = await call<Partial<MaisonState>>('state', { query: { from, to }, signal })
  return { people: data.people ?? [], tasks: data.tasks ?? [], marks: data.marks ?? [] }
}

export async function savePerson(person: Omit<Person, 'id'> & { id?: string }): Promise<Person> {
  return (await call<{ person: Person }>('person', { body: person })).person
}

export async function deletePerson(id: string): Promise<void> {
  await call('person-delete', { body: { id } })
}

export async function saveTask(task: TaskInput): Promise<Task> {
  return (await call<{ task: Task }>('task', { body: task })).task
}

export async function deleteTask(id: string): Promise<void> {
  await call('task-delete', { body: { id } })
}

/** Marque une occurrence faite ou sautée ; `status: null` la remet à faire. */
export async function setMark(taskId: string, date: string, status: Mark['status'] | null, personId: string | null): Promise<void> {
  await call('mark', { body: { taskId, date, status, personId } })
}
