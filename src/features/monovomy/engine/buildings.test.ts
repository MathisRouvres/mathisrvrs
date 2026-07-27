import { describe, it, expect } from 'vitest'
import { createGame } from './setup'
import { build, sellBuilding, mortgage, unmortgage, getBuildingLevel, isMortgaged } from './buildings'
import { computeRent } from './turn'
import { soireeBoard } from '../content'
import type { BoardSpace } from '../content/schema'
import type { DiceRoll, GameConfig, GameState } from './types'

const config: GameConfig = {
  difficulty: 'inter',
  durationMinutes: 60,
  bankruptcy: 'none',
  themeId: 'soiree',
  seed: 'test-11b',
}

// Groupe « brun » (le plus petit) : rue_soif + impasse_dernier_verre.
const BRUN = ['rue_soif', 'impasse_dernier_verre']

function gameOwning(ownerId: string, spaceIds: string[], cash = 5000): GameState {
  const base = createGame(config, [
    { id: 'p1', name: 'A', avatar: 'A', drinkMode: 'alcohol' },
    { id: 'p2', name: 'B', avatar: 'B', drinkMode: 'alcohol' },
  ], [])
  const ownership: Record<string, string> = {}
  for (const id of spaceIds) ownership[id] = ownerId
  return {
    ...base,
    ownership,
    players: base.players.map((p) => (p.id === ownerId ? { ...p, cash, ownedSpaceIds: [...spaceIds] } : p)),
  }
}

describe('build', () => {
  it('refuse sans monopole', () => {
    const s = gameOwning('p1', ['rue_soif'])
    const r = build(s, soireeBoard, 'p1', 'rue_soif')
    expect(r.error).toBe('not_monopoly')
  })

  it('construit sur monopole complet, débite le cash', () => {
    const s = gameOwning('p1', BRUN)
    const before = s.players[0]!.cash
    const r = build(s, soireeBoard, 'p1', 'rue_soif')
    expect(r.error).toBeNull()
    expect(getBuildingLevel(r.state, 'rue_soif')).toBe(1)
    expect(r.state.players[0]!.cash).toBeLessThan(before)
  })

  it('impose une construction homogène (pas +2 sur une case avant l’autre)', () => {
    let s = gameOwning('p1', BRUN)
    s = build(s, soireeBoard, 'p1', 'rue_soif').state
    const r = build(s, soireeBoard, 'p1', 'rue_soif') // 2e sur la même avant l’autre
    expect(r.error).toBe('uneven_build')
  })

  it('ne dépasse pas le niveau max (hôtel)', () => {
    let s = gameOwning('p1', BRUN)
    const max = (soireeBoard.spaces.find((x) => x.id === 'rue_soif') as { rents: number[] }).rents.length - 1
    // Monte les deux cases en alternance jusqu’au max.
    for (let lvl = 0; lvl < max; lvl += 1) {
      for (const id of BRUN) s = build(s, soireeBoard, 'p1', id).state
    }
    expect(getBuildingLevel(s, 'rue_soif')).toBe(max)
    expect(build(s, soireeBoard, 'p1', 'rue_soif').error).toBe('max_level')
  })

  it('refuse si cash insuffisant', () => {
    const s = gameOwning('p1', BRUN, 1)
    expect(build(s, soireeBoard, 'p1', 'rue_soif').error).toBe('insufficient_cash')
  })
})

describe('sellBuilding', () => {
  it('revend un palier et rembourse', () => {
    let s = gameOwning('p1', BRUN)
    s = build(s, soireeBoard, 'p1', 'rue_soif').state
    const cash = s.players[0]!.cash
    const r = sellBuilding(s, soireeBoard, 'p1', 'rue_soif')
    expect(r.error).toBeNull()
    expect(getBuildingLevel(r.state, 'rue_soif')).toBe(0)
    expect(r.state.players[0]!.cash).toBeGreaterThan(cash)
  })
})

describe('computeRent (Phase 11B)', () => {
  const roll: DiceRoll = { d1: 3, d2: 4, total: 7, isDouble: false }
  const soif = soireeBoard.spaces.find((s) => s.id === 'rue_soif') as BoardSpace & { rents: number[] }

  it('loyer de base sans monopole', () => {
    const s = gameOwning('p2', ['rue_soif'])
    expect(computeRent(soif, roll, s, soireeBoard, 'p2')).toBe(soif.rents[0])
  })
  it('loyer de base doublé sur monopole terrain nu', () => {
    const s = gameOwning('p2', BRUN)
    expect(computeRent(soif, roll, s, soireeBoard, 'p2')).toBe(soif.rents[0]! * 2)
  })
  it('loyer par niveau d’établissement', () => {
    const s = build(gameOwning('p2', BRUN), soireeBoard, 'p2', 'rue_soif').state
    expect(computeRent(soif, roll, s, soireeBoard, 'p2')).toBe(soif.rents[1])
  })
  it('loyer nul si hypothéquée', () => {
    const s = mortgage(gameOwning('p2', BRUN), soireeBoard, 'p2', 'rue_soif').state
    expect(computeRent(soif, roll, s, soireeBoard, 'p2')).toBe(0)
  })
})

describe('mortgage', () => {
  it('hypothèque une propriété nue, crédite le cash', () => {
    const s = gameOwning('p1', BRUN)
    const cash = s.players[0]!.cash
    const r = mortgage(s, soireeBoard, 'p1', 'rue_soif')
    expect(r.error).toBeNull()
    expect(isMortgaged(r.state, 'rue_soif')).toBe(true)
    expect(r.state.players[0]!.cash).toBeGreaterThan(cash)
  })

  it('refuse d’hypothéquer une case bâtie', () => {
    let s = gameOwning('p1', BRUN)
    s = build(s, soireeBoard, 'p1', 'rue_soif').state
    expect(mortgage(s, soireeBoard, 'p1', 'rue_soif').error).toBe('has_buildings')
  })

  it('lève l’hypothèque avec intérêt', () => {
    let s = gameOwning('p1', BRUN)
    s = mortgage(s, soireeBoard, 'p1', 'rue_soif').state
    const cash = s.players[0]!.cash
    const r = unmortgage(s, soireeBoard, 'p1', 'rue_soif')
    expect(r.error).toBeNull()
    expect(isMortgaged(r.state, 'rue_soif')).toBe(false)
    expect(r.state.players[0]!.cash).toBeLessThan(cash)
  })
})
