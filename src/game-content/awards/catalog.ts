/**
 * Catalogue de distinctions individuelles par championnat (Phase 11).
 * Configurable : chaque championnat expose un sous-ensemble, adapté à son
 * prestige. Noms fictifs. Aucune seconde simulation de saison — le scoring
 * (moteur `core/awards.ts`) n'exploite que des stats réellement produites.
 */

import type { ChampionshipCategoryId } from '../championships'

export type AwardFamily = 'gk' | 'def' | 'mid' | 'att' | 'all'

export type AwardId =
  | 'joueur_du_mois'
  | 'jeune_joueur_du_mois'
  | 'joueur_saison'
  | 'jeune_joueur_saison'
  | 'revelation_saison'
  | 'meilleur_gardien'
  | 'meilleur_defenseur'
  | 'meilleur_milieu'
  | 'meilleur_attaquant'
  | 'meilleur_buteur'
  | 'meilleur_passeur'
  | 'joueur_regulier'
  | 'meilleur_remplacant'
  | 'equipe_type'
  | 'meilleur_joueur_promu'
  | 'meilleur_joueur_coupe'

/** Métrique dominante du score (le poste reste pris en compte). */
export type AwardMetric =
  | 'overall'
  | 'buts'
  | 'passes'
  | 'regularite'
  | 'banc'

export interface AwardEligibility {
  minMinutes?: number
  minMatches?: number
  minStarts?: number
  /** Âge maximum (jeunes / révélation). */
  maxAge?: number
  /** Ratio de titularisation maximum (récompense de remplaçant). */
  maxStartRatio?: number
  /** Nécessite un club promu (ou promotion cette saison). */
  requiresPromoted?: boolean
  /** Nécessite un parcours de coupe (demi+). */
  requiresCupRun?: boolean
}

export interface AwardDefinition {
  id: AwardId
  /** Nom générique (adapté au championnat via `awardName`). */
  baseName: string
  family: AwardFamily
  metric: AwardMetric
  /** Récompense de saison, mensuelle (agrégée) ou équipe type. */
  kind: 'saison' | 'mensuelle' | 'equipe_type'
  eligibility: AwardEligibility
  /** Poids de prestige propre à la récompense (0–1). */
  prestigeWeight: number
}

export const AWARD_DEFINITIONS: Record<AwardId, AwardDefinition> = {
  joueur_saison: {
    id: 'joueur_saison',
    baseName: "Joueur de la saison",
    family: 'all',
    metric: 'overall',
    kind: 'saison',
    eligibility: { minMinutes: 1500, minMatches: 20 },
    prestigeWeight: 1,
  },
  jeune_joueur_saison: {
    id: 'jeune_joueur_saison',
    baseName: 'Jeune joueur de la saison',
    family: 'all',
    metric: 'overall',
    kind: 'saison',
    eligibility: { minMinutes: 900, minMatches: 14, maxAge: 21 },
    prestigeWeight: 0.85,
  },
  revelation_saison: {
    id: 'revelation_saison',
    baseName: 'Révélation de la saison',
    family: 'all',
    metric: 'overall',
    kind: 'saison',
    eligibility: { minMinutes: 900, minMatches: 14, maxAge: 23 },
    prestigeWeight: 0.75,
  },
  meilleur_gardien: {
    id: 'meilleur_gardien',
    baseName: 'Meilleur gardien',
    family: 'gk',
    metric: 'overall',
    kind: 'saison',
    eligibility: { minMinutes: 1600, minMatches: 20 },
    prestigeWeight: 0.8,
  },
  meilleur_defenseur: {
    id: 'meilleur_defenseur',
    baseName: 'Meilleur défenseur',
    family: 'def',
    metric: 'overall',
    kind: 'saison',
    eligibility: { minMinutes: 1500, minMatches: 20 },
    prestigeWeight: 0.8,
  },
  meilleur_milieu: {
    id: 'meilleur_milieu',
    baseName: 'Meilleur milieu',
    family: 'mid',
    metric: 'overall',
    kind: 'saison',
    eligibility: { minMinutes: 1500, minMatches: 20 },
    prestigeWeight: 0.8,
  },
  meilleur_attaquant: {
    id: 'meilleur_attaquant',
    baseName: 'Meilleur attaquant',
    family: 'att',
    metric: 'overall',
    kind: 'saison',
    eligibility: { minMinutes: 1400, minMatches: 18 },
    prestigeWeight: 0.8,
  },
  meilleur_buteur: {
    id: 'meilleur_buteur',
    baseName: 'Meilleur buteur',
    family: 'all',
    metric: 'buts',
    kind: 'saison',
    eligibility: { minMatches: 15, minMinutes: 900 },
    prestigeWeight: 0.7,
  },
  meilleur_passeur: {
    id: 'meilleur_passeur',
    baseName: 'Meilleur passeur',
    family: 'all',
    metric: 'passes',
    kind: 'saison',
    eligibility: { minMatches: 15, minMinutes: 900 },
    prestigeWeight: 0.65,
  },
  joueur_regulier: {
    id: 'joueur_regulier',
    baseName: 'Joueur le plus régulier',
    family: 'all',
    metric: 'regularite',
    kind: 'saison',
    eligibility: { minMinutes: 2200, minStarts: 26 },
    prestigeWeight: 0.55,
  },
  meilleur_remplacant: {
    id: 'meilleur_remplacant',
    baseName: 'Meilleur remplaçant',
    family: 'all',
    metric: 'banc',
    kind: 'saison',
    eligibility: { minMinutes: 400, minMatches: 12, maxStartRatio: 0.55 },
    prestigeWeight: 0.45,
  },
  equipe_type: {
    id: 'equipe_type',
    baseName: 'Équipe type de la saison',
    family: 'all',
    metric: 'overall',
    kind: 'equipe_type',
    eligibility: { minMinutes: 1200, minMatches: 16 },
    prestigeWeight: 0.9,
  },
  meilleur_joueur_promu: {
    id: 'meilleur_joueur_promu',
    baseName: "Meilleur joueur d'un club promu",
    family: 'all',
    metric: 'overall',
    kind: 'saison',
    eligibility: { minMinutes: 1200, minMatches: 16, requiresPromoted: true },
    prestigeWeight: 0.6,
  },
  meilleur_joueur_coupe: {
    id: 'meilleur_joueur_coupe',
    baseName: 'Meilleur joueur de la coupe nationale',
    family: 'all',
    metric: 'overall',
    kind: 'saison',
    eligibility: { minMinutes: 300, requiresCupRun: true },
    prestigeWeight: 0.65,
  },
  joueur_du_mois: {
    id: 'joueur_du_mois',
    baseName: 'Joueur du mois',
    family: 'all',
    metric: 'overall',
    kind: 'mensuelle',
    eligibility: { minMinutes: 900, minMatches: 12 },
    prestigeWeight: 0.4,
  },
  jeune_joueur_du_mois: {
    id: 'jeune_joueur_du_mois',
    baseName: 'Jeune joueur du mois',
    family: 'all',
    metric: 'overall',
    kind: 'mensuelle',
    eligibility: { minMinutes: 600, minMatches: 10, maxAge: 21 },
    prestigeWeight: 0.35,
  },
}

