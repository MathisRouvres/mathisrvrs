import { createRng, type SeededRng } from '../random/createRng'
import type {
  DifficultyId,
  GameMode,
  HiddenTraitId,
  Relationships,
  ResourceId,
  SportStatId,
} from '../types/career'
import type {
  CareerStageId,
  ClubSeasonResult,
  SeasonSimulationResult,
} from '../types/season'
import { SPORT_STAT_IDS } from './constants'
import {
  clamp,
  clampRelation,
  clampResource,
  clampStat,
  clampStatFloat,
} from './clamp'
import { resolveNextCareerStage } from './careerStages'
import {
  ageGrowthFactor,
  getPositionCurve,
  positionOverall,
} from './positionCurves'
import { chaptersForMode } from './seasonChapters'
import { simulateClubSeason } from './simulateClub'

export type CareerFlags = Record<string, boolean | number | string>

export interface SeasonSimulationInput {
  seed: string
  seasonIndex: number
  age: number
  positionId: string
  difficulty: DifficultyId
  mode: GameMode
  careerStage: CareerStageId
  stats: Record<SportStatId, number>
  resources: Record<ResourceId, number>
  hiddenTraits: Record<HiddenTraitId, number>
  relationships: Relationships
  clubInfrastructure: number
  competitionLevel: number
  estimatedValue: number
  injuryWeeksRemaining: number
  contractWeeksRemaining: number | null
  maxSeasons: number
  /** Phase 6 — contexte club/pays + conséquences des dilemmes. */
  clubId?: string | null
  flags?: CareerFlags
  /** Niveau du championnat du pays (division 1). */
  leagueLevel?: number
  /** Concurrence au poste (0–100) ; dérivée de la seed si absente. */
  positionCompetition?: number
  /** Scénarios de test / événements forcés. */
  forceNoMinutes?: boolean
  forceLongInjury?: boolean
  forceExceptional?: boolean
  forceClubRank?: number
}

type PositionFamily = 'gk' | 'def' | 'mid' | 'att'

/** Taux de but par match (référence) selon le poste précis. */
const GOAL_RATE: Record<string, number> = {
  st: 0.5, winger: 0.32, cam: 0.26, cm: 0.11, cdm: 0.05, fb: 0.05, cb: 0.035, gk: 0,
}
/** Taux de passe décisive par match (référence) selon le poste précis. */
const ASSIST_RATE: Record<string, number> = {
  st: 0.16, winger: 0.3, cam: 0.32, cm: 0.22, cdm: 0.12, fb: 0.14, cb: 0.05, gk: 0,
}

function positionFamily(positionId: string): PositionFamily {
  if (positionId === 'gk') return 'gk'
  if (positionId === 'cb' || positionId === 'fb') return 'def'
  if (['cdm', 'cm', 'cam'].includes(positionId)) return 'mid'
  return 'att'
}

function difficultyFactor(d: DifficultyId): number {
  if (d === 'story') return 1.12
  if (d === 'demanding') return 0.88
  return 1
}

function overallFromStats(
  stats: Record<SportStatId, number>,
  positionId: string,
): number {
  // Unifié avec le niveau affiché (Phase 13) : overall pondéré par le poste,
  // pour que valeur stockée et valeur affichée coïncident.
  return positionOverall(stats, positionId)
}

function estimateValue(
  overall: number,
  age: number,
  potential: number,
  reputation: number,
  minutes: number,
): number {
  const ageMod = age < 23 ? 1.15 : age < 29 ? 1.05 : age < 33 ? 0.9 : 0.7
  const potMod = 0.7 + potential / 200
  const repMod = 0.8 + reputation / 250
  const minMod = 0.75 + Math.min(minutes, 3000) / 6000
  return Math.round(overall * 12_000 * ageMod * potMod * repMod * minMod)
}

function cloneStats(
  stats: Record<SportStatId, number>,
): Record<SportStatId, number> {
  const next = {} as Record<SportStatId, number>
  for (const id of SPORT_STAT_IDS) next[id] = stats[id]
  return next
}

