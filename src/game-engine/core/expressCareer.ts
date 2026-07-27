import type { CareerSavePackage, SeasonSimulationResult } from '../types'
import type {
  CareerState,
  DilemmasResolvedThisSeason,
  GenderId,
  LifestyleId,
  SportStatId,
  VisibleCareerStats,
} from '../types/career'
import type { DilemmaDefinition, DilemmaResolutionLog } from '../dilemmas/types'
import { isDilemmaEligible } from '../dilemmas/eligibility'
import {
  pickDilemmaForSlot,
  type SeasonSlot,
} from '../dilemmas/slots'
import { resolveDilemmaChoice as resolveChoiceEngine } from '../dilemmas/resolveChoice'
import { processDueDilemmaEffects } from '../dilemmas/processDelayed'
import { createRng } from '../random/createRng'
import { createSeed } from './ids'
import { clamp, clampCash, clampStat, clampStatFloat } from './clamp'
import {
  ageSponsorships,
  applyAnnualFinance,
  computeAnnualFinance,
  resolveContractForSeason,
} from './finance'
import {
  SEASON_OBJECTIVE_LABELS,
  OBJECTIVE_RESULT_LABELS,
} from './competition'
import {
  CONTENT_VERSION,
  DILEMMAS_PER_SEASON,
  ENGINE_VERSION,
  SEASON_CALENDAR_YEAR,
  SPORT_STAT_IDS,
} from './constants'
import {
  createPlayerCareerPackage,
  listDefaultFoundingChoices,
} from './createPlayerCareer'
import {
  deriveAttributes,
  deriveTrajectory,
  potentialLabelFromStars,
  type AttributeView,
  type Trajectory,
} from './careerQuality'
import { CAREER_STAGE_LABELS } from '../types/season'
import { buildSeasonProgression } from './progression'
import { trophyMeta } from './trophy'
import { advanceCareerSeason } from './applySeason'
import { isCareerReadOnly } from './createCareerPackage'
import {
  assertDilemmaInvariant,
  checkDilemmaInvariant,
  deriveClubStatus,
  getVisibleStats,
  seasonPhaseFromDilemmas,
} from './visibleStats'
import { simulateRivalSeason } from './npcs'
import { getCountryById } from '../../game-content/countries'
import {
  getMacroPosition,
  type MacroPositionId,
} from '../../game-content/macroPositions'
import { getClubById } from '../../game-content/clubs'
import { getPositionById } from '../../game-content/positions'
import { activeDilemmaCatalog } from '../../game-content/events/active'
import { careerSavePackageSchema } from './schemas'

const FALLBACK_ID = 'express_fallback_training'

export interface ExpressCareerInput {
  countryId: string
  macroPosition: MacroPositionId
  /** Genre de la carrière (défaut « male »). */
  gender?: GenderId
  seed?: string
  ownerId?: string | null
}

const CLUB_STATUS_LABELS: Record<string, string> = {
  academy: 'Académie',
  bench: 'Remplaçant',
  rotation: 'Rotation',
  starter: 'Titulaire',
  key_player: 'Joueur clé',
}

export interface CareerSummary {
  displayName: string
  countryId: string
  countryLabel: string
  macroPosition: string
  preciseRole: string
  preciseRoleLabel: string
  age: number
  seasonIndex: number
  clubId: string | null
  clubName: string
  clubStatus: string
  clubStatusLabel: string
  careerStage: string
  careerStageLabel: string
  dilemmasResolvedThisSeason: DilemmasResolvedThisSeason
  seasonsCompleted: number
  totalDilemmasResolved: number
  seasonLoopPhase: string
  provisionalLegacyScore: number
  finished: boolean
  visible: VisibleCareerStats
  /** Refonte UI — dérivés read-only (jamais de valeur cachée exacte). */
  potentialStars: number
  potentialLabel: string
  recruiterBlurb: string
  trajectory: Trajectory
  /** Évolution depuis le début de la saison courante. */
  niveauDeltaSeason: number
  reputationDeltaSeason: number
  /** ~6 attributs pertinents pour le poste (barres §5). */
  attributes: AttributeView[]
  /** Phase 7 — rival et personnages récurrents. */
  rival: {
    displayName: string
    age: number
    level: number
    reputation: number
    trophies: number
    clubName: string
    relation: number
  }
  /** Phase 2 — salaire, contrat, patrimoine (lecture seule). */
  finance: {
    weeklyWage: number
    contractWeeksRemaining: number | null
    contractSeasonsRemaining: number | null
    netWorth: number
    lastAnnualDelta: number
    lifestyle: LifestyleId
  }
}

