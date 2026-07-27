import { z } from 'zod'
import {
  CAREER_LENGTHS,
  CAREER_STAGES,
  CAREER_STATUSES,
  CLUB_STATUSES,
  DIFFICULTIES,
  GAME_MODES,
  HIDDEN_MAX,
  HIDDEN_MIN,
  LIFESTYLE_IDS,
  MACRO_POSITION_IDS,
  SPONSOR_SECTORS,
  PROGRESSION_LABELS,
  RELATION_MAX,
  RELATION_MIN,
  RESOURCE_MAX,
  RESOURCE_MIN,
  SAVE_SCHEMA_VERSION,
  SEASON_LOOP_PHASES,
  STAT_MAX,
  STAT_MIN,
  STRONG_FEET,
} from './constants'

const statSchema = z.number().min(STAT_MIN).max(STAT_MAX)
const relationSchema = z.number().min(RELATION_MIN).max(RELATION_MAX)
const resourceSchema = z.number().min(RESOURCE_MIN).max(RESOURCE_MAX)
const hiddenSchema = z.number().min(HIDDEN_MIN).max(HIDDEN_MAX)

const npcSchema = z.object({
  id: z.enum(['coach', 'teammate', 'rival', 'agent', 'journalist']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  displayName: z.string().min(1),
  personality: z.enum([
    'exigeant',
    'paternel',
    'calculateur',
    'loyal',
    'impulsif',
    'ambitieux',
    'cynique',
    'idealiste',
  ]),
  relation: z.number().min(0).max(100),
  goal: z.string().min(1),
  memory: z.record(
    z.string(),
    z.union([z.boolean(), z.number(), z.string()]),
  ),
})

const rivalSchema = npcSchema.extend({
  id: z.literal('rival'),
  age: z.number().int().min(14).max(50),
  positionId: z.string().min(1),
  level: z.number().min(1).max(99),
  clubId: z.string().nullable(),
  reputation: z.number().min(0).max(100),
  trophies: z.number().int().min(0),
})

export const playerProfileSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1).max(40),
  lastName: z.string().min(1).max(40),
  nickname: z.string().max(40).nullable(),
  displayName: z.string().min(1).max(100),
  originId: z.string().min(1),
  countryId: z.string().min(1),
  // Genre — défaut « male » pour les sauvegardes antérieures.
  gender: z.enum(['male', 'female']).default('male'),
  birthYear: z.number().int().min(2004).max(2010),
  primaryPosition: z.string().min(1),
  secondaryPosition: z.string().nullable(),
  macroPosition: z.enum(MACRO_POSITION_IDS),
  strongFoot: z.enum(STRONG_FEET),
  heightCm: z.number().int().min(160).max(205),
  playstyleId: z.string().min(1),
  visualId: z.string().min(1),
  difficulty: z.enum(DIFFICULTIES),
  careerLength: z.enum(CAREER_LENGTHS),
  foundingChoices: z.record(z.string(), z.string()),
  preferredPositions: z.array(z.string()),
  personalityTraits: z.array(z.string()),
  hometownRegion: z.string(),
  potentialStars: z.number().int().min(1).max(5),
  recruiterBlurb: z.string().min(1),
  createdAt: z.string().min(1),
  creationMode: z.enum(['express', 'legacy']),
})

/** Record établi/battu (Phase 12). */
const recordEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  scope: z.enum([
    'personnel',
    'club',
    'championnat',
    'national',
    'continental',
    'mondial',
  ]),
  rarity: z.enum([
    'accomplissement',
    'record_club',
    'record_championnat',
    'record_national',
    'record_continental',
    'record_mondial',
  ]),
  value: z.number(),
  seasonIndex: z.number().int().nonnegative(),
  age: z.number().int().nonnegative(),
  clubId: z.string().nullable(),
  championshipId: z.string().nullable(),
  context: z.string(),
})