/**
 * Bonus de percée borné (Phase 13, §7) — jeune révélation, saison statistique
 * exceptionnelle, changement de poste réussi, retour de blessure, saison
 * historique, grande compétition. Multiplicateur du budget de croissance, borné
 * (jamais star mondiale en une saison).
 */
function breakthroughFactor(
  input: SeasonSimulationInput,
  minutes: number,
  averageRating: number,
  goalsPlusAssists: number,
  cleanSheets: number,
): number {
  const flags = input.flags ?? {}
  let b = 1
  if (input.age <= 21 && minutes > 1600 && averageRating >= 7.1) b += 0.25
  if (averageRating >= 7.6 && (goalsPlusAssists >= 15 || cleanSheets >= 14)) b += 0.3
  if (flags.position_switch === true && averageRating >= 6.8) b += 0.15
  if (flags.long_injury_last_season === true && minutes > 1500) b += 0.2
  if (flags.season_historic === true) b += 0.15
  if (flags.first_full_starter === true && minutes > 1800) b += 0.2
  if (flags.national_regular === true && input.seasonIndex % 2 === 0) b += 0.1
  return clamp(b, 1, 1.7)
}

function applyTrainingAndGrowth(
  rng: SeededRng,
  input: SeasonSimulationInput,
  minutes: number,
  longInjury: boolean,
  breakthrough: number,
): Record<SportStatId, number> {
  const next = cloneStats(input.stats)
  const curve = getPositionCurve(input.positionId)
  const ageFactor = ageGrowthFactor(input.age, curve)
  const pot = input.hiddenTraits.potentiel
  const pro = input.hiddenTraits.professionnalisme
  const constancy = input.hiddenTraits.constance
  const morale = input.resources.moral
  const fatigue = input.resources.fatigue
  const coach = input.resources.confianceEntraineur
  const infra = input.clubInfrastructure
  const diff = difficultyFactor(input.difficulty)

  const minutesFactor = clamp(minutes / 2200, 0, 1.25)
  const trainingQuality =
    (0.4 + infra / 180 + pro / 220 + (100 - fatigue) / 380) *
    (0.78 + coach / 360)

  // Budget de croissance rehaussé (Phase 13) + percée bornée. L'accumulation
  // est désormais fractionnaire (clampStatFloat) : les petits gains ne sont plus
  // détruits par l'arrondi à chaque saison.
  let growthBudget =
    ageFactor *
    (0.5 + pot / 150) *
    (0.7 + minutesFactor) *
    trainingQuality *
    diff *
    (0.85 + constancy / 400) *
    (0.85 + morale / 400) *
    breakthrough

  if (longInjury) growthBudget *= 0.25
  if (minutes < 200) growthBudget *= 0.35
  if (input.forceExceptional) growthBudget *= 1.55

  // Plafond souple adouci (Phase 13). Le potentiel reste un plafond souple :
  // au-delà, la progression est fortement ralentie mais jamais bloquée nette.
  const ceiling = clampStatFloat(50 + pot * 0.49)

  for (const id of SPORT_STAT_IDS) {
    let unit = 0.6
    if (curve.fragileStats.includes(id)) {
      unit = ageFactor < 0.7 ? -0.9 * curve.declineRate : 0.75
    } else if (curve.durableStats.includes(id)) {
      unit = ageFactor < 0.7 ? 0.4 : 0.9
    }

    // Décisions / traits atypiques : adaptabilité réduit le déclin
    if (unit < 0 && input.hiddenTraits.adaptabilite > 70) {
      unit *= 0.6
    }
    if (unit > 0 && input.hiddenTraits.ambition > 75 && minutes > 1500) {
      unit *= 1.15
    }

    const delta = growthBudget * unit * (0.75 + rng.randomFloat() * 0.5)
    let value = next[id] + delta

    // Plafond souple : rendement fortement décroissant au-delà du potentiel
    // (progression rare au-dessus de l'estimation, jamais un mur net).
    if (value > ceiling && delta > 0) {
      const over = value - ceiling
      value = ceiling + over * 0.18
    }
    next[id] = clampStatFloat(value)
  }

  return next
}

