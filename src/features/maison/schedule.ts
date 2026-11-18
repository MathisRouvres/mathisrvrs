/**
 * Heures de la journée : tâches placées à une heure, horaires de travail (`Shift`) et lecture d'un
 * planning collé en texte. Les heures sont des chaînes « HH:MM » (comme l'API) ou des minutes depuis
 * minuit pour les calculs.
 */
import { addDays, isDateKey, type Occurrence } from './recurrence'

/** Un créneau de travail ; `end` <= `start` : horaire de nuit, fin le lendemain. */
export interface Shift {
  personId: string
  day: string
  start: string
  end: string
}

/** Morceau d'un horaire de travail tombant dans une journée donnée (minutes depuis minuit). */
export interface Segment {
  personId: string
  start: number
  end: number
  shift: Shift
}

export const DAY_MINUTES = 24 * 60
/** Durée affichée d'une tâche sans durée estimée. */
export const DEFAULT_DURATION = 30
/** Pas du glisser-déposer. */
export const SNAP_MINUTES = 15

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value)
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Minutes → « HH:MM » (ramené dans la journée, 0 à 23:59). */
export function toTime(minutes: number): string {
  const clamped = Math.min(DAY_MINUTES - 1, Math.max(0, Math.round(minutes)))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

/** « 8h », « 8h30 », « 14h05 » pour l'affichage. */
export function formatTime(time: string): string {
  const [h, m] = time.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export function snap(minutes: number, step = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step
}

/** Début et fin (minutes) d'une occurrence placée à une heure ; null sans heure. */
export function occurrenceSpan(occ: Pick<Occurrence, 'time' | 'task'>): { start: number; end: number } | null {
  if (!occ.time) return null
  const start = toMinutes(occ.time)
  return { start, end: Math.min(DAY_MINUTES, start + (occ.task.duration ?? DEFAULT_DURATION)) }
}

/** Morceaux des horaires de travail tombant le jour `day` (un horaire de nuit de la veille compris). */
export function segmentsOn(shifts: Shift[], day: string): Segment[] {
  const previous = addDays(day, -1)
  const result: Segment[] = []
  for (const shift of shifts) {
    const start = toMinutes(shift.start)
    const end = toMinutes(shift.end)
    const overnight = end <= start
    if (shift.day === day) result.push({ personId: shift.personId, start, end: overnight ? DAY_MINUTES : end, shift })
    else if (shift.day === previous && overnight && end > 0) result.push({ personId: shift.personId, start: 0, end, shift })
  }
  return result.sort((a, b) => a.start - b.start)
}

/** Personnes chargées de l'occurrence qui travaillent pendant son créneau. */
export function busyAssignees(occ: Occurrence, segments: Segment[]): string[] {
  const span = occurrenceSpan(occ)
  if (!span) return []
  const busy = new Set<string>()
  for (const segment of segments) {
    if (occ.assignees.includes(segment.personId) && segment.start < span.end && span.start < segment.end) {
      busy.add(segment.personId)
    }
  }
  return [...busy]
}

/**
 * Colonnes pour des blocs qui se chevauchent : chaque bloc reçoit sa colonne et le nombre de
 * colonnes de son groupe de chevauchement (même ordre que `items`).
 */
export function layoutLanes(items: Array<{ start: number; end: number }>): Array<{ lane: number; lanes: number }> {
  const order = items.map((item, i) => ({ ...item, i })).sort((a, b) => a.start - b.start || b.end - a.end)
  const result: Array<{ lane: number; lanes: number }> = items.map(() => ({ lane: 0, lanes: 1 }))
  let group: number[] = []
  let laneEnds: number[] = []
  let groupEnd = -1
  const close = () => {
    for (const i of group) result[i].lanes = laneEnds.length
    group = []
    laneEnds = []
  }
  for (const item of order) {
    if (item.start >= groupEnd) close()
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.end)
    } else {
      laneEnds[lane] = item.end
    }
    result[item.i].lane = lane
    group.push(item.i)
    groupEnd = Math.max(groupEnd, item.end)
  }
  close()
  return result
}

/** Les horaires de travail élargissent la frise sans sortir de 6h – 23h (une nuit de travail resterait sinon 0h – 24h). */
const WORK_WINDOW = { from: 6 * 60, to: 23 * 60 }

/**
 * Heures affichées par la frise : 7h à 22h, élargies aux tâches placées (`tasks`, sans limite) et aux
 * horaires de travail (`work`, dans 6h – 23h).
 */
export function hourRange(tasks: number[], work: number[] = []): { from: number; to: number } {
  let from = 7 * 60
  let to = 22 * 60
  const values = [...tasks, ...work.map((m) => Math.min(WORK_WINDOW.to, Math.max(WORK_WINDOW.from, m)))]
  for (const value of values) {
    from = Math.min(from, Math.floor(value / 60) * 60)
    to = Math.max(to, Math.ceil(value / 60) * 60)
  }
  return { from, to: Math.min(DAY_MINUTES, to) }
}

