import type { CareerState, GameMode, SportStatId } from '../types/career'
import { createRng } from '../random/createRng'
import {
  CAREER_LENGTH_SEASONS,
  DEFAULT_START_AGE,
  DEFAULT_START_SEASON,
} from './constants'
import { clampRelation, clampStat } from './clamp'
import { createNpcs } from './npcs'
import { initialWealth } from './finance'
import {
  emptyHiddenTraits,
  emptyResources,
  emptySportStats,
} from './playerCreationTypes'

/** État technique de secours (atelier) — profil minimal jouable. */
export function createEmptyCareerState(input: {
  seed: string
  mode: GameMode
  clubId?: string | null
}): CareerState {
  const rng = createRng(input.seed)
  const stats = emptySportStats(40)
  for (const key of Object.keys(stats) as SportStatId[]) {
    stats[key] = clampStat(rng.randomInt(36, 50))
  }
  const resources = emptyResources()
  const hidden = emptyHiddenTraits()
  hidden.potentiel = clampStat(rng.randomInt(50, 75))

  return {
    seed: input.seed,
    mode: input.mode,
    seasonIndex: DEFAULT_START_SEASON,
    chapterId: null,
    phase: 'setup',
    careerStage: 'creation',
    age: DEFAULT_START_AGE,
    clubId: input.clubId ?? null,
    contract: null,
    agentId: 'loyal',
    stats,
    resources,
    hiddenTraits: hidden,
    flags: {
      guest: true,
      technicalShell: true,
    },
    pendingEffects: [],
    finances: {
      cash: 500,
      weeklyWage: 0,
      investments: [],
    },
    lifestyle: 'modeste',
    wealth: initialWealth(500, 0),
    sponsorships: [],
    relationships: {
      coach: clampRelation(50),
      teammates: clampRelation(50),
      family: clampRelation(70),
      friends: clampRelation(60),
      partner: 0,
      media: clampRelation(20),
      fans: clampRelation(15),
      sponsors: clampRelation(10),
    },
    maxSeasons: CAREER_LENGTH_SEASONS.standard,
    estimatedValue: 180_000,
    injuryWeeksRemaining: 0,
    clubInfrastructure: 42,
    competitionLevel: 38,
    seasonTimeline: [],
    rngState: rng.getState(),
    countryId: 'cote-brumeuse',
    macroPosition: 'midfielder',
    preciseRole: 'cm',
    clubStatus: 'academy',
    dilemmasResolvedThisSeason: 0,
    seasonsCompleted: 0,
    totalDilemmasResolved: 0,
    seasonLoopPhase: 'awaiting_dilemma_1',
    provisionalLegacyScore: 0,
    npcs: createNpcs({
      seed: input.seed,
      countryId: 'cote-brumeuse',
      preciseRole: 'cm',
      age: DEFAULT_START_AGE,
    }),
  }
}