function buildBeats(
  rng: SeededRng,
  input: SeasonSimulationInput,
  minutes: number,
  longInjury: boolean,
): SeasonSimulationResult['beats'] {
  const chapters = chaptersForMode(input.mode)
  const beats: SeasonSimulationResult['beats'] = []

  for (const chapter of chapters) {
    const type = rng.pick(chapter.beatTypes)
    let title = chapter.label
    let summary = ''

    switch (type) {
      case 'training':
        title = 'Bloc d’entraînement'
        summary =
          input.resources.fatigue > 70
            ? 'Charge lourde : le staff freine pour préserver le physique.'
            : 'Séances intensives — le staff note ton professionnalisme.'
        break
      case 'narrative':
        title = 'Dilemme du vestiaire'
        summary =
          input.relationships.teammates > 55
            ? 'Tu apaises une tension entre titulaires et remplaçants.'
            : 'Une remarque maladroite refroidit une partie du groupe.'
        break
      case 'sport_sim':
        title = 'Séquence compétition'
        summary =
          minutes < 300
            ? 'Peu de rotations : tu restes longtemps sur le banc.'
            : 'Enchaînement de matchs — ton volume de jeu structure la saison.'
        break
      case 'match_moment':
        title = 'Moment clé'
        summary =
          input.hiddenTraits.grandsMatchs > 60 && minutes > 800
            ? 'Dans un match tendu, tu prends la bonne décision au bon moment.'
            : 'Occasion manquée ou lecture tardive : le coach le note.'
        break
      case 'delayed_consequence':
        title = 'Écho d’une décision passée'
        summary = longInjury
          ? 'La reprise est freinée par la méfiance médicale.'
          : 'Une promesse antérieure au staff influence ton statut.'
        break
      case 'contract_relation':
        title = 'Point contrat / relation'
        summary =
          input.resources.confianceEntraineur > 60
            ? 'Le coach confirme son plan pour toi la saison suivante.'
            : 'Discussion froide : ton rôle reste flou.'
        break
      default:
        summary = 'Temps fort de saison.'
    }

    beats.push({ chapterId: chapter.id, type, title, summary })
  }

  return beats
}

/**
 * Simulation pure d’une saison — déterministe, sans UI ni I/O.
 */
