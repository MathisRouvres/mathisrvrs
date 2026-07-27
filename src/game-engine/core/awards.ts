import type { CareerState } from '../types/career'
import type {
  AwardCandidate,
  AwardPositionFamily,
  AwardStatus,
  ClubSeasonResult,
  DistinctionRecord,
  SeasonMatchStats,
  TeamOfSeasonStatus,
} from '../types/season'
import type { ChampionshipDefinition } from '../../game-content/championships'
import {
  AWARD_DEFINITIONS,
  awardName,
  type AwardDefinition,
  type AwardId,
} from '../../game-content/awards/catalog'
import { createRng, type SeededRng } from '../random/createRng'
import { clamp } from './clamp'

/**
 * Distinctions individuelles par championnat (Phase 11). Résultats AUTOMATIQUES
 * après la simulation annuelle — jamais un dilemme. Aucune seconde simulation :
 * le scoring n'exploite que des stats réellement produites (`matchStats`, club).
 * Le joueur contrôlé est noté avec LA MÊME formule que les concurrents
 * synthétiques (aucun favoritisme). Déterministe via un rng dédié.
 */

// --------------------------------------------------------------------------
// Poste → famille
// --------------------------------------------------------------------------

export function familyFromRole(role: string): AwardPositionFamily {
  if (role === 'gk') return 'gk'
  if (role === 'cb' || role === 'fb') return 'def'
  if (role === 'cdm' || role === 'cm' || role === 'cam') return 'mid'
  return 'att'
}

// --------------------------------------------------------------------------
// Profil de performance comparable (joueur ou concurrent)
// --------------------------------------------------------------------------

export interface AwardPerf {
  family: AwardPositionFamily
  age: number
  matches: number
  starts: number
  minutes: number
  goals: number
  assists: number
  cleanSheets: number
  keySaves: number
  averageRating: number
  yellowCards: number
  redCards: number
  injuryDays: number
  clubGoalsAgainst: number
  clubRank: number
  leagueSize: number
  reputation: number
  /** Aptitude « grands matchs » (0–100) — facteur décisif. */
  grandsMatchs: number
}

function n01(x: number): number {
  return clamp(x, 0, 1)
}

export function regularity(p: AwardPerf): number {
  return n01(
    (p.starts / Math.max(1, p.matches)) * 0.6 +
      (p.minutes / 2800) * 0.4 -
      p.injuryDays / 400,
  )
}
function importance(p: AwardPerf): number {
  return n01(p.starts / Math.max(1, p.matches))
}
function ratingN(p: AwardPerf): number {
  return n01((p.averageRating - 6.0) / 2.2)
}
function discN(p: AwardPerf): number {
  return n01(1 - (p.yellowCards / 10 + p.redCards * 0.35))
}
function concededCtx(p: AwardPerf): number {
  return n01(1 - (p.clubGoalsAgainst - 18) / 50)
}
function csRate(p: AwardPerf): number {
  return n01(p.cleanSheets / Math.max(1, p.matches))
}

// --------------------------------------------------------------------------
// Scoring spécifique au poste (0–100) — pas de formule unique pro-attaquant
// --------------------------------------------------------------------------

function scoreGk(p: AwardPerf): number {
  return (
    100 *
    (0.24 * csRate(p) +
      0.2 * n01(p.keySaves / 40) +
      0.2 * ratingN(p) +
      0.15 * concededCtx(p) +
      0.1 * regularity(p) +
      0.11 * discN(p))
  )
}
function scoreDef(p: AwardPerf): number {
  return (
    100 *
    (0.28 * ratingN(p) +
      0.2 * concededCtx(p) +
      0.15 * csRate(p) +
      0.12 * regularity(p) +
      0.1 * discN(p) +
      0.09 * n01((p.goals * 2 + p.assists) / 12) +
      0.06 * importance(p))
  )
}
function scoreMid(p: AwardPerf): number {
  return (
    100 *
    (0.3 * ratingN(p) +
      0.24 * n01((p.assists * 1.2 + p.goals * 0.8) / 16) +
      0.16 * n01((p.goals + p.assists) / 16) +
      0.12 * regularity(p) +
      0.1 * importance(p) +
      0.08 * discN(p))
  )
}
function scoreAtt(p: AwardPerf): number {
  const efficiency = n01(p.goals / Math.max(1, p.matches) / 0.8)
  return (
    100 *
    (0.32 * n01(p.goals / 22) +
      0.16 * ratingN(p) +
      0.15 * n01(p.assists / 12) +
      0.13 * efficiency +
      0.14 * n01(p.grandsMatchs / 100) +
      0.1 * regularity(p))
  )
}

