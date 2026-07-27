import type { CareerSavePackage } from '../types'
import type { CareerState } from '../types/career'
import type {
  DistinctionRecord,
  RecordEntry,
  SeasonMatchStats,
} from '../types/season'
import { buildCareerRecords, type CareerRecords } from './records'
import { CAREER_HONOR_NAME } from './majorAwards'
import { clamp } from './clamp'
import {
  ACHIEVEMENT_LABELS,
  buildPalmares,
  trophyMeta,
  type PalmaresEntry,
} from './trophy'
import { getVisibleStats } from './visibleStats'
import { getClubById } from '../../game-content/clubs'
import { getCountryById } from '../../game-content/countries'
import { getPositionById } from '../../game-content/positions'

export type LegacyDimensionId =
  | 'reussiteSportive'
  | 'longevite'
  | 'fidelite'
  | 'popularite'
  | 'richesse'
  | 'resilience'
  | 'influenceVestiaire'
  | 'carriereInternationale'

export interface LegacyBreakdown {
  reussiteSportive: number
  longevite: number
  fidelite: number
  popularite: number
  richesse: number
  resilience: number
  influenceVestiaire: number
  carriereInternationale: number
}

export interface CareerArchetype {
  id: string
  title: string
  tagline: string
}

export interface FinalReport {
  displayName: string
  countryLabel: string
  positionLabel: string
  retirementAge: number
  seasons: number
  clubs: Array<{ id: string; name: string }>
  bestClubName: string
  totals: {
    matches: number
    goals: number
    assists: number
    cleanSheets: number
    keySaves: number
    nationalCaps: number
    trophies: number
    distinctions: number
    majorInjuries: number
  }
  trophyList: string[]
  distinctionList: string[]
  /** Palmarès structuré (Phase 10) — exploitable fiche/retraite/partage. */
  palmares: PalmaresEntry[]
  /** Faits marquants collectifs (non-trophées), dédupliqués. */
  faitsMarquants: string[]
  /** Distinctions individuelles remportées (Phase 11). */
  individualAwards: DistinctionRecord[]
  /** Nombre total de nominations individuelles (victoires incluses). */
  individualNominations: number
  /** Bilan distinctions majeures & records (Phase 12). */
  retirement: RetirementHighlights
  bestLevel: number
  fortune: number
  rival: {
    displayName: string
    level: number
    trophies: number
    clubName: string
    relation: number
    verdict: string
  }
  keyRelationships: Array<{ role: string; name: string; note: string }>
  keyDecisions: string[]
  legacy: LegacyBreakdown
  legacyScore: number
  archetype: CareerArchetype
  narrative: string
}

/** Points forts de fin de carrière (Phase 12). */
export interface RetirementHighlights {
  /** Distinction la plus prestigieuse remportée. */
  mostPrestigiousAward: string | null
  /** Meilleur classement mondial atteint (1 = vainqueur ; null si jamais). */
  bestWorldRanking: number | null
  /** Nombre de distinctions remportées. */
  distinctionsWon: number
  /** Nombre de records établis (registre détenu). */
  recordsCount: number
  /** Records encore détenus. */
  recordsStillHeld: RecordEntry[]
  /** Trophées majeurs (continental / international / mondial). */
  majorTrophies: string[]
  /** Saison de référence (la meilleure). */
  referenceSeason: number | null
  /** Distinction honorifique de carrière (fictive), si méritée. */
  careerHonor: string | null
  /** Records de carrière agrégés. */
  careerRecords: CareerRecords
}

/** Libellés lisibles des dimensions d’héritage. */
export const LEGACY_DIMENSION_LABELS: Record<LegacyDimensionId, string> = {
  reussiteSportive: 'Réussite sportive',
  longevite: 'Longévité',
  fidelite: 'Fidélité',
  popularite: 'Popularité',
  richesse: 'Richesse',
  resilience: 'Résilience',
  influenceVestiaire: 'Influence vestiaire',
  carriereInternationale: 'Carrière internationale',
}

