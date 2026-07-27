import { countries } from '../countries'
import { clubs } from '../clubs'
import { awardsForCategory, type AwardId } from '../awards/catalog'

/**
 * Identité sportive des championnats (Phase 9). Réutilise `country.leagueLevel`
 * (backbone numérique déjà exploité par le moteur : salaires, qualification
 * continentale) — aucun système parallèle. Les noms sont fictifs (contrainte).
 */

export type ChampionshipCategoryId =
  | 'local'
  | 'developpement'
  | 'competitif'
  | 'majeur'
  | 'elite'

export const CHAMPIONSHIP_CATEGORY_LABELS: Record<ChampionshipCategoryId, string> = {
  local: 'Championnat local',
  developpement: 'Championnat en développement',
  competitif: 'Championnat compétitif',
  majeur: 'Championnat majeur',
  elite: "Championnat d'élite",
}

/** Classification qualitative depuis le prestige (niveau de championnat 1–99). */
export function deriveChampionshipCategory(prestige: number): ChampionshipCategoryId {
  if (prestige >= 70) return 'elite'
  if (prestige >= 62) return 'majeur'
  if (prestige >= 52) return 'competitif'
  if (prestige >= 45) return 'developpement'
  return 'local'
}

export interface ChampionshipDefinition {
  id: string
  countryId: string
  /** Nom fictif du championnat. */
  name: string
  /** Nombre de divisions modélisées. */
  divisions: number
  /** Prestige = niveau du championnat (1–99). */
  prestige: number
  /** Difficulté sportive moyenne (dérivée du prestige). */
  difficulty: number
  /** Visibilité médiatique (0–100). */
  mediaVisibility: number
  /** Niveau salarial moyen (0–100). */
  avgSalaryLevel: number
  /** Niveau sportif moyen des clubs (0–100). */
  avgSportLevel: number
  /** Attractivité internationale (0–100). */
  internationalAttractiveness: number
  category: ChampionshipCategoryId
  /** Récompenses disponibles (ids de compétitions/récompenses). */
  rewards: string[]
  /** Distinctions individuelles configurées (Phase 11). */
  awards: AwardId[]
  /** Coefficient de réputation gagnée (multiplicateur). */
  reputationCoef: number
  /** Coefficient d'héritage (multiplicateur du score final). */
  legacyCoef: number
  /** Coefficient économique (salaires/sponsors). */
  economicCoef: number
}

/** Noms fictifs par pays (aucune ligue réelle). */
const FICTIONAL_NAMES: Record<string, string> = {
  'cote-brumeuse': 'Ligue des Lys',
  'baie-lumen': 'Liga del Sol',
  'hauts-plateaux': 'Ligue des Aigles',
  'archipel-sel': 'Liga Atlântica',
  'capitale-miroir': 'Ligue de la Couronne',
  'vallee-cendre': 'Ligue de la Botte',
}

/** Récompenses par catégorie (montée en gamme avec le prestige). */
function rewardsFor(cat: ChampionshipCategoryId): string[] {
  const base = ['comp_national', 'comp_division_inf', 'comp_coupe_nationale', 'comp_supercoupe']
  const mid = [...base, 'comp_coupe_ligue']
  const high = [...mid, 'comp_continental_secondaire']
  const elite = [...high, 'comp_continental_principal']
  switch (cat) {
    case 'local':
    case 'developpement':
      return base
    case 'competitif':
      return mid
    case 'majeur':
      return high
    case 'elite':
      return elite
  }
}

function buildChampionship(countryId: string, leagueLevel: number): ChampionshipDefinition {
  const nationalClubs = clubs.filter((c) => c.countryId === countryId)
  const avgSportLevel = nationalClubs.length
    ? Math.round(
        nationalClubs.reduce((a, c) => a + c.competitionLevel, 0) / nationalClubs.length,
      )
    : leagueLevel
  const prestige = leagueLevel
  const category = deriveChampionshipCategory(prestige)
  return {
    id: `champ-${countryId}`,
    countryId,
    name: FICTIONAL_NAMES[countryId] ?? 'Championnat National',
    divisions: 2,
    prestige,
    difficulty: Math.round(40 + prestige * 0.5),
    mediaVisibility: Math.round(30 + prestige * 0.7),
    avgSalaryLevel: Math.round(35 + prestige * 0.6),
    avgSportLevel,
    internationalAttractiveness: Math.round(25 + prestige * 0.75),
    category,
    rewards: rewardsFor(category),
    awards: awardsForCategory(category),
    reputationCoef: +(0.8 + prestige / 130).toFixed(2),
    legacyCoef: +(0.85 + prestige / 160).toFixed(2),
    economicCoef: +(0.8 + prestige / 120).toFixed(2),
  }
}

export const championships: ChampionshipDefinition[] = countries.map((c) =>
  buildChampionship(c.id, c.leagueLevel),
)

const byCountry = new Map<string, ChampionshipDefinition>(
  championships.map((c) => [c.countryId, c]),
)
const byId = new Map<string, ChampionshipDefinition>(
  championships.map((c) => [c.id, c]),
)

export function getChampionshipByCountry(
  countryId: string,
): ChampionshipDefinition | undefined {
  return byCountry.get(countryId)
}

export function getChampionshipById(id: string): ChampionshipDefinition | undefined {
  return byId.get(id)
}