export function simulateSeason(
  input: SeasonSimulationInput,
): SeasonSimulationResult {
  const rng = createRng(
    `${input.seed}:season:${input.seasonIndex}:v2`,
  )

  const flags: CareerFlags = input.flags ?? {}
  const statsBefore = cloneStats(input.stats)
  const resourcesBefore = { ...input.resources }
  const reputationBefore = input.resources.reputationSportive
  const valueBefore = input.estimatedValue
  const family = positionFamily(input.positionId)

  // Concurrence au poste : recrue, hiérarchie — varie chaque saison via la seed.
  const positionCompetition =
    input.positionCompetition ??
    clamp(
      input.competitionLevel + rng.randomInt(-12, 12) + (flags.rival_feud === true ? 6 : 0),
      15,
      95,
    )

  const frag = input.hiddenTraits.fragilitePhysique
  const hiddenInjuryRisk =
    flags.injury_hidden === true || flags.grave_injury_risk === true ? 0.07 : 0
  const injuryRoll = rng.randomFloat()
  let longInjury =
    Boolean(input.forceLongInjury) ||
    input.injuryWeeksRemaining >= 12 ||
    (injuryRoll < frag / 320 + hiddenInjuryRisk &&
      (input.resources.fatigue > 65 || hiddenInjuryRisk > 0))

  if (input.forceExceptional) longInjury = false

  let minutes = 0
  let matches = 0
  let starts = 0

  if (input.forceNoMinutes) {
    minutes = 0
    matches = rng.randomInt(0, 4)
    starts = 0
  } else if (longInjury) {
    minutes = rng.randomInt(0, 450)
    matches = rng.randomInt(2, 10)
    starts = Math.min(matches, rng.randomInt(0, 4))
  } else {
    const coach = input.resources.confianceEntraineur
    const form = input.resources.forme
    const overall = overallFromStats(input.stats, input.positionId)
    const levelGap = input.competitionLevel - overall
    const competitionGap = positionCompetition - overall
    const chance =
      0.35 +
      coach / 250 +
      form / 300 -
      Math.max(0, levelGap) / 120 -
      Math.max(0, competitionGap) / 220 +
      input.hiddenTraits.professionnalisme / 400 +
      (flags.coach_ally === true ? 0.05 : 0) -
      (flags.coach_feud === true ? 0.08 : 0)

    const baseMinutes = Math.round(
      clamp(chance, 0.08, 1.05) * rng.randomInt(900, 3200),
    )
    minutes = input.forceExceptional
      ? Math.max(baseMinutes, rng.randomInt(2400, 3400))
      : baseMinutes
    matches = Math.max(8, Math.round(minutes / 78))
    starts = Math.round(matches * clamp(chance, 0.2, 0.95))
  }

  const isGk = family === 'gk'
  const isDef = family === 'gk' || family === 'def' || input.positionId === 'cdm'

  let goals = 0
  let assists = 0
  let cleanSheets = 0
  let keySaves = 0

  if (!input.forceNoMinutes && minutes > 0) {
    const finishing = input.stats.finition
    const vision = input.stats.vision
    const defense = input.stats.defense
    const placement = input.stats.placement
    const sangFroid = input.stats.sangFroid
    if (isGk) {
      goals = 0
      assists = rng.chance(0.08) ? 1 : 0
      cleanSheets = Math.round((minutes / 3200) * rng.randomInt(4, 14))
      keySaves = Math.round(
        (minutes / 90) *
          (0.55 + (placement + sangFroid) / 240) *
          (0.75 + rng.randomFloat() * 0.5),
      )
    } else {
      // Buts/passes réalistes : taux par match dépendant du poste (l'ancienne
      // formule plafonnait un attaquant plein-temps à ~0–1 but/saison).
      const perMatch = minutes / 90
      const gRate = GOAL_RATE[input.positionId] ?? 0.12
      const aRate = ASSIST_RATE[input.positionId] ?? 0.14
      const finFactor = 0.55 + finishing / 130
      const visFactor = 0.55 + vision / 130
      goals = Math.round(perMatch * gRate * finFactor * (0.7 + rng.randomFloat() * 0.6))
      assists = Math.round(perMatch * aRate * visFactor * (0.7 + rng.randomFloat() * 0.6))
      cleanSheets = isDef
        ? Math.round((minutes / 3400) * (defense / 60) * rng.randomInt(2, 10))
        : 0
    }
  }

  if (input.forceExceptional && !isGk) {
    goals = Math.max(goals, family === 'att' ? rng.randomInt(14, 24) : rng.randomInt(6, 12))
    assists = Math.max(assists, rng.randomInt(6, 14))
  }
  if (input.forceExceptional && isGk) {
    cleanSheets = Math.max(cleanSheets, rng.randomInt(14, 20))
    keySaves = Math.max(keySaves, rng.randomInt(70, 110))
  }

  // Note moyenne : contribution spécifique au poste — un gardien n’est pas
  // jugé sur ses buts, un défenseur peut briller sans marquer, un milieu
  // vaut par son influence, un attaquant surtout par ses buts.
  const played = minutes >= 200
  let contribution = 0
  if (played) {
    const perMatch = Math.max(1, minutes / 90)
    if (family === 'gk') {
      contribution =
        cleanSheets * 0.055 + (keySaves / perMatch) * 0.25 - 0.25
    } else if (family === 'def') {
      contribution =
        cleanSheets * 0.05 +
        (input.stats.defense - 55) / 55 +
        goals * 0.04 +
        assists * 0.02
    } else if (family === 'mid') {
      contribution =
        assists * 0.05 +
        goals * 0.04 +
        ((input.stats.vision + input.stats.passe) / 2 - 55) / 60
    } else {
      contribution =
        goals * 0.065 +
        assists * 0.03 -
        (goals === 0 && minutes > 1500 ? 0.4 : 0)
    }
  }
  contribution = clamp(contribution, -0.9, 0.9)

  const ratingBase =
    6.05 +
    overallFromStats(input.stats, input.positionId) / 90 +
    contribution +
    input.resources.forme / 250 +
    (input.resources.moral - 50) / 500 -
    input.resources.fatigue / 250 +
    (input.forceExceptional ? 0.7 : 0) -
    (longInjury ? 0.35 : 0) -
    (minutes < 200 ? 0.4 : 0)

  const averageRating =
    Math.round(clamp(ratingBase + (rng.randomFloat() - 0.5) * 0.6, 5.2, 8.8) * 10) /
    10

  // Discipline basse → cartons plus fréquents.
  const disc = input.resources.discipline
  const yellowCap = Math.max(1, Math.round(9 - disc / 15))
  const yellowCards = minutes < 100 ? rng.randomInt(0, 1) : rng.randomInt(0, yellowCap)
  const redCards = rng.chance(0.03 + (disc < 40 ? 0.07 : 0)) ? 1 : 0
  const injuryDays = longInjury
    ? rng.randomInt(60, 160)
    : rng.chance(frag / 200)
      ? rng.randomInt(7, 35)
      : 0

  // Saison du club — classement, coupe, trophées collectifs.
  const playerImpact = clamp(
    (minutes / 3000) * 0.55 + ((averageRating - 6.2) / 2.4) * 0.45,
    0,
    1,
  )
  const club: ClubSeasonResult = simulateClubSeason(rng, {
    clubId: input.clubId ?? null,
    clubStrength: input.competitionLevel,
    leagueLevel: input.leagueLevel ?? input.competitionLevel,
    division: flags.division2 === true ? 2 : 1,
    playerImpact,
    forceRank: input.forceClubRank,
  })

  const trophies: string[] = [...club.trophies]
  if (family === 'att' && goals >= 18 && played) {
    trophies.push('Meilleur buteur du championnat')
  }
  if (
    averageRating >= 7.5 &&
    minutes > 2200 &&
    rng.chance(0.4 + input.hiddenTraits.grandsMatchs / 300)
  ) {
    trophies.push('Joueur de la saison du club')
  }

  const breakthrough = breakthroughFactor(
    input,
    minutes,
    averageRating,
    goals + assists,
    cleanSheets,
  )
  const statsAfter = applyTrainingAndGrowth(
    rng,
    input,
    minutes,
    longInjury,
    breakthrough,
  )

  const resourcesAfter = { ...input.resources }
  resourcesAfter.fatigue = clampResource(
    longInjury
      ? input.resources.fatigue - 10
      : input.resources.fatigue + Math.round(minutes / 400) - 8,
  )
  resourcesAfter.forme = clampResource(
    longInjury
      ? input.resources.forme - 12
      : input.resources.forme + (averageRating - 6.5) * 4,
  )
  resourcesAfter.moral = clampResource(
    minutes < 200
      ? input.resources.moral - 14
      : input.resources.moral + (averageRating - 6.4) * 5,
  )
  resourcesAfter.sante = clampResource(
    longInjury ? input.resources.sante - 18 : input.resources.sante + 2,
  )
  resourcesAfter.confianceEntraineur = clampResource(
    minutes < 200
      ? input.resources.confianceEntraineur - 10
      : input.resources.confianceEntraineur + (averageRating - 6.5) * 6,
  )
  const repClubBonus =
    (club.trophies.includes('Champion national') ? 6 : 0) +
    (club.cupRun === 'vainqueur' ? 4 : 0) +
    (club.continentalQualified ? 2 : 0) -
    (club.relegated ? 5 : 0)
  const repFamilyGain = isGk
    ? cleanSheets * 0.35 + keySaves * 0.03
    : goals * (family === 'att' ? 0.45 : 0.3) + assists * 0.3
  const mediaStormDampener = flags.media_storm === true ? 0.7 : 1
  resourcesAfter.reputationSportive = clampResource(
    input.resources.reputationSportive +
      ((minutes < 200 ? -6 : 0) +
        (averageRating - 6.5) * 4 +
        repFamilyGain +
        repClubBonus +
        (input.forceExceptional ? 12 : 0)) *
        mediaStormDampener,
  )
  resourcesAfter.popularite = clampResource(
    input.resources.popularite +
      goals * 0.5 +
      (trophies.length ? 4 : 0) +
      (flags.fan_favorite === true || flags.derby_hero === true ? 2 : 0) -
      (club.relegated ? 3 : 0),
  )
  resourcesAfter.bienEtre = clampResource(
    longInjury
      ? input.resources.bienEtre - 10
      : input.resources.bienEtre + (input.resources.discipline > 60 ? 3 : -1),
  )

  const relationshipsAfter: Relationships = {
    ...input.relationships,
    coach: clampRelation(
      input.relationships.coach +
        (resourcesAfter.confianceEntraineur - input.resources.confianceEntraineur) *
          0.6,
    ),
    teammates: clampRelation(
      input.relationships.teammates + (minutes > 1500 ? 3 : minutes < 200 ? -4 : 0),
    ),
    media: clampRelation(
      input.relationships.media + (resourcesAfter.popularite - input.resources.popularite) * 0.4,
    ),
    fans: clampRelation(
      input.relationships.fans + goals * 0.4 + (trophies.length ? 3 : 0),
    ),
  }

  const overallAfter = overallFromStats(statsAfter, input.positionId)
  const valueAfter = estimateValue(
    overallAfter,
    input.age + 1,
    input.hiddenTraits.potentiel,
    resourcesAfter.reputationSportive,
    minutes,
  )

  let progressionLabel: SeasonSimulationResult['progressionLabel'] = 'stable'
  if (input.forceNoMinutes || minutes < 180) progressionLabel = 'sans_temps_de_jeu'
  else if (longInjury) progressionLabel = 'blessure'
  else if (input.forceExceptional || (averageRating >= 7.6 && goals + assists >= 15))
    progressionLabel = 'exceptionnelle'
  else if (overallAfter - overallFromStats(statsBefore, input.positionId) >= 2.2)
    progressionLabel = 'forte'
  else if (overallAfter - overallFromStats(statsBefore, input.positionId) >= 0.6)
    progressionLabel = 'positive'
  else if (overallAfter - overallFromStats(statsBefore, input.positionId) <= -1.2)
    progressionLabel = 'regression'

  const beats = buildBeats(rng, input, minutes, longInjury)

  const careerStageAfter = resolveNextCareerStage({
    age: input.age + 1,
    seasonIndex: input.seasonIndex,
    reputation: resourcesAfter.reputationSportive,
    estimatedValue: valueAfter,
    minutesThisSeason: minutes,
    averageRating,
    longInjury,
    contractWeeksRemaining: input.contractWeeksRemaining,
    maxSeasons: input.maxSeasons,
    current: input.careerStage,
  })

  const keyEvent = pickKeyEvent({
    club,
    trophies,
    longInjury,
    progressionLabel,
    minutes,
    goals,
    family,
  })

  const narrativeSummary = buildNarrative({
    progressionLabel,
    minutes,
    goals,
    assists,
    cleanSheets,
    keySaves,
    averageRating,
    longInjury,
    trophies,
    stage: careerStageAfter,
    club,
    family,
  })

  return {
    seasonIndex: input.seasonIndex,
    ageBefore: input.age,
    ageAfter: input.age + 1,
    matchStats: {
      matches,
      starts,
      minutes,
      goals,
      assists,
      cleanSheets,
      keySaves,
      averageRating,
      yellowCards,
      redCards,
      injuryDays,
      trophies,
    },
    statsBefore,
    statsAfter,
    resourcesBefore,
    resourcesAfter,
    valueBefore,
    valueAfter,
    reputationBefore,
    reputationAfter: resourcesAfter.reputationSportive,
    relationshipsAfter,
    progressionLabel,
    narrativeSummary,
    beats,
    careerStageBefore: input.careerStage,
    careerStageAfter,
    longInjury,
    rngFinalState: rng.getState(),
    club,
    keyEvent,
    overallBefore: Math.round(overallFromStats(statsBefore, input.positionId)),
    overallAfter: Math.round(overallAfter),
    autoTransfer: null,
  }
}