function isGkRole(role: string): boolean {
  return role === 'gk'
}

function aggregateTotals(state: CareerState): {
  totals: FinalReport['totals']
  trophyList: string[]
  distinctionList: string[]
  clubs: FinalReport['clubs']
  bestClubName: string
} {
  const empty: SeasonMatchStats = {
    matches: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    keySaves: 0,
    averageRating: 0,
    yellowCards: 0,
    redCards: 0,
    injuryDays: 0,
    trophies: [],
  }
  const acc = { ...empty, trophies: [] as string[] }
  let majorInjuries = 0
  const trophyList: string[] = []
  const distinctionList: string[] = []
  const clubOrder: string[] = []
  let bestClubName = getClubById(state.clubId ?? '')?.name ?? 'Sans club'
  let bestClubLevel = -1

  for (const entry of state.seasonTimeline) {
    const s = entry.matchStats
    acc.matches += s.matches
    acc.goals += s.goals
    acc.assists += s.assists
    acc.cleanSheets += s.cleanSheets
    acc.keySaves += s.keySaves ?? 0
    if (s.injuryDays >= 40) majorInjuries += 1
    for (const t of s.trophies) {
      // Trophée collectif officiel (Phase 10) vs distinction individuelle.
      if (trophyMeta(t).official) {
        trophyList.push(`${t} (S${entry.seasonIndex})`)
      } else {
        distinctionList.push(`${t} (S${entry.seasonIndex})`)
      }
    }
    if (entry.clubId && !clubOrder.includes(entry.clubId)) {
      clubOrder.push(entry.clubId)
      const club = getClubById(entry.clubId)
      if (club && club.competitionLevel > bestClubLevel) {
        bestClubLevel = club.competitionLevel
        bestClubName = club.name
      }
    }
  }

  // Club courant inclus s’il n’a jamais été enregistré (carrière très courte).
  if (state.clubId && !clubOrder.includes(state.clubId)) {
    clubOrder.unshift(state.clubId)
  }

  const nationalCaps =
    typeof state.flags.nationalCaps === 'number' ? state.flags.nationalCaps : 0

  const clubs = clubOrder.map((id) => ({
    id,
    name: getClubById(id)?.name ?? id,
  }))

  return {
    totals: {
      matches: acc.matches,
      goals: acc.goals,
      assists: acc.assists,
      cleanSheets: acc.cleanSheets,
      keySaves: acc.keySaves,
      nationalCaps,
      trophies: trophyList.length,
      distinctions: distinctionList.length,
      majorInjuries,
    },
    trophyList,
    distinctionList,
    clubs,
    bestClubName,
  }
}

/**
 * Score d’héritage multi-dimensionnel — les trophées comptent mais ne
 * dominent pas : fidélité, longévité, résilience, international, popularité,
 * influence peuvent porter une carrière sans palmarès.
 */