/** Sous-ensemble de récompenses par catégorie (montée en gamme au prestige). */
export function awardsForCategory(cat: ChampionshipCategoryId): AwardId[] {
  const base: AwardId[] = [
    'joueur_saison',
    'meilleur_buteur',
    'jeune_joueur_saison',
    'equipe_type',
  ]
  const competitif: AwardId[] = [
    ...base,
    'meilleur_gardien',
    'meilleur_defenseur',
    'meilleur_milieu',
    'meilleur_attaquant',
    'meilleur_passeur',
    'joueur_regulier',
  ]
  const majeur: AwardId[] = [
    ...competitif,
    'revelation_saison',
    'meilleur_remplacant',
    'meilleur_joueur_promu',
    'meilleur_joueur_coupe',
    'joueur_du_mois',
  ]
  const elite: AwardId[] = [...majeur, 'jeune_joueur_du_mois']
  switch (cat) {
    case 'local':
    case 'developpement':
      return base
    case 'competitif':
      return competitif
    case 'majeur':
      return majeur
    case 'elite':
      return elite
  }
}

/** Noms de trophées fictifs, adaptés au championnat. */
const AWARD_STYLE: Record<AwardId, string> = {
  joueur_saison: "Trophée d'Or",
  jeune_joueur_saison: "Espoir de l'Année",
  revelation_saison: 'Révélation',
  meilleur_gardien: "Gant d'Or",
  meilleur_defenseur: "Bouclier d'Or",
  meilleur_milieu: "Métronome d'Or",
  meilleur_attaquant: "Foudre d'Or",
  meilleur_buteur: "Soulier d'Or",
  meilleur_passeur: "Passe d'Or",
  joueur_regulier: 'Prix de la Régularité',
  meilleur_remplacant: 'Sixième Homme',
  equipe_type: 'Onze Type',
  meilleur_joueur_promu: "Révélation d'un Promu",
  meilleur_joueur_coupe: 'Homme de la Coupe',
  joueur_du_mois: 'Joueur du Mois',
  jeune_joueur_du_mois: 'Jeune du Mois',
}

/** Nom affiché d'une récompense pour un championnat donné (fictif). */
export function awardName(id: AwardId, championshipName: string): string {
  return `${AWARD_STYLE[id]} – ${championshipName}`
}
