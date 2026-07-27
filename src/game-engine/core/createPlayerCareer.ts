import {
  foundingCategories,
  getFoundingOption,
} from '../../game-content/founding'
import { getOriginById, origins } from '../../game-content/origins'
import { getPlaystyleById, playstyles } from '../../game-content/playstyles'
import { getPositionById, positions } from '../../game-content/positions'
import { getVisualById, visuals } from '../../game-content/visuals'
import { createRng, type SeededRng } from '../random/createRng'
import type {
  CareerSavePackage,
  CareerState,
  HiddenTraitId,
  PlayerProfile,
  ResourceId,
  SportStatId,
} from '../types'
import {
  CAREER_LENGTH_SEASONS,
  CONTENT_VERSION,
  ENGINE_VERSION,
  SAVE_SCHEMA_VERSION,
  SEASON_CALENDAR_YEAR,
  SPORT_STAT_IDS,
} from './constants'
import {
  clampCash,
  clampHidden,
  clampRelation,
  clampResource,
  clampStat,
} from './clamp'
import { createId, createSeed, nowIso } from './ids'
import { createNpcs } from './npcs'
import { initialWealth } from './finance'
import {
  assertDraftBasics,
  emptyHiddenTraits,
  emptyResources,
  emptySportStats,
  SPORT_STAT_LABELS,
  type PlayerCreationDraft,
  type PlayerSummaryCard,
} from './playerCreationTypes'
import { careerSavePackageSchema } from './schemas'

function applyDeltaMap<T extends string>(
  target: Record<T, number>,
  deltas: Partial<Record<T, number>> | undefined,
  clampFn: (n: number) => number,
): void {
  if (!deltas) return
  for (const [key, delta] of Object.entries(deltas) as Array<[T, number]>) {
    if (typeof delta !== 'number') continue
    target[key] = clampFn((target[key] ?? 0) + delta)
  }
}

function difficultyModifiers(difficulty: PlayerCreationDraft['difficulty']): {
  sport: number
  hiddenPotential: number
  resourceStress: number
} {
  switch (difficulty) {
    case 'story':
      return { sport: 4, hiddenPotential: 3, resourceStress: -4 }
    case 'demanding':
      return { sport: -3, hiddenPotential: 2, resourceStress: 6 }
    default:
      return { sport: 0, hiddenPotential: 0, resourceStress: 0 }
  }
}

function heightModifiers(heightCm: number): Partial<Record<SportStatId, number>> {
  if (heightCm >= 188) return { puissance: 3, vitesse: -2, placement: 1 }
  if (heightCm <= 172) return { vitesse: 3, dribble: 2, puissance: -2 }
  return {}
}

function starsFromPotential(potentiel: number): number {
  if (potentiel >= 88) return 5
  if (potentiel >= 78) return 4
  if (potentiel >= 66) return 3
  if (potentiel >= 52) return 2
  return 1
}

function recruiterBlurb(stars: number, positionLabel: string, rng: SeededRng): string {
  const lines = [
    `Profil ${positionLabel.toLowerCase()} à suivre — lecture encore floue.`,
    `Des signes encourageants à ce poste de ${positionLabel.toLowerCase()}.`,
    `Potentiel intéressant : le plafond reste à confirmer.`,
    `Un dossier solide, sans garantie de sommet.`,
    `Très haut plafond possible — beaucoup dépendra du parcours.`,
  ]
  const idx = clampStat(stars) - 1
  const base = lines[Math.min(Math.max(idx, 0), lines.length - 1)] as string
  const extras = [
    'Le staff académie reste prudent.',
    'Quelques détails techniques déjà aboutis.',
    'La tête semble prête pour la concurrence.',
  ]
  return `${base} ${rng.pick(extras)}`
}

export function buildDisplayName(
  firstName: string,
  lastName: string,
  nickname?: string | null,
): string {
  const nick = nickname?.trim()
  if (nick) return `${firstName.trim()} « ${nick} » ${lastName.trim()}`
  return `${firstName.trim()} ${lastName.trim()}`
}

