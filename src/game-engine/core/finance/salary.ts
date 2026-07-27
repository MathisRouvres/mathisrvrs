import type { ClubStatusId } from '../../types/career'
import { clamp } from '../clamp'
import {
  WAGE_BRACKETS,
  type WageTierId,
} from './constants'

/**
 * Facteurs de calcul du salaire (Phase 2).
 * Tous dérivés de l'état du moteur — aucun système parallèle.
 */
export interface WageFactors {
  age: number
  /** Niveau global visible (1–99). */
  level: number
  /** Potentiel estimé (1–99, trait caché). */
  potentiel: number
  /** Réputation sportive (0–100). */
  reputation: number
  clubStatus: ClubStatusId
  /** Prestige du club (niveau de compétition, 1–99). */
  clubPrestige: number
  /** Niveau du championnat (1–99). */
  leagueLevel: number
  /** Statut en sélection nationale. */
  nationalTier: 'none' | 'capped' | 'regular'
  /** Qualité/relation de l'agent (0–100). */
  agentQuality: number
  /** Fragilité physique (1–99, décote si élevée). */
  fragility: number
  /** Tension du marché / concurrence entre clubs (0–1). */
  competition: number
}

const STATUS_BONUS: Record<ClubStatusId, number> = {
  academy: -32,
  bench: -10,
  rotation: 0,
  starter: 9,
  key_player: 17,
}

const NATIONAL_BONUS: Record<WageFactors['nationalTier'], number> = {
  none: 0,
  capped: 6,
  regular: 14,
}

/**
 * Score de marché 0–100 combinant réputation, niveau, statut, sélection,
 * championnat et une prime de jeunesse à haut potentiel.
 */
export function computeMarketScore(f: WageFactors): number {
  const youthPotential =
    f.age <= 23 ? Math.max(0, (f.potentiel - 55) * 0.35) : 0
  const score =
    f.reputation * 0.42 +
    f.level * 0.34 +
    STATUS_BONUS[f.clubStatus] +
    NATIONAL_BONUS[f.nationalTier] +
    f.leagueLevel * 0.1 +
    youthPotential
  return clamp(score, 0, 100)
}

/** Tier de salaire dérivé du score de marché (et du statut académie). */
export function deriveWageTier(f: WageFactors): WageTierId {
  if (f.clubStatus === 'academy') return 'centre'
  const s = computeMarketScore(f)
  if (s < 22) return 'jeune_pro'
  if (s < 36) return 'remplacant'
  if (s < 49) return 'rotation'
  if (s < 61) return 'titulaire'
  if (s < 73) return 'cadre'
  if (s < 83) return 'star_championnat'
  if (s < 92) return 'international'
  return 'star_mondiale'
}

/**
 * Position dans la fourchette [0,1] selon les facteurs fins :
 * potentiel jeune, agent, concurrence, championnat, moins la fragilité.
 */
function bracketPosition(f: WageFactors): number {
  const youth = f.age <= 24 ? clamp((f.potentiel - 50) / 50, 0, 1) * 0.2 : 0
  const agent = clamp(f.agentQuality / 100, 0, 1) * 0.12
  const competition = clamp(f.competition, 0, 1) * 0.16
  const league = clamp(f.leagueLevel / 99, 0, 1) * 0.1
  const fragility = clamp((f.fragility - 45) / 55, 0, 1) * 0.1
  return clamp(0.3 + youth + agent + competition + league - fragility, 0, 1)
}

/** Décote de vétéran : le salaire recule après 32 ans. */
function veteranFactor(age: number): number {
  if (age < 33) return 1
  return clamp(1 - (age - 32) * 0.08, 0.4, 1)
}

export interface WageResult {
  tier: WageTierId
  weeklyWage: number
}

/**
 * Salaire hebdomadaire cohérent, borné à la fourchette du tier.
 * Ne dépend que de facteurs déjà présents dans le moteur ; jamais négatif.
 */
export function computeContractWage(f: WageFactors): WageResult {
  const tier = deriveWageTier(f)
  const [min, max] = WAGE_BRACKETS[tier]
  const t = bracketPosition(f)
  const base = min + (max - min) * t
  const weeklyWage = Math.max(0, Math.round(base * veteranFactor(f.age)))
  return { tier, weeklyWage }
}