function activeCatalog(): DilemmaDefinition[] {
  return activeDilemmaCatalog
}

function stampExpressFields(
  pkg: CareerSavePackage,
  input: {
    countryId: string
    macroPosition: MacroPositionId
    preciseRole: string
    creationMode: 'express' | 'legacy'
  },
): CareerSavePackage {
  const club = getClubById(pkg.snapshot.clubId ?? '')
  const state: CareerState = {
    ...pkg.snapshot.state,
    countryId: input.countryId,
    macroPosition: input.macroPosition,
    preciseRole: input.preciseRole,
    clubStatus: club?.isAcademy ? 'academy' : 'rotation',
    dilemmasResolvedThisSeason: 0,
    seasonsCompleted: 0,
    totalDilemmasResolved: 0,
    seasonLoopPhase: 'awaiting_dilemma_1',
    provisionalLegacyScore: 0,
    mode: 'express',
    phase: 'playing',
    flags: {
      ...pkg.snapshot.state.flags,
      createdVia: 'express',
      expressNarrative: true,
      seasonStartNiveau: getVisibleStats(pkg.snapshot.state).niveau,
    },
  }

  const next: CareerSavePackage = {
    ...pkg,
    schemaVersion: pkg.schemaVersion,
    snapshot: {
      ...pkg.snapshot,
      mode: 'express',
      engineVersion: ENGINE_VERSION,
      contentVersion: CONTENT_VERSION,
      state,
      legacyScore: 0,
    },
    playerProfile: {
      ...pkg.playerProfile,
      countryId: input.countryId,
      macroPosition: input.macroPosition,
      creationMode: input.creationMode,
      originId: input.countryId,
    },
  }

  assertDilemmaInvariant(next.snapshot.state)
  return careerSavePackageSchema.parse(next) as CareerSavePackage
}

/**
 * Crée une carrière narrative express : pays + poste macro uniquement.
 * Identité, rôle précis, club, stats = seed.
 */
