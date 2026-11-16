/**
 * Calendrier des tâches maison : dates et récurrences, sans dépendance au fuseau.
 *
 * Une date est une clé locale « AAAA-MM-JJ » (jour du calendrier, pas un instant) ; les calculs
 * passent par un numéro de jour (jours depuis le 1970-01-01, en UTC) pour ignorer les heures d'été.
 * Les occurrences d'une tâche répétée sont déroulées ici, dans le navigateur : la base ne stocke que
 * la règle et, par date, ce qui a été fait ou sauté (`Mark`).
 */

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Task {
  id: string
  title: string
  notes: string
  category: string
  /** Première date (AAAA-MM-JJ). */
  start: string
  repeat: Repeat
  /** Tous les N jours / semaines / mois / ans (1 = chaque). */
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
}

export interface Occurrence {
  task: Task
  date: string
  /** Rang de l'occurrence depuis `start` (0 = la première) : sert au tour de rôle. */
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
 * Une tâche sans répétition a une seule occurrence, à `start`.
 */
export function occurrenceDates(task: Task, from: string, to: string): Array<{ date: string; index: number }> {
  const first = dayNumber(task.start)
  const last = Math.min(dayNumber(to), task.until ? dayNumber(task.until) : Infinity)
  const lo = Math.max(dayNumber(from), first)
  if (lo > last) return []
  if (task.repeat === 'none') return lo === first ? [{ date: task.start, index: 0 }] : []

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

/** Toutes les occurrences de la période, triées par date puis titre, avec leur marque éventuelle. */
export function expand(tasks: Task[], marks: Mark[], from: string, to: string): Occurrence[] {
  const byKey = new Map(marks.map((mark) => [`${mark.taskId}|${mark.date}`, mark]))
  const result: Occurrence[] = []
  for (const task of tasks) {
    for (const { date, index } of occurrenceDates(task, from, to)) {
      result.push({
        task,
        date,
        index,
        assignees: assigneesAt(task, index),
        mark: byKey.get(`${task.id}|${date}`) ?? null,
      })
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.task.title.localeCompare(b.task.title, 'fr'))
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
