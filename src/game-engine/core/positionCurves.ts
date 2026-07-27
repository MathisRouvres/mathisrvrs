import type { SportStatId } from '../types/career'

export interface PositionGrowthCurve {
  positionId: string
  /** Âge de pic approximatif. */
  peakAge: number
  /** Début de déclin physique marqué. */
  declineAge: number
  /** Multiplicateur de gain avant le pic. */
  growthRate: number
  /** Multiplicateur de perte après declineAge. */
  declineRate: number
  /** Stats qui déclinent plus vite avec l’âge. */
  fragileStats: SportStatId[]
  /** Stats qui tiennent mieux (expérience). */
  durableStats: SportStatId[]
}

const DEFAULT_CURVE: Omit<PositionGrowthCurve, 'positionId'> = {
  peakAge: 27,
  declineAge: 31,
  growthRate: 1,
  declineRate: 1,
  fragileStats: ['vitesse', 'endurance', 'dribble'],
  durableStats: ['tactique', 'placement', 'sangFroid', 'leadership'],
}

export const POSITION_CURVES: Record<string, PositionGrowthCurve> = {
  gk: {
    positionId: 'gk',
    peakAge: 30,
    declineAge: 34,
    growthRate: 0.95,
    declineRate: 0.75,
    fragileStats: ['vitesse', 'endurance'],
    durableStats: ['placement', 'sangFroid', 'leadership', 'tactique'],
  },
  cb: {
    positionId: 'cb',
    peakAge: 28,
    declineAge: 32,
    growthRate: 1,
    declineRate: 0.9,
    fragileStats: ['vitesse', 'endurance'],
    durableStats: ['placement', 'tactique', 'defense', 'leadership'],
  },
  fb: {
    positionId: 'fb',
    peakAge: 26,
    declineAge: 30,
    growthRate: 1.05,
    declineRate: 1.15,
    fragileStats: ['vitesse', 'endurance', 'dribble'],
    durableStats: ['tactique', 'passe', 'placement'],
  },
  cdm: {
    positionId: 'cdm',
    peakAge: 28,
    declineAge: 32,
    growthRate: 1,
    declineRate: 0.85,
    fragileStats: ['vitesse', 'endurance'],
    durableStats: ['tactique', 'passe', 'placement', 'sangFroid'],
  },
  cm: {
    positionId: 'cm',
    peakAge: 27,
    declineAge: 31,
    growthRate: 1.05,
    declineRate: 0.95,
    fragileStats: ['vitesse', 'endurance'],
    durableStats: ['passe', 'vision', 'tactique', 'sangFroid'],
  },
  cam: {
    positionId: 'cam',
    peakAge: 26,
    declineAge: 30,
    growthRate: 1.1,
    declineRate: 1.05,
    fragileStats: ['vitesse', 'dribble'],
    durableStats: ['vision', 'passe', 'technique', 'sangFroid'],
  },
  winger: {
    positionId: 'winger',
    peakAge: 25,
    declineAge: 29,
    growthRate: 1.15,
    declineRate: 1.35,
    fragileStats: ['vitesse', 'dribble', 'endurance'],
    durableStats: ['technique', 'tir', 'vision'],
  },
  st: {
    positionId: 'st',
    peakAge: 27,
    declineAge: 31,
    growthRate: 1.1,
    declineRate: 1.1,
    fragileStats: ['vitesse', 'endurance'],
    durableStats: ['finition', 'placement', 'sangFroid', 'tir'],
  },
}

export function getPositionCurve(positionId: string): PositionGrowthCurve {
  return (
    POSITION_CURVES[positionId] ?? {
      positionId,
      ...DEFAULT_CURVE,
    }
  )
}

/**
 * Poids par poste pour le niveau global (Phase 13). Cause du plateau ~65 :
 * l'ancien niveau = moyenne NON pondérée des 15 stats → les stats hors-poste
 * (basses) tiraient la moyenne vers le bas, quelle que soit l'excellence aux
 * postes-clés. On pondère fortement les stats du poste (comme un « overall »
 * de jeu de gestion) : un spécialiste atteint enfin son vrai niveau.
 */
const KEY_WEIGHT = 3.0
const SECONDARY_WEIGHT = 1.35
const REST_WEIGHT = 0.45

const POSITION_STATS: Record<
  string,
  { key: SportStatId[]; secondary: SportStatId[] }
> = {
  gk: { key: ['placement', 'sangFroid', 'controle', 'vision'], secondary: ['leadership', 'tactique', 'puissance', 'passe'] },
  cb: { key: ['defense', 'placement', 'puissance', 'tactique'], secondary: ['sangFroid', 'leadership', 'endurance', 'vitesse'] },
  fb: { key: ['vitesse', 'endurance', 'defense', 'dribble'], secondary: ['passe', 'tactique', 'placement', 'technique'] },
  cdm: { key: ['tactique', 'defense', 'passe', 'placement'], secondary: ['sangFroid', 'endurance', 'puissance', 'vision'] },
  cm: { key: ['passe', 'vision', 'technique', 'endurance'], secondary: ['controle', 'tactique', 'sangFroid', 'dribble'] },
  cam: { key: ['vision', 'technique', 'passe', 'dribble'], secondary: ['controle', 'tir', 'finition', 'sangFroid'] },
  winger: { key: ['vitesse', 'dribble', 'technique', 'tir'], secondary: ['finition', 'controle', 'passe', 'endurance'] },
  st: { key: ['finition', 'tir', 'placement', 'puissance'], secondary: ['vitesse', 'dribble', 'technique', 'sangFroid'] },
}

const DEFAULT_POSITION_STATS = {
  key: ['passe', 'vision', 'technique', 'endurance'] as SportStatId[],
  secondary: ['controle', 'tactique', 'sangFroid', 'dribble'] as SportStatId[],
}

/**
 * Niveau global pondéré par le poste (0–99). Remplace la moyenne plate.
 * `stats` peut contenir des flottants (accumulation fractionnaire).
 */
export function positionOverall(
  stats: Record<SportStatId, number>,
  positionId: string,
): number {
  const profile = POSITION_STATS[positionId] ?? DEFAULT_POSITION_STATS
  const keySet = new Set<string>(profile.key)
  const secSet = new Set<string>(profile.secondary)
  let sum = 0
  let weight = 0
  for (const id of Object.keys(stats) as SportStatId[]) {
    const w = keySet.has(id) ? KEY_WEIGHT : secSet.has(id) ? SECONDARY_WEIGHT : REST_WEIGHT
    sum += stats[id] * w
    weight += w
  }
  return weight > 0 ? sum / weight : 0
}

/**
 * Facteur d’âge ∈ ~[0.35, 1.25] selon la courbe du poste.
 * >1 = fenêtre de progression, <1 = maturité ou déclin.
 */
export function ageGrowthFactor(age: number, curve: PositionGrowthCurve): number {
  if (age < 18) return 1.15 * curve.growthRate
  if (age < curve.peakAge - 3) return 1.1 * curve.growthRate
  if (age <= curve.peakAge) return 1.0 * curve.growthRate
  if (age < curve.declineAge) return 0.85
  if (age < curve.declineAge + 3) return 0.55 / curve.declineRate
  return 0.35 / curve.declineRate
}
