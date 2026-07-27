/**
 * Distinctions majeures (Phase 12) : nationales, continentales, internationales
 * et mondiales. Réutilise les récompenses de championnat (Phase 11) et les
 * compétitions/prestiges déjà en place. Noms 100 % fictifs et originaux —
 * aucune marque réelle de trophée individuel.
 */

import type { AwardFamily, AwardMetric } from './catalog'

export type MajorTier = 'national' | 'continental' | 'international' | 'mondial'

export interface MajorAwardAccess {
  maxAge?: number
  /** Joueur évoluant à l'étranger (pays courant ≠ pays d'origine). */
  requiresAbroad?: boolean
  /** Parcours de coupe nationale (demi+). */
  requiresCupRun?: boolean
  /** Participation continentale (qualifié / engagé). */
  requiresContinental?: boolean
  /** Sélection nationale + tournoi continental cette saison. */
  requiresTournament?: boolean
  /** Sélection nationale + tournoi mondial cette saison. */
  requiresWorldTournament?: boolean
  /** Seuil d'accès mondial composite (0–1) — très sélectif. */
  minWorldAccess?: number
  /** Performance de saison minimale (score 0–100). */
  minSeasonScore?: number
}

export interface MajorAwardDefinition {
  id: string
  tier: MajorTier
  /** Nom fictif (les distinctions nationales y ajoutent le pays). */
  baseName: string
  family: AwardFamily | 'poste'
  metric: AwardMetric
  kind: 'saison' | 'equipe' | 'competition'
  access: MajorAwardAccess
  /** Prestige de la distinction (0–100). */
  prestige: number
  /** Niveau moyen du vivier de concurrents (plus haut = plus dur). */
  poolStrength: number
  poolSize: number
}

// --------------------------------------------------------------------------
// Distinctions nationales (fédération du pays)
// --------------------------------------------------------------------------

const NATIONAL: MajorAwardDefinition[] = [
  { id: 'nat_joueur', tier: 'national', baseName: 'Ballon National', family: 'all', metric: 'overall', kind: 'saison', access: { minSeasonScore: 60 }, prestige: 66, poolStrength: 66, poolSize: 9 },
  { id: 'nat_jeune', tier: 'national', baseName: 'Espoir National', family: 'all', metric: 'overall', kind: 'saison', access: { maxAge: 21, minSeasonScore: 55 }, prestige: 58, poolStrength: 60, poolSize: 8 },
  { id: 'nat_revelation', tier: 'national', baseName: 'Révélation Nationale', family: 'all', metric: 'overall', kind: 'saison', access: { maxAge: 23, minSeasonScore: 55 }, prestige: 54, poolStrength: 58, poolSize: 8 },
  { id: 'nat_etranger', tier: 'national', baseName: 'Ambassadeur', family: 'all', metric: 'overall', kind: 'saison', access: { requiresAbroad: true, minSeasonScore: 58 }, prestige: 62, poolStrength: 64, poolSize: 7 },
  { id: 'nat_equipe', tier: 'national', baseName: 'Onze National', family: 'all', metric: 'overall', kind: 'equipe', access: { minSeasonScore: 58 }, prestige: 60, poolStrength: 64, poolSize: 9 },
  { id: 'nat_coupe', tier: 'national', baseName: 'Héros de la Coupe', family: 'all', metric: 'overall', kind: 'competition', access: { requiresCupRun: true, minSeasonScore: 55 }, prestige: 58, poolStrength: 62, poolSize: 7 },
]

// --------------------------------------------------------------------------
// Distinctions continentales (épreuves de club de zone)
// --------------------------------------------------------------------------

const CONTINENTAL: MajorAwardDefinition[] = [
  { id: 'cont_joueur', tier: 'continental', baseName: 'Couronne Continentale', family: 'all', metric: 'overall', kind: 'saison', access: { requiresContinental: true, minSeasonScore: 68 }, prestige: 80, poolStrength: 76, poolSize: 10 },
  { id: 'cont_jeune', tier: 'continental', baseName: 'Espoir Continental', family: 'all', metric: 'overall', kind: 'saison', access: { requiresContinental: true, maxAge: 21, minSeasonScore: 64 }, prestige: 72, poolStrength: 72, poolSize: 9 },
  { id: 'cont_competition', tier: 'continental', baseName: 'Étoile de la Ligue Continentale', family: 'all', metric: 'overall', kind: 'competition', access: { requiresContinental: true, minSeasonScore: 70 }, prestige: 82, poolStrength: 78, poolSize: 10 },
  { id: 'cont_gardien', tier: 'continental', baseName: 'Muraille Continentale', family: 'gk', metric: 'overall', kind: 'saison', access: { requiresContinental: true, minSeasonScore: 66 }, prestige: 74, poolStrength: 74, poolSize: 8 },
  { id: 'cont_poste', tier: 'continental', baseName: 'Meilleur à son poste continental', family: 'poste', metric: 'overall', kind: 'saison', access: { requiresContinental: true, minSeasonScore: 66 }, prestige: 72, poolStrength: 74, poolSize: 8 },
  { id: 'cont_equipe', tier: 'continental', baseName: 'Onze Continental', family: 'all', metric: 'overall', kind: 'equipe', access: { requiresContinental: true, minSeasonScore: 66 }, prestige: 76, poolStrength: 76, poolSize: 11 },
  { id: 'cont_buteur', tier: 'continental', baseName: 'Canon Continental', family: 'all', metric: 'buts', kind: 'saison', access: { requiresContinental: true, minSeasonScore: 60 }, prestige: 72, poolStrength: 74, poolSize: 9 },
  { id: 'cont_passeur', tier: 'continental', baseName: 'Sceptre Continental', family: 'all', metric: 'passes', kind: 'saison', access: { requiresContinental: true, minSeasonScore: 60 }, prestige: 70, poolStrength: 74, poolSize: 9 },
]

