import { seedToState } from './seed'

export interface SeededRng {
  /** État courant (sérialisable). */
  getState(): number
  setState(state: number): void
  randomFloat(): number
  randomInt(min: number, max: number): number
  chance(probability: number): boolean
  pick<T>(items: readonly T[]): T
  weightedPick<T>(items: readonly T[], weights: readonly number[]): T
  shuffle<T>(items: readonly T[]): T[]
}

/**
 * PRNG Mulberry32 — déterministe, rapide, adapté au gameplay.
 * Aucun Math.random() métier.
 */
export function createRng(seed: string | number): SeededRng {
  let state = seedToState(seed)

  function nextUint32(): number {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
  }

  function randomFloat(): number {
    return nextUint32() / 4294967296
  }

  function randomInt(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new RangeError('randomInt: min et max doivent être finis')
    }
    if (max < min) {
      throw new RangeError('randomInt: max doit être >= min')
    }
    if (min === max) return min
    const span = max - min + 1
    return min + Math.floor(randomFloat() * span)
  }

  function chance(probability: number): boolean {
    if (!Number.isFinite(probability)) {
      throw new RangeError('chance: probability invalide')
    }
    if (probability <= 0) return false
    if (probability >= 1) return true
    return randomFloat() < probability
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('pick: liste vide')
    }
    return items[randomInt(0, items.length - 1)] as T
  }

  function weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length === 0) {
      throw new RangeError('weightedPick: liste vide')
    }
    if (items.length !== weights.length) {
      throw new RangeError('weightedPick: items et weights de tailles différentes')
    }
    let total = 0
    for (const w of weights) {
      if (!Number.isFinite(w) || w < 0) {
        throw new RangeError('weightedPick: poids invalide')
      }
      total += w
    }
    if (total <= 0) {
      throw new RangeError('weightedPick: somme des poids nulle')
    }
    let cursor = randomFloat() * total
    for (let i = 0; i < items.length; i += 1) {
      cursor -= weights[i] as number
      if (cursor < 0) return items[i] as T
    }
    return items[items.length - 1] as T
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const copy = items.slice()
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(0, i)
      const tmp = copy[i] as T
      copy[i] = copy[j] as T
      copy[j] = tmp
    }
    return copy
  }

  return {
    getState: () => state,
    setState: (next) => {
      state = next >>> 0 || 0x9e3779b9
    },
    randomFloat,
    randomInt,
    chance,
    pick,
    weightedPick,
    shuffle,
  }
}
