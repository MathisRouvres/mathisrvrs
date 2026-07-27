import type { GamePhase } from './types'

/**
 * Machine à états du tour (Phase 5) — formalisation.
 *
 * Phases du GDD/spec, classées par nature :
 *  - persistées (états de repos, une intention attendue) :
 *      waiting · awaiting_roll · awaiting_jail · awaiting_purchase ·
 *      awaiting_card · turn_cleanup · finished
 *  - transitoires (traversées atomiquement dans `takeTurn` / `resolveMovement`,
 *    jamais persistées) : rolling · moving · resolving_tile
 *  - réservée (à venir) : awaiting_trade
 *
 * Les phases transitoires sont listées ici pour la traçabilité même si le moteur
 * ne les persiste pas (le mouvement + la résolution de case sont atomiques).
 */
export const SPEC_TURN_PHASES = [
  'waiting',
  'rolling',
  'moving',
  'resolving_tile',
  'awaiting_purchase',
  'awaiting_card',
  'awaiting_trade',
  'turn_cleanup',
  'finished',
] as const

/** Types d’intention réseau/joueur. */
export type IntentType =
  | 'roll'
  | 'buy'
  | 'ackCard'
  | 'endTurn'
  | 'jail'
  | 'endGame'
  | 'build'
  | 'sellBuilding'
  | 'mortgage'
  | 'unmortgage'
  | 'bid'
  | 'passBid'

/** Gestion des établissements/hypothèques : autorisée dans les phases de repos du tour. */
const MANAGE: IntentType[] = ['build', 'sellBuilding', 'mortgage', 'unmortgage']

/** Intentions acceptées dans chaque phase persistée. `endGame` est traité à part (autorité hôte). */
export const PHASE_INTENTS: Record<GamePhase, IntentType[]> = {
  waiting: [],
  awaiting_roll: ['roll', ...MANAGE],
  awaiting_jail: ['jail'],
  awaiting_purchase: ['buy'],
  awaiting_card: ['ackCard'],
  awaiting_trade: ['endTurn'],
  awaiting_auction: ['bid', 'passBid'],
  turn_cleanup: ['endTurn', ...MANAGE],
  finished: [],
}

/** Codes d’erreur métier renvoyés par le reducer (jamais d’exception qui casse la partie). */
export type IntentError =
  | 'not_your_turn'
  | 'wrong_phase'
  | 'invalid_jail_action'
  | 'no_jail_card'
  | 'game_over'
  | 'unknown_intent'

/**
 * Valide qu’un type d’intention est accepté dans la phase courante.
 * Retourne un code d’erreur métier clair, ou `null` si l’intention est recevable.
 */
export function validatePhaseIntent(phase: GamePhase, intentType: IntentType): IntentError | null {
  if (intentType === 'endGame') return null
  if (phase === 'finished') return 'game_over'
  const allowed = PHASE_INTENTS[phase] ?? []
  return allowed.includes(intentType) ? null : 'wrong_phase'
}