export function createCareer(input: ExpressCareerInput): CareerSavePackage {
  const country = getCountryById(input.countryId)
  if (!country) throw new Error('Pays de départ invalide.')
  const macro = getMacroPosition(input.macroPosition)
  if (!macro) throw new Error('Poste invalide.')

  const seed = input.seed ?? createSeed()
  const gender: GenderId = input.gender ?? 'male'
  const rng = createRng(`${seed}:express-create`)
  const preciseRole = rng.pick([...macro.roles])
  // Prénom selon le genre (défaut masculin) ; noms de famille partagés.
  const firstNamePool =
    gender === 'female' ? country.firstNamesFemale : country.firstNames
  const firstName = rng.pick(firstNamePool)
  const lastName = rng.pick(country.lastNames)
  // Départ en club formateur : académies et clubs modestes uniquement.
  const startClubIds = country.clubIds.filter((id) => {
    const c = getClubById(id)
    return c ? c.isAcademy || c.competitionLevel <= 50 : false
  })
  const clubId = rng.pick(startClubIds.length > 0 ? startClubIds : country.clubIds)
  const age = rng.chance(0.5) ? 16 : 17
  const club = getClubById(clubId)

  const playstylesByMacro: Record<MacroPositionId, string[]> = {
    gk: ['anchor', 'duelist'],
    defender: ['duelist', 'anchor', 'pressing'],
    midfielder: ['architect', 'pressing', 'anchor'],
    attacker: ['finisher', 'pressing', 'architect'],
  }
  const playstylePool = playstylesByMacro[input.macroPosition]
  const playstyleId = rng.pick(playstylePool)
  const visualId = rng.pick(['slate', 'ember', 'tide', 'moss'] as const)

  const draft = {
    firstName,
    lastName,
    nickname: null as string | null,
    originId: country.originId,
    gender,
    birthYear: SEASON_CALENDAR_YEAR - age,
    primaryPosition: preciseRole,
    secondaryPosition: null as string | null,
    strongFoot: rng.pick(['left', 'right', 'both'] as const),
    heightCm: rng.randomInt(
      input.macroPosition === 'gk' ? 185 : 168,
      input.macroPosition === 'gk' ? 198 : 190,
    ),
    playstyleId,
    visualId,
    difficulty: 'balanced' as const,
    careerLength: 'standard' as const,
    foundingChoices: listDefaultFoundingChoices(),
    mode: 'express' as const,
    seed,
    ownerId: input.ownerId ?? null,
    clubId,
  }

  let pkg = createPlayerCareerPackage(draft)

  if (club) {
    pkg = {
      ...pkg,
      snapshot: {
        ...pkg.snapshot,
        state: {
          ...pkg.snapshot.state,
          clubInfrastructure: club.infrastructure,
          competitionLevel: club.competitionLevel,
        },
      },
    }
  }

  return stampExpressFields(pkg, {
    countryId: input.countryId,
    macroPosition: input.macroPosition,
    preciseRole,
    creationMode: 'express',
  })
}

/**
 * Prochain dilemme de la saison (max 2).
 * Priorité : conséquence narrative en file → tirage par emplacement → secours.
 * Emplacement 1 = priorité sportive ; emplacement 2 = priorité carrière.
 */
export function getNextDilemma(
  pkg: CareerSavePackage,
  catalog: DilemmaDefinition[] = activeCatalog(),
): DilemmaDefinition | null {
  if (isCareerFinished(pkg)) return null
  const prepared = processDueDilemmaEffects(pkg)
  const state = prepared.snapshot.state
  if (state.dilemmasResolvedThisSeason >= DILEMMAS_PER_SEASON) return null

  // Une conséquence importante remplace l’emplacement — le total reste à deux.
  const queuedId = state.flags.queuedDilemmaId
  if (typeof queuedId === 'string') {
    const queued = catalog.find((d) => d.id === queuedId)
    if (queued) return queued
  }

  const slot = (state.dilemmasResolvedThisSeason + 1) as SeasonSlot
  const rng = createRng(
    `${state.seed}:express-pick:${state.seasonIndex}:${state.dilemmasResolvedThisSeason}`,
  )
  const picked = pickDilemmaForSlot(
    catalog.filter((d) => d.id !== FALLBACK_ID),
    state,
    prepared.playerProfile,
    rng,
    slot,
  )
  if (picked) return picked

  const fallback = catalog.find((d) => d.id === FALLBACK_ID)
  if (fallback && isDilemmaEligible(fallback, state, prepared.playerProfile)) {
    return fallback
  }
  return fallback ?? catalog[0] ?? null
}

/** Variation d’une statistique visible après un choix (affichage UI). */
export interface VisibleStatDelta {
  id: keyof VisibleCareerStats
  delta: number
}

/** Variation d’un attribut sportif granulaire (surlignage attributs §5). */
export interface SportStatDelta {
  id: SportStatId
  delta: number
}

/**
 * Développement des compétences par les dilemmes (§5, §9).
 * Chaque décision fait progresser les stats-clés du poste. L'ampleur dépend de
 * l'effort du choix (posture), de la qualité de la décision (climat coach /
 * moral / forme) et du potentiel — bornée par le même plafond de potentiel que
 * la croissance saisonnière, pour que la légende reste méritée (talent + choix
 * réguliers) et non automatique.
 */
