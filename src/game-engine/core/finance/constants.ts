import type { LifestyleId } from '../../types/career'

/**
 * Paramètres économiques (Phase 2).
 * Devise fictive alignée sur l'échelle existante (cash de départ ~500,
 * primes de dilemmes 30k, valeurs marchandes 120k–400k).
 */

/** Paliers de salaire hebdomadaire — bornes [min, max] par tier. */
export type WageTierId =
  | 'centre'
  | 'jeune_pro'
  | 'remplacant'
  | 'rotation'
  | 'titulaire'
  | 'cadre'
  | 'star_championnat'
  | 'international'
  | 'star_mondiale'

export const WAGE_TIER_IDS: readonly WageTierId[] = [
  'centre',
  'jeune_pro',
  'remplacant',
  'rotation',
  'titulaire',
  'cadre',
  'star_championnat',
  'international',
  'star_mondiale',
]

/** Fourchettes hebdomadaires cohérentes (croissantes, sans chevauchement). */
export const WAGE_BRACKETS: Record<WageTierId, readonly [number, number]> = {
  centre: [0, 250],
  jeune_pro: [250, 1_200],
  remplacant: [1_200, 4_000],
  rotation: [4_000, 12_000],
  titulaire: [12_000, 35_000],
  cadre: [35_000, 80_000],
  star_championnat: [80_000, 160_000],
  international: [160_000, 300_000],
  star_mondiale: [300_000, 600_000],
}

export const WAGE_TIER_LABELS: Record<WageTierId, string> = {
  centre: 'Joueur du centre',
  jeune_pro: 'Jeune professionnel',
  remplacant: 'Remplaçant',
  rotation: 'Joueur de rotation',
  titulaire: 'Titulaire',
  cadre: 'Cadre',
  star_championnat: 'Star du championnat',
  international: 'International',
  star_mondiale: 'Star mondiale',
}

export const WEEKS_PER_SEASON = 52

/** Commission agent par défaut (fraction du salaire annuel). */
export const DEFAULT_AGENT_COMMISSION = 0.06

/** Rendement annuel des investissements (fraction de la valeur placée). */
export const INVESTMENT_YIELD_RATE = 0.05

/** Paramètres du niveau de vie : coût fixe annuel + part variable du revenu. */
export const LIFESTYLE_PARAMS: Record<
  LifestyleId,
  { base: number; rate: number }
> = {
  modeste: { base: 6_000, rate: 0.14 },
  confortable: { base: 22_000, rate: 0.26 },
  luxueux: { base: 90_000, rate: 0.38 },
  extravagant: { base: 280_000, rate: 0.5 },
}

/** Seuils de salaire hebdomadaire pour dériver le niveau de vie. */
export const LIFESTYLE_WAGE_THRESHOLDS: ReadonlyArray<
  [LifestyleId, number]
> = [
  ['modeste', 1_200],
  ['confortable', 12_000],
  ['luxueux', 80_000],
  // au-delà : extravagant
]

/** Revenus de sélection nationale (annuels). */
export const SELECTION_INCOME = {
  regular: 45_000,
  capped: 14_000,
} as const

/** Palier d'ancienneté déclenchant le bonus de fidélité. */
export const LOYALTY_MILESTONE_SEASONS = 4
