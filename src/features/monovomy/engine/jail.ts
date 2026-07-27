import type { BoardTheme } from '../content/schema'
import type { DiceRoll, GameState, TurnResult } from './types'
import { JAIL_BAIL, JAIL_BAIL_SIPS } from './constants'
import { cloneState } from './clone'
import { createGameRng, rollDice } from './rng'
import { applyBankruptcy, currentPlayer, resolveMovement } from './turn'

/**
 * Prison réelle (Phase 5). Le joueur en prison ne se déplace pas tant qu’il n’en
 * est pas sorti : caution, double aux dés, carte « sortie de prison », ou
 * libération forcée après `JAIL_MAX_TURNS` tours. Il conserve son cash / ses
 * biens et peut toujours consulter/négocier (non bloqué au sens du jeu).
 *
 * Le mode soft remplace la gorgée de caution par un mini-gage : le moteur
 * expose `sips` (base), la substitution soft se fait à l’affichage comme ailleurs.
 */

const ZERO_ROLL: DiceRoll = { d1: 0, d2: 0, total: 0, isDouble: false }

function assertJail(state: GameState): void {
  if (state.phase !== 'awaiting_jail' || state.finished) {
    throw new Error('jail: aucune résolution de prison en attente')
  }
  if (!currentPlayer(state).inJail) {
    throw new Error('jail: le joueur courant n’est pas en prison')
  }
}

function free(next: GameState): void {
  const player = currentPlayer(next)
  player.inJail = false
  player.jailTurns = 0
}

/** Paie la caution : libère le joueur, qui pourra ensuite lancer normalement. */
export function jailPayBail(state: GameState): TurnResult {
  assertJail(state)
  const next = cloneState(state)
  const player = currentPlayer(next)
  const paid = Math.min(player.cash, JAIL_BAIL)
  player.cash -= paid
  const shortfall = JAIL_BAIL - paid
  const bankruptcy = shortfall > 0 ? applyBankruptcy(next, player) : null
  free(next)
  if (bankruptcy?.eliminated) {
    next.phase = 'turn_cleanup'
  } else {
    next.phase = 'awaiting_roll'
  }
  return {
    state: next,
    roll: ZERO_ROLL,
    passedStart: false,
    salary: 0,
    outcome: { kind: 'jail_out', name: 'Caution payée', via: 'bail', sips: JAIL_BAIL_SIPS },
    bankruptcy,
  }
}

/** Utilise une carte « sortie de prison » ; libère sans payer. */
export function jailUseCard(state: GameState): TurnResult {
  assertJail(state)
  const player0 = currentPlayer(state)
  if (player0.jailCards <= 0) throw new Error('jail: aucune carte de sortie')
  const next = cloneState(state)
  const player = currentPlayer(next)
  player.jailCards -= 1
  free(next)
  next.phase = 'awaiting_roll'
  return {
    state: next,
    roll: ZERO_ROLL,
    passedStart: false,
    salary: 0,
    outcome: { kind: 'jail_out', name: 'Carte de sortie', via: 'card', sips: 0 },
    bankruptcy: null,
  }
}

/**
 * Tente un double pour sortir. Double → libéré et déplacé immédiatement.
 * Sinon décompte un tour ; au dernier tour, libération forcée (caution payée) +
 * déplacement du jet ; tant qu’il reste des tours, reste en prison (fin de tour).
 */
export function jailAttemptDouble(state: GameState, board: BoardTheme): TurnResult {
  assertJail(state)
  const rng = createGameRng(state.config.seed, state.rngState)
  const roll = rollDice(rng)
  const next = cloneState(state)
  next.rngState = rng.getState()
  const player = currentPlayer(next)

  if (roll.isDouble) {
    free(next)
    return resolveMovement(next, board, roll).result
  }

  player.jailTurns -= 1
  if (player.jailTurns <= 0) {
    // Libération forcée : on paie la caution (bornée) puis on avance du jet.
    const paid = Math.min(player.cash, JAIL_BAIL)
    player.cash -= paid
    const shortfall = JAIL_BAIL - paid
    const bankruptcy = shortfall > 0 ? applyBankruptcy(next, player) : null
    free(next)
    if (bankruptcy?.eliminated) {
      next.phase = 'turn_cleanup'
      return {
        state: next,
        roll,
        passedStart: false,
        salary: 0,
        outcome: { kind: 'jail_out', name: 'Libération forcée', via: 'bail', sips: JAIL_BAIL_SIPS },
        bankruptcy,
      }
    }
    const moved = resolveMovement(next, board, roll).result
    return { ...moved, bankruptcy: moved.bankruptcy ?? bankruptcy }
  }

  // Reste en prison, le tour se termine.
  next.phase = 'turn_cleanup'
  return {
    state: next,
    roll,
    passedStart: false,
    salary: 0,
    outcome: { kind: 'jail_stay', name: 'Toujours en cuve', turnsLeft: player.jailTurns, sips: JAIL_BAIL_SIPS },
    bankruptcy: null,
  }
}
