import type { DiceRoll } from './types'
import { createRng, type SeededRng } from '../../../game-engine/random/createRng'

export type { SeededRng }

/** Instancie le PRNG déterministe du jeu, éventuellement à un état donné. */
export function createGameRng(seed: string | number, state?: number): SeededRng {
  const rng = createRng(seed)
  if (state !== undefined) rng.setState(state)
  return rng
}

/** Lance deux dés à 6 faces via le PRNG déterministe. */
export function rollDice(rng: SeededRng): DiceRoll {
  const d1 = rng.randomInt(1, 6)
  const d2 = rng.randomInt(1, 6)
  return { d1, d2, total: d1 + d2, isDouble: d1 === d2 }
}
