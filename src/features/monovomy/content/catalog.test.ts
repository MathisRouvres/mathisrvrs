import { describe, it, expect } from 'vitest'
import { boardThemeSchema, actionCardSchema, ACTION_FAMILIES } from './schema'
import { soireeBoard } from './board.soiree'
import { actionCards } from './cards'
import { DIFFICULTY_IDS } from '../engine/constants'

describe('MonoVomy — plateau Soirée', () => {
  it('respecte le schéma de thème', () => {
    expect(() => boardThemeSchema.parse(soireeBoard)).not.toThrow()
  })

  it('contient exactement 40 cases', () => {
    expect(soireeBoard.spaces).toHaveLength(40)
  })

  it('a des identifiants de cases uniques', () => {
    const ids = soireeBoard.spaces.map((space) => space.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('a 4 coins aux positions 0, 10, 20, 30', () => {
    expect(soireeBoard.spaces[0]?.kind).toBe('start')
    expect(soireeBoard.spaces[10]?.kind).toBe('jail')
    expect(soireeBoard.spaces[20]?.kind).toBe('parking')
    expect(soireeBoard.spaces[30]?.kind).toBe('gojail')
  })
})

describe('MonoVomy — catalogue de cartes', () => {
  it('chaque carte respecte le schéma', () => {
    for (const card of actionCards) {
      expect(() => actionCardSchema.parse(card)).not.toThrow()
    }
  })

  it('a des identifiants de cartes uniques', () => {
    const ids = actionCards.map((card) => card.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('couvre les 5 familles', () => {
    for (const family of ACTION_FAMILIES) {
      expect(actionCards.some((c) => c.family === family)).toBe(true)
    }
  })

  it('couvre les 4 niveaux', () => {
    for (const level of DIFFICULTY_IDS) {
      expect(actionCards.some((c) => c.levelMin === level)).toBe(true)
    }
  })

  it('marque toutes les règles comme persistantes', () => {
    for (const card of actionCards.filter((c) => c.family === 'regle')) {
      expect(card.persistent).toBe(true)
    }
  })

  it('propose un volume de contenu suffisant', () => {
    expect(actionCards.length).toBeGreaterThanOrEqual(40)
  })
})
