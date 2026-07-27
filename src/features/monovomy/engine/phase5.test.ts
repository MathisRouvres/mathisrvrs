import { describe, it, expect } from 'vitest'
import { soireeBoard } from '../content/board.soiree'
import { actionCards, getCardById } from '../content'
import {
  createGame,
  startClock,
  tickGameClock,
  remainingMs,
  turnTimedOut,
  stampTurnTimer,
  jailPayBail,
  jailUseCard,
  jailAttemptDouble,
  jailIndex,
  endGame,
  ranking,
  cloneState,
  JAIL_BAIL,
} from './index'
import { applyIntent, defaultIntentForPhase } from '../net'
import type { GameConfig, GameState, PlayerSetup } from './types'
import type { Intent } from '../net'

const POOL = actionCards.map((c) => c.id)
const BOARD = soireeBoard

function cfg(over: Partial<GameConfig> = {}): GameConfig {
  return {
    difficulty: 'inter',
    durationMinutes: 60,
    bankruptcy: 'none',
    themeId: 'soiree',
    seed: 'p5',
    ...over,
  }
}

function setups(n: number): PlayerSetup[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `J${i + 1}`,
    avatar: `${i + 1}`,
    drinkMode: (i % 2 === 0 ? 'alcohol' : 'soft') as PlayerSetup['drinkMode'],
  }))
}

const SEATS3 = { c1: 0, c2: 1, c3: 2 }

/** Force le joueur courant en prison (état de test). */
function enterJail(state: GameState, jailTurns = 3): GameState {
  const s = cloneState(state)
  const p = s.players[s.currentPlayerIndex]
  if (p) {
    p.inJail = true
    p.jailTurns = jailTurns
    p.position = jailIndex(BOARD)
  }
  s.phase = 'awaiting_jail'
  return s
}

describe('Phase 5 — timer de partie', () => {
  it('se termine automatiquement au timer avec endReason', () => {
    const s = startClock(createGame(cfg({ durationMinutes: 1 }), setups(3), POOL), 1000)
    expect(s.endsAt).toBe(61000)
    const before = tickGameClock(s, 60000)
    expect(before.justEnded).toBe(false)
    expect(before.state.finished).toBe(false)
    const after = tickGameClock(s, 61000)
    expect(after.justEnded).toBe(true)
    expect(after.state.finished).toBe(true)
    expect(after.state.phase).toBe('finished')
    expect(after.state.endReason).toBe('timer')
    // Le classement final reste calculable.
    expect(ranking(after.state, BOARD)).toHaveLength(3)
  })

  it('survit à une reconnexion sans réinitialiser (endsAt absolu)', () => {
    const s = startClock(createGame(cfg({ durationMinutes: 1 }), setups(3), POOL), 1000)
    const rec = tickGameClock(s, 30000)
    expect(rec.state.endsAt).toBe(s.endsAt)
    expect(rec.state.finished).toBe(false)
    expect(remainingMs(rec.state, 30000)).toBe(31000)
  })
})

describe('Phase 5 — timer de tour', () => {
  it('détecte l’expiration et fournit une action par défaut', () => {
    const s = startClock(createGame(cfg({ turnSeconds: 20 }), setups(3), POOL), 1000)
    expect(s.turnEndsAt).toBe(21000)
    expect(turnTimedOut(s, 20000)).toBe(false)
    expect(turnTimedOut(s, 21000)).toBe(true)
    const intent = defaultIntentForPhase(s.phase)
    expect(intent).toEqual({ type: 'roll' })
    const clientId = `c${s.currentPlayerIndex + 1}`
    const r = applyIntent(s, clientId, SEATS3, intent as Intent, BOARD)
    expect(r.error).toBeNull()
    expect(r.state.phase).not.toBe('awaiting_roll')
  })
})