// ── Lecture d'un planning collé en texte ─────────────────────────────────────

export interface ParsedPlanning {
  /** Jour → créneaux ; liste vide = jour de repos (efface les horaires de ce jour). */
  days: Map<string, Array<{ start: string; end: string }>>
  /** Lignes non comprises, avec leur numéro. */
  errors: string[]
}

const REST_RE = /\b(repos|off|cong[ée]s?|rien|libre|rh|rtt|absente?|vacances|ferm[ée])\b|^-+$/i
const DATE_ISO_RE = /(\d{4})-(\d{1,2})-(\d{1,2})/
const DATE_FR_RE = /(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?/
const RANGE_RE = /(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?\s*(?:-|–|—|à|>)\s*(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?/gi

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Année du jour/mois la plus proche de `reference` (un planning de janvier lu en décembre). */
function nearestYear(day: number, month: number, reference: string): number {
  const year = Number(reference.slice(0, 4))
  const ref = Date.parse(reference)
  let best = year
  let gap = Infinity
  for (const y of [year - 1, year, year + 1]) {
    const distance = Math.abs(Date.parse(`${y}-${pad(month)}-${pad(day)}`) - ref)
    if (distance < gap) {
      gap = distance
      best = y
    }
  }
  return best
}

function readDate(line: string, reference: string): { day: string; rest: string } | null {
  const iso = DATE_ISO_RE.exec(line)
  if (iso) {
    const day = `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`
    return isDateKey(day) ? { day, rest: line.slice(iso.index + iso[0].length) } : null
  }
  const fr = DATE_FR_RE.exec(line)
  if (!fr) return null
  const d = Number(fr[1])
  const m = Number(fr[2])
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  let y = fr[3] ? Number(fr[3]) : nearestYear(d, m, reference)
  if (y < 100) y += 2000
  const day = `${y}-${pad(m)}-${pad(d)}`
  return isDateKey(day) ? { day, rest: line.slice(fr.index + fr[0].length) } : null
}

/**
 * Lit un planning collé ligne par ligne : une date (« 2026-11-17 », « 17/11 », « lun 17/11/2026 »)
 * puis un ou plusieurs créneaux (« 8h-16h30 », « 08:00 - 12:00 / 14:00-18:00 ») ou « repos ».
 * `reference` (AAAA-MM-JJ) donne l'année quand elle manque. Lignes vides et « # … » ignorées.
 */
export function parsePlanning(text: string, reference: string): ParsedPlanning {
  const days = new Map<string, Array<{ start: string; end: string }>>()
  const errors: string[] = []
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return
    const found = readDate(line, reference)
    if (!found) {
      errors.push(`Ligne ${i + 1} : date introuvable (« ${line} »).`)
      return
    }
    const rest = found.rest.trim()
    const ranges = [...rest.matchAll(RANGE_RE)]
    // Ligne illisible : le jour n'est pas retenu (il n'effacera pas les horaires déjà enregistrés).
    if (ranges.length === 0 && rest !== '' && !REST_RE.test(rest)) {
      errors.push(`Ligne ${i + 1} : horaire illisible (« ${line} »).`)
      return
    }
    const list = days.get(found.day) ?? []
    days.set(found.day, list)
    for (const r of ranges) {
      const [h1, m1, h2, m2] = [Number(r[1]), Number(r[2] ?? 0), Number(r[3]), Number(r[4] ?? 0)]
      if (h1 > 24 || h2 > 24 || m1 > 59 || m2 > 59) {
        errors.push(`Ligne ${i + 1} : heure impossible (« ${r[0].trim()} »).`)
        continue
      }
      const start = `${pad(h1 % 24)}:${pad(m1)}`
      const end = `${pad(h2 % 24)}:${pad(m2)}`
      if (start === end) {
        errors.push(`Ligne ${i + 1} : début et fin identiques (« ${r[0].trim()} »).`)
        continue
      }
      list.push({ start, end })
    }
  })
  return { days: new Map([...days].sort(([a], [b]) => a.localeCompare(b))), errors }
}

/** « de Mathis », « d’Isis » (élision devant une voyelle ou un h). */
export function ofName(name: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(name) ? `d’${name}` : `de ${name}`
}

/** Texte d'import (une ligne par jour) d'une liste d'horaires : pour la recopier ou la corriger. */
export function planningText(days: Map<string, Array<{ start: string; end: string }>>): string {
  return [...days]
    .map(([day, list]) => `${day} ${list.length === 0 ? 'repos' : list.map((s) => `${s.start}-${s.end}`).join(' ')}`)
    .join('\n')
}
