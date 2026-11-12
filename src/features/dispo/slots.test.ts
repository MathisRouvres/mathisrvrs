import { describe, expect, it } from 'vitest'
import {
  SLOTS_PER_DAY,
  addDays,
  applyOverlay,
  buildWeekData,
  changesFromOverlay,
  commonRuns,
  expandWeek,
  myRecurringKeys,
  ruleOf,
  skipOpsOfRule,
  toggleOps,
  weeklyPattern,
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

/** Disponibilités d'un jour à partir de créneaux ponctuels seulement. */
function availabilityOf(slots: Array<{ personId: string; start: string }>, day: Date) {
  return expandWeek(buildWeekData({ slots, weekly: [], skips: [] }), [day])
}

describe('créneaux communs', () => {
  const day = new Date(2026, 10, 12)
  const key = (index: number) => slotKey(slotStart(day, index))
  const before = new Date(2026, 10, 12, 7, 0)

  it('regroupe les créneaux consécutifs d’un même groupe, plus grand groupe d’abord', () => {
    const availability = availabilityOf([
      ...[20, 21, 22].flatMap((i) => [
        { personId: 'a', start: key(i) },
        { personId: 'b', start: key(i) },
      ]),
      { personId: 'c', start: key(22) },
      { personId: 'a', start: key(2) },
    ], day)
    const runs = commonRuns(availability, [day], before)
    expect(runs.map((r) => [r.startIndex, r.length, r.people])).toEqual([
      [22, 1, ['a', 'b', 'c']],
      [20, 2, ['a', 'b']],
    ])
  })

  it('ignore les créneaux passés', () => {
    const availability = availabilityOf([
      { personId: 'a', start: key(0) },
      { personId: 'b', start: key(0) },
    ], day)
    expect(commonRuns(availability, [day], new Date(2026, 10, 12, 9, 0))).toEqual([])
    expect(commonRuns(availability, [day], before)).toHaveLength(1)
  })
})

describe('chaque semaine', () => {
  const monday = new Date(2026, 10, 9)
  const days = weekDays(monday)
  const tuesday18 = slotStart(days[1]!, 20) // mardi 10 novembre 18:00
  const key18 = slotKey(tuesday18)
  const ruleTue18 = { personId: 'me', weekday: 2, minute: 18 * 60 }

  it('jour ISO et minute locale du créneau', () => {
    expect(ruleOf(tuesday18)).toEqual({ weekday: 2, minute: 1080 })
    expect(ruleOf(slotStart(days[6]!, 0))).toEqual({ weekday: 7, minute: 480 })
  })

  it('une règle se déroule sur chaque semaine, changement d’heure compris', () => {
    const data = buildWeekData({ slots: [], weekly: [{ personId: 'me', weekday: 1, minute: 1080 }], skips: [] })
    for (const week of [new Date(2026, 9, 19), new Date(2026, 9, 26), new Date(2027, 2, 29)]) {
      const start = slotStart(week, 20)
      expect([start.getDay(), start.getHours()]).toEqual([1, 18])
      expect(expandWeek(data, weekDays(week)).get(slotKey(start))).toEqual(new Set(['me']))
    }
  })

  it('une exception lève la règle pour une seule date', () => {
    const data = buildWeekData({ slots: [], weekly: [ruleTue18], skips: [{ personId: 'me', start: key18 }] })
    expect(expandWeek(data, days).has(key18)).toBe(false)
    expect(expandWeek(data, weekDays(addDays(monday, 7))).has(slotKey(slotStart(addDays(days[1]!, 7), 20)))).toBe(true)
    expect(weeklyPattern(data, days).get(key18)).toEqual(new Set(['me']))
    expect(myRecurringKeys(data, 'me', days).has(key18)).toBe(false)
  })

  it('bascule « cette semaine » : créneau ponctuel ou exception', () => {
    const empty = buildWeekData({ slots: [], weekly: [], skips: [] })
    expect(toggleOps(empty, 'me', tuesday18, true, 'week')).toEqual([[`slot:${key18}`, true]])

    const ruled = buildWeekData({ slots: [], weekly: [ruleTue18], skips: [] })
    expect(toggleOps(ruled, 'me', tuesday18, false, 'week')).toEqual([[`skip:${key18}`, true]])
    expect(toggleOps(ruled, 'me', tuesday18, true, 'week')).toEqual([])

    const skipped = buildWeekData({ slots: [], weekly: [ruleTue18], skips: [{ personId: 'me', start: key18 }] })
    expect(toggleOps(skipped, 'me', tuesday18, true, 'week')).toEqual([[`skip:${key18}`, false]])

    const both = buildWeekData({ slots: [{ personId: 'me', start: key18 }], weekly: [ruleTue18], skips: [] })
    expect(toggleOps(both, 'me', tuesday18, false, 'week')).toEqual([
      [`slot:${key18}`, false],
      [`skip:${key18}`, true],
    ])
  })

  it('bascule « chaque semaine » : la règle du jour et de l’heure', () => {
    const empty = buildWeekData({ slots: [], weekly: [], skips: [] })
    expect(toggleOps(empty, 'me', tuesday18, true, 'weekly')).toEqual([['weekly:2-1080', true]])
  })

  it('poser une règle en attente efface ses exceptions', () => {
    const skipped = buildWeekData({ slots: [], weekly: [], skips: [{ personId: 'me', start: key18 }] })
    const data = applyOverlay(skipped, 'me', new Map([['weekly:2-1080', true]]))
    expect(data.weekly.get('me')).toEqual(new Set(['2-1080']))
    expect(data.skips.get('me')).toEqual(new Set())
    expect(expandWeek(data, days).get(key18)).toEqual(new Set(['me']))
    expect(skipOpsOfRule(new Map([[`skip:${key18}`, true], ['slot:x', true]]), '2-1080')).toEqual([`skip:${key18}`])
  })

  it('modifications en attente → corps de la requête', () => {
    expect(
      changesFromOverlay([
        [`slot:${key18}`, true],
        ['weekly:2-1080', false],
        [`skip:${key18}`, true],
      ]),
    ).toEqual({
      add: [key18],
      remove: [],
      weeklyAdd: [],
      weeklyRemove: [{ weekday: 2, minute: 1080 }],
      skipAdd: [{ start: key18, weekday: 2, minute: 1080 }],
      skipRemove: [],
    })
  })
})
