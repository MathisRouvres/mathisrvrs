/**
 * Calendrier des tâches maison : dates et récurrences, sans dépendance au fuseau.
 *
 * Une date est une clé locale « AAAA-MM-JJ » (jour du calendrier, pas un instant) ; les calculs
 * passent par un numéro de jour (jours depuis le 1970-01-01, en UTC) pour ignorer les heures d'été.
 * Les occurrences d'une tâche répétée sont déroulées ici, dans le navigateur : la base ne stocke que
 * la règle et, par date prévue, ce qui a été fait ou sauté (`Mark`) et les reports (`Move`).
 * Une tâche `after` revient `every` jours après la dernière fois : sa prochaine date dépend de sa
 * dernière marque (`Chain`), pas du calendrier.
 */

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'after'

export interface Task {
  id: string
  title: string
  notes: string
  category: string
  /** Première date (AAAA-MM-JJ). */
  start: string
  /** Heure prévue « HH:MM », ou null (dans la journée, sans heure). */
  time: string | null
  repeat: Repeat
  /** Tous les N jours / semaines / mois / ans (1 = chaque) ; `after` : N jours après la dernière fois. */
  every: number
  /** Jours ISO (1 = lundi … 7 = dimanche) pour une tâche hebdomadaire ; vide = jour de `start`. */
  weekdays: number[]
  /** Dernière date possible (incluse), ou null. */
  until: string | null
  /** Durée estimée en minutes, ou null. */
  duration: number | null
  /** Personnes chargées de la tâche, dans l'ordre du tour de rôle. */
  assignees: string[]
  /** Tâche répétée : une seule personne par occurrence, à tour de rôle. */
  rotate: boolean
}

export interface Mark {
  taskId: string
  date: string
  status: 'done' | 'skipped'
  /** Qui l'a faite (status done), ou null. */
  personId: string | null
  /** Jour où elle a été cochée (AAAA-MM-JJ). */
  doneOn?: string | null
}

/** Date prévue `date` d'une tâche déplacée au jour `to`, à l'heure `at` (null : heure de la tâche). */
export interface Move {
  taskId: string
  date: string
  to: string
  at?: string | null
}

/** Tâche `after` : sa dernière marque (date prévue, jour coché) et le nombre de ses marques. */
export interface Chain {
  taskId: string
  date: string
  doneOn: string | null
  count: number
}

export interface Occurrence {
  task: Task
  /** Date affichée : la date prévue, ou celle du report. */
  date: string
  /** Date prévue : clé des marques et des reports de cette occurrence. */
  origin: string
  /** Heure affichée « HH:MM » (celle du déplacement, sinon celle de la tâche), ou null. */
  time: string | null
  /** Rang de l'occurrence depuis `start` (0 = la première ; -1 = inconnu) : sert au tour de rôle. */
  index: number
  /** Personnes chargées de cette occurrence-ci. */
  assignees: string[]
  mark: Mark | null
}

const DAY_MS = 86_400_000
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export const WEEKDAY_SHORT = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
export const WEEKDAY_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = KEY_RE.exec(value)
  if (!match) return false
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)
}

/** Numéro de jour d'une clé AAAA-MM-JJ. */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

export function keyOfDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

/** Clé du jour local d'une Date (heure de l'appareil). */
export function keyOfDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(): string {
  return keyOfDate(new Date())
}

export function addDays(key: string, days: number): string {
  return keyOfDay(dayNumber(key) + days)
}

/** Jour ISO : 1 = lundi … 7 = dimanche. */
export function isoWeekday(key: string): number {
  // Le 1970-01-01 était un jeudi (4).
  return ((((dayNumber(key) + 3) % 7) + 7) % 7) + 1
}