export const careerStateSchema = z.object({
  seed: z.string().min(1),
  mode: z.enum(GAME_MODES),
  seasonIndex: z.number().int().min(1),
  chapterId: z.string().nullable(),
  phase: z.enum(['setup', 'playing', 'retired']),
  careerStage: z.enum(CAREER_STAGES),
  age: z.number().int().min(14).max(55),
  clubId: z.string().nullable(),
  contract: z
    .object({
      weeksRemaining: z.number().int().min(0),
      // Salaire jamais négatif (garanti par le bornage).
      weeklyWage: z.number().min(0),
      // Champs enrichis Phase 2 — optionnels (compat contrats/sauvegardes antérieurs).
      clubId: z.string().nullable().optional(),
      startSeason: z.number().int().optional(),
      endSeason: z.number().int().optional(),
      signingBonus: z.number().min(0).optional(),
      promisedStatus: z.enum(CLUB_STATUSES).optional(),
      appearanceBonus: z.number().min(0).optional(),
      startBonus: z.number().min(0).optional(),
      performanceBonus: z.number().min(0).optional(),
      trophyBonus: z.number().min(0).optional(),
      loyaltyBonus: z.number().min(0).optional(),
      releaseClause: z.number().min(0).nullable().optional(),
      optionYear: z.boolean().optional(),
      agentCommissionRate: z.number().min(0).max(0.5).optional(),
      narrativePromises: z.array(z.string()).optional(),
    })
    .nullable(),
  agentId: z.string().nullable(),
  stats: z.object({
    technique: statSchema,
    controle: statSchema,
    passe: statSchema,
    vision: statSchema,
    tir: statSchema,
    finition: statSchema,
    dribble: statSchema,
    vitesse: statSchema,
    endurance: statSchema,
    puissance: statSchema,
    defense: statSchema,
    placement: statSchema,
    tactique: statSchema,
    sangFroid: statSchema,
    leadership: statSchema,
  }),
  resources: z.object({
    forme: resourceSchema,
    moral: resourceSchema,
    fatigue: resourceSchema,
    sante: resourceSchema,
    confianceEntraineur: resourceSchema,
    cohesionVestiaire: resourceSchema,
    reputationSportive: resourceSchema,
    popularite: resourceSchema,
    discipline: resourceSchema,
    bienEtre: resourceSchema,
    financesPersonnelles: resourceSchema,
  }),
  hiddenTraits: z.object({
    potentiel: hiddenSchema,
    professionnalisme: hiddenSchema,
    constance: hiddenSchema,
    fragilitePhysique: hiddenSchema,
    grandsMatchs: hiddenSchema,
    adaptabilite: hiddenSchema,
    ambition: hiddenSchema,
    loyaute: hiddenSchema,
    resistancePression: hiddenSchema,
  }),
  flags: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])),
  pendingEffects: z.array(
    z.object({
      id: z.string(),
      sourceEventId: z.string().nullable(),
      triggerSeason: z.number().int(),
      payload: z.record(z.string(), z.unknown()),
    }),
  ),
  finances: z.object({
    cash: z.number().min(0),
    weeklyWage: z.number().min(0),
    investments: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.number(),
      }),
    ),
  }),
  // Niveau de vie — défaut « modeste » sur les sauvegardes antérieures.
  lifestyle: z.enum(LIFESTYLE_IDS).default('modeste'),
  // Patrimoine cumulatif — défauts neutres (la migration renseigne les vraies valeurs).
  wealth: z
    .object({
      current: z.number().min(0),
      max: z.number().min(0),
      cumulativeIncome: z.number().min(0),
      bestWeeklyWage: z.number().min(0),
      cumulativeCommercial: z.number().min(0),
      investmentGains: z.number().min(0),
      financialLosses: z.number().min(0),
      cumulativeExpenses: z.number().min(0),
      lastAnnualDelta: z.number(),
    })
    .default({
      current: 0,
      max: 0,
      cumulativeIncome: 0,
      bestWeeklyWage: 0,
      cumulativeCommercial: 0,
      investmentGains: 0,
      financialLosses: 0,
      cumulativeExpenses: 0,
      lastAnnualDelta: 0,
    }),
  // Sponsors actifs (Phase 3) — défaut vide sur sauvegardes antérieures.
  sponsorships: z
    .array(
      z.object({
        id: z.string().min(1),
        sponsorId: z.string().min(1),
        name: z.string().min(1),
        sector: z.enum(SPONSOR_SECTORS),
        prestige: z.number().min(1).max(99),
        annualPay: z.number().min(0),
        seasonsRemaining: z.number().int().min(0),
        imageTag: z.string().min(1),
        reputationRisk: z.number().min(0).max(100),
        signedSeason: z.number().int(),
        exclusive: z.boolean(),
      }),
    )
    .default([]),
  relationships: z.object({
    coach: relationSchema,
    teammates: relationSchema,
    family: relationSchema,
    friends: relationSchema,
    partner: relationSchema,
    media: relationSchema,
    fans: relationSchema,
    sponsors: relationSchema,
  }),
  maxSeasons: z.number().int().min(5).max(30),
  estimatedValue: z.number().min(0),
  injuryWeeksRemaining: z.number().int().min(0).max(60),
  clubInfrastructure: z.number().min(1).max(99),
  competitionLevel: z.number().min(1).max(99),
  seasonTimeline: z.array(
    z.object({
      seasonIndex: z.number().int(),
      age: z.number().int(),
      clubId: z.string().nullable(),
      careerStage: z.enum(CAREER_STAGES),
      matchStats: z.object({
        matches: z.number(),
        starts: z.number(),
        minutes: z.number(),
        goals: z.number(),
        assists: z.number(),
        cleanSheets: z.number(),
        // Optionnel + défaut : compat sauvegardes antérieures à la Phase 6.
        keySaves: z.number().optional().default(0),
        averageRating: z.number(),
        yellowCards: z.number(),
        redCards: z.number(),
        injuryDays: z.number(),
        trophies: z.array(z.string()),
      }),
      progressionLabel: z.enum(PROGRESSION_LABELS),
      narrativeSummary: z.string(),
      valueAfter: z.number(),
      reputationAfter: z.number(),
      recordedAt: z.string(),
      clubRank: z.number().int().min(1).max(24).optional(),
      keyEvent: z.string().optional(),
      // Phase 9 — historique sportif enrichi (optionnels, compat sauvegardes).
      championshipId: z.string().nullable().optional(),
      division: z.union([z.literal(1), z.literal(2)]).optional(),
      objective: z
        .enum([
          'maintien',
          'milieu_tableau',
          'premiere_moitie',
          'qualification_continentale',
          'titre',
          'promotion',
          'parcours_coupe',
          'defense_titre',
        ])
        .optional(),
      objectiveResult: z
        .enum([
          'echec_important',
          'objectif_manque',
          'objectif_atteint',
          'objectif_depasse',
          'saison_historique',
        ])
        .optional(),
      promoted: z.boolean().optional(),
      relegated: z.boolean().optional(),
      continentalQualified: z.boolean().optional(),
      cupRun: z
        .enum(['aucune', 'huitiemes', 'quarts', 'demi', 'finale', 'vainqueur'])
        .optional(),
      historicImportance: z.number().int().min(1).max(5).optional(),
      // Phase 10 — trophées & récompenses collectives (optionnels).
      clubStanding: z
        .enum([
          'grand_favori',
          'pretendant',
          'candidat_continental',
          'milieu',
          'candidat_maintien',
          'promu',
          'outsider',
        ])
        .optional(),
      achievements: z.array(z.string()).optional(),
      contributionTier: z.string().optional(),
      // Phase 11 — distinctions individuelles (optionnel).
      distinctions: z
        .array(
          z.object({
            awardId: z.string(),
            awardName: z.string(),
            championshipId: z.string().nullable(),
            competition: z.string(),
            seasonIndex: z.number().int().nonnegative(),
            age: z.number().int().nonnegative(),
            clubId: z.string().nullable(),
            positionFamily: z.enum(['gk', 'def', 'mid', 'att']),
            result: z.enum([
              'non_retenu',
              'nomme',
              'finaliste',
              'troisieme',
              'deuxieme',
              'vainqueur',
            ]),
            rank: z.number().int().nonnegative(),
            score: z.number(),
            prestige: z.number(),
            justification: z.string(),
            competitors: z.array(
              z.object({
                name: z.string(),
                clubName: z.string(),
                family: z.enum(['gk', 'def', 'mid', 'att']),
                score: z.number(),
                result: z.enum([
                  'non_retenu',
                  'nomme',
                  'finaliste',
                  'troisieme',
                  'deuxieme',
                  'vainqueur',
                ]),
                isPlayer: z.boolean(),
              }),
            ),
            teamStatus: z
              .enum(['absent', 'elargi', 'titulaire', 'meilleur'])
              .optional(),
            monthlyCount: z.number().int().nonnegative().optional(),
            tier: z
              .enum(['championnat', 'national', 'continental', 'international', 'mondial'])
              .optional(),
          }),
        )
        .optional(),
      // Phase 12 — records établis/battus cette saison (optionnel).
      records: z.array(recordEntrySchema).optional(),
      // Phase 14 — niveau visible en fin de saison (carte timeline).
      level: z.number().optional(),
    }),
  ),
  rngState: z.number().int().nonnegative(),
  countryId: z.string().min(1),
  macroPosition: z.enum(MACRO_POSITION_IDS),
  preciseRole: z.string().min(1),
  clubStatus: z.enum(CLUB_STATUSES),
  dilemmasResolvedThisSeason: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
  ]),
  seasonsCompleted: z.number().int().min(0),
  totalDilemmasResolved: z.number().int().min(0),
  seasonLoopPhase: z.enum(SEASON_LOOP_PHASES),
  provisionalLegacyScore: z.number(),
  npcs: z.object({
    coach: npcSchema,
    teammate: npcSchema,
    rival: rivalSchema,
    agent: npcSchema,
    journalist: npcSchema,
  }),
  // Phase 12 — registre des records détenus (optionnel, compat sauvegardes).
  records: z.array(recordEntrySchema).optional(),
})