// --------------------------------------------------------------------------
// Distinctions internationales (tournoi de sélections)
// --------------------------------------------------------------------------

const INTERNATIONAL: MajorAwardDefinition[] = [
  { id: 'int_joueur', tier: 'international', baseName: 'Astre du Tournoi', family: 'all', metric: 'overall', kind: 'competition', access: { requiresTournament: true, minSeasonScore: 66 }, prestige: 84, poolStrength: 80, poolSize: 10 },
  { id: 'int_jeune', tier: 'international', baseName: 'Étoile Montante du Tournoi', family: 'all', metric: 'overall', kind: 'competition', access: { requiresTournament: true, maxAge: 21, minSeasonScore: 62 }, prestige: 74, poolStrength: 76, poolSize: 9 },
  { id: 'int_gardien', tier: 'international', baseName: 'Rempart du Tournoi', family: 'gk', metric: 'overall', kind: 'competition', access: { requiresTournament: true, minSeasonScore: 64 }, prestige: 76, poolStrength: 78, poolSize: 8 },
  { id: 'int_poste', tier: 'international', baseName: 'Meilleur à son poste du tournoi', family: 'poste', metric: 'overall', kind: 'competition', access: { requiresTournament: true, minSeasonScore: 64 }, prestige: 74, poolStrength: 78, poolSize: 8 },
  { id: 'int_equipe', tier: 'international', baseName: 'Onze du Tournoi', family: 'all', metric: 'overall', kind: 'equipe', access: { requiresTournament: true, minSeasonScore: 64 }, prestige: 78, poolStrength: 80, poolSize: 11 },
  { id: 'int_buteur', tier: 'international', baseName: 'Foudre du Tournoi', family: 'all', metric: 'buts', kind: 'competition', access: { requiresTournament: true, minSeasonScore: 60 }, prestige: 74, poolStrength: 78, poolSize: 9 },
  { id: 'int_passeur', tier: 'international', baseName: 'Maestro du Tournoi', family: 'all', metric: 'passes', kind: 'competition', access: { requiresTournament: true, minSeasonScore: 60 }, prestige: 72, poolStrength: 78, poolSize: 9 },
]

// --------------------------------------------------------------------------
// Distinctions mondiales (carrières les plus prestigieuses)
// --------------------------------------------------------------------------

const WORLD: MajorAwardDefinition[] = [
  { id: 'monde_joueur', tier: 'mondial', baseName: "Sphère d'Or", family: 'all', metric: 'overall', kind: 'saison', access: { minWorldAccess: 0.62, minSeasonScore: 74 }, prestige: 98, poolStrength: 90, poolSize: 12 },
  { id: 'monde_jeune', tier: 'mondial', baseName: 'Astre Montant Mondial', family: 'all', metric: 'overall', kind: 'saison', access: { maxAge: 21, minWorldAccess: 0.55, minSeasonScore: 70 }, prestige: 88, poolStrength: 86, poolSize: 10 },
  { id: 'monde_gardien', tier: 'mondial', baseName: "Muraille d'Or Mondiale", family: 'gk', metric: 'overall', kind: 'saison', access: { minWorldAccess: 0.58, minSeasonScore: 72 }, prestige: 90, poolStrength: 88, poolSize: 9 },
  { id: 'monde_equipe', tier: 'mondial', baseName: 'Onze Mondial', family: 'all', metric: 'overall', kind: 'equipe', access: { minWorldAccess: 0.6, minSeasonScore: 72 }, prestige: 92, poolStrength: 90, poolSize: 13 },
  { id: 'monde_competition', tier: 'mondial', baseName: 'Étoile du Mondial', family: 'all', metric: 'overall', kind: 'competition', access: { requiresWorldTournament: true, minSeasonScore: 70 }, prestige: 96, poolStrength: 90, poolSize: 12 },
]

export const majorAwardCatalog: MajorAwardDefinition[] = [
  ...NATIONAL,
  ...CONTINENTAL,
  ...INTERNATIONAL,
  ...WORLD,
]

export function majorAwardsByTier(tier: MajorTier): MajorAwardDefinition[] {
  return majorAwardCatalog.filter((a) => a.tier === tier)
}

/** Distinction honorifique de carrière (fictif) — attribuée en fin de carrière. */
export const CAREER_HONOR_NAME = 'Ordre du Ballon Éternel'

/** Nom affiché d'une distinction majeure (le national ajoute le pays). */
export function majorAwardName(
  def: MajorAwardDefinition,
  countryLabel?: string,
): string {
  if (def.tier === 'national' && countryLabel) {
    return `${def.baseName} – ${countryLabel}`
  }
  return def.baseName
}
