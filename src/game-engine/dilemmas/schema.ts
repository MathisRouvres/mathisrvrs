import { z } from 'zod'
import {
  CAREER_STAGES,
  HIDDEN_TRAIT_IDS,
  RELATION_MAX,
  RELATION_MIN,
  RESOURCE_IDS,
  RESOURCE_MAX,
  RESOURCE_MIN,
  SPONSOR_SECTORS,
  SPORT_STAT_IDS,
  STAT_MAX,
  STAT_MIN,
} from '../core/constants'
import {
  CHOICE_STANCES,
  DILEMMA_CATEGORIES,
  DILEMMA_RARITIES,
} from './types'

const sportStat = z.enum(SPORT_STAT_IDS)
const resourceId = z.enum(RESOURCE_IDS)
const hiddenId = z.enum(HIDDEN_TRAIT_IDS)
const relationId = z.enum([
  'coach',
  'teammates',
  'family',
  'friends',
  'partner',
  'media',
  'fans',
  'sponsors',
] as const)

const effectTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('stat'), id: sportStat }),
  z.object({ kind: z.literal('resource'), id: resourceId }),
  z.object({ kind: z.literal('hidden'), id: hiddenId }),
  z.object({ kind: z.literal('relation'), id: relationId }),
  z.object({ kind: z.literal('cash') }),
  z.object({ kind: z.literal('flag'), key: z.string().min(1) }),
])

export const dilemmaEffectSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('delta'),
      target: effectTargetSchema,
      delta: z.number().refine((n) => Number.isFinite(n), 'delta invalide'),
    }),
    z.object({
      type: z.literal('setFlag'),
      key: z.string().min(1),
      value: z.union([z.boolean(), z.number(), z.string()]),
    }),
    z.object({
      type: z.literal('removeFlag'),
      key: z.string().min(1),
    }),
    z.object({
      type: z.literal('narrativeDebt'),
      debtId: z.string().min(1),
      label: z.string().min(1),
      dueSeasonOffset: z.number().int().min(1).max(20),
    }),
    z.object({
      type: z.literal('queueEvent'),
      eventId: z.string().min(1),
      seasonOffset: z.number().int().min(0).max(20).optional(),
    }),
    z.object({
      type: z.literal('skillCheck'),
      pool: z.enum(['stat', 'resource', 'hidden']),
      id: z.string().min(1),
      difficulty: z.number().min(1).max(99),
      onSuccess: z.array(dilemmaEffectSchema),
      onFail: z.array(dilemmaEffectSchema),
    }),
    z.object({
      type: z.literal('chance'),
      probability: z.number().min(0).max(1),
      effects: z.array(dilemmaEffectSchema),
    }),
    // --- Phase 3 : agents, sponsors, investissements ---
    z.object({
      type: z.literal('setAgent'),
      agentId: z.string().min(1),
    }),
    z.object({
      type: z.literal('signSponsor'),
      sponsor: z.object({
        sponsorId: z.string().min(1),
        name: z.string().min(1),
        sector: z.enum(SPONSOR_SECTORS),
        prestige: z.number().min(1).max(99),
        annualPay: z.number().min(0),
        durationSeasons: z.number().int().min(1).max(6),
        imageTag: z.string().min(1),
        reputationRisk: z.number().min(0).max(100),
        exclusive: z.boolean(),
      }),
    }),
    z.object({
      type: z.literal('endSponsor'),
      sponsorId: z.string().min(1).optional(),
      reputationHit: z.number().min(0).max(100).optional(),
    }),
    z.object({
      type: z.literal('makeInvestment'),
      investment: z.object({
        investmentId: z.string().min(1),
        label: z.string().min(1),
        cost: z.number().min(0),
        sector: z.string().min(1),
      }),
    }),
  ]),
)

const conditionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('minAge'), value: z.number().int() }),
  z.object({ type: z.literal('maxAge'), value: z.number().int() }),
  z.object({
    type: z.literal('hasFlag'),
    key: z.string(),
    equals: z.union([z.boolean(), z.number(), z.string()]).optional(),
  }),
  z.object({ type: z.literal('missingFlag'), key: z.string() }),
  z.object({ type: z.literal('minResource'), id: resourceId, value: z.number() }),
  z.object({ type: z.literal('maxResource'), id: resourceId, value: z.number() }),
  z.object({ type: z.literal('minStat'), id: sportStat, value: z.number() }),
  z.object({ type: z.literal('minHidden'), id: hiddenId, value: z.number() }),
  z.object({ type: z.literal('minRelation'), id: relationId, value: z.number() }),
  z.object({
    type: z.literal('careerStage'),
    stages: z.array(z.enum(CAREER_STAGES)).min(1),
  }),
  z.object({ type: z.literal('position'), ids: z.array(z.string()).min(1) }),
  z.object({ type: z.literal('minMinutesLastSeason'), value: z.number() }),
  z.object({ type: z.literal('maxMinutesLastSeason'), value: z.number() }),
  z.object({ type: z.literal('hasDebt'), debtId: z.string() }),
  z.object({ type: z.literal('missingDebt'), debtId: z.string() }),
  z.object({ type: z.literal('country'), ids: z.array(z.string()).min(1) }),
  z.object({ type: z.literal('minRivalRelation'), value: z.number() }),
  z.object({ type: z.literal('maxRivalRelation'), value: z.number() }),
  z.object({
    type: z.literal('minNpcRelation'),
    npc: z.enum(['coach', 'teammate', 'rival', 'agent', 'journalist']),
    value: z.number(),
  }),
  z.object({
    type: z.literal('maxNpcRelation'),
    npc: z.enum(['coach', 'teammate', 'rival', 'agent', 'journalist']),
    value: z.number(),
  }),
])

export const dilemmaChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  stance: z.enum(CHOICE_STANCES),
  riskPreview: z.string().min(1),
  immediate: z.array(dilemmaEffectSchema),
  delayed: z.array(
    z.object({
      seasonOffset: z.number().int().min(1).max(20),
      effects: z.array(dilemmaEffectSchema),
    }),
  ),
  hidden: z.array(dilemmaEffectSchema),
  nextEventIds: z.array(z.string()).optional(),
})

export const dilemmaDefinitionSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_]+$/, 'id snake_case requis'),
  version: z.number().int().positive(),
  title: z.string().min(1).max(120),
  body: z.string().min(20),
  category: z.enum(DILEMMA_CATEGORIES),
  tags: z.array(z.string()),
  rarity: z.enum(DILEMMA_RARITIES),
  weight: z.number().positive().max(1000),
  ageMin: z.number().int().min(14).max(55),
  ageMax: z.number().int().min(14).max(55),
  positions: z.array(z.string()).nullable(),
  careerStages: z.array(z.enum(CAREER_STAGES)).nullable(),
  prerequisites: z.array(conditionSchema),
  exclusions: z.array(conditionSchema),
  cooldownSeasons: z.number().int().min(0).max(30),
  unique: z.boolean(),
  expiresAtSeason: z.number().int().positive().nullable(),
  choices: z.array(dilemmaChoiceSchema).min(2).max(3),
  followUpEventIds: z.array(z.string()),
  echoes: z
    .array(z.object({ flag: z.string().min(1), text: z.string().min(10) }))
    .optional(),
})

export type ParsedDilemma = z.infer<typeof dilemmaDefinitionSchema>

export const BOUNDS = {
  STAT_MIN,
  STAT_MAX,
  RESOURCE_MIN,
  RESOURCE_MAX,
  RELATION_MIN,
  RELATION_MAX,
}