export const careerRunSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().nullable(),
  seed: z.string().min(1),
  engineVersion: z.string().min(1),
  contentVersion: z.string().min(1),
  mode: z.enum(GAME_MODES),
  status: z.enum(CAREER_STATUSES),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  age: z.number().int(),
  seasonIndex: z.number().int(),
  clubId: z.string().nullable(),
  state: careerStateSchema,
  legacyScore: z.number(),
  saveSchemaVersion: z.number().int().positive(),
})

export const careerEventRecordSchema = z.object({
  id: z.string().min(1),
  careerId: z.string().min(1),
  eventDefinitionId: z.string().nullable(),
  type: z.string().min(1),
  seasonIndex: z.number().int(),
  createdAt: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  resolved: z.boolean(),
  resolutionDecisionId: z.string().nullable(),
})

export const careerDecisionRecordSchema = z.object({
  id: z.string().min(1),
  careerId: z.string().min(1),
  eventId: z.string().min(1),
  choiceId: z.string().min(1),
  seasonIndex: z.number().int(),
  createdAt: z.string().min(1),
  stateBefore: careerStateSchema,
  stateAfter: careerStateSchema,
  meta: z.record(z.string(), z.unknown()),
})

export const careerSeasonRecordSchema = z.object({
  id: z.string().min(1),
  careerId: z.string().min(1),
  seasonIndex: z.number().int(),
  clubId: z.string().nullable(),
  startedAt: z.string().min(1),
  endedAt: z.string().nullable(),
  summary: z.record(z.string(), z.unknown()),
})

export const careerSavePackageSchema = z.object({
  schemaVersion: z.number().int().positive(),
  snapshot: careerRunSchema,
  playerProfile: playerProfileSchema,
  journal: z.object({
    events: z.array(careerEventRecordSchema),
    decisions: z.array(careerDecisionRecordSchema),
    seasons: z.array(careerSeasonRecordSchema),
  }),
})

export function assertSaveSchemaVersion(version: number): void {
  if (version > SAVE_SCHEMA_VERSION) {
    throw new Error(
      `Sauvegarde trop récente (v${version}) pour ce client (v${SAVE_SCHEMA_VERSION}).`,
    )
  }
}
