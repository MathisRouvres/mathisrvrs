/**
 * Terrains libres croisés avec nos dispos : un créneau de club est retenu quand au moins
 * `minPeople` personnes sont dispo sur toute sa durée (chaque case de 30 min qu'il couvre).
 */

import type { Club, CourtSlot } from './api'
import { SLOT_MINUTES, slotKey, type Availability } from './slots'

export interface CourtMatch {
  club: Pick<Club, 'id' | 'name'>
  slot: CourtSlot
  start: Date
  end: Date
  people: string[]
}

const SLOT_MS = SLOT_MINUTES * 60_000

/** Personnes dispo sur toutes les cases de 30 min que couvre [start, end). */
export function peopleDuring(availability: Availability, start: Date, end: Date): string[] {
  let common: Set<string> | null = null as Set<string> | null
  for (let t = Math.floor(start.getTime() / SLOT_MS) * SLOT_MS; t < end.getTime(); t += SLOT_MS) {
    const here = availability.get(slotKey(new Date(t)))
    if (!here || here.size === 0) return []
    common = common ? new Set([...common].filter((id) => here.has(id))) : new Set(here)
    if (common.size === 0) return []
  }
  return common ? [...common].sort() : []
}

/**
 * Créneaux de club à venir où au moins `minPeople` personnes sont dispo, le plus grand groupe
 * d'abord, puis le plus tôt.
 */
export function courtMatches(clubs: Club[], availability: Availability, now: Date, minPeople = 2): CourtMatch[] {
  const matches: CourtMatch[] = []
  for (const club of clubs) {
    for (const slot of club.slots) {
      const start = new Date(slot.start)
      if (Number.isNaN(start.getTime()) || start <= now) continue
      const end = new Date(start.getTime() + slot.duration * 60_000)
      const people = peopleDuring(availability, start, end)
      if (people.length >= minPeople) matches.push({ club: { id: club.id, name: club.name }, slot, start, end, people })
    }
  }
  return matches.sort(
    (a, b) =>
      b.people.length - a.people.length ||
      a.start.getTime() - b.start.getTime() ||
      a.club.name.localeCompare(b.club.name),
  )
}

/** Lundi `weekStart` (heure locale) → `2026-11-09`. */
export function weekParam(weekStart: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${weekStart.getFullYear()}-${pad(weekStart.getMonth() + 1)}-${pad(weekStart.getDate())}`
}