export function computeLegacy(
  state: CareerState,
  totals: FinalReport['totals'],
  bestLevel: number,
): { breakdown: LegacyBreakdown; score: number } {
  const seasons = Math.max(1, state.seasonsCompleted)
  const rel = state.relationships
  const flags = state.flags

  const reussiteSportive = clamp(
    totals.trophies * 12 +
      totals.distinctions * 6 +
      (bestLevel - 45) * 1.4 +
      (state.careerStage === 'apogee' ? 8 : 0),
    0,
    100,
  )

  const longevite = clamp(
    (seasons - 3) * 6 + Math.max(0, state.age - 30) * 4,
    0,
    100,
  )

  const maxTenure =
    typeof flags.maxClubTenure === 'number' ? flags.maxClubTenure : 0
  const clubCount = new Set(
    state.seasonTimeline.map((e) => e.clubId).filter(Boolean),
  ).size
  const fidelite = clamp(
    maxTenure * 9 +
      (flags.home_return === true ? 18 : 0) +
      (flags.club_promise_kept === true ? 12 : 0) -
      Math.max(0, clubCount - 2) * 6,
    0,
    100,
  )

  const popularite = clamp(
    state.resources.popularite * 0.6 +
      rel.fans * 0.4 +
      (flags.fan_favorite === true ? 10 : 0),
    0,
    100,
  )

  const richesse = clamp(Math.log10(Math.max(1, state.finances.cash)) * 22 - 12, 0, 100)

  const resilience = clamp(
    (totals.majorInjuries > 0 && seasons > totals.majorInjuries + 2 ? 30 : 0) +
      (flags.chronic_managed === true ? 20 : 0) +
      (flags.level_crisis === true && bestLevel >= 55 ? 18 : 0) +
      state.hiddenTraits.resistancePression * 0.4,
    0,
    100,
  )

  const influenceVestiaire = clamp(
    rel.teammates * 0.5 +
      state.stats.leadership * 0.4 +
      (flags.vestiaire_leader === true ? 12 : 0) +
      (flags.capitaine_un_soir === true ? 8 : 0) +
      (flags.friendship_deep === true ? 8 : 0),
    0,
    100,
  )

  const carriereInternationale = clamp(
    totals.nationalCaps * 1.6 +
      (flags.national_regular === true ? 25 : 0) +
      (flags.national_capped === true ? 12 : 0),
    0,
    100,
  )

  const breakdown: LegacyBreakdown = {
    reussiteSportive,
    longevite,
    fidelite,
    popularite,
    richesse,
    resilience,
    influenceVestiaire,
    carriereInternationale,
  }

  // Global : moyenne pondérée douce — deux plus hautes dimensions comptent
  // davantage pour qu’une carrière « spécialisée » soit récompensée.
  const values = Object.values(breakdown).sort((a, b) => b - a)
  const weighted =
    values[0]! * 0.24 +
    values[1]! * 0.18 +
    values.slice(2).reduce((sum, v) => sum + v, 0) * (0.58 / 6)
  const score = Math.round(clamp(weighted, 0, 100))

  return { breakdown, score }
}