const EFFORT_BY_STANCE: Record<string, number> = {
  ambitious: 1.0,
  high_risk: 1.0,
  professional: 1.0,
  resilient: 0.9,
  individualist: 0.85,
  collective: 0.75,
  loyal: 0.7,
  ethical: 0.7,
  media_savvy: 0.7,
  prudent: 0.65,
  financial: 0.6,
  emotional: 0.6,
}

export function developPositionSkills(
  after: CareerState,
  before: CareerState,
  choice: { stance: string } | undefined,
): Record<SportStatId, number> {
  const potentiel = before.hiddenTraits.potentiel
  const effort = EFFORT_BY_STANCE[choice?.stance ?? 'prudent'] ?? 0.75
  const qualitySignal =
    after.resources.confianceEntraineur -
    before.resources.confianceEntraineur +
    (after.resources.moral - before.resources.moral) +
    (after.resources.forme - before.resources.forme)
  const qualityMul = clamp(1 + qualitySignal / 45, 0.4, 1.6)
  const potFactor = 0.7 + potentiel / 160
  const points = clamp(Math.round((0.9 + effort) * qualityMul * potFactor), 0, 5)
  if (points <= 0) return after.stats

  const role = getPositionById(before.preciseRole)
  const pool: SportStatId[] =
    role && role.keyStats.length > 0
      ? [...role.keyStats]
      : [...SPORT_STAT_IDS.slice(0, 4)]
  // Plafond souple adouci (Phase 13) ; accumulation fractionnaire préservée.
  const ceiling = clampStatFloat(50 + potentiel * 0.49)
  const rng = createRng(
    `${before.seed}:skill-dev:${before.seasonIndex}:${before.totalDilemmasResolved}`,
  )

  const next = { ...after.stats }
  let remaining = points
  let guard = 0
  while (remaining > 0 && guard < 24) {
    guard += 1
    const id = rng.pick(pool)
    if (next[id] >= ceiling) {
      // Au plafond de potentiel : marge de progression rare (jamais bloquée).
      if (rng.chance(0.3)) next[id] = clampStatFloat(next[id] + 0.6)
    } else {
      next[id] = clampStatFloat(next[id] + 1)
    }
    remaining -= 1
  }
  return next
}

function choiceHasHiddenConsequences(
  event: DilemmaDefinition,
  choiceId: string,
): boolean {
  const choice = event.choices.find((c) => c.id === choiceId)
  if (!choice) return false
  if (choice.delayed.length > 0) return true
  if (choice.hidden.length > 0) return true
  if ((choice.nextEventIds?.length ?? 0) > 0) return true
  return choice.immediate.some(
    (e) => e.type === 'queueEvent' || e.type === 'narrativeDebt',
  )
}

