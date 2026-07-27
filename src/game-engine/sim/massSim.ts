import {
  buildFinalReport,
  completeSeason,
  createCareer,
  deriveCareerTier,
  familyFromRole,
  getNextDilemma,
  getVisibleStats,
  isCareerFinished,
  resolveDilemmaChoice,
  type CareerTierId,
} from '../index'
import { createRng } from '../random/createRng'
import { countries } from '../../game-content/countries'
import { MACRO_POSITIONS } from '../../game-content/macroPositions'
import {
  deriveChampionshipCategory,
  getChampionshipByCountry,
  type ChampionshipCategoryId,
} from '../../game-content/championships'
import type { CareerSavePackage } from '../types'
import type { MacroPositionId } from '../../game-content/macroPositions'

/**
 * Harnais de simulation de masse (Phase 8). Réutilise le moteur réel
 * (createCareer → getNextDilemma → resolveDilemmaChoice → completeSeason).
 * Aucune modification du moteur : la distribution émerge du jeu.
 */

export type StrategyId =
  | 'prudent'
  | 'ambitieux'
  | 'collectif'
  | 'individualiste'
  | 'fidele'
  | 'opportuniste'
  | 'professionnel'
  | 'mediatique'
  | 'financier'
  | 'aleatoire'

export const STRATEGIES: StrategyId[] = [
  'prudent',
  'ambitieux',
  'collectif',
  'individualiste',
  'fidele',
  'opportuniste',
  'professionnel',
  'mediatique',
  'financier',
  'aleatoire',
]

/** Ordre de préférence des postures par stratégie. */
const STRATEGY_STANCES: Record<StrategyId, string[]> = {
  prudent: ['prudent', 'professional', 'loyal', 'ethical'],
  ambitieux: ['ambitious', 'high_risk', 'individualist'],
  collectif: ['collective', 'loyal', 'ethical'],
  individualiste: ['individualist', 'ambitious', 'financial'],
  fidele: ['loyal', 'collective', 'ethical'],
  opportuniste: ['high_risk', 'ambitious', 'financial', 'media_savvy'],
  professionnel: ['professional', 'prudent', 'resilient'],
  mediatique: ['media_savvy', 'ambitious'],
  financier: ['financial', 'prudent'],
  aleatoire: [],
}

interface Rng {
  randomInt(min: number, max: number): number
}

function pickChoice(
  choices: Array<{ id: string; stance: string }>,
  strategy: StrategyId,
  rng: Rng,
): string {
  if (strategy === 'aleatoire') {
    return choices[rng.randomInt(0, choices.length - 1)]!.id
  }
  const pri = STRATEGY_STANCES[strategy]
  let best = choices[0]!
  let bestRank = Number.POSITIVE_INFINITY
  for (const c of choices) {
    const r = pri.indexOf(c.stance)
    if (r !== -1 && r < bestRank) {
      bestRank = r
      best = c
    }
  }
  return best.id
}

export interface CareerOutcome {
  tier: CareerTierId
  retirementAge: number
  seasons: number
  dilemmas: number
  initialLevel: number
  peakLevel: number
  peakAge: number
  retirementLevel: number
  maxStatusRank: number
  clubs: number
  transfers: number
  injuries: number
  trophies: number
  finals: number
  promotions: number
  qualifications: number
  achievements: number
  nominations: number
  awardsWon: number
  records: number
  caps: number
  maxWeeklyWage: number
  cumulativeIncome: number
  netWorth: number
  sponsors: number
  investments: number
  legacyScore: number
  blocked: boolean
  /** Catégorie du championnat de départ (effet boule de neige §5). */
  startCategory: ChampionshipCategoryId
}

export interface InvariantCounters {
  thirdDilemma: number
  seasonUnderTwo: number
  negativeSalary: number
  multipleContracts: number
  invalidWealth: number
  incompatibleSponsor: number
  postRetirementDilemma: number
  blockedCareer: number
  engineThrow: number
  // Phase 15 — invariants récompenses/trophées/records.
  duplicateSeasonIndex: number
  duplicateTrophySeason: number
  duplicateAwardSeason: number
  duplicateRecordSeason: number
  awardWithoutCompetition: number
  awardWrongPosition: number
  trophyWrongRank: number
}

/** Tallies globaux (récompenses, records, boule de neige). */
export interface MassTally {
  awardsByType: Record<string, number>
  awardsByTier: Record<string, number>
  winsByPosition: Record<string, number>
  nomsByPosition: Record<string, number>
  recordsByRarity: Record<string, number>
  /** Boule de neige : issues par catégorie de championnat de départ. */
  byStartCategory: Record<string, { count: number; peak: number; trophies: number; awards: number; topTier: number }>
}

