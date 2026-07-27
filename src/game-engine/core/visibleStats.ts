import type {
  CareerState,
  ClubStatusId,
  DilemmasResolvedThisSeason,
  SeasonLoopPhaseId,
  VisibleCareerStats,
} from '../types/career'
import { clampResource } from './clamp'
import { DILEMMAS_PER_SEASON } from './constants'
import { positionOverall } from './positionCurves'

export function seasonPhaseFromDilemmas(
  count: DilemmasResolvedThisSeason,
): SeasonLoopPhaseId {
  if (count <= 0) return 'awaiting_dilemma_1'
  if (count === 1) return 'awaiting_dilemma_2'
  return 'ready_for_bilan'
}

/** Invariant : total = saisons_terminées × 2 + dilemmes_saison_courante */
export function checkDilemmaInvariant(state: CareerState): boolean {
  const expected =
    state.seasonsCompleted * DILEMMAS_PER_SEASON +
    state.dilemmasResolvedThisSeason
  return state.totalDilemmasResolved === expected
}

export function assertDilemmaInvariant(state: CareerState): void {
  if (!checkDilemmaInvariant(state)) {
    throw new Error(
      `Invariant dilemmes violé : total=${state.totalDilemmasResolved} ≠ ` +
        `${state.seasonsCompleted}*2 + ${state.dilemmasResolvedThisSeason}`,
    )
  }
}

export function getVisibleStats(state: CareerState): VisibleCareerStats {
  // Niveau = overall pondéré par le poste (Phase 13) — plus une moyenne plate
  // des 15 stats (qui plafonnait artificiellement vers 65).
  const niveau = Math.round(positionOverall(state.stats, state.preciseRole))
  return {
    niveau: clampResource(niveau),
    forme: clampResource(state.resources.forme),
    sante: clampResource(state.resources.sante),
    mental: clampResource(
      Math.round((state.resources.moral + state.resources.bienEtre) / 2),
    ),
    reputation: clampResource(state.resources.reputationSportive),
    confianceCoach: clampResource(state.resources.confianceEntraineur),
    discipline: clampResource(state.resources.discipline),
    argent: Math.max(0, Math.round(state.finances.cash)),
  }
}

export function deriveClubStatus(state: CareerState): ClubStatusId {
  if (state.age <= 17) return 'academy'
  const rep = state.resources.reputationSportive
  const coach = state.resources.confianceEntraineur
  if (rep >= 75 && coach >= 65) return 'key_player'
  if (rep >= 55 && coach >= 50) return 'starter'
  if (coach >= 40) return 'rotation'
  return 'bench'
}

/** Patch d’état v4 sur un objet partiel (migration / décisions journal). */
export function patchStateToV4(
  state: Record<string, unknown>,
  defaults: {
    countryId?: string
    macroPosition?: string
    preciseRole?: string
  } = {},
): Record<string, unknown> {
  const age = typeof state.age === 'number' ? state.age : 16
  const seasonIndex =
    typeof state.seasonIndex === 'number' ? state.seasonIndex : 1
  const timeline = Array.isArray(state.seasonTimeline)
    ? state.seasonTimeline
    : []
  const seasonsCompleted =
    typeof state.seasonsCompleted === 'number'
      ? state.seasonsCompleted
      : Math.max(0, timeline.length)
  const dilemmasResolvedThisSeason = ([0, 1, 2] as const).includes(
    state.dilemmasResolvedThisSeason as 0 | 1 | 2,
  )
    ? (state.dilemmasResolvedThisSeason as 0 | 1 | 2)
    : 0
  const totalDilemmasResolved =
    typeof state.totalDilemmasResolved === 'number'
      ? state.totalDilemmasResolved
      : seasonsCompleted * DILEMMAS_PER_SEASON + dilemmasResolvedThisSeason

  const preciseRole =
    (typeof state.preciseRole === 'string' && state.preciseRole) ||
    defaults.preciseRole ||
    'cm'
  const macroPosition =
    (typeof state.macroPosition === 'string' && state.macroPosition) ||
    defaults.macroPosition ||
    'midfielder'
  const countryId =
    (typeof state.countryId === 'string' && state.countryId) ||
    defaults.countryId ||
    'cote-brumeuse'

  return {
    ...state,
    countryId,
    macroPosition,
    preciseRole,
    clubStatus: state.clubStatus ?? (age <= 17 ? 'academy' : 'rotation'),
    dilemmasResolvedThisSeason,
    seasonsCompleted,
    totalDilemmasResolved,
    seasonLoopPhase:
      state.seasonLoopPhase ?? seasonPhaseFromDilemmas(dilemmasResolvedThisSeason),
    provisionalLegacyScore:
      typeof state.provisionalLegacyScore === 'number'
        ? state.provisionalLegacyScore
        : 0,
    seasonIndex,
  }
}