export function resolveDilemmaChoice(
  pkg: CareerSavePackage,
  event: DilemmaDefinition,
  choiceId: string,
): {
  package: CareerSavePackage
  log: DilemmaResolutionLog
  shouldCompleteSeason: boolean
  /** Variations visibles à afficher immédiatement (Niveau +2, Santé -5…). */
  visibleDeltas: VisibleStatDelta[]
  /** Variations d’attributs granulaires (surlignage des barres §5). */
  statDeltas: SportStatDelta[]
  /** Signale « conséquences plus tard » sans jamais révéler le futur. */
  hasHiddenConsequences: boolean
} {
  if (pkg.snapshot.state.dilemmasResolvedThisSeason >= DILEMMAS_PER_SEASON) {
    throw new Error('Deux dilemmes déjà résolus cette saison.')
  }

  const prepared = processDueDilemmaEffects(pkg)
  const visibleBefore = getVisibleStats(prepared.snapshot.state)
  const statsBefore = prepared.snapshot.state.stats
  const { package: resolved, log } = resolveChoiceEngine(
    prepared,
    event,
    choiceId,
  )

  const prev = resolved.snapshot.state.dilemmasResolvedThisSeason
  const nextCount = (prev + 1) as DilemmasResolvedThisSeason
  if (nextCount > 2) {
    throw new Error('Un troisième dilemme est interdit.')
  }

  // Les compétences progressent avec chaque dilemme (talent + effort + choix).
  const developedStats = developPositionSkills(
    resolved.snapshot.state,
    prepared.snapshot.state,
    event.choices.find((c) => c.id === choiceId),
  )

  const state: CareerState = {
    ...resolved.snapshot.state,
    stats: developedStats,
    dilemmasResolvedThisSeason: nextCount,
    totalDilemmasResolved: resolved.snapshot.state.totalDilemmasResolved + 1,
    seasonLoopPhase: seasonPhaseFromDilemmas(nextCount),
    clubStatus: deriveClubStatus({
      ...resolved.snapshot.state,
      dilemmasResolvedThisSeason: nextCount,
    }),
    provisionalLegacyScore: Math.round(
      resolved.snapshot.legacyScore +
        resolved.snapshot.state.resources.reputationSportive * 0.15 +
        nextCount,
    ),
    flags: {
      ...resolved.snapshot.state.flags,
    },
  }
  delete state.flags.queuedDilemmaId

  const nextPkg = careerSavePackageSchema.parse({
    ...resolved,
    snapshot: {
      ...resolved.snapshot,
      state,
      legacyScore: state.provisionalLegacyScore,
    },
  }) as CareerSavePackage

  assertDilemmaInvariant(nextPkg.snapshot.state)

  const visibleAfter = getVisibleStats(nextPkg.snapshot.state)
  const visibleDeltas: VisibleStatDelta[] = (
    Object.keys(visibleAfter) as Array<keyof VisibleCareerStats>
  )
    .map((id) => ({ id, delta: visibleAfter[id] - visibleBefore[id] }))
    .filter((d) => d.delta !== 0)

  const statsAfter = nextPkg.snapshot.state.stats
  const statDeltas: SportStatDelta[] = SPORT_STAT_IDS.map((id) => ({
    id,
    delta: statsAfter[id] - statsBefore[id],
  })).filter((d) => d.delta !== 0)

  return {
    package: nextPkg,
    log,
    shouldCompleteSeason: nextCount >= DILEMMAS_PER_SEASON,
    visibleDeltas,
    statDeltas,
    hasHiddenConsequences: choiceHasHiddenConsequences(event, choiceId),
  }
}