export function emptyTally(): MassTally {
  return {
    awardsByType: {},
    awardsByTier: {},
    winsByPosition: { gk: 0, def: 0, mid: 0, att: 0 },
    nomsByPosition: { gk: 0, def: 0, mid: 0, att: 0 },
    recordsByRarity: {},
    byStartCategory: {},
  }
}

function inc(rec: Record<string, number>, key: string, by = 1): void {
  rec[key] = (rec[key] ?? 0) + by
}

export function emptyInvariants(): InvariantCounters {
  return {
    thirdDilemma: 0, seasonUnderTwo: 0, negativeSalary: 0, multipleContracts: 0,
    invalidWealth: 0, incompatibleSponsor: 0, postRetirementDilemma: 0,
    blockedCareer: 0, engineThrow: 0, duplicateSeasonIndex: 0,
    duplicateTrophySeason: 0, duplicateAwardSeason: 0, duplicateRecordSeason: 0,
    awardWithoutCompetition: 0, awardWrongPosition: 0, trophyWrongRank: 0,
  }
}

const STATUS_RANK: Record<string, number> = {
  academy: 0,
  bench: 1,
  rotation: 2,
  starter: 3,
  key_player: 4,
}

const MAX_SEASONS_GUARD = 45

/** Simule une carrière complète selon une stratégie. */
export function simulateCareer(
  input: { countryId: string; macroPosition: MacroPositionId; seed: string },
  strategy: StrategyId,
  inv: InvariantCounters,
  freq?: Map<string, number>,
  tally?: MassTally,
): CareerOutcome {
  const rng = createRng(`${input.seed}:strategy`)
  let pkg: CareerSavePackage = createCareer(input)
  const initialLevel = getVisibleStats(pkg.snapshot.state).niveau
  const startCategory = deriveChampionshipCategory(
    getChampionshipByCountry(input.countryId)?.prestige ?? 40,
  )

  let dilemmas = 0
  let seasons = 0
  let transfers = 0
  let injuries = 0
  let maxStatusRank = 0
  const clubSet = new Set<string>()
  let blocked = false

  try {
    let guard = 0
    while (!isCareerFinished(pkg) && guard < MAX_SEASONS_GUARD) {
      guard += 1
      // Exactement deux dilemmes par saison.
      for (let k = 0; k < 2; k += 1) {
        const d = getNextDilemma(pkg)
        if (!d) {
          inv.seasonUnderTwo += 1
          break
        }
        if (freq) freq.set(d.id, (freq.get(d.id) ?? 0) + 1)
        const choiceId = pickChoice(d.choices, strategy, rng)
        pkg = resolveDilemmaChoice(pkg, d, choiceId).package
        dilemmas += 1
      }
      // Aucun troisième dilemme.
      if (getNextDilemma(pkg) !== null) inv.thirdDilemma += 1

      const { package: after, result } = completeSeason(pkg)
      pkg = after
      seasons += 1
      if (result.autoTransfer) transfers += 1
      if (result.matchStats.injuryDays > 15) injuries += 1

      const st = pkg.snapshot.state
      if (st.clubId) clubSet.add(st.clubId)
      maxStatusRank = Math.max(maxStatusRank, STATUS_RANK[st.clubStatus] ?? 0)

      // Invariants économiques.
      if (st.contract && st.contract.weeklyWage < 0) inv.negativeSalary += 1
      if (st.finances.cash < 0 || st.wealth.current < 0) inv.invalidWealth += 1
      const exclusiveSectors = st.sponsorships.filter((s) => s.exclusive).map((s) => s.sector)
      if (new Set(exclusiveSectors).size !== exclusiveSectors.length) inv.incompatibleSponsor += 1
    }
    if (!isCareerFinished(pkg)) {
      blocked = true
      inv.blockedCareer += 1
    }
    // Aucune conséquence interactive après la retraite.
    if (getNextDilemma(pkg) !== null) inv.postRetirementDilemma += 1
  } catch {
    inv.engineThrow += 1
    blocked = true
  }

  const st = pkg.snapshot.state
  const report = buildFinalReport(pkg)
  const peakLevelFlag =
    typeof st.flags.peakLevel === 'number' ? st.flags.peakLevel : 0
  const family = familyFromRole(st.preciseRole)

  // --- Scan de timeline : progression, récompenses, records, invariants (§2–§7) ---
  let peakLevel = peakLevelFlag
  let peakAge = st.age
  let retirementLevel = initialLevel
  let finals = 0
  let promotions = 0
  let qualifications = 0
  let achievements = 0
  let nominations = 0
  let awardsWon = 0
  let records = 0
  const seenSeasons = new Set<number>()

  for (const e of st.seasonTimeline) {
    if (seenSeasons.has(e.seasonIndex)) inv.duplicateSeasonIndex += 1
    seenSeasons.add(e.seasonIndex)

    if (typeof e.level === 'number') {
      if (e.level > peakLevel) {
        peakLevel = e.level
        peakAge = e.age
      }
      retirementLevel = e.level
    }

    // Collectif (§3).
    if (e.cupRun === 'finale') finals += 1
    if (e.promoted) promotions += 1
    if (e.continentalQualified) qualifications += 1
    achievements += (e.achievements ?? []).length

    // Trophées : unicité + cohérence de rang (§7).
    const tro = e.matchStats.trophies
    if (new Set(tro).size !== tro.length) inv.duplicateTrophySeason += 1
    if (tro.includes('Champion national') && e.clubRank !== undefined && e.clubRank !== 1) {
      inv.trophyWrongRank += 1
    }

    // Distinctions individuelles (§4) : unicité, compétition, cohérence poste.
    const dis = e.distinctions ?? []
    const key = new Set<string>()
    for (const d of dis) {
      const k = `${d.awardId}:${d.tier ?? 'championnat'}`
      if (key.has(k)) inv.duplicateAwardSeason += 1
      key.add(k)
      if (!d.championshipId) inv.awardWithoutCompetition += 1
      if (d.awardId.includes('gardien') && d.positionFamily !== 'gk') {
        inv.awardWrongPosition += 1
      }
      nominations += 1
      inc(tally?.nomsByPosition ?? {}, d.positionFamily)
      if (d.result === 'vainqueur') {
        awardsWon += 1
        if (tally) {
          inc(tally.awardsByType, d.awardId)
          inc(tally.awardsByTier, d.tier ?? 'championnat')
          inc(tally.winsByPosition, d.positionFamily)
        }
      }
    }

    // Records (§7) : unicité + tally rareté.
    const rec = e.records ?? []
    if (new Set(rec.map((x) => x.id)).size !== rec.length) inv.duplicateRecordSeason += 1
    records += rec.length
    if (tally) for (const x of rec) inc(tally.recordsByRarity, x.rarity)
  }

  const tier = deriveCareerTier(report.legacyScore, peakLevel)

  if (tally) {
    const cat = tally.byStartCategory[startCategory] ?? {
      count: 0, peak: 0, trophies: 0, awards: 0, topTier: 0,
    }
    cat.count += 1
    cat.peak += peakLevel
    cat.trophies += report.totals.trophies
    cat.awards += awardsWon
    if (tier.id === 'grande' || tier.id === 'exceptionnelle' || tier.id === 'legendaire') {
      cat.topTier += 1
    }
    tally.byStartCategory[startCategory] = cat
  }

  return {
    tier: tier.id,
    retirementAge: st.age,
    seasons: st.seasonsCompleted,
    dilemmas,
    initialLevel,
    peakLevel,
    peakAge,
    retirementLevel,
    maxStatusRank,
    clubs: clubSet.size || (st.clubId ? 1 : 0),
    transfers,
    injuries,
    trophies: report.totals.trophies,
    finals,
    promotions,
    qualifications,
    achievements,
    nominations,
    awardsWon,
    records,
    caps: report.totals.nationalCaps,
    maxWeeklyWage: st.wealth.bestWeeklyWage,
    cumulativeIncome: st.wealth.cumulativeIncome,
    netWorth: st.wealth.current,
    sponsors: st.sponsorships.length,
    investments: st.finances.investments.length,
    legacyScore: report.legacyScore,
    blocked,
    startCategory,
  }
}

