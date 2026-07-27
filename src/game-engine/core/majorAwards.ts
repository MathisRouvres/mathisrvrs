import type { CareerState } from '../types/career'
import type {
  AwardCandidate,
  AwardPositionFamily,
  AwardStatus,
  ClubSeasonResult,
  DistinctionRecord,
  DistinctionTier,
  SeasonMatchStats,
} from '../types/season'
import type { ChampionshipDefinition } from '../../game-content/championships'
import {
  majorAwardCatalog,
  majorAwardName,
  type MajorAwardDefinition,
} from '../../game-content/awards/majorCatalog'
import { createRng } from '../random/createRng'
import { clamp } from './clamp'
import {
  buildPlayerPerf,
  overallScore,
  regularity,
  scoreByMetric,
  statusForRank,
  synthCompetitor,
  type AwardPerf,
} from './awards'

/**
 * Distinctions majeures (Phase 12) — nationales, continentales, internationales,
 * mondiales. Automatiques après la simulation annuelle (jamais de dilemme).
 * Réutilise le scoring poste de la Phase 11 ; le joueur affronte des viviers de
 * concurrents de plus en plus forts (mondial = le plus dur). rng dédié
 * `seed:major:season` → flux de saison inchangé.
 */

const ALL_FAMILIES: AwardPositionFamily[] = ['gk', 'def', 'mid', 'att']
const TEAM_SLOTS: Record<AwardPositionFamily, number> = { gk: 1, def: 4, mid: 3, att: 3 }

const STATUS_FACTOR: Record<AwardStatus, number> = {
  vainqueur: 1,
  deuxieme: 0.5,
  troisieme: 0.35,
  finaliste: 0.22,
  nomme: 0.12,
  non_retenu: 0,
}

const TIER_MULT: Record<DistinctionTier, number> = {
  championnat: 0.6,
  national: 0.8,
  continental: 1,
  international: 1.1,
  mondial: 1.3,
}

export interface MajorAwardsInput {
  matchStats: SeasonMatchStats
  club: ClubSeasonResult
  ageDuringSeason: number
  championship: ChampionshipDefinition
  /** Trophées collectifs de la saison (contexte d'accès mondial). */
  seasonTrophies: string[]
  /** Libellé du pays (distinctions nationales). */
  countryLabel: string
  /** Le joueur évolue à l'étranger (pays courant ≠ origine). */
  isAbroad: boolean
}

export interface MajorAwardsResult {
  records: DistinctionRecord[]
  winners: string[]
  impact: { reputation: number; popularite: number; valuePct: number; flags: string[] }
  /** Accès mondial calculé (0–1) — exposé pour les tests / le bilan. */
  worldAccess: number
}

/** Score composite d'accès mondial (très sélectif). */
export function worldAccessScore(
  state: CareerState,
  perf: AwardPerf,
  championship: ChampionshipDefinition,
  seasonTrophies: string[],
): number {
  const flags = state.flags
  const national = flags.national_regular === true || flags.national_capped === true
  const continental =
    flags.continental_entrant === true || flags.won_continental === true
  const continentalFactor = flags.won_continental === true ? 1 : continental ? 0.5 : 0
  const internationalFactor =
    flags.won_international === true ? 1 : national ? 0.5 : 0
  const trophyFactor = clamp(seasonTrophies.length / 2, 0, 1)
  return clamp(
    0.26 * (overallScore(perf) / 100) +
      0.14 * (championship.prestige / 100) +
      0.12 * continentalFactor +
      0.12 * internationalFactor +
      0.1 * trophyFactor +
      0.08 * (perf.reputation / 100) +
      0.08 * (perf.grandsMatchs / 100) +
      0.1 * regularity(perf),
    0,
    1,
  )
}

function podium(
  sorted: Array<{ name: string; clubName: string; family: AwardPositionFamily; score: number; isPlayer: boolean }>,
): AwardCandidate[] {
  return sorted.slice(0, 3).map((c, i) => ({
    name: c.name,
    clubName: c.clubName,
    family: c.family,
    score: Math.round(c.score),
    result: statusForRank(i + 1, sorted.length),
    isPlayer: c.isPlayer,
  }))
}

function accessible(
  def: MajorAwardDefinition,
  perf: AwardPerf,
  playerScore: number,
  gates: {
    isAbroad: boolean
    cupReached: boolean
    continental: boolean
    tournament: boolean
    worldTournament: boolean
    worldAccess: number
  },
): boolean {
  const a = def.access
  if (def.family === 'gk' && perf.family !== 'gk') return false
  if (a.maxAge !== undefined && perf.age > a.maxAge) return false
  if (a.requiresAbroad && !gates.isAbroad) return false
  if (a.requiresCupRun && !gates.cupReached) return false
  if (a.requiresContinental && !gates.continental) return false
  if (a.requiresTournament && !gates.tournament) return false
  if (a.requiresWorldTournament && !gates.worldTournament) return false
  if (a.minWorldAccess !== undefined && gates.worldAccess < a.minWorldAccess) return false
  if (a.minSeasonScore !== undefined && playerScore < a.minSeasonScore) return false
  return true
}

