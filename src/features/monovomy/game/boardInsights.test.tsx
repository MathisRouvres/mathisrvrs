import { describe, it, expect } from 'vitest'
import { propertyGroups, completeGroups, ownerColorBySpace } from './boardInsights'

const board = {
  spaces: [
    { kind: 'start', id: 'go' },
    { kind: 'property', id: 'a1', group: 'brun' },
    { kind: 'property', id: 'a2', group: 'brun' },
    { kind: 'property', id: 'b1', group: 'cyan' },
    { kind: 'property', id: 'b2', group: 'cyan' },
    { kind: 'property', id: 'b3', group: 'cyan' },
    { kind: 'station', id: 's1' },
  ],
} as const

function state(ownership: Record<string, string>, players = [{ id: 'p1' }, { id: 'p2' }]) {
  return { ownership, players } as never
}

describe('propertyGroups', () => {
  it('regroupe les propriétés par couleur (ignore non-propriétés)', () => {
    expect(propertyGroups(board)).toEqual({ brun: ['a1', 'a2'], cyan: ['b1', 'b2', 'b3'] })
  })
})

describe('completeGroups', () => {
  it('détecte un groupe entièrement détenu', () => {
    const r = completeGroups(state({ a1: 'p1', a2: 'p1' }), board)
    expect(r.monopolySpaces).toEqual({ a1: 'p1', a2: 'p1' })
    expect(r.monopolyGroupsByOwner).toEqual({ p1: ['brun'] })
  })
  it('groupe partiel ou multi-propriétaire = pas de monopole', () => {
    expect(completeGroups(state({ a1: 'p1' }), board).monopolySpaces).toEqual({})
    expect(completeGroups(state({ a1: 'p1', a2: 'p2' }), board).monopolySpaces).toEqual({})
  })
})

describe('ownerColorBySpace', () => {
  it('mappe chaque case possédée sur la couleur du joueur', () => {
    const map = ownerColorBySpace(state({ a1: 'p1', b1: 'p2' }), ['#red', '#blue'])
    expect(map).toEqual({ a1: '#red', b1: '#blue' })
  })
})
