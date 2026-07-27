import type { GameState } from './types'
import { cloneState } from './clone'

/**
 * Horloge de partie — timestamps ABSOLUS partagés (ms), jamais un compteur local.
 *
 * Le moteur reste pur et déterministe : le temps entre toujours par le paramètre
 * `now` fourni par l’appelant (l’hôte injecte `Date.now()`, les tests un temps fixe).
 * `endsAt` étant absolu, une reconnexion se resynchronise sans réinitialiser le timer.
 */

const MS_PER_MINUTE = 60_000

/** True si le timer de partie tourne (démarré et avec une échéance). */
export function clockRunning(state: GameState): boolean {
  return state.startedAt > 0 && state.endsAt > 0
}

/** Temps restant de partie (ms), borné à 0. */
export function remainingMs(state: GameState, now: number): number {
  if (!clockRunning(state)) return Math.max(0, state.remainingTime)
  return Math.max(0, state.endsAt - now)
}

/** Démarre l’horloge : stampe `startedAt`/`endsAt` et le premier timer de tour. */
export function startClock(state: GameState, now: number): GameState {
  const next = cloneState(state)
  next.startedAt = now
  const durationMs = Math.max(0, state.config.durationMinutes) * MS_PER_MINUTE
  next.endsAt = durationMs > 0 ? now + durationMs : 0
  next.remainingTime = durationMs
  return stampTurnTimer(next, now)
}

/** (Re)stampe l’échéance du tour courant selon `config.turnSeconds`. */
export function stampTurnTimer(state: GameState, now: number): GameState {
  const next = cloneState(state)
  const secs = state.config.turnSeconds
  next.turnEndsAt = secs && secs > 0 && !state.finished ? now + secs * 1000 : 0
  return next
}

/** Vrai si le tour courant a dépassé son échéance. */
export function turnTimedOut(state: GameState, now: number): boolean {
  if (state.finished) return false
  return state.turnEndsAt > 0 && now >= state.turnEndsAt
}

/** Temps restant du tour courant (ms), borné à 0 ; -1 si pas de timer de tour. */
export function turnRemainingMs(state: GameState, now: number): number {
  if (state.turnEndsAt <= 0) return -1
  return Math.max(0, state.turnEndsAt - now)
}

/**
 * Tick de l’horloge de partie. Met à jour `remainingTime` et, si l’échéance est
 * atteinte, termine proprement : `finished`, phase `finished`, `endReason = 'timer'`.
 * Pur et déterministe pour un `now` donné.
 */
export function tickGameClock(state: GameState, now: number): { state: GameState; justEnded: boolean } {
  if (!clockRunning(state) || state.finished) {
    return { state, justEnded: false }
  }
  const next = cloneState(state)
  if (now >= state.endsAt) {
    next.remainingTime = 0
    next.finished = true
    next.phase = 'finished'
    next.endReason = state.endReason ?? 'timer'
    next.turnEndsAt = 0
    return { state: next, justEnded: true }
  }
  next.remainingTime = state.endsAt - now
  return { state: next, justEnded: false }
}