/** Simulation + bilan + reset compteur dilemmes pour la saison suivante. */
export function completeSeason(pkg: CareerSavePackage): {
  package: CareerSavePackage
  result: SeasonSimulationResult
} {
  if (pkg.snapshot.state.dilemmasResolvedThisSeason < DILEMMAS_PER_SEASON) {
    throw new Error(
      'La saison ne peut se terminer qu’après deux dilemmes résolus.',
    )
  }
  assertDilemmaInvariant(pkg.snapshot.state)

  const { package: advanced, result: rawResult } = advanceCareerSeason(pkg)
  const finished =
    advanced.snapshot.status === 'finished' ||
    advanced.snapshot.state.flags.wants_retirement === true ||
    advanced.snapshot.state.careerStage === 'carriere_terminee'

  // Carrière parallèle du rival — évolue chaque saison, peut marquer le bilan.
  const { rival, milestone } = simulateRivalSeason(
    advanced.snapshot.state.npcs.rival,
    advanced.snapshot.state.seed,
    rawResult.seasonIndex,
    rawResult.reputationAfter,
  )
  // Verdict d'objectif (Phase 9) : ajouté au résumé du bilan, sans écran ni choix.
  const lastEntry =
    advanced.snapshot.state.seasonTimeline[
      advanced.snapshot.state.seasonTimeline.length - 1
    ]
  const objectiveNote =
    lastEntry?.objective && lastEntry.objectiveResult
      ? ` Objectif « ${SEASON_OBJECTIVE_LABELS[lastEntry.objective].toLowerCase()} » : ${OBJECTIVE_RESULT_LABELS[lastEntry.objectiveResult].toLowerCase()}.`
      : ''
  const baseNarrative = milestone
    ? `${rawResult.narrativeSummary} ${milestone}`
    : rawResult.narrativeSummary
  const result = { ...rawResult, narrativeSummary: `${baseNarrative}${objectiveNote}` }

  // Fidélité : compteur de saisons au même club (remis à zéro au transfert).
  const prevTenure = pkg.snapshot.state.flags.clubTenure
  const clubTenure = result.autoTransfer
    ? 0
    : (typeof prevTenure === 'number' ? prevTenure : 0) + 1
  const prevMaxTenure =
    typeof pkg.snapshot.state.flags.maxClubTenure === 'number'
      ? pkg.snapshot.state.flags.maxClubTenure
      : 0
  const maxClubTenure = Math.max(prevMaxTenure, clubTenure)

  // Meilleur niveau atteint (bilan final).
  const niveauNow = getVisibleStats(advanced.snapshot.state).niveau
  const prevPeak =
    typeof pkg.snapshot.state.flags.peakLevel === 'number'
      ? pkg.snapshot.state.flags.peakLevel
      : 0
  const peakLevel = Math.max(prevPeak, niveauNow)

  // Sélections cumulées, dérivées des flags de sélection nationale.
  const prevCaps =
    typeof pkg.snapshot.state.flags.nationalCaps === 'number'
      ? pkg.snapshot.state.flags.nationalCaps
      : 0
  const capsGain =
    advanced.snapshot.state.flags.national_regular === true
      ? 7
      : advanced.snapshot.state.flags.national_capped === true
        ? 3
        : 0
  const nationalCaps = prevCaps + capsGain

  // Héritage : les trophées comptent, mais fidélité, vestiaire et public
  // rendent mémorable une carrière sans palmarès majeur.
  const relations = advanced.snapshot.state.relationships
  const legacyGain =
    result.reputationAfter * 0.15 +
    (result.progressionLabel === 'exceptionnelle' ? 10 : 3) +
    result.matchStats.trophies.length * 5 +
    (clubTenure >= 5 ? 3 : clubTenure >= 3 ? 1 : 0) +
    (relations.fans >= 70 ? 2 : 0) +
    (relations.family >= 70 ? 1 : 0) +
    (relations.teammates >= 70 ? 1 : 0) +
    // Phase 9 : le verdict d'objectif nourrit l'héritage, pondéré par le prestige.
    (lastEntry?.objectiveResult === 'saison_historique'
      ? 6
      : lastEntry?.objectiveResult === 'objectif_depasse'
        ? 3
        : lastEntry?.objectiveResult === 'echec_important'
          ? -2
          : 0)

  let state: CareerState = {
    ...advanced.snapshot.state,
    seasonsCompleted: pkg.snapshot.state.seasonsCompleted + 1,
    dilemmasResolvedThisSeason: 0,
    seasonLoopPhase: finished ? 'showing_bilan' : 'awaiting_dilemma_1',
    clubStatus: deriveClubStatus(advanced.snapshot.state),
    npcs: { ...advanced.snapshot.state.npcs, rival },
    flags: {
      ...advanced.snapshot.state.flags,
      clubTenure,
      maxClubTenure,
      peakLevel,
      nationalCaps,
      // Baseline pour l'affichage « Niveau +N cette saison » (§4).
      seasonStartNiveau: niveauNow,
    },
    provisionalLegacyScore: Math.round(
      advanced.snapshot.legacyScore + legacyGain,
    ),
  }

  // --- Phase 2 : contrats & finances ---
  // Salaire perçu pendant la saison écoulée (avant tout nouveau contrat).
  const wageThisSeason = pkg.snapshot.state.contract?.weeklyWage ?? 0
  const contractThisSeason = pkg.snapshot.state.contract
  const leagueLevel =
    getCountryById(state.countryId)?.leagueLevel ?? state.competitionLevel

  // Événement de contrat (hors transfert, déjà signé ce tour) : premier contrat
  // pro, prolongation en fin de contrat, ou renégociation après montée en statut.
  // Le salaire n'évolue qu'ici — jamais de hausse automatique annuelle.
  if (!result.autoTransfer) {
    const contractRng = createRng(`${state.seed}:contract:${result.seasonIndex}`)
    const resolution = resolveContractForSeason(state, {
      seasonIndex: state.seasonIndex,
      leagueLevel,
      renegotiationRoll: contractRng.randomInt(0, 100) / 100,
    })
    if (resolution) {
      state = {
        ...state,
        contract: resolution.contract,
        finances: {
          ...state.finances,
          cash: clampCash(state.finances.cash + resolution.signingBonus),
          weeklyWage: resolution.contract.weeklyWage,
        },
      }
    }
  }

  // Bilan financier annuel : revenus, dépenses, patrimoine.
  const annual = computeAnnualFinance({
    state,
    matchStats: result.matchStats,
    weeklyWageThisSeason: wageThisSeason,
    contractThisSeason,
    clubTenure,
  })
  state = applyAnnualFinance(state, annual)
  // Sponsors : décompte + expiration APRÈS paiement de la saison.
  state = ageSponsorships(state)
  // Aligne finances.weeklyWage sur le contrat courant (affichage).
  state = {
    ...state,
    finances: {
      ...state.finances,
      weeklyWage: state.contract?.weeklyWage ?? 0,
    },
  }

  // Retraite narrative / santé critique — uniquement après le 2e dilemme (déjà garanti)
  if (
    !finished &&
    (advanced.snapshot.state.flags.wants_retirement === true ||
      advanced.snapshot.state.resources.sante <= 12 ||
      (advanced.snapshot.state.age >= 33 &&
        getVisibleStats(advanced.snapshot.state).niveau < 38))
  ) {
    state = {
      ...state,
      phase: 'retired',
      careerStage: 'carriere_terminee',
      seasonLoopPhase: 'showing_bilan',
    }
  }

  assertDilemmaInvariant({
    ...state,
    // Pendant le bilan, total doit coller : seasonsCompleted déjà +1, dilemmes saison = 0
  })

  let nextPkg: CareerSavePackage = {
    ...advanced,
    snapshot: {
      ...advanced.snapshot,
      state,
      legacyScore: state.provisionalLegacyScore,
      status:
        state.careerStage === 'carriere_terminee' || state.phase === 'retired'
          ? 'finished'
          : advanced.snapshot.status,
      age: state.age,
      seasonIndex: state.seasonIndex,
    },
  }

  // Si wants_retirement, mark finished
  if (state.flags.wants_retirement === true) {
    nextPkg = {
      ...nextPkg,
      snapshot: {
        ...nextPkg.snapshot,
        status: 'finished',
        state: {
          ...nextPkg.snapshot.state,
          phase: 'retired',
          careerStage: 'carriere_terminee',
        },
      },
    }
  }

  nextPkg = careerSavePackageSchema.parse(nextPkg) as CareerSavePackage
  assertDilemmaInvariant(nextPkg.snapshot.state)

  // --- Phase 14 : digest de progression (données prêtes pour l'affichage) ---
  const beforeState = pkg.snapshot.state
  const afterState = nextPkg.snapshot.state
  const seasonFlags = afterState.flags
  const progression = buildSeasonProgression({
    statsBefore: result.statsBefore,
    statsAfter: result.statsAfter,
    positionId: beforeState.preciseRole,
    reputationBefore: result.reputationBefore,
    reputationAfter: result.reputationAfter,
    statusBefore: beforeState.clubStatus,
    statusAfter: afterState.clubStatus,
    salaryBefore: beforeState.contract?.weeklyWage ?? 0,
    salaryAfter: afterState.contract?.weeklyWage ?? 0,
    palmares: result.matchStats.trophies.filter((t) => trophyMeta(t).official),
    trajectory: deriveTrajectory(afterState),
    cause: {
      minutes: result.matchStats.minutes,
      averageRating: result.matchStats.averageRating,
      progressionLabel: result.progressionLabel,
      positionSwitch: seasonFlags.position_switch === true,
      returningFromInjury: seasonFlags.long_injury_last_season === true,
    },
  })

  return { package: nextPkg, result: { ...result, progression } }
}

