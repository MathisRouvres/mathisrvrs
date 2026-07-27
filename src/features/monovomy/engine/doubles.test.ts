import { describe, it, expect } from 'vitest'
import { createGame } from './setup'
import { takeTurn, endTurn, jailIndex } from './turn'
import { createGameRng, rollDice } from './rng'
import { soireeBoard } from '../content'
import type { GameConfig, GameState } from './types'

const config: GameConfig = {
  difficulty: 'inter', durationMinutes: 60, bankruptcy: 'none', themeId: 'soiree', seed: 'seed',
}

function fresh(seed: string): GameState {
  return createGame({ ...config, seed }, [
    { id: 'p1', name: 'A', avatar: 'A', drinkMode: 'alcohol' },
    { id: 'p2', name: 'B', avatar: 'B', drinkMode: 'alcohol' },
  ], [])
}

/** Trouve un seed dont le PREMIER jet est (ou n'est pas) un double. */
function seedWithDouble(want: boolean): string {
  for (let i = 0; i < 5000; i += 1) {
    const seed = `s${i}`
    const roll = rollDice(createGameRng(seed))
    if (roll.isDouble === want) return seed
  }
  throw new Error('seed introuvable')
}

describe('doubles', () => {
  it('un double fait rejouer le même joueur', () => {
    const s = fresh(seedWithDouble(true))
    const cur = s.currentPlayerIndex
    const after = endTurn(takeTurn(s, soireeBoard).state)
    expect(after.phase).toBe('awaiting_roll')
    expect(after.currentPlayerIndex).toBe(cur) // même joueur
  })

  it('sans double, le tour passe au joueur suivant', () => {
    const s = fresh(seedWithDouble(false))
    const cur = s.currentPlayerIndex
    const after = endTurn(takeTurn(s, soireeBoard).state)
    expect(after.currentPlayerIndex).not.toBe(cur)
  })

  it('marque rollAgain + incrémente le compteur sur un double', () => {
    const t = takeTurn(fresh(seedWithDouble(true)), soireeBoard).state
    // rollAgain seulement si pas envoyé en prison par la case.
    if (t.phase !== 'turn_cleanup' || !t.players[t.currentPlayerIndex]?.inJail) {
      expect(t.rollAgain).toBe(true)
      expect(t.doublesStreak).toBe(1)
    }
  })

  it('3e double consécutif → prison directe, sans déplacement', () => {
    const dbl = seedWithDouble(true)
    const base = fresh(dbl)
    // Simule deux doubles déjà obtenus ce tour.
    const primed: GameState = { ...base, doublesStreak: 2 }
    const r = takeTurn(primed, soireeBoard)
    const player = r.state.players[r.state.currentPlayerIndex]!
    expect(player.inJail).toBe(true)
    expect(player.position).toBe(jailIndex(soireeBoard))
    expect(r.state.rollAgain ?? false).toBe(false)
    expect(r.outcome.kind).toBe('go_jail')
    // endTurn ne fait pas rejouer un joueur en prison.
    const after = endTurn(r.state)
    expect(after.currentPlayerIndex).not.toBe(r.state.currentPlayerIndex)
  })
})
