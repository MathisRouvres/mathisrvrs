/**
 * Catalogue de compétitions fictives (Phase 9). Archétypes réutilisables par la
 * simulation rapide — aucun calendrier détaillé, aucun match à gérer. Le prestige
 * réel d'une épreuve nationale dépend du championnat (voir `championships`).
 */

export type CompetitionType =
  | 'national'
  | 'division_inferieure'
  | 'coupe_nationale'
  | 'supercoupe'
  | 'coupe_ligue'
  | 'continental_principal'
  | 'continental_secondaire'
  | 'international_continental'
  | 'international_mondial'

export type CompetitionScope = 'pays' | 'zone' | 'monde'

export interface CompetitionArchetype {
  id: string
  type: CompetitionType
  name: string
  scope: CompetitionScope
  /** Rang de prestige dans la hiérarchie (1 = plus modeste, 9 = sommet mondial). */
  hierarchyRank: number
  /** Prestige de base (0–100), affiné par le championnat pour les épreuves nationales. */
  basePrestige: number
  difficulty: number
  clubCount: number
  format: string
  qualification: string
  collectiveRewards: string[]
  individualRewards: string[]
  reputationCoef: number
  economicCoef: number
  legacyCoef: number
}

export const competitionCatalog: CompetitionArchetype[] = [
  {
    id: 'comp_division_inf',
    type: 'division_inferieure',
    name: 'Division inférieure',
    scope: 'pays',
    hierarchyRank: 1,
    basePrestige: 28,
    difficulty: 38,
    clubCount: 16,
    format: 'Championnat toutes rondes (2e division)',
    qualification: 'Relégation ou départ en 2e division',
    collectiveRewards: ['Champion de division 2', 'Montée'],
    individualRewards: ['Meilleur buteur de D2'],
    reputationCoef: 0.6,
    economicCoef: 0.6,
    legacyCoef: 0.5,
  },
  {
    id: 'comp_supercoupe',
    type: 'supercoupe',
    name: 'Supercoupe',
    scope: 'pays',
    hierarchyRank: 2,
    basePrestige: 42,
    difficulty: 55,
    clubCount: 2,
    format: 'Match unique',
    qualification: 'Champion contre vainqueur de la coupe',
    collectiveRewards: ['Supercoupe'],
    individualRewards: [],
    reputationCoef: 0.5,
    economicCoef: 0.5,
    legacyCoef: 0.5,
  },
  {
    id: 'comp_coupe_ligue',
    type: 'coupe_ligue',
    name: 'Coupe de la ligue',
    scope: 'pays',
    hierarchyRank: 3,
    basePrestige: 46,
    difficulty: 52,
    clubCount: 32,
    format: 'Élimination directe (clubs professionnels)',
    qualification: 'Clubs professionnels du pays',
    collectiveRewards: ['Coupe de la ligue'],
    individualRewards: [],
    reputationCoef: 0.6,
    economicCoef: 0.6,
    legacyCoef: 0.6,
  },
  {
    id: 'comp_coupe_nationale',
    type: 'coupe_nationale',
    name: 'Coupe nationale',
    scope: 'pays',
    hierarchyRank: 4,
    basePrestige: 55,
    difficulty: 58,
    clubCount: 64,
    format: 'Élimination directe ouverte',
    qualification: 'Ouverte à tous les clubs',
    collectiveRewards: ['Coupe nationale'],
    individualRewards: ['Homme de la finale'],
    reputationCoef: 0.85,
    economicCoef: 0.75,
    legacyCoef: 0.85,
  },
  {
    id: 'comp_national',
    type: 'national',
    name: 'Championnat national',
    scope: 'pays',
    hierarchyRank: 5,
    basePrestige: 60,
    difficulty: 62,
    clubCount: 16,
    format: 'Championnat toutes rondes (1re division)',
    qualification: 'Automatique (club de 1re division)',
    collectiveRewards: ['Champion national'],
    individualRewards: ['Meilleur buteur', 'Meilleur joueur', 'Meilleur espoir'],
    reputationCoef: 1.0,
    economicCoef: 1.0,
    legacyCoef: 1.0,
  },
  {
    id: 'comp_continental_secondaire',
    type: 'continental_secondaire',
    name: 'Coupe continentale',
    scope: 'zone',
    hierarchyRank: 6,
    basePrestige: 68,
    difficulty: 70,
    clubCount: 32,
    format: 'Phase de groupes puis élimination directe',
    qualification: '4e–6e d’un championnat compétitif ou plus',
    collectiveRewards: ['Coupe continentale'],
    individualRewards: ['Révélation continentale'],
    reputationCoef: 1.2,
    economicCoef: 1.2,
    legacyCoef: 1.2,
  },
  {
    id: 'comp_continental_principal',
    type: 'continental_principal',
    name: 'Ligue continentale',
    scope: 'zone',
    hierarchyRank: 7,
    basePrestige: 82,
    difficulty: 84,
    clubCount: 32,
    format: 'Phase de groupes puis élimination directe',
    qualification: '3 premiers d’un championnat majeur ou d’élite',
    collectiveRewards: ['Ligue continentale'],
    individualRewards: ['Meilleur buteur continental', 'Joueur de la finale'],
    reputationCoef: 1.6,
    economicCoef: 1.5,
    legacyCoef: 1.8,
  },
  {
    id: 'comp_international_continental',
    type: 'international_continental',
    name: 'Championnat continental des nations',
    scope: 'zone',
    hierarchyRank: 8,
    basePrestige: 86,
    difficulty: 86,
    clubCount: 24,
    format: 'Tournoi de sélections continentales',
    qualification: 'Sélection nationale qualifiée',
    collectiveRewards: ['Championnat continental'],
    individualRewards: ['Meilleur joueur du tournoi'],
    reputationCoef: 1.8,
    economicCoef: 1.0,
    legacyCoef: 2.0,
  },
  {
    id: 'comp_international_mondial',
    type: 'international_mondial',
    name: 'Coupe du monde',
    scope: 'monde',
    hierarchyRank: 9,
    basePrestige: 95,
    difficulty: 92,
    clubCount: 32,
    format: 'Tournoi mondial de sélections',
    qualification: 'Sélection nationale qualifiée',
    collectiveRewards: ['Coupe du monde'],
    individualRewards: ['Meilleur joueur du monde', 'Meilleur buteur mondial'],
    reputationCoef: 2.2,
    economicCoef: 1.0,
    legacyCoef: 2.6,
  },
]

const byId = new Map<string, CompetitionArchetype>(
  competitionCatalog.map((c) => [c.id, c]),
)

export function getCompetitionArchetype(id: string): CompetitionArchetype | undefined {
  return byId.get(id)
}

/** Hiérarchie triée (du plus modeste au sommet). */
export function competitionHierarchy(): CompetitionArchetype[] {
  return [...competitionCatalog].sort((a, b) => a.hierarchyRank - b.hierarchyRank)
}
