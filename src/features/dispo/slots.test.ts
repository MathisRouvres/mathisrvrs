import { describe, expect, it } from 'vitest'
import {
  SLOTS_PER_DAY,
  addDays,
  buildAvailability,
  commonRuns,
  isPastSlot,
  normalizeKey,
  slotKey,
  slotLabel,
  slotStart,
  startOfWeek,
  weekDays,
  weekRange,
} from './slots'

describe('grille /dispo', () => {
  it('30 créneaux de 30 min, de 08:00 à 22:30', () => {
    expect(SLOTS_PER_DAY).toBe(30)
    expect(slotLabel(0)).toBe('08:00')
    expect(slotLabel(1)).toBe('08:30')
    expect(slotLabel(SLOTS_PER_DAY - 1)).toBe('22:30')
  })

  it('semaine du lundi au dimanche', () => {
    const wednesday = new Date(2026, 10, 11, 15, 42)
    const monday = startOfWeek(wednesday)
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate(), monday.getHours()]).toEqual([2026, 10, 9, 0])
    expect(startOfWeek(new Date(2026, 10, 15, 23)).getDate()).toBe(9) // dimanche
    expect(startOfWeek(new Date(2026, 10, 16, 0)).getDate()).toBe(16) // lundi suivant
    expect(weekDays(monday).map((d) => d.getDate())).toEqual([9, 10, 11, 12, 13, 14, 15])
  })

  it('jours calendaires même au changement d’heure', () => {
    const day = new Date(2026, 9, 24)
    expect(addDays(day, 1).getDate()).toBe(25)
    expect(addDays(day, 1).getHours()).toBe(0)
    expect(slotStart(addDays(day, 1), 20).getHours()).toBe(18)
  })

  it('créneau → heure locale, clé ISO normalisée', () => {
    const start = slotStart(new Date(2026, 10, 12), 21)
    expect([start.getHours(), start.getMinutes()]).toEqual([18, 30])
    expect(normalizeKey(start.toISOString().replace('.000Z', '+00:00'))).toBe(slotKey(start))
  })

  it('intervalle de lecture de la semaine', () => {
    const monday = new Date(2026, 10, 9)
    const { from, to } = weekRange(monday)
    expect(from.getTime()).toBe(slotStart(monday, 0).getTime())
    expect(to.getTime()).toBe(new Date(2026, 10, 16).getTime())
  })

  it('créneau passé une fois terminé', () => {
    const start = new Date(2026, 10, 12, 18, 0)
    expect(isPastSlot(start, new Date(2026, 10, 12, 18, 29))).toBe(false)
    expect(isPastSlot(start, new Date(2026, 10, 12, 18, 30))).toBe(true)
  })
})

describe('créneaux communs', () => {
  const day = new Date(2026, 10, 12)
  const key = (index: number) => slotKey(slotStart(day, index))
  const before = new Date(2026, 10, 12, 7, 0)

  it('regroupe les créneaux consécutifs d’un même groupe, plus grand groupe d’abord', () => {
    const availability = buildAvailability([
      ...[20, 21, 22].flatMap((i) => [
        { personId: 'a', start: key(i) },
        { personId: 'b', start: key(i) },
      ]),
      { personId: 'c', start: key(22) },
      { personId: 'a', start: key(2) },
    ])
    const runs = commonRuns(availability, [day], before)
    expect(runs.map((r) => [r.startIndex, r.length, r.people])).toEqual([
      [22, 1, ['a', 'b', 'c']],
      [20, 2, ['a', 'b']],
    ])
  })

  it('ignore les créneaux passés', () => {
    const availability = buildAvailability([
      { personId: 'a', start: key(0) },
      { personId: 'b', start: key(0) },
    ])
    expect(commonRuns(availability, [day], new Date(2026, 10, 12, 9, 0))).toEqual([])
    expect(commonRuns(availability, [day], before)).toHaveLength(1)
  })
})
