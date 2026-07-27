import { describe, it, expect } from 'vitest'
import { soireeBoard } from '../content/board.soiree'
import { actionCards } from '../content/cards'
import { createGame } from '../engine'
import type { GameConfig, PlayerSetup } from '../engine/types'
import { applyIntent } from './hostReducer'
import { createLoopbackHub } from './transport'
import type { Envelope } from './transport'

const POOL = actionCards.map((c) => c.id)
const CFG: GameConfig = {
  difficulty: 'inter',
  durationMinutes: 60,
  bankruptcy: 'none',
  themeId: 'soiree',
  seed: 'net-seed',
}
const SETUPS: PlayerSetup[] = [
  { id: 'p1', name: 'A', avatar: 'A', drinkMode: 'alcohol' },
  { id: 'p2', name: 'B', avatar: 'B', drinkMode: 'soft' },
]
const SEATS = { c1: 0, c2: 1 }

describe('MonoVomy — reducer réseau', () => {
  it('refuse une action hors-tour', () => {
    const state = createGame(CFG, SETUPS, POOL)
    const res = applyIntent(state, 'c2', SEATS, { type: 'roll' }, soireeBoard)
    expect(res.error).toBe('not_your_turn')
    expect(res.state).toBe(state)
  })

  it('applique le lancer du joueur courant', () => {
    const state = createGame(CFG, SETUPS, POOL)
    const res = applyIntent(state, 'c1', SEATS, { type: 'roll' }, soireeBoard)
    expect(res.error).toBeNull()
    expect(res.sync).not.toBeNull()
    expect(res.state.players[0]?.position ?? 0).toBeGreaterThan(0)
  })

  it('reste déterministe via le reducer réseau', () => {
    const run = () => {
      let s = createGame(CFG, SETUPS, POOL)
      s = applyIntent(s, 'c1', SEATS, { type: 'roll' }, soireeBoard).state
      if (s.phase === 'awaiting_purchase') {
        s = applyIntent(s, 'c1', SEATS, { type: 'buy', yes: true }, soireeBoard).state
      }
      if (s.phase === 'awaiting_card') {
        s = applyIntent(s, 'c1', SEATS, { type: 'ackCard' }, soireeBoard).state
      }
      if (s.phase === 'turn_cleanup') {
        s = applyIntent(s, 'c1', SEATS, { type: 'endTurn' }, soireeBoard).state
      }
      return s
    }
    expect(run()).toEqual(run())
  })
})

describe('MonoVomy — transport loopback', () => {
  it('délivre les messages aux autres pairs, pas à soi-même', () => {
    const hub = createLoopbackHub()
    const host = hub.connect('host')
    const client = hub.connect('c1')
    const received: Envelope[] = []
    host.subscribe((env) => received.push(env))
    client.subscribe(() => {})
    client.publish({ kind: 'client', from: 'c1', msg: { t: 'chat', clientId: 'c1', text: 'hi' } })
    expect(received).toHaveLength(1)
    expect(received[0]?.kind).toBe('client')
  })
})