export function computeMajorDistinctions(
  state: CareerState,
  input: MajorAwardsInput,
): MajorAwardsResult {
  const { championship } = input
  const rng = createRng(`${state.seed}:major:${state.seasonIndex}`)
  const perf = buildPlayerPerf(state, input.matchStats, input.club, input.ageDuringSeason)
  const flags = state.flags
  const national = flags.national_regular === true || flags.national_capped === true
  const worldAccess = worldAccessScore(state, perf, championship, input.seasonTrophies)
  const gates = {
    isAbroad: input.isAbroad,
    cupReached: ['demi', 'finale', 'vainqueur'].includes(input.club.cupRun),
    continental:
      flags.continental_entrant === true || input.club.continentalQualified === true,
    tournament: national && state.seasonIndex % 2 === 0,
    worldTournament: national && state.seasonIndex % 4 === 0,
    worldAccess,
  }

  const records: DistinctionRecord[] = []
  const winners: string[] = []
  let repPts = 0
  let popuPts = 0
  let valuePct = 0
  const flagSet = new Set<string>()

  for (const def of majorAwardCatalog) {
    const playerScore = scoreByMetric(def.metric, perf)
    if (!accessible(def, perf, playerScore, gates)) continue

    const label = majorAwardName(def, input.countryLabel)
    const base = {
      awardId: def.id,
      awardName: label,
      championshipId: championship.id,
      competition: label,
      seasonIndex: state.seasonIndex,
      age: input.ageDuringSeason,
      clubId: state.clubId ?? null,
      positionFamily: perf.family,
      prestige: def.prestige,
      tier: def.tier,
    }

    // Équipe type de tier : formation (titulaire / élargi / absent).
    if (def.kind === 'equipe') {
      const slot = TEAM_SLOTS[perf.family]
      let beaten = 0
      for (let i = 0; i < def.poolSize; i += 1) {
        const c = synthCompetitor(rng, perf.family, def.poolStrength, perf.leagueSize)
        if (scoreByMetric(def.metric, c.perf) > playerScore) beaten += 1
      }
      let result: AwardStatus
      let teamStatus: 'absent' | 'elargi' | 'titulaire' | 'meilleur'
      if (beaten < slot) {
        result = 'vainqueur'
        teamStatus = beaten === 0 ? 'meilleur' : 'titulaire'
      } else if (beaten < slot + 3) {
        result = 'nomme'
        teamStatus = 'elargi'
      } else {
        continue
      }
      records.push({
        ...base,
        result,
        rank: beaten + 1,
        score: Math.round(playerScore),
        justification: `${teamStatus === 'meilleur' ? "Meilleur de l'équipe type" : teamStatus === 'titulaire' ? "Titulaire de l'équipe type" : "Équipe type élargie"}. Note ${perf.averageRating.toFixed(1)}.`,
        competitors: [],
        teamStatus,
      })
      if (result === 'vainqueur') {
        winners.push(label)
        flagSet.add(`${def.tier}_award`)
      }
      const f = (def.prestige / 100) * TIER_MULT[def.tier] * STATUS_FACTOR[result]
      repPts += f * 10
      popuPts += f * 8
      valuePct += f * 0.03
      continue
    }

    // Ranking : joueur vs vivier de concurrents (poste respecté).
    const pool = [
      { name: 'Toi', clubName: 'Ton club', family: perf.family, score: playerScore, isPlayer: true },
    ]
    for (let i = 0; i < def.poolSize - 1; i += 1) {
      const fam =
        def.family === 'gk' || def.family === 'poste'
          ? perf.family
          : rng.pick(ALL_FAMILIES)
      const c = synthCompetitor(rng, fam, def.poolStrength, perf.leagueSize)
      pool.push({
        name: c.name,
        clubName: c.clubName,
        family: fam,
        score: scoreByMetric(def.metric, c.perf),
        isPlayer: false,
      })
    }
    pool.sort((a, b) => b.score - a.score)
    const rank = pool.findIndex((c) => c.isPlayer) + 1
    const result = statusForRank(rank, pool.length)
    if (result === 'non_retenu') continue

    records.push({
      ...base,
      result,
      rank,
      score: Math.round(playerScore),
      justification: majorJustification(def, perf, result),
      competitors: podium(pool),
    })
    if (result === 'vainqueur') {
      winners.push(label)
      flagSet.add(`${def.tier}_award`)
      if (def.id === 'monde_joueur') flagSet.add('world_player_year')
      if (def.tier === 'mondial') flagSet.add('world_class')
    }

    const f = (def.prestige / 100) * TIER_MULT[def.tier] * STATUS_FACTOR[result]
    repPts += f * 10
    popuPts += f * 8
    valuePct += f * 0.03
  }

  return {
    records,
    winners,
    impact: {
      reputation: Math.min(16, Math.round(repPts)),
      popularite: Math.min(14, Math.round(popuPts)),
      valuePct: Math.min(0.12, +valuePct.toFixed(3)),
      flags: [...flagSet],
    },
    worldAccess,
  }
}

function majorJustification(
  def: MajorAwardDefinition,
  p: AwardPerf,
  result: AwardStatus,
): string {
  const verdict =
    result === 'vainqueur'
      ? 'Distinction remportée.'
      : result === 'deuxieme' || result === 'troisieme'
        ? 'Sur le podium.'
        : 'Nomination.'
  const stat =
    def.metric === 'buts'
      ? `${p.goals} buts`
      : def.metric === 'passes'
        ? `${p.assists} passes décisives`
        : p.family === 'gk'
          ? `${p.cleanSheets} clean sheets, ${p.keySaves} arrêts décisifs`
          : `${p.goals} buts, ${p.assists} passes`
  return `${stat}, note ${p.averageRating.toFixed(1)}. ${verdict}`
}

export { CAREER_HONOR_NAME } from '../../game-content/awards/majorCatalog'
