/**
 * Grille du calendrier /dispo : semaines du lundi au dimanche, créneaux de 30 min de 8 h à
 * 23 h, à l'heure locale du navigateur. Un créneau est identifié par l'ISO UTC de son début
 * (`2026-11-12T17:00:00.000Z`) ; l'API (public/dispo-api.php) le stocke en secondes Unix.
 */

import type { SlotChanges, WeekRows } from './api'

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

/** Règle « chaque semaine » : jour ISO (1 = lundi) et minute de l'heure locale (480 = 8:00). */
export interface WeeklyRule {
  weekday: number
  minute: number
}

/** Par personne : créneaux ponctuels, règles (`weekday-minute`) et exceptions (clés ISO). */
export interface WeekData {
  slots: Map<string, Set<string>>
  weekly: Map<string, Set<string>>
  skips: Map<string, Set<string>>
}

/** Ce que je change, en attente d'enregistrement : `slot:<iso>`, `weekly:<j>-<min>`, `skip:<iso>` → présent ou non. */
export type Overlay = Map<string, boolean>

export type GridMode = 'week' | 'weekly'

export function ruleKey(rule: WeeklyRule): string {
  return `${rule.weekday}-${rule.minute}`
}

/** Jour ISO et minute locale d'un début de créneau. */
export function ruleOf(start: Date): WeeklyRule {
  return { weekday: ((start.getDay() + 6) % 7) + 1, minute: start.getHours() * 60 + start.getMinutes() }
}

function add(map: Map<string, Set<string>>, id: string, value: string) {
  let set = map.get(id)
  if (!set) {
    set = new Set()
    map.set(id, set)
  }
  set.add(value)
}

export function buildWeekData(rows: WeekRows): WeekData {
  const data: WeekData = { slots: new Map(), weekly: new Map(), skips: new Map() }
  for (const row of rows.slots) add(data.slots, row.personId, normalizeKey(row.start))
  for (const row of rows.weekly) add(data.weekly, row.personId, ruleKey(row))
  for (const row of rows.skips) add(data.skips, row.personId, normalizeKey(row.start))
  return data
}

/** Mes modifications en attente appliquées à mes données (les autres restent telles quelles). */
export function applyOverlay(data: WeekData, meId: string, overlay: Overlay): WeekData {
  if (overlay.size === 0) return data
  const mine = (map: Map<string, Set<string>>) => new Set(map.get(meId) ?? [])
  const slots = mine(data.slots)
  const weekly = mine(data.weekly)
  const skips = mine(data.skips)
  for (const [op, on] of overlay) {
    const [kind, value] = [op.slice(0, op.indexOf(':')), op.slice(op.indexOf(':') + 1)]
    const target = kind === 'slot' ? slots : kind === 'weekly' ? weekly : skips
    if (on) target.add(value)
    else target.delete(value)
    // Poser ou retirer une règle efface ses exceptions (même règle côté serveur).
    if (kind === 'weekly') {
      for (const key of [...skips]) if (ruleKey(ruleOf(new Date(key))) === value) skips.delete(key)
    }
  }
  const replace = (map: Map<string, Set<string>>, set: Set<string>) => new Map(map).set(meId, set)
  return { slots: replace(data.slots, slots), weekly: replace(data.weekly, weekly), skips: replace(data.skips, skips) }
}

/** Disponibilités réelles de la semaine : créneaux ponctuels + règles, moins les exceptions. */
export function expandWeek(data: WeekData, days: Date[]): Availability {
  const map: Availability = new Map()
  for (const [id, keys] of data.slots) for (const key of keys) add(map, key, id)
  for (const [id, rules] of data.weekly) {
    const skips = data.skips.get(id)
    for (const day of days) {
      for (let index = 0; index < SLOTS_PER_DAY; index++) {
        const start = slotStart(day, index)
        const key = slotKey(start)
        if (rules.has(ruleKey(ruleOf(start))) && !skips?.has(key)) add(map, key, id)
      }
    }
  }
  return map
}

/** Semaine type : qui a une règle sur chaque créneau, posé sur les dates de `days`. */
export function weeklyPattern(data: WeekData, days: Date[]): Availability {
  const map: Availability = new Map()
  for (const day of days) {
    for (let index = 0; index < SLOTS_PER_DAY; index++) {
      const start = slotStart(day, index)
      const rule = ruleKey(ruleOf(start))
      for (const [id, rules] of data.weekly) if (rules.has(rule)) add(map, slotKey(start), id)
    }
  }
  return map
}

/** Créneaux de la semaine où je suis dispo grâce à une règle (pour les signaler ↻). */
export function myRecurringKeys(data: WeekData, meId: string, days: Date[]): Set<string> {
  const rules = data.weekly.get(meId)
  const skips = data.skips.get(meId)
  const keys = new Set<string>()
  if (!rules) return keys
  for (const day of days) {
    for (let index = 0; index < SLOTS_PER_DAY; index++) {
      const start = slotStart(day, index)
      if (rules.has(ruleKey(ruleOf(start))) && !skips?.has(slotKey(start))) keys.add(slotKey(start))
    }
  }
  return keys
}

function parseRule(value: string): WeeklyRule {
  const [weekday, minute] = value.split('-').map(Number)
  return { weekday: weekday ?? 0, minute: minute ?? 0 }
}

/** Modifications en attente → corps de `saveSlots`. */
export function changesFromOverlay(ops: Iterable<[string, boolean]>): SlotChanges {
  const changes: SlotChanges = { add: [], remove: [], weeklyAdd: [], weeklyRemove: [], skipAdd: [], skipRemove: [] }
  for (const [op, on] of ops) {
    const value = op.slice(op.indexOf(':') + 1)
    if (op.startsWith('slot:')) (on ? changes.add : changes.remove).push(value)
    else if (op.startsWith('weekly:')) (on ? changes.weeklyAdd : changes.weeklyRemove).push(parseRule(value))
    else (on ? changes.skipAdd : changes.skipRemove).push({ start: value, ...ruleOf(new Date(value)) })
  }
  return changes
}

/** Exceptions en attente qui portent sur la règle `rule` (`weekday-minute`). */
export function skipOpsOfRule(overlay: Overlay, rule: string): string[] {
  return [...overlay.keys()].filter((op) => op.startsWith('skip:') && ruleKey(ruleOf(new Date(op.slice(5)))) === rule)
}

/**
 * Opérations pour me rendre dispo (`on`) ou non sur le créneau `start`.
 * - `weekly` : la règle du même jour et de la même heure, toutes les semaines.
 * - `week` : cette date seulement ; une règle existante est levée par une exception, pas supprimée.
 */
export function toggleOps(data: WeekData, meId: string, start: Date, on: boolean, mode: GridMode): Array<[string, boolean]> {
  const rule = ruleKey(ruleOf(start))
  if (mode === 'weekly') return [[`weekly:${rule}`, on]]

  const key = slotKey(start)
  const hasRule = data.weekly.get(meId)?.has(rule) ?? false
  const skipped = data.skips.get(meId)?.has(key) ?? false
  const hasSlot = data.slots.get(meId)?.has(key) ?? false
  if (on) {
    if (hasRule && skipped) return [[`skip:${key}`, false]]
    return hasRule || hasSlot ? [] : [[`slot:${key}`, true]]
  }
  const ops: Array<[string, boolean]> = []
  if (hasSlot) ops.push([`slot:${key}`, false])
  if (hasRule && !skipped) ops.push([`skip:${key}`, true])
  return ops
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
