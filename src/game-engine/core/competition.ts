import type {
  ClubSeasonResult,
  ClubStandingId,
  ObjectiveResultId,
  SeasonObjectiveId,
} from '../types/season'

export type { ClubStandingId, ObjectiveResultId, SeasonObjectiveId }

/**
 * Championnats, statuts de club et objectifs de saison (Phase 9).
 * Fonctions pures et déterministes (aucun RNG) — dérivées des données déjà
 * présentes (force du club, niveau du championnat, résultat de saison).
 */

// --------------------------------------------------------------------------
// Statut du club avant la saison
// --------------------------------------------------------------------------

export const CLUB_STANDING_LABELS: Record<ClubStandingId, string> = {
  grand_favori: 'Grand favori',
  pretendant: 'Prétendant au titre',
  candidat_continental: 'Candidat aux places continentales',
  milieu: 'Milieu de tableau',
  candidat_maintien: 'Candidat au maintien',
  promu: 'Promu',
  outsider: 'Outsider',
}

/** Force effective de la division (la 2e division est plus faible). */
function effectiveLeague(leagueLevel: number, division: 1 | 2): number {
  return division === 2 ? leagueLevel - 14 : leagueLevel
}

/** Situation du club avant la saison, selon sa force réelle et son championnat. */
export function deriveClubStanding(
  clubStrength: number,
  leagueLevel: number,
  division: 1 | 2,
  justPromoted = false,
): ClubStandingId {
  if (division === 2) {
    const gap = clubStrength - effectiveLeague(leagueLevel, 2)
    return gap >= 6 ? 'promu' : 'outsider'
  }
  if (justPromoted) return 'promu'
  const gap = clubStrength - leagueLevel
  if (gap >= 14) return 'grand_favori'
  if (gap >= 8) return 'pretendant'
  if (gap >= 2) return 'candidat_continental'
  if (gap >= -6) return 'milieu'
  if (gap >= -12) return 'candidat_maintien'
  return 'outsider'
}

// --------------------------------------------------------------------------
// Objectif de saison (généré automatiquement)
// --------------------------------------------------------------------------

export const SEASON_OBJECTIVE_LABELS: Record<SeasonObjectiveId, string> = {
  maintien: 'Maintien',
  milieu_tableau: 'Milieu de tableau',
  premiere_moitie: 'Première moitié de tableau',
  qualification_continentale: 'Qualification continentale',
  titre: 'Titre de champion',
  promotion: 'Promotion',
  parcours_coupe: 'Beau parcours en coupe',
  defense_titre: 'Défense du titre',
}

/** Objectif collectif imposé (le joueur ne le choisit pas). */
export function deriveSeasonObjective(
  standing: ClubStandingId,
  division: 1 | 2,
  defendingChampion: boolean,
  leagueLevel: number,
): SeasonObjectiveId {
  if (division === 2) return 'promotion'
  if (defendingChampion) return 'defense_titre'
  const continentalAvailable = leagueLevel >= 55
  switch (standing) {
    case 'grand_favori':
      return 'titre'
    case 'pretendant':
      return continentalAvailable ? 'qualification_continentale' : 'premiere_moitie'
    case 'candidat_continental':
      return continentalAvailable ? 'qualification_continentale' : 'premiere_moitie'
    case 'milieu':
      return leagueLevel >= 70 ? 'parcours_coupe' : 'milieu_tableau'
    case 'candidat_maintien':
      return 'maintien'
    case 'promu':
      return 'maintien'
    case 'outsider':
      return 'maintien'
  }
}

// --------------------------------------------------------------------------
// Évaluation de fin de saison
// --------------------------------------------------------------------------

export const OBJECTIVE_RESULT_LABELS: Record<ObjectiveResultId, string> = {
  echec_important: 'Échec important',
  objectif_manque: 'Objectif manqué',
  objectif_atteint: 'Objectif atteint',
  objectif_depasse: 'Objectif dépassé',
  saison_historique: 'Saison historique',
}

