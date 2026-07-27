import type { DifficultyId } from './constants'
import { DIFFICULTY_MULTIPLIER } from './constants'

/** Palier de propriété → gorgées de base (voir GDD §5). tier 3 = cul sec. */
export const SIP_TIER_BASE: Record<1 | 2 | 3, number> = { 1: 1, 2: 2, 3: 4 }

/** Gorgées dues sur un loyer : palier × multiplicateur du niveau. */
export function sipsForTier(tier: 1 | 2 | 3, difficulty: DifficultyId): number {
  return SIP_TIER_BASE[tier] * DIFFICULTY_MULTIPLIER[difficulty]
}

/** Gorgées dues par une carte action : base × multiplicateur du niveau. */
export function sipsForCard(baseSips: number, difficulty: DifficultyId): number {
  return baseSips * DIFFICULTY_MULTIPLIER[difficulty]
}
