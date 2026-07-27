import type { SportStatId } from '../../game-engine/types'

export interface PositionDefinition {
  id: string
  label: string
  shortLabel: string
  /** Coefficients d’évaluation (somme ≈ 1). */
  evalWeights: Partial<Record<SportStatId, number>>
  /** Bonus de base à la création. */
  baseBoosts: Partial<Record<SportStatId, number>>
  keyStats: SportStatId[]
}

export const positions: PositionDefinition[] = [
  {
    id: 'gk',
    label: 'Gardien',
    shortLabel: 'GB',
    evalWeights: {
      placement: 0.22,
      sangFroid: 0.18,
      controle: 0.14,
      vision: 0.12,
      leadership: 0.1,
      puissance: 0.08,
      tactique: 0.08,
      endurance: 0.08,
    },
    baseBoosts: { placement: 8, sangFroid: 6, controle: 4, leadership: 3 },
    keyStats: ['placement', 'sangFroid', 'controle', 'vision'],
  },
  {
    id: 'cb',
    label: 'Défenseur central',
    shortLabel: 'DC',
    evalWeights: {
      defense: 0.22,
      placement: 0.18,
      puissance: 0.14,
      tactique: 0.12,
      sangFroid: 0.1,
      endurance: 0.08,
      leadership: 0.08,
      passe: 0.08,
    },
    baseBoosts: { defense: 8, placement: 6, puissance: 5, tactique: 3 },
    keyStats: ['defense', 'placement', 'puissance', 'tactique'],
  },
  {
    id: 'fb',
    label: 'Latéral',
    shortLabel: 'LAT',
    evalWeights: {
      vitesse: 0.18,
      endurance: 0.16,
      defense: 0.14,
      dribble: 0.12,
      passe: 0.1,
      placement: 0.1,
      technique: 0.1,
      puissance: 0.1,
    },
    baseBoosts: { vitesse: 7, endurance: 6, defense: 4, dribble: 3 },
    keyStats: ['vitesse', 'endurance', 'defense', 'dribble'],
  },
  {
    id: 'cdm',
    label: 'Milieu défensif',
    shortLabel: 'MDC',
    evalWeights: {
      tactique: 0.18,
      defense: 0.16,
      passe: 0.14,
      placement: 0.12,
      endurance: 0.12,
      vision: 0.1,
      sangFroid: 0.1,
      puissance: 0.08,
    },
    baseBoosts: { tactique: 7, defense: 5, passe: 4, endurance: 3 },
    keyStats: ['tactique', 'defense', 'passe', 'placement'],
  },
  {
    id: 'cm',
    label: 'Milieu central',
    shortLabel: 'MC',
    evalWeights: {
      passe: 0.18,
      vision: 0.16,
      technique: 0.14,
      endurance: 0.12,
      tactique: 0.12,
      controle: 0.1,
      sangFroid: 0.1,
      leadership: 0.08,
    },
    baseBoosts: { passe: 6, vision: 6, technique: 4, endurance: 3 },
    keyStats: ['passe', 'vision', 'technique', 'endurance'],
  },
  {
    id: 'cam',
    label: 'Milieu offensif',
    shortLabel: 'MO',
    evalWeights: {
      vision: 0.2,
      technique: 0.16,
      passe: 0.14,
      dribble: 0.14,
      controle: 0.12,
      tir: 0.1,
      sangFroid: 0.08,
      vitesse: 0.06,
    },
    baseBoosts: { vision: 7, technique: 6, dribble: 4, passe: 3 },
    keyStats: ['vision', 'technique', 'passe', 'dribble'],
  },
  {
    id: 'winger',
    label: 'Ailier',
    shortLabel: 'AI',
    evalWeights: {
      vitesse: 0.2,
      dribble: 0.18,
      technique: 0.14,
      tir: 0.12,
      endurance: 0.1,
      controle: 0.1,
      finition: 0.08,
      passe: 0.08,
    },
    baseBoosts: { vitesse: 8, dribble: 6, technique: 4, tir: 3 },
    keyStats: ['vitesse', 'dribble', 'technique', 'tir'],
  },
  {
    id: 'st',
    label: 'Avant-centre',
    shortLabel: 'BU',
    evalWeights: {
      finition: 0.22,
      tir: 0.16,
      puissance: 0.12,
      placement: 0.12,
      controle: 0.1,
      sangFroid: 0.1,
      vitesse: 0.1,
      dribble: 0.08,
    },
    baseBoosts: { finition: 8, tir: 6, placement: 4, puissance: 3 },
    keyStats: ['finition', 'tir', 'placement', 'puissance'],
  },
]

export function getPositionById(id: string): PositionDefinition | undefined {
  return positions.find((p) => p.id === id)
}
