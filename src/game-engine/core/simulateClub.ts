import type { SeededRng } from '../random/createRng'
import type { ClubSeasonResult, CupRunStage } from '../types/season'
import { clamp } from './clamp'

export interface ClubSeasonInput {
  clubId: string | null
  /** Force du club (competitionLevel courant de l’état). */
  clubStrength: number
  /** Niveau de la division 1 du pays. */
  leagueLevel: number
  division: 1 | 2
  /** Contribution du joueur à la saison du club, 0–1. */
  playerImpact: number
  /** Scénarios de test. */
  forceRank?: number
}

const LEAGUE_SIZE = 16

const CUP_STAGES: CupRunStage[] = [
  'aucune',
  'huitiemes',
  'quarts',
  'demi',
  'finale',
  'vainqueur',
]

/**
 * Saison du club — classement, coupe, trophées, promotion/relégation,
 * changement d’entraîneur. Déterministe via le rng fourni.
 */
export function simulateClubSeason(
  rng: SeededRng,
  input: ClubSeasonInput,
): ClubSeasonResult {
  const effectiveLeague =
    input.division === 2 ? input.leagueLevel - 14 : input.leagueLevel

  // Écart de force → position attendue, bruitée, bonus si le joueur brille.
  const strengthGap = input.clubStrength - effectiveLeague
  const expected =
    LEAGUE_SIZE / 2 +
    0.5 -
    strengthGap / 3.5 -
    input.playerImpact * 2.5 +
    (rng.randomFloat() - 0.5) * 6

  const leagueRank =
    input.forceRank ?? clamp(Math.round(expected), 1, LEAGUE_SIZE)

  // Parcours de coupe : chaque tour se gagne selon la force relative.
  let cupIndex = 0
  const winStepChance = clamp(0.42 + strengthGap / 60 + input.playerImpact * 0.1, 0.15, 0.8)
  for (let stage = 1; stage < CUP_STAGES.length; stage += 1) {
    if (!rng.chance(winStepChance)) break
    cupIndex = stage
  }
  const cupRun = CUP_STAGES[cupIndex] ?? 'aucune'

  const relegated = input.forceRank === undefined
    ? leagueRank >= LEAGUE_SIZE - 1
    : leagueRank >= LEAGUE_SIZE - 1
  const promoted = input.division === 2 && leagueRank <= 2
  const champion = leagueRank === 1
  const continentalQualified =
    input.division === 1 && leagueRank <= 3 && input.leagueLevel >= 55

  const trophies: string[] = []
  if (champion) {
    trophies.push(
      input.division === 1 ? 'Champion national' : 'Champion de division 2',
    )
  }
  if (cupRun === 'vainqueur') trophies.push('Coupe nationale')

  const coachChanged = rng.chance(
    0.08 + (leagueRank >= 12 ? 0.3 : 0) + (relegated ? 0.25 : 0),
  )

  // Bilan chiffré déterministe (Phase 10) : dérivé du seul classement (aucun
  // tirage — le flux rng reste inchangé). Permet les accomplissements
  // (meilleure attaque/défense, invincibilité) sans simuler les matchs.
  const played = (LEAGUE_SIZE - 1) * 2
  const rankFactor = (LEAGUE_SIZE - leagueRank) / (LEAGUE_SIZE - 1) // 1 = premier
  const wins = clamp(Math.round(rankFactor * played * 0.6), 0, played)
  const losses = clamp(Math.round((1 - rankFactor) * played * 0.45), 0, played - wins)
  const draws = played - wins - losses
  const goalsFor = Math.round(24 + rankFactor * 46)
  const goalsAgainst = Math.round(20 + (1 - rankFactor) * 42)
  const unbeaten = losses === 0

  return {
    clubId: input.clubId,
    leagueRank,
    leagueSize: LEAGUE_SIZE,
    leagueLevel: input.leagueLevel,
    division: input.division,
    cupRun,
    continentalQualified,
    trophies,
    promoted,
    relegated: input.division === 2 ? false : relegated,
    coachChanged,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    unbeaten,
  }
}
