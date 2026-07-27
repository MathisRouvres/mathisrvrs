import type {
  CareerStageId,
  HiddenTraitId,
  NpcId,
  RelationshipId,
  ResourceId,
  SponsorSectorId,
  SportStatId,
} from '../types/career'

export const DILEMMA_CATEGORIES = [
  'training',
  'match',
  'coach',
  'teammates',
  'rivalry',
  'transfer',
  'contract',
  'agent',
  'media',
  'fans',
  'sponsors',
  'family',
  'lifestyle',
  'injury',
  'mental',
  'money',
  'national_team',
  'career_end',
  'narrative_chain',
] as const

export type DilemmaCategory = (typeof DILEMMA_CATEGORIES)[number]

export const DILEMMA_RARITIES = ['common', 'uncommon', 'rare', 'legendary'] as const
export type DilemmaRarity = (typeof DILEMMA_RARITIES)[number]

export const CHOICE_STANCES = [
  'prudent',
  'ambitious',
  'loyal',
  'individualist',
  'financial',
  'emotional',
  'ethical',
  'high_risk',
  'collective',
  'professional',
  'media_savvy',
  'resilient',
] as const
export type ChoiceStance = (typeof CHOICE_STANCES)[number]

export type EffectTarget =
  | { kind: 'stat'; id: SportStatId }
  | { kind: 'resource'; id: ResourceId }
  | { kind: 'hidden'; id: HiddenTraitId }
  | { kind: 'relation'; id: RelationshipId }
  | { kind: 'cash' }
  | { kind: 'flag'; key: string }

/** Opérations d’effet (immédiates, retardées ou cachées). */
export type DilemmaEffect =
  | { type: 'delta'; target: EffectTarget; delta: number }
  | { type: 'setFlag'; key: string; value: boolean | number | string }
  | { type: 'removeFlag'; key: string }
  | {
      type: 'narrativeDebt'
      debtId: string
      label: string
      dueSeasonOffset: number
    }
  | {
      type: 'queueEvent'
      eventId: string
      seasonOffset?: number
    }
  | {
      type: 'skillCheck'
      pool: 'stat' | 'resource' | 'hidden'
      id: string
      difficulty: number
      onSuccess: DilemmaEffect[]
      onFail: DilemmaEffect[]
    }
  | {
      type: 'chance'
      probability: number
      effects: DilemmaEffect[]
    }
  // --- Phase 3 : agents, sponsors, investissements ---
  | { type: 'setAgent'; agentId: string }
  | {
      type: 'signSponsor'
      sponsor: {
        sponsorId: string
        name: string
        sector: SponsorSectorId
        prestige: number
        annualPay: number
        durationSeasons: number
        imageTag: string
        reputationRisk: number
        exclusive: boolean
      }
    }
  | { type: 'endSponsor'; sponsorId?: string; reputationHit?: number }
  | {
      type: 'makeInvestment'
      investment: {
        investmentId: string
        label: string
        cost: number
        sector: string
      }
    }

export type DilemmaCondition =
  | { type: 'minAge'; value: number }
  | { type: 'maxAge'; value: number }
  | { type: 'hasFlag'; key: string; equals?: boolean | number | string }
  | { type: 'missingFlag'; key: string }
  | { type: 'minResource'; id: ResourceId; value: number }
  | { type: 'maxResource'; id: ResourceId; value: number }
  | { type: 'minStat'; id: SportStatId; value: number }
  | { type: 'minHidden'; id: HiddenTraitId; value: number }
  | { type: 'minRelation'; id: RelationshipId; value: number }
  | { type: 'careerStage'; stages: CareerStageId[] }
  | { type: 'position'; ids: string[] }
  | { type: 'minMinutesLastSeason'; value: number }
  | { type: 'maxMinutesLastSeason'; value: number }
  | { type: 'hasDebt'; debtId: string }
  | { type: 'missingDebt'; debtId: string }
  | { type: 'country'; ids: string[] }
  | { type: 'minRivalRelation'; value: number }
  | { type: 'maxRivalRelation'; value: number }
  // Relation avec un personnage récurrent (Phase 7 — mémoire/personnages).
  | { type: 'minNpcRelation'; npc: NpcId; value: number }
  | { type: 'maxNpcRelation'; npc: NpcId; value: number }

export interface DilemmaChoiceDefinition {
  id: string
  label: string
  stance: ChoiceStance
  /** Aperçu partiel des risques — jamais exhaustif. */
  riskPreview: string
  immediate: DilemmaEffect[]
  delayed: Array<{ seasonOffset: number; effects: DilemmaEffect[] }>
  hidden: DilemmaEffect[]
  /** Chaîne narrative optionnelle. */
  nextEventIds?: string[]
}

export interface DilemmaDefinition {
  id: string
  version: number
  title: string
  body: string
  category: DilemmaCategory
  tags: string[]
  rarity: DilemmaRarity
  weight: number
  ageMin: number
  ageMax: number
  positions: string[] | null
  careerStages: CareerStageId[] | null
  prerequisites: DilemmaCondition[]
  exclusions: DilemmaCondition[]
  cooldownSeasons: number
  unique: boolean
  expiresAtSeason: number | null
  choices: DilemmaChoiceDefinition[]
  followUpEventIds: string[]
  /**
   * Échos du passé (Phase 7) : si `flag` est posé, la mention `text` est
   * affichée pour rappeler le choix d’origine. {years} = saisons écoulées.
   */
  echoes?: Array<{ flag: string; text: string }>
}

export interface DilemmaResolutionLog {
  eventId: string
  choiceId: string
  appliedImmediate: string[]
  appliedHidden: string[]
  queuedDelayed: number
  skillChecks: Array<{ id: string; passed: boolean }>
  narrative: string
}