export function overallScore(p: AwardPerf): number {
  switch (p.family) {
    case 'gk':
      return scoreGk(p)
    case 'def':
      return scoreDef(p)
    case 'mid':
      return scoreMid(p)
    case 'att':
      return scoreAtt(p)
  }
}

/** Score d'un candidat pour une récompense (métrique dominante + poste). */
export function scoreForAward(def: AwardDefinition, p: AwardPerf): number {
  return scoreByMetric(def.metric, p)
}

/** Score par métrique dominante (réutilisé par les distinctions majeures). */
export function scoreByMetric(metric: AwardDefinition['metric'], p: AwardPerf): number {
  switch (metric) {
    case 'buts':
      return (
        100 *
        (0.7 * n01(p.goals / 24) +
          0.15 * ratingN(p) +
          0.1 * n01(p.goals / Math.max(1, p.matches) / 0.9) +
          0.05 * regularity(p))
      )
    case 'passes':
      return (
        100 *
        (0.68 * n01(p.assists / 14) +
          0.17 * ratingN(p) +
          0.1 * n01((p.goals + p.assists) / 18) +
          0.05 * regularity(p))
      )
    case 'regularite':
      return (
        100 *
        (0.5 * regularity(p) +
          0.2 * importance(p) +
          0.2 * ratingN(p) +
          0.1 * n01(p.minutes / 3000))
      )
    case 'banc':
      return (
        100 *
        (0.45 * n01((p.goals + p.assists) / Math.max(1, p.minutes / 90) / 0.5) +
          0.25 * ratingN(p) +
          0.2 * (1 - importance(p)) +
          0.1 * n01(p.matches / 24))
      )
    case 'overall':
    default:
      return overallScore(p)
  }
}

// --------------------------------------------------------------------------
// Éligibilité
// --------------------------------------------------------------------------

/** Une saison exceptionnelle (note très haute) n'est pas annulée par une blessure. */
function exceptionalSeason(p: AwardPerf): boolean {
  return p.averageRating >= 7.6 && p.goals + p.assists >= 12
}

export function isEligible(def: AwardDefinition, p: AwardPerf): boolean {
  const e = def.eligibility
  if (def.family !== 'all' && def.family !== p.family) return false
  if (e.maxAge !== undefined && p.age > e.maxAge) return false
  // Les contraintes promu / parcours de coupe sont contextuelles (voir l'appelant).
  if (e.minMatches !== undefined && p.matches < e.minMatches) return false
  if (e.minStarts !== undefined && p.starts < e.minStarts) return false
  if (e.maxStartRatio !== undefined && importance(p) > e.maxStartRatio) return false
  if (e.minMinutes !== undefined) {
    const relaxed = exceptionalSeason(p) ? 0.7 : 1
    if (p.minutes < e.minMinutes * relaxed) return false
  }
  return true
}

// --------------------------------------------------------------------------
// Concurrents synthétiques (déterministes, cohérents, comparables)
// --------------------------------------------------------------------------

const FIRST_NAMES = [
  'Marek', 'Diallo', 'Renzo', 'Toma', 'Kaï', 'Ilias', 'Novak', 'Enzo',
  'Samir', 'Léan', 'Bogdan', 'Yuki', 'Aleix', 'Dario', 'Nael', 'Ravi',
]
const LAST_NAMES = [
  'Vantis', 'Okonkwo', 'Brantz', 'Sereno', 'Halden', 'Mirov', 'Castel',
  'Yilmaz', 'Dross', 'Farel', 'Kovar', 'Sund', 'Aitor', 'Brenn', 'Loew',
]
const SYNTH_CLUBS = [
  'Union Verte', 'Real Costa', 'FC Boréal', 'Athletic Nord', 'Sporting Vent',
  'CD Aurora', 'Racing Sud', 'Étoile Noire', 'Olympic Rive', 'AC Ferro',
]