export function computePlayerBundle(draft: PlayerCreationDraft): {
  profile: Omit<PlayerProfile, 'id' | 'createdAt'>
  statePartial: Pick<
    CareerState,
    | 'stats'
    | 'resources'
    | 'hiddenTraits'
    | 'finances'
    | 'relationships'
    | 'age'
    | 'maxSeasons'
    | 'mode'
  >
  summary: PlayerSummaryCard
  personalityTraits: string[]
} {
  assertDraftBasics(draft)
  const seed = draft.seed ?? createSeed()
  const rng = createRng(`${seed}:creation`)

  const position = getPositionById(draft.primaryPosition)
  if (!position) throw new Error('Poste principal invalide.')
  if (draft.secondaryPosition && !getPositionById(draft.secondaryPosition)) {
    throw new Error('Poste secondaire invalide.')
  }
  const origin = getOriginById(draft.originId)
  if (!origin) throw new Error('Origine invalide.')
  const playstyle = getPlaystyleById(draft.playstyleId)
  if (!playstyle) throw new Error('Profil de jeu invalide.')
  if (!getVisualById(draft.visualId)) throw new Error('Identité visuelle invalide.')

  for (const category of foundingCategories) {
    const optionId = draft.foundingChoices[category.id]
    if (!optionId || !getFoundingOption(category.id, optionId)) {
      throw new Error(`Choix fondateur manquant : ${category.id}`)
    }
  }

  const stats = emptySportStats(40)
  for (const id of SPORT_STAT_IDS) {
    stats[id] = clampStat(rng.randomInt(34, 48))
  }

  const resources = emptyResources()
  const hidden = emptyHiddenTraits()
  hidden.potentiel = clampHidden(rng.randomInt(48, 86))

  applyDeltaMap(stats, position.baseBoosts, clampStat)
  applyDeltaMap(stats, playstyle.deltas, clampStat)
  applyDeltaMap(stats, heightModifiers(draft.heightCm), clampStat)

  const secondary = draft.secondaryPosition
    ? getPositionById(draft.secondaryPosition)
    : undefined
  if (secondary) {
    for (const [key, value] of Object.entries(secondary.baseBoosts)) {
      stats[key as SportStatId] = clampStat(
        stats[key as SportStatId] + Math.round((value as number) * 0.35),
      )
    }
  }

  const traits: string[] = []
  let cash = 500

  for (const category of foundingCategories) {
    const optionId = draft.foundingChoices[category.id] as string
    const option = getFoundingOption(category.id, optionId)
    if (!option) continue
    applyDeltaMap(stats, option.sportDeltas, clampStat)
    applyDeltaMap(resources, option.resourceDeltas, clampResource)
    applyDeltaMap(hidden, option.hiddenDeltas, clampHidden)
    if (option.cashDelta) cash = clampCash(cash + option.cashDelta)
    if (option.traits) traits.push(...option.traits)
  }

  const diff = difficultyModifiers(draft.difficulty)
  for (const id of SPORT_STAT_IDS) {
    stats[id] = clampStat(stats[id] + diff.sport)
  }
  hidden.potentiel = clampHidden(hidden.potentiel + diff.hiddenPotential)
  resources.fatigue = clampResource(resources.fatigue + diff.resourceStress)
  resources.bienEtre = clampResource(resources.bienEtre - Math.floor(diff.resourceStress / 2))

  // Garde-fous jouabilité : aucune stat clé à 1, fatigue/santé viables
  for (const keyStat of position.keyStats) {
    stats[keyStat] = clampStat(Math.max(stats[keyStat], 28))
  }
  resources.sante = clampResource(Math.max(resources.sante, 35))
  resources.forme = clampResource(Math.max(resources.forme, 35))
  resources.fatigue = clampResource(Math.min(resources.fatigue, 75))

  const age = SEASON_CALENDAR_YEAR - draft.birthYear
  const potentialStars = starsFromPotential(hidden.potentiel)
  const displayName = buildDisplayName(draft.firstName, draft.lastName, draft.nickname)
  const blurb = recruiterBlurb(potentialStars, position.label, rng)

  const ranked = [...SPORT_STAT_IDS]
    .map((id) => ({ id, value: stats[id], label: SPORT_STAT_LABELS[id] }))
    .sort((a, b) => b.value - a.value)

  const strengths = ranked.slice(0, 3).map((s) => s.label)
  const weaknesses = ranked.slice(-3).reverse().map((s) => s.label)

  const foundingLabels = foundingCategories.map((category) => {
    const optionId = draft.foundingChoices[category.id] as string
    const option = getFoundingOption(category.id, optionId)
    return `${category.title} : ${option?.label ?? optionId}`
  })

  const mode =
    draft.mode ??
    (draft.careerLength === 'short'
      ? 'express'
      : draft.careerLength === 'long'
        ? 'immersion'
        : 'standard')

  return {
    personalityTraits: traits,
    profile: {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      nickname: draft.nickname?.trim() ? draft.nickname.trim() : null,
      displayName,
      originId: draft.originId,
      countryId: draft.originId,
      gender: draft.gender ?? 'male',
      birthYear: draft.birthYear,
      primaryPosition: draft.primaryPosition,
      secondaryPosition: draft.secondaryPosition ?? null,
      macroPosition:
        draft.primaryPosition === 'gk'
          ? 'gk'
          : draft.primaryPosition === 'cb' || draft.primaryPosition === 'fb'
            ? 'defender'
            : draft.primaryPosition === 'winger' ||
                draft.primaryPosition === 'st'
              ? 'attacker'
              : 'midfielder',
      strongFoot: draft.strongFoot,
      heightCm: draft.heightCm,
      playstyleId: draft.playstyleId,
      visualId: draft.visualId,
      difficulty: draft.difficulty,
      careerLength: draft.careerLength,
      foundingChoices: { ...draft.foundingChoices },
      preferredPositions: [
        draft.primaryPosition,
        ...(draft.secondaryPosition ? [draft.secondaryPosition] : []),
      ],
      personalityTraits: traits,
      hometownRegion: origin.region,
      potentialStars,
      recruiterBlurb: blurb,
      creationMode: draft.mode === 'express' ? 'express' : 'legacy',
    },
    statePartial: {
      stats,
      resources,
      hiddenTraits: hidden,
      finances: {
        cash,
        weeklyWage: 0,
        investments: [],
      },
      relationships: {
        coach: clampRelation(resources.confianceEntraineur),
        teammates: clampRelation(resources.cohesionVestiaire),
        family: clampRelation(58),
        friends: clampRelation(52),
        partner: 0,
        media: clampRelation(Math.floor(resources.popularite * 0.6)),
        fans: clampRelation(Math.floor(resources.popularite * 0.5)),
        sponsors: clampRelation(8),
      },
      age,
      maxSeasons: CAREER_LENGTH_SEASONS[draft.careerLength],
      mode,
    },
    summary: {
      displayName,
      positionLabel: position.label,
      originLabel: origin.label,
      age,
      heightCm: draft.heightCm,
      strongFoot: draft.strongFoot,
      playstyleLabel: playstyle.label,
      visualId: draft.visualId,
      difficulty: draft.difficulty,
      careerLength: draft.careerLength,
      potentialStars,
      recruiterBlurb: blurb,
      strengths,
      weaknesses,
      foundingLabels,
      topVisibleStats: ranked.slice(0, 5),
    },
  }
}