const ARCHETYPES: Array<{
  id: string
  title: string
  tagline: string
  test: (b: LegacyBreakdown, s: CareerState, t: FinalReport['totals']) => number
}> = [
  {
    id: 'legende',
    title: 'La Légende du jeu',
    tagline: 'Une carrière que l’on racontera longtemps.',
    test: (b) =>
      b.reussiteSportive >= 75 &&
      b.carriereInternationale >= 55 &&
      b.popularite >= 55
        ? 100
        : 0,
  },
  {
    id: 'enfant_club',
    title: 'L’Enfant du club',
    tagline: 'Fidèle jusqu’au bout, un maillot pour la vie.',
    test: (b) => (b.fidelite >= 70 ? 70 + b.fidelite / 5 : 0),
  },
  {
    id: 'globe_trotter',
    title: 'Le Nomade des ligues',
    tagline: 'Chaque saison, un nouveau ciel.',
    test: (_b, s) => {
      const clubs = new Set(
        s.seasonTimeline.map((e) => e.clubId).filter(Boolean),
      ).size
      return clubs >= 4 ? 60 + clubs * 4 : 0
    },
  },
  {
    id: 'capitaine',
    title: 'Le Brassard respecté',
    tagline: 'Le vestiaire le suivait sans hésiter.',
    test: (b) => (b.influenceVestiaire >= 68 ? 68 + b.influenceVestiaire / 6 : 0),
  },
  {
    id: 'heros_national',
    title: 'Le Fer de lance national',
    tagline: 'Il a porté les couleurs comme personne.',
    test: (b) =>
      b.carriereInternationale >= 65 ? 66 + b.carriereInternationale / 6 : 0,
  },
  {
    id: 'survivant',
    title: 'Le Revenant',
    tagline: 'Brisé, recousu, jamais à terre.',
    test: (b) => (b.resilience >= 62 ? 64 + b.resilience / 6 : 0),
  },
  {
    id: 'star_media',
    title: 'La Une permanente',
    tagline: 'Sur le terrain et à la lumière des projecteurs.',
    test: (b) => (b.popularite >= 72 && b.reussiteSportive < 70 ? 65 + b.popularite / 8 : 0),
  },
  {
    id: 'nabab',
    title: 'Le Nabab',
    tagline: 'La carrière fut aussi une affaire en or.',
    test: (b) => (b.richesse >= 78 ? 62 + b.richesse / 8 : 0),
  },
  {
    id: 'horloge',
    title: 'L’Increvable',
    tagline: 'Saison après saison, toujours là.',
    test: (b) => (b.longevite >= 70 ? 63 + b.longevite / 7 : 0),
  },
  {
    id: 'roi_sans_couronne',
    title: 'Le Roi sans couronne',
    tagline: 'Un immense joueur, un palmarès qui l’ignore.',
    test: (b) =>
      b.reussiteSportive < 45 && b.longevite >= 45 && b.popularite >= 45
        ? 55
        : 0,
  },
  {
    id: 'talent_gache',
    title: 'Le Talent inachevé',
    tagline: 'Tout était là, sauf la suite.',
    test: (b, s) =>
      s.age < 30 && b.reussiteSportive < 40 && b.longevite < 35 ? 58 : 0,
  },
  {
    id: 'mentor',
    title: 'Le Passeur de flambeau',
    tagline: 'Sa plus belle œuvre, ce sont les autres.',
    test: (b, s) =>
      b.influenceVestiaire >= 55 && s.age >= 33 ? 56 + b.influenceVestiaire / 8 : 0,
  },
  {
    id: 'artisan',
    title: 'Le Professionnel modèle',
    tagline: 'Rien de tapageur, tout de solide.',
    test: (_b, s) =>
      s.hiddenTraits.professionnalisme >= 65 ? 45 + s.hiddenTraits.professionnalisme / 8 : 0,
  },
]

/** Points forts de retraite (Phase 12) — distinctions majeures + records. */
export function buildRetirementHighlights(
  state: CareerState,
  legacyScore: number,
): RetirementHighlights {
  const distinctions = state.seasonTimeline.flatMap((e) => e.distinctions ?? [])
  const won = distinctions.filter((d) => d.result === 'vainqueur')
  const mostPrestigious = won.reduce<DistinctionRecord | null>(
    (best, d) => (!best || d.prestige > best.prestige ? d : best),
    null,
  )
  const worldRanks = distinctions
    .filter((d) => d.tier === 'mondial')
    .map((d) => d.rank)
  const bestWorldRanking = worldRanks.length ? Math.min(...worldRanks) : null

  const majorTrophies = [
    ...new Set(
      state.seasonTimeline.flatMap((e) =>
        e.matchStats.trophies.filter((t) =>
          ['continental', 'international'].includes(trophyMeta(t).celebration),
        ),
      ),
    ),
  ]

  let bestSeason: number | null = null
  let bestScore = -Infinity
  for (const e of state.seasonTimeline) {
    const s =
      e.matchStats.goals * 3 +
      e.matchStats.assists * 2 +
      (e.matchStats.averageRating - 6) * 18 +
      e.matchStats.minutes / 60
    if (s > bestScore) {
      bestScore = s
      bestSeason = e.seasonIndex
    }
  }

  const careerRecords = buildCareerRecords(state)
  const hasWorldAward = won.some((d) => d.tier === 'mondial')
  const careerHonor =
    legacyScore >= 80 || hasWorldAward ? CAREER_HONOR_NAME : null

  return {
    mostPrestigiousAward: mostPrestigious?.awardName ?? null,
    bestWorldRanking,
    distinctionsWon: won.length,
    recordsCount: (state.records ?? []).length,
    recordsStillHeld: state.records ?? [],
    majorTrophies,
    referenceSeason: bestSeason,
    careerHonor,
    careerRecords,
  }
}

