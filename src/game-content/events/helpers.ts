import type {
  DilemmaChoiceDefinition,
  DilemmaCondition,
  DilemmaDefinition,
  DilemmaEffect,
} from '../../game-engine/dilemmas'
import type { CareerStageId } from '../../game-engine/types/career'
import type {
  HiddenTraitId,
  RelationshipId,
  ResourceId,
  SportStatId,
} from '../../game-engine/types/career'

type DilemmaInput = Omit<
  DilemmaDefinition,
  | 'version'
  | 'tags'
  | 'positions'
  | 'careerStages'
  | 'prerequisites'
  | 'exclusions'
  | 'cooldownSeasons'
  | 'unique'
  | 'expiresAtSeason'
  | 'followUpEventIds'
> & {
  version?: number
  tags?: string[]
  positions?: string[] | null
  careerStages?: CareerStageId[] | null
  prerequisites?: DilemmaCondition[]
  exclusions?: DilemmaCondition[]
  cooldownSeasons?: number
  unique?: boolean
  expiresAtSeason?: number | null
  followUpEventIds?: string[]
}

type ChoiceInput = Pick<
  DilemmaChoiceDefinition,
  'id' | 'label' | 'stance' | 'riskPreview'
> &
  Partial<
    Pick<
      DilemmaChoiceDefinition,
      'immediate' | 'delayed' | 'hidden' | 'nextEventIds'
    >
  >

/** Helper avec valeurs par défaut pour construire un dilemme data-driven. */
export function dilemma(input: DilemmaInput): DilemmaDefinition {
  return {
    version: 1,
    tags: [],
    positions: null,
    careerStages: null,
    prerequisites: [],
    exclusions: [],
    cooldownSeasons: 3,
    unique: false,
    expiresAtSeason: null,
    followUpEventIds: [],
    ...input,
  }
}

/** Helper pour un choix avec tableaux d'effets vides par défaut. */
export function choice(input: ChoiceInput): DilemmaChoiceDefinition {
  return {
    immediate: [],
    delayed: [],
    hidden: [],
    ...input,
  }
}

/** Raccourcis d'effets pour alléger le catalogue. */
export const fx = {
  stat(id: SportStatId, delta: number): DilemmaEffect {
    return { type: 'delta', target: { kind: 'stat', id }, delta }
  },
  res(id: ResourceId, delta: number): DilemmaEffect {
    return { type: 'delta', target: { kind: 'resource', id }, delta }
  },
  /** Alias lisible. */
  resource(id: ResourceId, delta: number): DilemmaEffect {
    return fx.res(id, delta)
  },
  hidden(id: HiddenTraitId, delta: number): DilemmaEffect {
    return { type: 'delta', target: { kind: 'hidden', id }, delta }
  },
  rel(id: RelationshipId, delta: number): DilemmaEffect {
    return { type: 'delta', target: { kind: 'relation', id }, delta }
  },
  relation(id: RelationshipId, delta: number): DilemmaEffect {
    return fx.rel(id, delta)
  },
  cash(delta: number): DilemmaEffect {
    return { type: 'delta', target: { kind: 'cash' }, delta }
  },
  flag(key: string, value: boolean | number | string = true): DilemmaEffect {
    return { type: 'setFlag', key, value }
  },
  setFlag(key: string, value: boolean | number | string = true): DilemmaEffect {
    return fx.flag(key, value)
  },
  removeFlag(key: string): DilemmaEffect {
    return { type: 'removeFlag', key }
  },
  queue(eventId: string, seasonOffset?: number): DilemmaEffect {
    return seasonOffset !== undefined
      ? { type: 'queueEvent', eventId, seasonOffset }
      : { type: 'queueEvent', eventId }
  },
  debt(debtId: string, label: string, dueSeasonOffset: number): DilemmaEffect {
    return { type: 'narrativeDebt', debtId, label, dueSeasonOffset }
  },
  narrativeDebt(
    debtId: string,
    label: string,
    dueSeasonOffset: number,
  ): DilemmaEffect {
    return fx.debt(debtId, label, dueSeasonOffset)
  },
  chance(probability: number, effects: DilemmaEffect[]): DilemmaEffect {
    return { type: 'chance', probability, effects }
  },
  skillCheck(
    pool: 'stat' | 'resource' | 'hidden',
    id: string,
    difficulty: number,
    onSuccess: DilemmaEffect[],
    onFail: DilemmaEffect[],
  ): DilemmaEffect {
    return { type: 'skillCheck', pool, id, difficulty, onSuccess, onFail }
  },
  delayed(seasonOffset: number, effects: DilemmaEffect[]): {
    seasonOffset: number
    effects: DilemmaEffect[]
  } {
    return { seasonOffset, effects }
  },
  // --- Phase 3 : agents, sponsors, investissements ---
  setAgent(agentId: string): DilemmaEffect {
    return { type: 'setAgent', agentId }
  },
  signSponsor(sponsor: {
    sponsorId: string
    name: string
    sector: import('../../game-engine/types/career').SponsorSectorId
    prestige: number
    annualPay: number
    durationSeasons: number
    imageTag: string
    reputationRisk: number
    exclusive: boolean
  }): DilemmaEffect {
    return { type: 'signSponsor', sponsor }
  },
  endSponsor(sponsorId?: string, reputationHit?: number): DilemmaEffect {
    return { type: 'endSponsor', sponsorId, reputationHit }
  },
  makeInvestment(investment: {
    investmentId: string
    label: string
    cost: number
    sector: string
  }): DilemmaEffect {
    return { type: 'makeInvestment', investment }
  },
}

type ChainEpisodeInput = Partial<DilemmaInput> &
  Pick<DilemmaInput, 'id' | 'title' | 'body' | 'choices'> & {
    previousEventId: string
  }

/** Épisode de chaîne narrative (poids très bas, unique, prérequis seen). */
export function chainEpisode(input: ChainEpisodeInput): DilemmaDefinition {
  const { previousEventId, prerequisites, ageMin, ageMax, ...rest } = input
  return dilemma({
    ...rest,
    rarity: rest.rarity ?? 'uncommon',
    ageMin: ageMin ?? 16,
    ageMax: ageMax ?? 40,
    category: 'narrative_chain',
    weight: 0.5,
    unique: true,
    prerequisites: [
      { type: 'hasFlag', key: `seen:${previousEventId}` },
      ...(prerequisites ?? []),
    ],
  })
}