function buildOpeningEvents(
  careerId: string,
  draft: PlayerCreationDraft,
  seed: string,
  seasonIndex: number,
): CareerSavePackage['journal']['events'] {
  const rng = createRng(`${seed}:opening-events`)
  const now = nowIso()
  const origin = getOriginById(draft.originId)
  const position = getPositionById(draft.primaryPosition)
  const social = getFoundingOption(
    'social_origin',
    draft.foundingChoices.social_origin ?? '',
  )
  const path = getFoundingOption(
    'football_path',
    draft.foundingChoices.football_path ?? '',
  )

  const templates = [
    {
      type: 'arrival_academy',
      payload: {
        title: 'Premiers pas à l’académie',
        body: `Tu arrives à l’Académie Northwind depuis ${origin?.label ?? 'ta région'}. Le staff note ton profil ${position?.label ?? ''}.`,
      },
    },
    {
      type: 'origin_echo',
      payload: {
        title: 'Ce que tu emportes',
        body: social
          ? `${social.summary} Les premiers regards du vestiaire se forgent déjà.`
          : 'Ton bagage personnel colore déjà les premières semaines.',
      },
    },
    {
      type: 'training_path',
      payload: {
        title: 'Sur le terrain d’entraînement',
        body: path
          ? `Ta formation (${path.label.toLowerCase()}) se voit dans tes automatismes — avantages et angles morts inclus.`
          : 'Les séances révèlent vite tes automatismes.',
      },
    },
  ]

  const count = rng.randomInt(2, 3)
  const picked = rng.shuffle(templates).slice(0, count)

  return picked.map((tpl) => ({
    id: createId('event'),
    careerId,
    eventDefinitionId: null,
    type: tpl.type,
    seasonIndex,
    createdAt: now,
    payload: tpl.payload,
    resolved: false,
    resolutionDecisionId: null,
  }))
}

