import { clamp, clampCash, clampRelation, clampStat, clampResource, clampHidden } from '../core/clamp'
import type { CareerState, SportStatId } from '../types/career'

export function applyStatDelta(
  state: CareerState,
  statId: SportStatId,
  delta: number,
): CareerState {
  return {
    ...state,
    stats: {
      ...state.stats,
      [statId]: clampStat(state.stats[statId] + delta),
    },
  }
}

export { clamp, clampCash, clampRelation, clampStat, clampResource, clampHidden }
