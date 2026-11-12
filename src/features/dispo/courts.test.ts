import { describe, expect, it } from 'vitest'
import type { Club } from './api'
import { courtMatches, peopleDuring, weekParam } from './courts'
import { slotKey, type Availability } from './slots'

function availabilityOf(entries: Array<[Date, string[]]>): Availability {
  return new Map(entries.map(([time, ids]) => [slotKey(time), new Set(ids)]))
}

const at = (h: number, m = 0) => new Date(2026, 10, 14, h, m)

function club(slots: Array<[Date, number]>, name = 'Lagord'): Club {
  return {
    id: name.toLowerCase(),
    name,
    url: 'https://example.test',
    status: 'ok',
    slots: slots.map(([start, duration]) => ({
      start: start.toISOString(),
      duration,
      courts: 1,
      price: 5800,
      url: 'https://example.test',
    })),
  }
}

describe('terrains libres croisés avec les dispos', () => {
  const availability = availabilityOf([
    [at(18), ['a', 'b', 'c']],
    [at(18, 30), ['a', 'b', 'c', 'd']],
    [at(19), ['a', 'b', 'd']],
    [at(19, 30), ['a']],
  ])

  it('garde les personnes dispo sur toute la durée', () => {
    expect(peopleDuring(availability, at(18), at(19, 30))).toEqual(['a', 'b'])
    expect(peopleDuring(availability, at(18, 30), at(19, 30))).toEqual(['a', 'b', 'd'])
    // Une case vide en cours de route : personne.
    expect(peopleDuring(availability, at(19), at(20, 30))).toEqual([])
  })

  it('compte une case entamée par un début décalé', () => {
    expect(peopleDuring(availability, at(18, 15), at(19))).toEqual(['a', 'b', 'c'])
  })

  it('retient les créneaux à 2 personnes ou plus, le plus grand groupe puis le plus tôt', () => {
    const clubs = [
      club([
        [at(18), 90],
        [at(18, 30), 60],
        [at(19), 90],
      ]),
      club([[at(18), 60]], 'Impact'),
    ]
    const matches = courtMatches(clubs, availability, at(8))
    expect(matches.map((m) => [m.club.name, m.start.getHours(), m.start.getMinutes(), m.people.length])).toEqual([
      ['Impact', 18, 0, 3],
      ['Lagord', 18, 30, 3],
      ['Lagord', 18, 0, 2],
    ])
    expect(matches[0]?.end).toEqual(at(19))
  })

  it('ignore les créneaux passés et le seuil non atteint', () => {
    expect(courtMatches([club([[at(18), 90]])], availability, at(18))).toEqual([])
    expect(courtMatches([club([[at(18), 90]])], availability, at(8), 3)).toEqual([])
  })

  it('formate le lundi en date locale', () => {
    expect(weekParam(new Date(2026, 10, 9))).toBe('2026-11-09')
  })
})