/** Événement marquant unique de la saison, par ordre de priorité. */
function pickKeyEvent(input: {
  club: ClubSeasonResult
  trophies: string[]
  longInjury: boolean
  progressionLabel: SeasonSimulationResult['progressionLabel']
  minutes: number
  goals: number
  family: PositionFamily
}): string {
  const { club } = input
  if (club.trophies.includes('Champion national')) return 'Champion national'
  if (club.trophies.includes('Champion de division 2')) return 'Montée en division 1'
  if (club.cupRun === 'vainqueur') return 'Vainqueur de la coupe nationale'
  if (input.trophies.includes('Meilleur buteur du championnat'))
    return 'Meilleur buteur du championnat'
  if (club.relegated) return 'Relégation du club'
  if (input.longInjury) return 'Blessure longue'
  if (club.cupRun === 'finale') return 'Finale de coupe perdue'
  if (input.progressionLabel === 'exceptionnelle') return 'Saison exceptionnelle'
  if (club.coachChanged) return 'Changement d’entraîneur'
  if (input.minutes < 200) return 'Saison blanche'
  if (club.continentalQualified) return 'Qualification continentale'
  return 'Saison régulière'
}

const CUP_LABELS: Record<ClubSeasonResult['cupRun'], string> = {
  aucune: 'élimination précoce en coupe',
  huitiemes: 'huitièmes de coupe',
  quarts: 'quarts de coupe',
  demi: 'demi-finale de coupe',
  finale: 'finale de coupe perdue',
  vainqueur: 'coupe nationale remportée',
}