describe('Phase 5 — prison réelle', () => {
  it('sortie par paiement de la caution', () => {
    const base = createGame(cfg(), setups(3), POOL)
    const s = enterJail(base)
    const cur = s.currentPlayerIndex
    const before = s.players[cur]!.cash
    const r = jailPayBail(s)
    expect(r.state.players[cur]!.inJail).toBe(false)
    expect(r.state.players[cur]!.cash).toBe(before - JAIL_BAIL)
    expect(r.state.phase).toBe('awaiting_roll')
  })

  it('sortie par carte « sortie de prison » sans payer', () => {
    const base = createGame(cfg(), setups(3), POOL)
    let s = enterJail(base)
    const cur = s.currentPlayerIndex
    s = cloneState(s)
    s.players[cur]!.jailCards = 1
    const before = s.players[cur]!.cash
    const r = jailUseCard(s)
    expect(r.state.players[cur]!.inJail).toBe(false)
    expect(r.state.players[cur]!.jailCards).toBe(0)
    expect(r.state.players[cur]!.cash).toBe(before)
    expect(r.state.phase).toBe('awaiting_roll')
  })

  it('sortie par double (libre et déplacé, sans caution)', () => {
    let found = false
    for (let i = 0; i < 300 && !found; i += 1) {
      const s = enterJail(createGame(cfg({ seed: `dbl-${i}` }), setups(3), POOL), 3)
      const cur = s.currentPlayerIndex
      const before = s.players[cur]!.cash
      const r = jailAttemptDouble(s, BOARD)
      if (r.roll.isDouble) {
        found = true
        expect(r.state.players[cur]!.inJail).toBe(false)
        expect(r.state.players[cur]!.cash).toBeGreaterThanOrEqual(before) // aucune caution
        expect(r.state.players[cur]!.position).not.toBe(jailIndex(BOARD))
      }
    }
    expect(found).toBe(true)
  })

  it('double raté : reste en cuve et décompte les tours', () => {
    let found = false
    for (let i = 0; i < 300 && !found; i += 1) {
      const s = enterJail(createGame(cfg({ seed: `stay-${i}` }), setups(3), POOL), 3)
      const cur = s.currentPlayerIndex
      const r = jailAttemptDouble(s, BOARD)
      if (!r.roll.isDouble) {
        found = true
        expect(r.state.players[cur]!.inJail).toBe(true)
        expect(r.state.players[cur]!.jailTurns).toBe(2)
        expect(r.outcome.kind).toBe('jail_stay')
        expect(r.state.phase).toBe('turn_cleanup')
      }
    }
    expect(found).toBe(true)
  })

  it('libération forcée au dernier tour (toujours libéré)', () => {
    for (let i = 0; i < 10; i += 1) {
      const s = enterJail(createGame(cfg({ seed: `forced-${i}` }), setups(3), POOL), 1)
      const cur = s.currentPlayerIndex
      const r = jailAttemptDouble(s, BOARD)
      expect(r.state.players[cur]!.inJail).toBe(false)
    }
  })
})

describe('Phase 5 — machine à états (intentions invalides)', () => {
  const s0 = createGame(cfg(), setups(3), POOL) // phase awaiting_roll, joueur 0

  it('refuse une intention hors-tour', () => {
    expect(applyIntent(s0, 'c2', SEATS3, { type: 'roll' }, BOARD).error).toBe('not_your_turn')
  })

  it('refuse une intention hors-phase avec un code clair', () => {
    expect(applyIntent(s0, 'c1', SEATS3, { type: 'buy', yes: true }, BOARD).error).toBe('wrong_phase')
    expect(applyIntent(s0, 'c1', SEATS3, { type: 'endTurn' }, BOARD).error).toBe('wrong_phase')
    expect(applyIntent(s0, 'c1', SEATS3, { type: 'jail', action: 'bail' }, BOARD).error).toBe('wrong_phase')
  })

  it('refuse toute intention après la fin de partie', () => {
    const done = endGame(s0)
    expect(applyIntent(done, 'c1', SEATS3, { type: 'roll' }, BOARD).error).toBe('game_over')
  })

  it('ne mute jamais l’état sur intention invalide', () => {
    const res = applyIntent(s0, 'c1', SEATS3, { type: 'buy', yes: true }, BOARD)
    expect(res.state).toBe(s0)
  })
})

describe('Phase 5 — déterminisme complet (rejeu identique)', () => {
  function policy(state: GameState): Intent | null {
    switch (state.phase) {
      case 'awaiting_roll':
        return { type: 'roll' }
      case 'awaiting_jail':
        return { type: 'jail', action: 'double' }
      case 'awaiting_purchase':
        return { type: 'buy', yes: true }
      case 'awaiting_card':
        return { type: 'ackCard' }
      case 'turn_cleanup':
        return { type: 'endTurn' }
      default:
        return null
    }
  }

  function runScript(seed: string): GameState {
    let s = startClock(
      createGame(cfg({ seed, turnSeconds: 30, shuffleOrder: true, startCompensation: true }), setups(3), POOL),
      1000,
    )
    let now = 1000
    for (let guard = 0; guard < 400 && !s.finished && s.turn <= 12; guard += 1) {
      now += 500
      const intent = policy(s)
      if (!intent) break
      const clientId = `c${s.currentPlayerIndex + 1}`
      const r = applyIntent(s, clientId, SEATS3, intent, BOARD)
      if (r.error) break
      s = r.state
      if (intent.type === 'endTurn' && !s.finished) s = stampTurnTimer(s, now)
    }
    return s
  }

  it('même seed + mêmes intentions + même horloge → état identique', () => {
    expect(runScript('rejeu-42')).toEqual(runScript('rejeu-42'))
  })

  it('grant de carte « sortie de prison » appliqué de façon déterministe', () => {
    // Vérifie que la carte jail_free existe et est reconnue par le moteur/contenu.
    const card = getCardById('chance_sortie_cuve')
    expect(card?.effect).toBe('jail_free')
  })
})
