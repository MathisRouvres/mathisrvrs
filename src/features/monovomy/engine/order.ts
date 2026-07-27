import type { GameConfig } from './types'
import type { SeededRng } from './rng'
import { DEFAULT_COMPENSATION_STEP } from './constants'

/**
 * Construit l’ordre de jeu : une permutation des index de joueurs.
 * `shuffle` mélange via le PRNG seedé (déterministe) ; sinon ordre identité.
 */
export function buildTurnOrder(rng: SeededRng, count: number, shuffle: boolean): number[] {
  const identity = Array.from({ length: count }, (_, i) => i)
  return shuffle ? rng.shuffle(identity) : identity
}

/**
 * Bonus de compensation de départ pour un rang d’ordre donné (0 = premier à jouer).
 * Les joueurs qui jouent plus tard reçoivent un peu plus de cash — atténue
 * l’avantage du premier joueur. Désactivable via `config.startCompensation`.
 */
export function compensationForRank(config: GameConfig, rank: number): number {
  if (!config.startCompensation) return 0
  const step = config.compensationStep ?? DEFAULT_COMPENSATION_STEP
  return rank * step
}
