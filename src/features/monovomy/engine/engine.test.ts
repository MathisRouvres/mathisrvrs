import { describe, it, expect } from 'vitest'
import { soireeBoard } from '../content/board.soiree'
import { actionCards } from '../content/cards'
import { createGame, takeTurn, decideBuy, ackCard, endTurn, jailAttemptDouble } from './index'
import { getCardById } from '../content'
import type { GameConfig, GameState, PlayerSetup } from './types'

const CARD_POOL = actionCards.map((c) => c.id)

function baseConfig(seed: string): GameConfig {
  return {
    difficulty: 'inter',
    durationMinutes: 60,
    bankruptcy: 'none',
    themeId: 'soiree',
    seed,
  }
}

function setups(): PlayerSetup[] {
  return [
    { id: 'p1', name: 'Alice', avatar: 'A', drinkMode: 'alcohol' },
    { id: 'p2', name: 'Bob', avatar: 'B', drinkMode: 'soft' },
  ]
}

function playRounds(seed: string, rounds: number): GameState {
  let state = createGame(baseConfig(seed), setups(), CARD_POOL)
  let ended = 0
  let guard = 0
  while (ended < rounds && !state.finished && guard < rounds * 40) {
    guard += 1
    switch (state.phase) {
      case 'awaiting_roll':
        state = takeTurn(state, soireeBoard).state
        break
      case 'awaiting_jail':
        state = jailAttemptDouble(state, soireeBoard).state
        break
      case 'awaiting_purchase':
        state = decideBuy(state, soireeBoard, true)
        break
      case 'awaiting_card':
        state = ackCard(state, getCardById(state.pendingCardId ?? '')?.effect === 'jail_free')
        break
      case 'turn_cleanup':
        state = endTurn(state)
        ended += 1
        break
      default:
        ended = rounds
    }
  }
  return state
}

describe('MonoVomy — moteur', () => {
  it('est déterministe pour une même seed', () => {
    expect(playRounds('graine-42', 14)).toEqual(playRounds('graine-42', 14))
  })

  it('diverge selon la seed', () => {
    expect(playRounds('graine-1', 14)).not.toEqual(playRounds('graine-2', 14))
  })

  it('démarre chaque joueur à 1500€ en position 0', () => {
    const state = createGame(baseConfig('x'), setups(), CARD_POOL)
    for (const p of state.players) {
      expect(p.cash).toBe(1500)
      expect(p.position).toBe(0)
    }
  })

  it('produit un total de dés entre 2 et 12', () => {
    const state = createGame(baseConfig('des'), setups(), CARD_POOL)
    const { roll } = takeTurn(state, soireeBoard)
    expect(roll.total).toBeGreaterThanOrEqual(2)
    expect(roll.total).toBeLessThanOrEqual(12)
  })

  it('garde des montants finis et positifs après plusieurs tours', () => {
    const state = playRounds('graine-eco', 24)
    const total = state.players.reduce((sum, p) => sum + p.cash, 0)
    expect(Number.isFinite(total)).toBe(true)
    expect(total).toBeGreaterThanOrEqual(0)
  })
})
