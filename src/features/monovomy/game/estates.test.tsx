import { describe, it, expect } from 'vitest'
import { estateOf, estates, levelBadge } from './estates'

const board = {
  spaces: [
    { kind: 'start', id: 'go' },
    { kind: 'property', id: 'a1', name: 'A1', group: 'brun', price: 60, rents: [2, 10, 30, 90, 160, 250] },
    { kind: 'property', id: 'a2', name: 'A2', group: 'brun', price: 60, rents: [4, 20, 60, 180, 320, 450] },
    { kind: 'property', id: 'b1', name: 'B1', group: 'cyan', price: 100, rents: [6, 30, 90, 270, 400, 550] },
    { kind: 'station', id: 's1', name: 'Gare 1', price: 200, rents: [25, 50, 100, 200] },
    { kind: 'station', id: 's2', name: 'Gare 2', price: 200, rents: [25, 50, 100, 200] },
    { kind: 'utility', id: 'u1', name: 'Service', price: 150 },
    { kind: 'tax', id: 't1', name: 'Taxe', amount: 100 },
  ],
} as const

function mk(over: Record<string, unknown> = {}) {
  return {
    ownership: {},
    buildings: {},
    mortgaged: {},
    players: [
      { id: 'p1', name: 'Alice', ownedSpaceIds: [] as string[], eliminated: false },
      { id: 'p2', name: 'Bob', ownedSpaceIds: [] as string[], eliminated: false },
    ],
    currentPlayerIndex: 0,
    ...over,
  } as never
}

describe('estateOf', () => {
  it('ordonne comme le plateau et regroupe par couleur (gares/services inclus)', () => {
    const state = mk({
      ownership: { a1: 'p1', b1: 'p1', s1: 'p1', u1: 'p1' },
      players: [
        { id: 'p1', name: 'Alice', ownedSpaceIds: ['s1', 'b1', 'u1', 'a1'], eliminated: false },
        { id: 'p2', name: 'Bob', ownedSpaceIds: [], eliminated: false },
      ],
    })
    const e = estateOf(state, board as never, (state as never as { players: { id: string, name: string }[] }).players[0], 0, '#7c3aed')
    expect(e.spaceIds).toEqual(['a1', 'b1', 's1', 'u1'])
    expect(e.groups.map((g) => g.id)).toEqual(['brun', 'cyan', 'gares', 'services'])
    expect(e.count).toBe(4)
  })

  it('loyer : monopole ×2 sur terrain nu, barème du niveau dès la 1re maison', () => {
    const state = mk({
      ownership: { a1: 'p1', a2: 'p1' },
      buildings: { a2: 2 },
      players: [
        { id: 'p1', name: 'Alice', ownedSpaceIds: ['a1', 'a2'], eliminated: false },
        { id: 'p2', name: 'Bob', ownedSpaceIds: [], eliminated: false },
      ],
    })
    const e = estateOf(state, board as never, (state as never as { players: { id: string }[] }).players[0], 0, '#7c3aed')
    const [g] = e.groups
    expect(g.complete).toBe(true)
    expect(g.items[0].rent).toBe(4)   // a1 nu, monopole → 2 × 2
    expect(g.items[1].rent).toBe(60)  // a2 niveau 2 → rents[2]
    expect(e.rentTotal).toBe(64)
  })

  it('gare : loyer selon le nombre de gares détenues ; hypothèque → 0', () => {
    const state = mk({
      ownership: { s1: 'p1', s2: 'p1' },
      mortgaged: { s2: true },
      players: [
        { id: 'p1', name: 'Alice', ownedSpaceIds: ['s1', 's2'], eliminated: false },
        { id: 'p2', name: 'Bob', ownedSpaceIds: [], eliminated: false },
      ],
    })
    const e = estateOf(state, board as never, (state as never as { players: { id: string }[] }).players[0], 0, '#7c3aed')
    const items = e.groups[0].items
    expect(items[0].rent).toBe(50) // 2 gares → rents[1]
    expect(items[1].rent).toBe(0)  // hypothéquée
    expect(e.mortgagedCount).toBe(1)
  })

  it('service : loyer non chiffrable (dépend des dés)', () => {
    const state = mk({
      ownership: { u1: 'p1' },
      players: [
        { id: 'p1', name: 'Alice', ownedSpaceIds: ['u1'], eliminated: false },
        { id: 'p2', name: 'Bob', ownedSpaceIds: [], eliminated: false },
      ],
    })
    const e = estateOf(state, board as never, (state as never as { players: { id: string }[] }).players[0], 0, '#7c3aed')
    expect(e.groups[0].items[0].rent).toBeNull()
    expect(e.rentTotal).toBe(0)
  })
})

describe('estates', () => {
  it('un bloc par joueur en lice, éliminés exclus', () => {
    const state = mk({
      players: [
        { id: 'p1', name: 'Alice', ownedSpaceIds: [], eliminated: false },
        { id: 'p2', name: 'Bob', ownedSpaceIds: [], eliminated: true },
      ],
    })
    const list = estates(state, board as never, ['#a', '#b'])
    expect(list.map((e) => e.playerId)).toEqual(['p1'])
    expect(list[0].color).toBe('#a')
  })
})

describe('levelBadge', () => {
  it('hypothèque > établissement, hôtel au niveau max', () => {
    expect(levelBadge({ mortgaged: true, level: 3, maxLevel: 5 } as never)).toBe('🏦')
    expect(levelBadge({ mortgaged: false, level: 0, maxLevel: 5 } as never)).toBe('')
    expect(levelBadge({ mortgaged: false, level: 3, maxLevel: 5 } as never)).toBe('🏠3')
    expect(levelBadge({ mortgaged: false, level: 5, maxLevel: 5 } as never)).toBe('🏨')
  })
})