function champion(r: ClubSeasonResult): boolean {
  return r.trophies.some((t) => t.startsWith('Champion national'))
}
function cupWin(r: ClubSeasonResult): boolean {
  return r.cupRun === 'vainqueur' || r.trophies.includes('Coupe nationale')
}

/** Compare le résultat sportif à l'objectif imposé. */
export function evaluateSeasonObjective(
  objective: SeasonObjectiveId,
  r: ClubSeasonResult,
  standing: ClubStandingId,
): ObjectiveResultId {
  const size = r.leagueSize
  const rank = r.leagueRank
  const topHalf = rank <= size / 2
  const continental = r.continentalQualified

  switch (objective) {
    case 'titre':
    case 'defense_titre':
      if (champion(r)) return cupWin(r) ? 'saison_historique' : 'objectif_atteint'
      if (rank <= 3) return 'objectif_manque'
      if (r.relegated) return 'echec_important'
      return 'objectif_manque'

    case 'qualification_continentale':
      if (champion(r)) return 'saison_historique'
      if (continental) return cupWin(r) ? 'objectif_depasse' : 'objectif_atteint'
      if (rank <= 5) return 'objectif_manque'
      if (r.relegated) return 'echec_important'
      return 'objectif_manque'

    case 'premiere_moitie':
      if (champion(r) || continental) return champion(r) ? 'saison_historique' : 'objectif_depasse'
      if (topHalf) return 'objectif_atteint'
      if (r.relegated) return 'echec_important'
      return 'objectif_manque'

    case 'milieu_tableau':
      if (champion(r) || continental) return 'saison_historique'
      if (rank <= Math.ceil(size * 0.35)) return 'objectif_depasse'
      if (rank <= Math.ceil(size * 0.7)) return 'objectif_atteint'
      if (r.relegated) return 'echec_important'
      return 'objectif_manque'

    case 'maintien':
      if (champion(r) || continental) return 'saison_historique'
      if (standing === 'outsider' && rank <= 4) return 'saison_historique'
      if (rank <= Math.ceil(size * 0.4)) return 'objectif_depasse'
      if (r.relegated) return 'echec_important'
      return 'objectif_atteint'

    case 'promotion':
      if (r.promoted) return cupWin(r) || rank === 1 ? 'objectif_depasse' : 'objectif_atteint'
      if (rank <= 5) return 'objectif_manque'
      return 'echec_important'

    case 'parcours_coupe':
      if (cupWin(r)) return 'saison_historique'
      if (r.cupRun === 'finale') return 'objectif_depasse'
      if (r.cupRun === 'demi' || r.cupRun === 'quarts') return 'objectif_atteint'
      if (champion(r) || continental) return 'objectif_depasse'
      if (r.relegated) return 'echec_important'
      return 'objectif_manque'
  }
}

// --------------------------------------------------------------------------
// Effets de l'évaluation
// --------------------------------------------------------------------------

export interface ObjectiveEffects {
  coach: number
  reputation: number
  /** Importance historique du résultat (1–5). */
  historicImportance: number
  /** Flag posé (héritage / narration), ou null. */
  flag: string | null
}

const BASE_EFFECTS: Record<ObjectiveResultId, ObjectiveEffects> = {
  saison_historique: { coach: 10, reputation: 8, historicImportance: 5, flag: 'season_historic' },
  objectif_depasse: { coach: 6, reputation: 5, historicImportance: 4, flag: 'objective_exceeded' },
  objectif_atteint: { coach: 3, reputation: 2, historicImportance: 3, flag: null },
  objectif_manque: { coach: -4, reputation: -2, historicImportance: 2, flag: 'objective_missed' },
  echec_important: { coach: -8, reputation: -5, historicImportance: 1, flag: 'objective_failed' },
}

/**
 * Effets de l'évaluation, pondérés par le prestige du championnat (un exploit
 * dans un championnat prestigieux rapporte plus de réputation).
 */
export function objectiveOutcomeEffects(
  result: ObjectiveResultId,
  reputationCoef = 1,
): ObjectiveEffects {
  const base = BASE_EFFECTS[result]
  return {
    ...base,
    reputation: Math.round(base.reputation * reputationCoef),
  }
}