function buildNarrative(input: {
  progressionLabel: SeasonSimulationResult['progressionLabel']
  minutes: number
  goals: number
  assists: number
  cleanSheets: number
  keySaves: number
  averageRating: number
  longInjury: boolean
  trophies: string[]
  stage: CareerStageId
  club: ClubSeasonResult
  family: PositionFamily
}): string {
  const parts: string[] = []
  if (input.longInjury) {
    parts.push('Une blessure longue a tronqué la saison.')
  } else if (input.minutes < 200) {
    parts.push('Presque aucun temps de jeu : la frustration s’installe.')
  } else if (input.family === 'gk') {
    parts.push(
      `${input.minutes} minutes, note ${input.averageRating.toFixed(1)}, ${input.cleanSheets} clean sheets, ${input.keySaves} arrêts décisifs.`,
    )
  } else {
    parts.push(
      `${input.minutes} minutes, note ${input.averageRating.toFixed(1)}, ${input.goals} buts, ${input.assists} passes décisives.`,
    )
  }
  parts.push(
    `Club : ${input.club.leagueRank}ᵉ sur ${input.club.leagueSize}${input.club.division === 2 ? ' (division 2)' : ''}, ${CUP_LABELS[input.club.cupRun]}.`,
  )
  if (input.club.relegated) parts.push('Le club descend en division 2.')
  if (input.club.promoted) parts.push('Le club remonte en division 1.')
  if (input.club.coachChanged) parts.push('L’entraîneur change en cours de route.')
  if (input.trophies.length) {
    parts.push(`Trophée(s) : ${input.trophies.join(', ')}.`)
  }
  parts.push(`Trajectoire : ${input.progressionLabel.replaceAll('_', ' ')}.`)
  return parts.join(' ')
}