/** Alias métier demandé. */
export function simulateSeason(pkg: CareerSavePackage) {
  return completeSeason(pkg)
}

export function getCareerSummary(pkg: CareerSavePackage): CareerSummary {
  const state = pkg.snapshot.state
  const country = getCountryById(state.countryId)
  const club = getClubById(state.clubId ?? '')
  const role = getPositionById(state.preciseRole)
  const visible = getVisibleStats(state)

  const seasonStartNiveau =
    typeof state.flags.seasonStartNiveau === 'number'
      ? state.flags.seasonStartNiveau
      : visible.niveau
  const lastTimeline = state.seasonTimeline[state.seasonTimeline.length - 1]
  const reputationBaseline = lastTimeline
    ? lastTimeline.reputationAfter
    : visible.reputation

  return {
    displayName: pkg.playerProfile.displayName,
    countryId: state.countryId,
    countryLabel: country?.label ?? state.countryId,
    macroPosition: state.macroPosition,
    preciseRole: state.preciseRole,
    preciseRoleLabel: role?.label ?? state.preciseRole,
    age: state.age,
    seasonIndex: state.seasonIndex,
    clubId: state.clubId,
    clubName: club?.name ?? 'Sans club',
    clubStatus: state.clubStatus,
    clubStatusLabel: CLUB_STATUS_LABELS[state.clubStatus] ?? state.clubStatus,
    careerStage: state.careerStage,
    careerStageLabel: CAREER_STAGE_LABELS[state.careerStage] ?? state.careerStage,
    dilemmasResolvedThisSeason: state.dilemmasResolvedThisSeason,
    seasonsCompleted: state.seasonsCompleted,
    totalDilemmasResolved: state.totalDilemmasResolved,
    seasonLoopPhase: state.seasonLoopPhase,
    provisionalLegacyScore: state.provisionalLegacyScore,
    finished: isCareerFinished(pkg),
    visible,
    potentialStars: pkg.playerProfile.potentialStars,
    potentialLabel: potentialLabelFromStars(pkg.playerProfile.potentialStars),
    recruiterBlurb: pkg.playerProfile.recruiterBlurb,
    trajectory: deriveTrajectory(state),
    niveauDeltaSeason: visible.niveau - seasonStartNiveau,
    reputationDeltaSeason: Math.round(visible.reputation - reputationBaseline),
    attributes: deriveAttributes(state.preciseRole, state.stats),
    rival: {
      displayName: state.npcs.rival.displayName,
      age: state.npcs.rival.age,
      level: state.npcs.rival.level,
      reputation: state.npcs.rival.reputation,
      trophies: state.npcs.rival.trophies,
      clubName: getClubById(state.npcs.rival.clubId ?? '')?.name ?? 'Sans club',
      relation: state.npcs.rival.relation,
    },
    finance: {
      weeklyWage: state.contract?.weeklyWage ?? state.finances.weeklyWage ?? 0,
      contractWeeksRemaining: state.contract?.weeksRemaining ?? null,
      contractSeasonsRemaining: state.contract
        ? Math.max(0, Math.round(state.contract.weeksRemaining / 52))
        : null,
      netWorth: state.wealth.current,
      lastAnnualDelta: state.wealth.lastAnnualDelta,
      lifestyle: state.lifestyle,
    },
  }
}

export function isCareerFinished(pkg: CareerSavePackage): boolean {
  return (
    isCareerReadOnly(pkg.snapshot) ||
    pkg.snapshot.state.phase === 'retired' ||
    pkg.snapshot.state.careerStage === 'carriere_terminee'
  )
}

export {
  assertDilemmaInvariant,
  checkDilemmaInvariant,
  getVisibleStats,
}