function rangeF(rng: SeededRng, min: number, max: number): number {
  return min + rng.randomFloat() * (max - min)
}

function synthName(rng: SeededRng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`
}

/** Génère un concurrent crédible, calibré sur le niveau du championnat. */
export function synthCompetitor(
  rng: SeededRng,
  family: AwardPositionFamily,
  level: number,
  leagueSize: number,
): { perf: AwardPerf; name: string; clubName: string } {
  const matches = rng.randomInt(22, 34)
  const startRatio = rangeF(rng, 0.62, 1)
  const starts = Math.round(matches * startRatio)
  const minutes = Math.round(matches * 90 * startRatio * rangeF(rng, 0.85, 1))
  const averageRating = clamp(
    6.3 + (level - 50) / 50 + rangeF(rng, -0.4, 1.0),
    5.6,
    8.9,
  )
  const clubRank = rng.randomInt(1, leagueSize)
  const clubGoalsAgainst = Math.round(
    20 + (clubRank / leagueSize) * 40 + rangeF(rng, -6, 6),
  )
  let goals = 0
  let assists = 0
  let cleanSheets = 0
  let keySaves = 0
  if (family === 'att') {
    goals = rng.randomInt(Math.round(6 + level / 12), Math.round(11 + level / 6))
    assists = rng.randomInt(3, 12)
  } else if (family === 'mid') {
    goals = rng.randomInt(3, 12)
    assists = rng.randomInt(4, 14)
  } else if (family === 'def') {
    goals = rng.randomInt(0, 5)
    assists = rng.randomInt(1, 6)
    cleanSheets = rng.randomInt(Math.round(matches * 0.15), Math.round(matches * 0.4))
  } else {
    cleanSheets = rng.randomInt(Math.round(matches * 0.2), Math.round(matches * 0.45))
    keySaves = rng.randomInt(30, 90)
  }
  const perf: AwardPerf = {
    family,
    age: rng.randomInt(19, 33),
    matches,
    starts,
    minutes,
    goals,
    assists,
    cleanSheets,
    keySaves,
    averageRating: Math.round(averageRating * 10) / 10,
    yellowCards: rng.randomInt(1, 8),
    redCards: rng.chance(0.1) ? 1 : 0,
    injuryDays: rng.chance(0.2) ? rng.randomInt(20, 90) : 0,
    clubGoalsAgainst,
    clubRank,
    leagueSize,
    reputation: clamp(level + rangeF(rng, -15, 20), 20, 95),
    grandsMatchs: clamp(level + rangeF(rng, -20, 25), 20, 95),
  }
  return { perf, name: synthName(rng), clubName: rng.pick(SYNTH_CLUBS) }
}

const ALL_FAMILIES: AwardPositionFamily[] = ['gk', 'def', 'mid', 'att']

// --------------------------------------------------------------------------
// Nomination / classement
// --------------------------------------------------------------------------

export function statusForRank(rank: number, poolSize: number): AwardStatus {
  if (rank === 1) return 'vainqueur'
  if (rank === 2) return 'deuxieme'
  if (rank === 3) return 'troisieme'
  // Nomination/finaliste réservées aux vrais prétendants (haut de tableau) —
  // un joueur mal classé n'est plus « nommé » (correction bilan).
  const finCut = Math.max(3, Math.round(poolSize * 0.3))
  const nomCut = Math.max(3, Math.round(poolSize * 0.45))
  if (rank <= finCut) return 'finaliste'
  if (rank <= nomCut) return 'nomme'
  return 'non_retenu'
}

interface ScoredCandidate {
  name: string
  clubName: string
  family: AwardPositionFamily
  score: number
  isPlayer: boolean
}

function podium(sorted: ScoredCandidate[]): AwardCandidate[] {
  return sorted.slice(0, 3).map((c, i) => ({
    name: c.name,
    clubName: c.clubName,
    family: c.family,
    score: Math.round(c.score),
    result: statusForRank(i + 1, sorted.length),
    isPlayer: c.isPlayer,
  }))
}

// --------------------------------------------------------------------------
// Contexte joueur
// --------------------------------------------------------------------------

export interface PlayerContext {
  promoted: boolean
  cupReached: boolean // demi+ en coupe
}

export function buildPlayerPerf(
  state: CareerState,
  matchStats: SeasonMatchStats,
  club: ClubSeasonResult,
  ageDuringSeason: number,
): AwardPerf {
  return {
    family: familyFromRole(state.preciseRole),
    age: ageDuringSeason,
    matches: matchStats.matches,
    starts: matchStats.starts,
    minutes: matchStats.minutes,
    goals: matchStats.goals,
    assists: matchStats.assists,
    cleanSheets: matchStats.cleanSheets,
    keySaves: matchStats.keySaves ?? 0,
    averageRating: matchStats.averageRating,
    yellowCards: matchStats.yellowCards,
    redCards: matchStats.redCards,
    injuryDays: matchStats.injuryDays,
    clubGoalsAgainst: club.goalsAgainst ?? 30,
    clubRank: club.leagueRank,
    leagueSize: club.leagueSize,
    reputation: state.resources.reputationSportive,
    grandsMatchs: state.hiddenTraits.grandsMatchs,
  }
}

// --------------------------------------------------------------------------
// Équipe type de la saison
// --------------------------------------------------------------------------

const TEAM_SLOTS: Record<AwardPositionFamily, number> = { gk: 1, def: 4, mid: 3, att: 3 }

function computeTeamOfSeason(
  rng: SeededRng,
  playerPerf: AwardPerf,
  playerScore: number,
  level: number,
): { status: TeamOfSeasonStatus; best: number } {
  let beaten = 0
  let globalBest = playerScore
  for (const fam of ALL_FAMILIES) {
    const pool = fam === playerPerf.family ? 8 : 5
    for (let i = 0; i < pool; i += 1) {
      const c = synthCompetitor(rng, fam, level, playerPerf.leagueSize)
      const def = AWARD_DEFINITIONS.equipe_type
      const s = scoreForAward(def, c.perf)
      if (s > globalBest) globalBest = s
      if (fam === playerPerf.family && s > playerScore) beaten += 1
    }
  }
  const slot = TEAM_SLOTS[playerPerf.family]
  let status: TeamOfSeasonStatus = 'absent'
  if (beaten < slot) status = 'titulaire'
  else if (beaten < slot + 3) status = 'elargi'
  if (status === 'titulaire' && playerScore >= globalBest) status = 'meilleur'
  return { status, best: globalBest }
}

// --------------------------------------------------------------------------
// Récompenses mensuelles (agrégées — aucune stat de match fabriquée)
// --------------------------------------------------------------------------

/** Nombre de récompenses mensuelles, proxy agrégé de la régularité au sommet. */
function monthlyCount(rng: SeededRng, playerScore: number, level: number): number {
  const edge = clamp((playerScore - (55 + (level - 50) / 3)) / 22, 0, 1)
  let count = 0
  for (let m = 0; m < 4; m += 1) {
    if (rng.chance(edge * 0.6)) count += 1
  }
  return count
}

// --------------------------------------------------------------------------
// Impact carrière (modéré — jamais de gros bonus de niveau)
// --------------------------------------------------------------------------

export interface AwardsImpact {
  reputation: number
  popularite: number
  /** Multiplicateur additif de valeur estimée (ex. 0.04 = +4 %). */
  valuePct: number
  flags: string[]
}

const STATUS_FACTOR: Record<AwardStatus, number> = {
  vainqueur: 1,
  deuxieme: 0.5,
  troisieme: 0.35,
  finaliste: 0.22,
  nomme: 0.12,
  non_retenu: 0,
}

// --------------------------------------------------------------------------
// Point d'entrée : distinctions de la saison
// --------------------------------------------------------------------------

export interface SeasonDistinctions {
  records: DistinctionRecord[]
  /** Noms de récompenses gagnées (rang 1) — surfacées dans les distinctions. */
  winners: string[]
  impact: AwardsImpact
}

export function computeSeasonDistinctions(
  state: CareerState,
  input: {
    matchStats: SeasonMatchStats
    club: ClubSeasonResult
    ageDuringSeason: number
    championship: ChampionshipDefinition
  },
): SeasonDistinctions {
  const { championship } = input
  const rng = createRng(`${state.seed}:awards:${state.seasonIndex}`)
  const perf = buildPlayerPerf(state, input.matchStats, input.club, input.ageDuringSeason)
  const ctx: PlayerContext = {
    promoted: input.club.promoted || state.flags.was_promoted === true,
    cupReached: ['demi', 'finale', 'vainqueur'].includes(input.club.cupRun),
  }
  const level = championship.avgSportLevel
  const records: DistinctionRecord[] = []
  const winners: string[] = []
  let repPts = 0
  let popuPts = 0
  let valuePct = 0
  const flags = new Set<string>()

  for (const id of championship.awards) {
    const def = AWARD_DEFINITIONS[id]

    // Équipe type : traitement dédié (formation).
    if (def.kind === 'equipe_type') {
      if (!isEligible(def, perf)) continue
      const playerScore = scoreForAward(def, perf)
      const { status } = computeTeamOfSeason(rng, perf, playerScore, level)
      if (status === 'absent') continue
      const rank = status === 'meilleur' ? 1 : status === 'titulaire' ? 1 : 6
      const result: AwardStatus = status === 'elargi' ? 'nomme' : 'vainqueur'
      records.push({
        awardId: id,
        awardName: awardName(id, championship.name),
        championshipId: championship.id,
        competition: championship.name,
        seasonIndex: state.seasonIndex,
        age: input.ageDuringSeason,
        clubId: state.clubId ?? null,
        positionFamily: perf.family,
        result,
        rank,
        score: Math.round(playerScore),
        prestige: championship.prestige,
        justification: teamJustification(status, perf),
        competitors: [],
        teamStatus: status,
      })
      if (result === 'vainqueur') {
        winners.push(awardName(id, championship.name))
        flags.add('team_of_season')
      }
      const f = def.prestigeWeight * (championship.prestige / 100) *
        (status === 'meilleur' ? 1.2 : status === 'titulaire' ? 1 : 0.3)
      repPts += f * 10
      popuPts += f * 8
      valuePct += f * 0.03
      continue
    }

    // Éligibilité (avec règles contextuelles promu / coupe).
    if (!isEligible(def, perf)) continue
    if (def.eligibility.requiresPromoted && !ctx.promoted) continue
    if (def.eligibility.requiresCupRun && !ctx.cupReached) continue

    const playerScore = scoreForAward(def, perf)

    // Récompenses mensuelles : agrégat (statut = nombre de mois gagnés).
    if (def.kind === 'mensuelle') {
      const count = monthlyCount(rng, playerScore, level)
      if (count <= 0) continue
      records.push({
        awardId: id,
        awardName: awardName(id, championship.name),
        championshipId: championship.id,
        competition: championship.name,
        seasonIndex: state.seasonIndex,
        age: input.ageDuringSeason,
        clubId: state.clubId ?? null,
        positionFamily: perf.family,
        result: 'vainqueur',
        rank: 1,
        score: Math.round(playerScore),
        prestige: championship.prestige,
        justification: `${count} distinction${count > 1 ? 's' : ''} mensuelle${count > 1 ? 's' : ''} sur la saison.`,
        competitors: [],
        monthlyCount: count,
      })
      const f = def.prestigeWeight * (championship.prestige / 100) * (0.2 + count * 0.12)
      repPts += f * 10
      popuPts += f * 8
      valuePct += f * 0.03
      continue
    }

    // Récompense de saison : opposition à des concurrents synthétiques.
    const pool: ScoredCandidate[] = [
      {
        name: 'Toi',
        clubName: 'Ton club',
        family: perf.family,
        score: playerScore,
        isPlayer: true,
      },
    ]
    for (let i = 0; i < 7; i += 1) {
      const fam = def.family === 'all' ? rng.pick(ALL_FAMILIES) : def.family
      const c = synthCompetitor(rng, fam, level, perf.leagueSize)
      pool.push({
        name: c.name,
        clubName: c.clubName,
        family: fam,
        score: scoreForAward(def, c.perf),
        isPlayer: false,
      })
    }
    pool.sort((a, b) => b.score - a.score)
    const rank = pool.findIndex((c) => c.isPlayer) + 1
    const result = statusForRank(rank, pool.length)
    if (result === 'non_retenu') continue

    records.push({
      awardId: id,
      awardName: awardName(id, championship.name),
      championshipId: championship.id,
      competition: championship.name,
      seasonIndex: state.seasonIndex,
      age: input.ageDuringSeason,
      clubId: state.clubId ?? null,
      positionFamily: perf.family,
      result,
      rank,
      score: Math.round(playerScore),
      prestige: championship.prestige,
      justification: awardJustification(def, perf, result),
      competitors: podium(pool),
    })
    if (result === 'vainqueur') winners.push(awardName(id, championship.name))

    const f = def.prestigeWeight * (championship.prestige / 100) * STATUS_FACTOR[result]
    repPts += f * 10
    popuPts += f * 8
    valuePct += f * 0.03
    if (result === 'vainqueur') {
      flags.add('individual_award')
      if (id === 'joueur_saison') flags.add('star_individual')
      if (championship.category === 'elite' || championship.category === 'majeur') {
        flags.add('national_interest')
      }
    }
  }

  return {
    records,
    winners,
    impact: {
      reputation: Math.min(12, Math.round(repPts)),
      popularite: Math.min(10, Math.round(popuPts)),
      valuePct: Math.min(0.09, +valuePct.toFixed(3)),
      flags: [...flags],
    },
  }
}

// --------------------------------------------------------------------------
// Justifications qualitatives (sans révéler la formule exacte)
// --------------------------------------------------------------------------

function awardJustification(
  def: AwardDefinition,
  p: AwardPerf,
  result: AwardStatus,
): string {
  const bits: string[] = []
  if (def.metric === 'buts') bits.push(`${p.goals} buts`)
  else if (def.metric === 'passes') bits.push(`${p.assists} passes décisives`)
  else if (def.metric === 'regularite') bits.push(`${p.starts} titularisations`)
  else if (def.metric === 'banc') bits.push(`${p.goals + p.assists} apports en sortie de banc`)
  else if (p.family === 'gk') bits.push(`${p.cleanSheets} clean sheets, ${p.keySaves} arrêts décisifs`)
  else if (p.family === 'def') bits.push(`solidité défensive, ${p.cleanSheets} clean sheets`)
  else if (p.family === 'mid') bits.push(`${p.goals} buts, ${p.assists} passes`)
  else bits.push(`${p.goals} buts, ${p.assists} passes`)
  bits.push(`note ${p.averageRating.toFixed(1)} sur ${p.matches} matchs`)
  const verdict =
    result === 'vainqueur'
      ? 'Récompense remportée.'
      : result === 'deuxieme' || result === 'troisieme'
        ? 'Sur le podium final.'
        : 'Nomination méritée.'
  return `${bits.join(', ')}. ${verdict}`
}

function teamJustification(status: TeamOfSeasonStatus, p: AwardPerf): string {
  const perf = `Note ${p.averageRating.toFixed(1)}, ${p.minutes} minutes.`
  switch (status) {
    case 'meilleur':
      return `Meilleur joueur de l'équipe type. ${perf}`
    case 'titulaire':
      return `Titulaire de l'équipe type. ${perf}`
    case 'elargi':
      return `Retenu dans l'équipe type élargie. ${perf}`
    case 'absent':
      return perf
  }
}