export function startOfWeek(key: string): string {
  return addDays(key, 1 - isoWeekday(key))
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`
}

/** Premier jour du mois décalé de `months` mois. */
export function addMonths(key: string, months: number): string {
  const [y, m] = key.split('-').map(Number)
  const index = y * 12 + (m - 1) + months
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Clés de `from` à `to` inclus. */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = dayNumber(from); day <= dayNumber(to); day++) days.push(keyOfDay(day))
  return days
}

/** Grille d'un mois : semaines complètes du lundi au dimanche. */
export function monthGrid(monthKey: string): string[] {
  const first = startOfMonth(monthKey)
  const last = addDays(addMonths(first, 1), -1)
  return daysBetween(startOfWeek(first), addDays(startOfWeek(last), 6))
}

function weekdaysOf(task: Task): number[] {
  return task.weekdays.length > 0 ? task.weekdays : [isoWeekday(task.start)]
}

/** Date de la k-ième période d'une tâche mensuelle / annuelle (jour ramené à la fin du mois). */
function periodDate(task: Task, k: number): string {
  const [y, m, d] = task.start.split('-').map(Number)
  const months = task.repeat === 'monthly' ? k * task.every : k * task.every * 12
  const index = y * 12 + (m - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  const day = Math.min(d, daysInMonth(year, month))
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Le jour `day` (≥ start) est-il une occurrence d'une tâche quotidienne ou hebdomadaire ? */
function matchesDay(task: Task, day: number, weekdays: number[]): boolean {
  if (task.repeat === 'daily') return (day - dayNumber(task.start)) % task.every === 0
  const week = Math.floor((day - dayNumber(startOfWeek(task.start))) / 7)
  return week % task.every === 0 && weekdays.includes(((((day + 3) % 7) + 7) % 7) + 1)
}

/**
 * Dates d'occurrence de `task` entre `from` et `to` inclus, chacune avec son rang depuis `start`.
 * Une tâche sans répétition a une seule occurrence, à `start` ; une tâche `after` aussi (les
 * suivantes dépendent de ses marques : voir `nextAfter`).
 */
export function occurrenceDates(task: Task, from: string, to: string): Array<{ date: string; index: number }> {
  const first = dayNumber(task.start)
  const last = Math.min(dayNumber(to), task.until ? dayNumber(task.until) : Infinity)
  const lo = Math.max(dayNumber(from), first)
  if (lo > last) return []
  if (task.repeat === 'none' || task.repeat === 'after') return lo === first ? [{ date: task.start, index: 0 }] : []

  const result: Array<{ date: string; index: number }> = []
  if (task.repeat === 'monthly' || task.repeat === 'yearly') {
    for (let k = 0; ; k++) {
      const day = dayNumber(periodDate(task, k))
      if (day > last) break
      if (day >= lo) result.push({ date: keyOfDay(day), index: k })
    }
    return result
  }

  // Quotidienne / hebdomadaire : on compte depuis `start` (rang du tour de rôle), en ne gardant que
  // les jours de la période. Quelques milliers de tours au plus pour une tâche vieille de plusieurs années.
  const weekdays = weekdaysOf(task)
  let index = 0
  for (let day = first; day <= last; day++) {
    if (!matchesDay(task, day, weekdays)) continue
    if (day >= lo) result.push({ date: keyOfDay(day), index })
    index++
  }
  return result
}

/** Personnes chargées de l'occurrence de rang `index`. */
export function assigneesAt(task: Task, index: number): string[] {
  if (task.rotate && task.repeat !== 'none' && task.assignees.length > 1) {
    return [task.assignees[index % task.assignees.length]]
  }
  return task.assignees
}

/**
 * Prochaine date d'une tâche `after` : `every` jours après le jour où sa dernière marque a été
 * cochée, jamais avant le lendemain de sa date prévue ni avant `start`. Sans marque : `start`.
 */
export function nextAfter(task: Task, chain: Chain | undefined): { date: string; index: number } | null {
  let date = task.start
  let index = 0
  if (chain) {
    const candidates = [addDays(chain.doneOn ?? chain.date, task.every), addDays(chain.date, 1), task.start]
    date = candidates.reduce((max, key) => (key > max ? key : max))
    index = chain.count
  }
  if (task.until && date > task.until) return null
  return { date, index }
}

/**
 * Toutes les occurrences affichées entre `from` et `to` (après reports), triées par date puis titre,
 * avec leur marque éventuelle. `moves` et `chains` viennent de l'API (`state`).
 */
export function expand(
  tasks: Task[],
  marks: Mark[],
  from: string,
  to: string,
  extras: { moves?: Move[]; chains?: Chain[] } = {},
): Occurrence[] {
  const moves = extras.moves ?? []
  const markOf = new Map(marks.map((mark) => [`${mark.taskId}|${mark.date}`, mark]))
  const moveOf = new Map(moves.map((move) => [`${move.taskId}|${move.date}`, move]))
  const chainOf = new Map((extras.chains ?? []).map((chain) => [chain.taskId, chain]))
  const result: Occurrence[] = []

  for (const task of tasks) {
    // Dates prévues candidates → rang (-1 : déjà cochée, rang inconnu).
    const planned = new Map<string, number>()
    if (task.repeat === 'after') {
      for (const mark of marks) if (mark.taskId === task.id) planned.set(mark.date, -1)
      const next = nextAfter(task, chainOf.get(task.id))
      if (next) planned.set(next.date, next.index)
    } else {
      for (const { date, index } of occurrenceDates(task, from, to)) planned.set(date, index)
      // Dates prévues hors période mais reportées dedans.
      for (const move of moves) {
        if (move.taskId !== task.id || planned.has(move.date) || move.to < from || move.to > to) continue
        const found = occurrenceDates(task, move.date, move.date)[0]
        if (found) planned.set(found.date, found.index)
      }
    }

    for (const [origin, index] of planned) {
      const move = moveOf.get(`${task.id}|${origin}`)
      const date = move?.to ?? origin
      const time = move?.at ?? task.time
      if (date < from || date > to) continue
      const mark = markOf.get(`${task.id}|${origin}`) ?? null
      const assignees =
        index >= 0 ? assigneesAt(task, index) : task.rotate && mark?.personId ? [mark.personId] : task.assignees
      result.push({ task, date, origin, time, index, assignees, mark })
    }
  }
  // Par jour, puis sans heure d'abord, puis par heure, puis par titre.
  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time ?? '').localeCompare(b.time ?? '') ||
      a.task.title.localeCompare(b.task.title, 'fr'),
  )
}

/** Phrase courte décrivant la répétition (« Chaque semaine, le lundi et jeudi »). */
export function describeRepeat(task: Pick<Task, 'repeat' | 'every' | 'weekdays' | 'start' | 'until'>): string {
  const n = task.every
  let text: string
  switch (task.repeat) {
    case 'none':
      return 'Une seule fois'
    case 'daily':
      text = n === 1 ? 'Chaque jour' : `Tous les ${n} jours`
      break
    case 'weekly': {
      const days = (task.weekdays.length > 0 ? task.weekdays : [isoWeekday(task.start)]).slice().sort((a, b) => a - b)
      const names = days.length === 7 ? 'tous les jours' : `le ${joinFr(days.map((d) => WEEKDAY_LONG[d - 1]))}`
      text = `${n === 1 ? 'Chaque semaine' : `Toutes les ${n} semaines`}, ${names}`
      break
    }
    case 'monthly':
      text = `${n === 1 ? 'Chaque mois' : `Tous les ${n} mois`}, le ${Number(task.start.slice(8))}`
      break
    case 'yearly':
      text = `${n === 1 ? 'Chaque année' : `Tous les ${n} ans`}, le ${formatDay(task.start, { day: 'numeric', month: 'long' })}`
      break
    case 'after':
      text = n === 1 ? 'Le lendemain de la dernière fois' : `${n} jours après la dernière fois`
      break
  }
  return task.until ? `${text}, jusqu’au ${formatDay(task.until, { day: 'numeric', month: 'short', year: 'numeric' })}` : text
}

function joinFr(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

/** Mise en forme française d'une clé de date (calculée à midi UTC : jamais décalée d'un jour). */
export function formatDay(key: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('fr-FR', { ...options, timeZone: 'UTC' })
}