/** Archétype de fin — titre original adapté au parcours dominant. */
export function pickArchetype(
  breakdown: LegacyBreakdown,
  state: CareerState,
  totals: FinalReport['totals'],
): CareerArchetype {
  let best = ARCHETYPES[ARCHETYPES.length - 1]!
  let bestScore = -1
  for (const arch of ARCHETYPES) {
    const value = arch.test(breakdown, state, totals)
    if (value > bestScore) {
      bestScore = value
      best = arch
    }
  }
  if (bestScore <= 0) {
    return {
      id: 'parcours',
      title: 'Le Combattant discret',
      tagline: 'Une carrière honnête, menée jusqu’au bout.',
    }
  }
  return { id: best.id, title: best.title, tagline: best.tagline }
}

function buildNarrative(report: Omit<FinalReport, 'narrative'>): string {
  const parts: string[] = []
  parts.push(
    `${report.displayName}, ${report.positionLabel} formé sur ${report.countryLabel}, raccroche à ${report.retirementAge} ans après ${report.seasons} saisons.`,
  )
  if (report.totals.trophies > 0) {
    parts.push(
      `${report.totals.trophies} trophée${report.totals.trophies > 1 ? 's' : ''} et ${report.totals.matches} matchs plus tard, le nom reste attaché à ${report.bestClubName}.`,
    )
  } else {
    parts.push(
      `Sans grand titre mais avec ${report.totals.matches} matchs au compteur, la carrière s’est écrite ailleurs que dans les vitrines.`,
    )
  }
  parts.push(`Verdict : « ${report.archetype.title} ». ${report.archetype.tagline}`)
  return parts.join(' ')
}