// --------------------------------------------------------------------------
// Agrégation
// --------------------------------------------------------------------------

export interface MetricAgg {
  n: number
  sum: number
  min: number
  max: number
}

function emptyMetric(): MetricAgg {
  return { n: 0, sum: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
}

function push(m: MetricAgg, v: number): void {
  m.n += 1
  m.sum += v
  if (v < m.min) m.min = v
  if (v > m.max) m.max = v
}

export function avg(m: MetricAgg): number {
  return m.n ? m.sum / m.n : 0
}

const TIER_IDS: CareerTierId[] = [
  'compliquee',
  'correcte',
  'belle',
  'grande',
  'exceptionnelle',
  'legendaire',
]

/** Seuils de dépassement de niveau (§2). */
export const LEVEL_THRESHOLDS = [65, 70, 75, 80, 85, 90, 93]

export interface Bucket {
  count: number
  tiers: Record<CareerTierId, number>
  metrics: Record<string, MetricAgg>
  /** Nombre de carrières dont le pic dépasse chaque seuil. */
  thresholds: Record<number, number>
}

const METRIC_KEYS = [
  'retirementAge', 'seasons', 'dilemmas', 'initialLevel', 'peakLevel', 'peakAge',
  'retirementLevel', 'maxStatusRank', 'clubs', 'transfers', 'injuries', 'trophies',
  'finals', 'promotions', 'qualifications', 'achievements', 'nominations',
  'awardsWon', 'records', 'caps', 'maxWeeklyWage', 'cumulativeIncome', 'netWorth',
  'sponsors', 'investments', 'legacyScore',
] as const

function emptyBucket(): Bucket {
  const tiers = {} as Record<CareerTierId, number>
  for (const t of TIER_IDS) tiers[t] = 0
  const metrics: Record<string, MetricAgg> = {}
  for (const k of METRIC_KEYS) metrics[k] = emptyMetric()
  const thresholds: Record<number, number> = {}
  for (const t of LEVEL_THRESHOLDS) thresholds[t] = 0
  return { count: 0, tiers, metrics, thresholds }
}

function record(b: Bucket, o: CareerOutcome): void {
  b.count += 1
  b.tiers[o.tier] += 1
  for (const k of METRIC_KEYS) push(b.metrics[k]!, o[k as keyof CareerOutcome] as number)
  for (const t of LEVEL_THRESHOLDS) if (o.peakLevel > t) b.thresholds[t]! += 1
}

export interface MassSimResult {
  count: number
  durationMs: number
  overall: Bucket
  byStrategy: Record<string, Bucket>
  byCountry: Record<string, Bucket>
  byPosition: Record<string, Bucket>
  byChampionship: Record<string, Bucket>
  invariants: InvariantCounters
  tally: MassTally
  eventFrequency: Array<{ id: string; count: number }>
  totalEventDraws: number
}

export const TIER_ORDER = TIER_IDS

/** Pourcentage de carrières dépassant chaque seuil de niveau. */
export function thresholdPercents(b: Bucket): Record<number, number> {
  const out: Record<number, number> = {}
  for (const t of LEVEL_THRESHOLDS) out[t] = b.count ? (b.thresholds[t]! / b.count) * 100 : 0
  return out
}

/** Exécute `count` carrières réparties sur stratégies × pays × postes. */
export function runMassSim(count: number, now = 0): MassSimResult {
  const start = now
  const overall = emptyBucket()
  const byStrategy: Record<string, Bucket> = {}
  const byCountry: Record<string, Bucket> = {}
  const byPosition: Record<string, Bucket> = {}
  const byChampionship: Record<string, Bucket> = {}
  const invariants = emptyInvariants()
  const tally = emptyTally()
  const freq = new Map<string, number>()

  const posIds = MACRO_POSITIONS.map((p) => p.id as MacroPositionId)
  const countryIds = countries.map((c) => c.id)
  const catByCountry = new Map<string, ChampionshipCategoryId>(
    countryIds.map((c) => [
      c,
      deriveChampionshipCategory(getChampionshipByCountry(c)?.prestige ?? 40),
    ]),
  )

  for (const s of STRATEGIES) byStrategy[s] = emptyBucket()
  for (const c of countryIds) byCountry[c] = emptyBucket()
  for (const p of posIds) byPosition[p] = emptyBucket()

  for (let i = 0; i < count; i += 1) {
    const strategy = STRATEGIES[i % STRATEGIES.length]!
    const countryId = countryIds[i % countryIds.length]!
    const macroPosition = posIds[Math.floor(i / countryIds.length) % posIds.length]!
    const seed = `sim-${i}`
    const o = simulateCareer({ countryId, macroPosition, seed }, strategy, invariants, freq, tally)
    record(overall, o)
    record(byStrategy[strategy]!, o)
    record(byCountry[countryId]!, o)
    record(byPosition[macroPosition]!, o)
    const cat = catByCountry.get(countryId)!
    ;(byChampionship[cat] ??= emptyBucket())
    record(byChampionship[cat]!, o)
  }

  let totalEventDraws = 0
  for (const v of freq.values()) totalEventDraws += v
  const eventFrequency = [...freq.entries()]
    .map(([id, c]) => ({ id, count: c }))
    .sort((a, b) => b.count - a.count)

  return {
    count,
    durationMs: 0 - start,
    overall,
    byStrategy,
    byCountry,
    byPosition,
    byChampionship,
    invariants,
    tally,
    eventFrequency,
    totalEventDraws,
  }
}

/** Distribution des tiers en pourcentages. */
export function tierPercents(b: Bucket): Record<CareerTierId, number> {
  const out = {} as Record<CareerTierId, number>
  for (const t of TIER_IDS) out[t] = b.count ? (b.tiers[t] / b.count) * 100 : 0
  return out
}