export function createPlayerCareerPackage(
  draft: PlayerCreationDraft,
): CareerSavePackage {
  const seed = draft.seed ?? createSeed()
  const draftWithSeed = { ...draft, seed }
  const built = computePlayerBundle(draftWithSeed)
  const rng = createRng(seed)
  // Avance le RNG création déjà consommé via un sous-seed dédié ; état de jeu = seed carrière.
  const gameRng = createRng(`${seed}:runtime`)
  const now = nowIso()
  const careerId = createId('career')
  const profileId = createId('profile')
  const clubId = draft.clubId ?? 'academy-northwind'

  const state: CareerState = {
    seed,
    mode: built.statePartial.mode,
    seasonIndex: 1,
    chapterId: 'preseason',
    phase: 'playing',
    careerStage: 'centre_formation',
    age: built.statePartial.age,
    clubId,
    contract: {
      weeksRemaining: 52 * 2,
      weeklyWage: 0,
    },
    agentId: 'loyal',
    stats: built.statePartial.stats,
    resources: built.statePartial.resources,
    hiddenTraits: built.statePartial.hiddenTraits,
    flags: {
      guest: draft.ownerId == null,
      createdVia: draft.seed?.startsWith('quick:') ? 'quick' : 'guided',
      technicalShell: false,
    },
    pendingEffects: [],
    finances: built.statePartial.finances,
    lifestyle: 'modeste',
    wealth: initialWealth(built.statePartial.finances.cash, 0),
    sponsorships: [],
    relationships: built.statePartial.relationships,
    maxSeasons: built.statePartial.maxSeasons,
    estimatedValue: Math.round(
      120_000 + built.statePartial.hiddenTraits.potentiel * 4_000,
    ),
    injuryWeeksRemaining: 0,
    clubInfrastructure: clubId === 'academy-northwind' ? 48 : 55,
    competitionLevel: clubId === 'academy-northwind' ? 36 : 50,
    seasonTimeline: [],
    rngState: gameRng.getState(),
    countryId: built.profile.countryId,
    macroPosition: built.profile.macroPosition,
    preciseRole: draft.primaryPosition,
    clubStatus: built.statePartial.age <= 17 ? 'academy' : 'rotation',
    dilemmasResolvedThisSeason: 0,
    seasonsCompleted: 0,
    totalDilemmasResolved: 0,
    seasonLoopPhase: 'awaiting_dilemma_1',
    provisionalLegacyScore: 0,
    npcs: createNpcs({
      seed,
      countryId: built.profile.countryId,
      preciseRole: draft.primaryPosition,
      age: built.statePartial.age,
    }),
  }

  // Conserve une empreinte déterministe liée à la seed création
  void rng

  const playerProfile: PlayerProfile = {
    id: profileId,
    createdAt: now,
    ...built.profile,
  }

  const events = buildOpeningEvents(careerId, draftWithSeed, seed, state.seasonIndex)

  const pkg: CareerSavePackage = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    snapshot: {
      id: careerId,
      ownerId: draft.ownerId ?? null,
      seed,
      engineVersion: ENGINE_VERSION,
      contentVersion: CONTENT_VERSION,
      mode: state.mode,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      age: state.age,
      seasonIndex: state.seasonIndex,
      clubId: state.clubId,
      state,
      legacyScore: 0,
      saveSchemaVersion: SAVE_SCHEMA_VERSION,
    },
    playerProfile,
    journal: {
      events,
      decisions: [],
      seasons: [
        {
          id: createId('season'),
          careerId,
          seasonIndex: state.seasonIndex,
          clubId: state.clubId,
          startedAt: now,
          endedAt: null,
          summary: { bootstrap: true, openingEvents: events.length },
        },
      ],
    },
  }

  return careerSavePackageSchema.parse(pkg) as CareerSavePackage
}

export function buildSummaryFromDraft(draft: PlayerCreationDraft): PlayerSummaryCard {
  return computePlayerBundle(draft).summary
}

export function quickGenerateDraft(seed = createSeed()): PlayerCreationDraft {
  const rng = createRng(`quick:${seed}`)
  const firstNames = [
    'Lina',
    'Noé',
    'Sacha',
    'Mira',
    'Eden',
    'Yanis',
    'Kael',
    'Iris',
  ]
  const lastNames = [
    'Varela',
    'Morin',
    'Dastin',
    'Eluard',
    'Kovac',
    'Neris',
    'Alves',
    'Quen',
  ]
  const foundingChoices: Record<string, string> = {}
  for (const category of foundingCategories) {
    foundingChoices[category.id] = rng.pick(category.options).id
  }
  const primary = rng.pick(positions)
  let secondary = rng.pick(positions)
  if (secondary.id === primary.id) {
    secondary = positions.find((p) => p.id !== primary.id) ?? primary
  }

  return {
    firstName: rng.pick(firstNames),
    lastName: rng.pick(lastNames),
    nickname: rng.chance(0.35) ? rng.pick(['Spark', 'Brume', 'Nox', 'Flux']) : null,
    originId: rng.pick(origins).id,
    birthYear: rng.randomInt(2005, 2009),
    primaryPosition: primary.id,
    secondaryPosition: rng.chance(0.55) ? secondary.id : null,
    strongFoot: rng.pick(['left', 'right', 'both'] as const),
    heightCm: rng.randomInt(168, 192),
    playstyleId: rng.pick(playstyles).id,
    visualId: rng.pick(visuals).id,
    difficulty: rng.pick(['story', 'balanced', 'demanding'] as const),
    careerLength: rng.pick(['short', 'standard', 'long'] as const),
    foundingChoices,
    seed: `quick:${seed}`,
  }
}

export function listDefaultFoundingChoices(): Record<string, string> {
  const choices: Record<string, string> = {}
  for (const category of foundingCategories) {
    choices[category.id] = category.options[1]?.id ?? category.options[0]!.id
  }
  return choices
}