/** Construit le bilan final complet à partir de la sauvegarde. */
export function buildFinalReport(pkg: CareerSavePackage): FinalReport {
  const state = pkg.snapshot.state
  const visible = getVisibleStats(state)
  const bestLevel =
    typeof state.flags.peakLevel === 'number'
      ? Math.max(state.flags.peakLevel, visible.niveau)
      : visible.niveau

  const { totals, trophyList, distinctionList, clubs, bestClubName } =
    aggregateTotals(state)
  const { breakdown, score } = computeLegacy(state, totals, bestLevel)
  const archetype = pickArchetype(breakdown, state, totals)

  // Palmarès structuré + faits marquants collectifs (Phase 10).
  const palmares = buildPalmares(state)
  const faitsMarquants = [
    ...new Set(
      state.seasonTimeline.flatMap((e) =>
        (e.achievements ?? []).map((a) => ACHIEVEMENT_LABELS[a] ?? a),
      ),
    ),
  ]
  // Distinctions individuelles (Phase 11) — victoires + total des nominations.
  const allDistinctions = state.seasonTimeline.flatMap((e) => e.distinctions ?? [])
  const individualAwards = allDistinctions.filter((d) => d.result === 'vainqueur')
  const individualNominations = allDistinctions.length

  const rivalRel = state.npcs.rival.relation
  const keyRelationships: FinalReport['keyRelationships'] = [
    {
      role: 'Entraîneur marquant',
      name: state.npcs.coach.displayName,
      note:
        state.flags.coach_war === true
          ? 'Une relation orageuse, jamais vraiment apaisée.'
          : state.flags.coach_ally === true
            ? 'Un allié décisif dans les moments clés.'
            : 'Un mentor discret des débuts.',
    },
    {
      role: 'Coéquipier proche',
      name: state.npcs.teammate.displayName,
      note:
        state.flags.friendship_deep === true
          ? 'Une amitié forgée dans le vestiaire, restée intacte.'
          : 'Un compagnon de route des grands soirs.',
    },
    {
      role: 'Agent',
      name: state.npcs.agent.displayName,
      note:
        state.flags.agent_crisis === true
          ? 'Une confiance trahie qui a coûté cher.'
          : 'Un négociateur fidèle au fil des contrats.',
    },
  ]

  const keyDecisions: string[] = []
  const decisionFlags: Array<[string, string]> = [
    ['transfer_accepted', 'Avoir osé le grand départ au bon moment.'],
    ['club_promise_kept', 'Avoir tenu sa promesse au club malgré les sirènes.'],
    ['club_promise_broken', 'Avoir rompu une promesse et fâché tout un club.'],
    ['position_switch', 'Avoir accepté de changer de poste pour durer.'],
    ['injury_hidden', 'Avoir caché une douleur — un pari sur son corps.'],
    ['media_crisis', 'Avoir affronté une tempête médiatique.'],
    ['home_return', 'Être revenu finir là où tout avait commencé.'],
  ]
  for (const [flag, text] of decisionFlags) {
    if (state.flags[flag] === true) keyDecisions.push(text)
  }
  if (keyDecisions.length === 0) {
    keyDecisions.push('Une carrière sans esclandre, guidée par la constance.')
  }

  const base: Omit<FinalReport, 'narrative'> = {
    displayName: pkg.playerProfile.displayName,
    countryLabel: getCountryById(state.countryId)?.label ?? state.countryId,
    positionLabel:
      getPositionById(state.preciseRole)?.label ?? state.preciseRole,
    retirementAge: state.age,
    seasons: state.seasonsCompleted,
    clubs,
    bestClubName,
    totals: isGkRole(state.preciseRole)
      ? { ...totals, goals: 0 }
      : totals,
    trophyList,
    distinctionList,
    palmares,
    faitsMarquants,
    individualAwards,
    individualNominations,
    retirement: buildRetirementHighlights(state, score),
    bestLevel,
    fortune: Math.max(0, Math.round(state.finances.cash)),
    rival: {
      displayName: state.npcs.rival.displayName,
      level: state.npcs.rival.level,
      trophies: state.npcs.rival.trophies,
      clubName: getClubById(state.npcs.rival.clubId ?? '')?.name ?? 'Sans club',
      relation: rivalRel,
      verdict:
        rivalRel >= 60
          ? 'Le respect a fini par l’emporter.'
          : rivalRel <= 30
            ? 'La rivalité ne s’est jamais éteinte.'
            : 'Deux trajectoires qui se sont frôlées sans se confondre.',
    },
    keyRelationships,
    keyDecisions,
    legacy: breakdown,
    legacyScore: score,
    archetype,
  }

  return { ...base, narrative: buildNarrative(base) }
}

/** Carte partageable — aucune donnée personnelle de l’utilisateur. */
export interface ShareCard {
  displayName: string
  countryLabel: string
  positionLabel: string
  retirementAge: number
  bestClubName: string
  trophies: number
  legacyScore: number
  archetypeTitle: string
  /** Trophée le plus prestigieux du palmarès (Phase 10), s'il existe. */
  topTrophy: string | null
  /** Distinctions individuelles remportées (Phase 11). */
  awardsWon: number
}

export function buildShareCard(report: FinalReport): ShareCard {
  const top = report.palmares
    .filter((p) => p.official)
    .sort((a, b) => b.prestige - a.prestige)[0]
  return {
    displayName: report.displayName,
    countryLabel: report.countryLabel,
    positionLabel: report.positionLabel,
    retirementAge: report.retirementAge,
    bestClubName: report.bestClubName,
    trophies: report.totals.trophies,
    legacyScore: report.legacyScore,
    archetypeTitle: report.archetype.title,
    topTrophy: top ? top.competition : null,
    awardsWon: report.individualAwards.length,
  }
}
