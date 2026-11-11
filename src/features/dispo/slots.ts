/**
 * Grille du calendrier /dispo : semaines du lundi au dimanche, créneaux de 30 min de 8 h à
 * 23 h, à l'heure locale du navigateur. Un créneau est identifié par l'ISO UTC de son début
 * (`2026-11-12T17:00:00.000Z`), forme stockée dans `dispo_slots.slot_start`.
 */

export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 23
export const SLOT_MINUTES = 30
export const SLOTS_PER_DAY = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES

/** Personnes disponibles par créneau (clé ISO → ids). */
export type Availability = Map<string, Set<string>>

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Lundi 00:00 (heure locale) de la semaine qui contient `date`. */
export function startOfWeek(date: Date): Date {
  const offset = (date.getDay() + 6) % 7
  return addDays(date, -offset)
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/** Début du créneau `index` (0 = 8:00) du jour `day`, heure locale. */
export function slotStart(day: Date, index: number): Date {
  const minutes = DAY_START_HOUR * 60 + index * SLOT_MINUTES
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60)
}

export function slotKey(date: Date): string {
  return date.toISOString()
}

/** `2026-11-12T17:00:00+00:00` (PostgREST) → `2026-11-12T17:00:00.000Z`. */
export function normalizeKey(value: string): string {
  return new Date(value).toISOString()
}

/** Intervalle [from, to) couvrant les créneaux de la semaine. */
export function weekRange(weekStart: Date): { from: Date; to: Date } {
  return { from: slotStart(weekStart, 0), to: addDays(weekStart, 7) }
}

/** `0` → `08:00`, `1` → `08:30`. */
export function slotLabel(index: number): string {
  const minutes = DAY_START_HOUR * 60 + index * SLOT_MINUTES
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function isPastSlot(start: Date, now: Date): boolean {
  return start.getTime() + SLOT_MINUTES * 60_000 <= now.getTime()
}

export function buildAvailability(rows: Array<{ personId: string; start: string }>): Availability {
  const map: Availability = new Map()
  for (const row of rows) {
    const key = normalizeKey(row.start)
    let set = map.get(key)
    if (!set) {
      set = new Set()
      map.set(key, set)
    }
    set.add(row.personId)
  }
  return map
}

export interface CommonRun {
  day: Date
  /** Index du premier créneau et nombre de créneaux consécutifs. */
  startIndex: number
  length: number
  people: string[]
}

/**
 * Plages où au moins `minPeople` personnes sont disponibles ensemble : créneaux
 * consécutifs d'un même jour avec exactement le même groupe, créneaux passés exclus.
 * Triées par taille du groupe, puis durée, puis date.
 */
export function commonRuns(availability: Availability, days: Date[], now: Date, minPeople = 2): CommonRun[] {
  const runs: CommonRun[] = []
  for (const day of days) {
    let current: CommonRun | null = null
    let signature = ''
    for (let index = 0; index < SLOTS_PER_DAY; index++) {
      const start = slotStart(day, index)
      const people = isPastSlot(start, now) ? [] : [...(availability.get(slotKey(start)) ?? [])].sort()
      const sig = people.length >= minPeople ? people.join(',') : ''
      if (current && sig === signature) {
        current.length++
        continue
      }
      if (current) runs.push(current)
      current = sig ? { day, startIndex: index, length: 1, people } : null
      signature = sig
    }
    if (current) runs.push(current)
  }
  return runs.sort(
    (a, b) =>
      b.people.length - a.people.length ||
      b.length - a.length ||
      slotStart(a.day, a.startIndex).getTime() - slotStart(b.day, b.startIndex).getTime(),
  )
}
