import {
  RELATION_MAX,
  RELATION_MIN,
  RESOURCE_MAX,
  RESOURCE_MIN,
  HIDDEN_MAX,
  HIDDEN_MIN,
  STAT_MAX,
  STAT_MIN,
} from './constants'

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function clampStat(value: number): number {
  return Math.round(clamp(value, STAT_MIN, STAT_MAX))
}

/**
 * Clamp de stat SANS arrondi (Phase 13). La progression saisonnière est
 * fractionnaire : arrondir chaque écriture supprimait les gains < 0,5/saison
 * (plateau artificiel). Les stats sont stockées en flottant ; l'arrondi ne se
 * fait qu'à l'affichage (`getVisibleStats`).
 */
export function clampStatFloat(value: number): number {
  return clamp(value, STAT_MIN, STAT_MAX)
}

export function clampRelation(value: number): number {
  return Math.round(clamp(value, RELATION_MIN, RELATION_MAX))
}

export function clampResource(value: number): number {
  return Math.round(clamp(value, RESOURCE_MIN, RESOURCE_MAX))
}

export function clampHidden(value: number): number {
  return Math.round(clamp(value, HIDDEN_MIN, HIDDEN_MAX))
}

export function clampCash(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value))
}
