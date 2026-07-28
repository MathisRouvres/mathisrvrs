import { z } from 'zod'
import { DIFFICULTY_IDS, PARTY_INTENSITIES } from '../engine/constants'

/** Types de cases du plateau (voir GDD §3). */
export const SPACE_KINDS = [
  'start',
  'property',
  'station',
  'utility',
  'action',
  'tax',
  'jail',
  'gojail',
  'parking',
  'market',
] as const

const idSchema = z.string().regex(/^[a-z0-9_]+$/, 'id snake_case requis')

export const boardSpaceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('property'),
    id: idSchema,
    name: z.string().min(1),
    group: z.string().min(1),
    price: z.number().int().positive(),
    rents: z.array(z.number().int().nonnegative()).min(1),
    sipTier: z.number().int().min(1).max(3),
  }),
  z.object({
    kind: z.literal('station'),
    id: idSchema,
    name: z.string().min(1),
    price: z.number().int().positive(),
    rents: z.array(z.number().int().nonnegative()).length(4),
    sipTier: z.number().int().min(1).max(3),
  }),
  z.object({
    kind: z.literal('utility'),
    id: idSchema,
    name: z.string().min(1),
    price: z.number().int().positive(),
    sipTier: z.number().int().min(1).max(3),
  }),
  z.object({ kind: z.literal('start'), id: idSchema, name: z.string().min(1) }),
  z.object({ kind: z.literal('action'), id: idSchema, name: z.string().min(1) }),
  z.object({
    kind: z.literal('tax'),
    id: idSchema,
    name: z.string().min(1),
    amount: z.number().int().positive(),
    sips: z.number().int().nonnegative(),
  }),
  z.object({ kind: z.literal('jail'), id: idSchema, name: z.string().min(1) }),
  z.object({ kind: z.literal('gojail'), id: idSchema, name: z.string().min(1) }),
  z.object({ kind: z.literal('parking'), id: idSchema, name: z.string().min(1) }),
  z.object({ kind: z.literal('market'), id: idSchema, name: z.string().min(1) }),
])
export type BoardSpace = z.infer<typeof boardSpaceSchema>

export const boardThemeSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  spaces: z.array(boardSpaceSchema).length(40),
})
export type BoardTheme = z.infer<typeof boardThemeSchema>

/** Familles de cartes action (voir GDD §7). */
export const ACTION_FAMILIES = ['defi', 'chance', 'gage', 'regle', 'duel'] as const

/** Effets mécaniques d’une carte (data-driven). `jail_free` = jeton sortie de prison. */
export const CARD_EFFECTS = ['jail_free'] as const

export { PARTY_INTENSITIES }

/** Tags de contenu d’ambiance (Phase 8). */
export const CARD_TAGS = ['catchup', 'collective', 'finale', 'ambience'] as const

export const actionCardSchema = z.object({
  id: idSchema,
  family: z.enum(ACTION_FAMILIES),
  levelMin: z.enum(DIFFICULTY_IDS),
  text: z.string().min(4),
  baseSips: z.number().int().nonnegative(),
  soft: z.string().min(4).optional(),
  persistent: z.boolean().optional(),
  /** Effet mécanique appliqué par le moteur à la résolution (optionnel). */
  effect: z.enum(CARD_EFFECTS).optional(),
  /** Niveau d’ambiance minimal pour que la carte soit éligible (défaut : warmup). */
  intensity: z.enum(PARTY_INTENSITIES).optional(),
  /** Active une règle temporaire (référence `content/rules.ts`). */
  ruleId: idSchema.optional(),
  /** Tags de contenu (rattrapage, collective, finale, montée d’ambiance). */
  tags: z.array(z.enum(CARD_TAGS)).optional(),
})
export type ActionCard = z.infer<typeof actionCardSchema>

// ── Règles temporaires (Phase 8 — data-driven) ──────────────────────────────
export const RULE_DURATION_KINDS = ['turn', 'table', 'minutes'] as const
export const RULE_SCOPES = ['global', 'group', 'last_player', 'movement', 'economy'] as const
export const RULE_STACKING = ['replace', 'stack', 'ignore'] as const

export const temporaryRuleSchema = z.object({
  id: idSchema,
  name: z.string().min(2),
  description: z.string().min(4),
  duration: z.object({
    kind: z.enum(RULE_DURATION_KINDS),
    value: z.number().int().positive(),
  }),
  scope: z.enum(RULE_SCOPES),
  /** Groupe de propriétés ciblé (scope `group`), ex. loyers doublés. */
  groupId: z.string().min(1).optional(),
  stackingPolicy: z.enum(RULE_STACKING),
  /** Variante soft de la règle (alternative non alcoolisée). */
  softVariant: z.string().min(4),
})
export type TemporaryRule = z.infer<typeof temporaryRuleSchema>

// ── Marché Noir : cartes achetables (data-driven) ───────────────────────────

/** Effets d'une carte de marché. Les cinq premiers sont appliqués par le moteur. */
export const MARKET_EFFECTS = [
  'shield',
  'pickpocket',
  'loaded_die',
  'free_pass',
  'jail_key',
  'mirror',
  'gag',
  'proxy',
  'round',
] as const
export type MarketEffect = (typeof MARKET_EFFECTS)[number]

/** Effets résolus par le moteur (changement d'état réel). Les autres sont déclaratifs. */
export const MECHANICAL_EFFECTS: readonly MarketEffect[] = [
  'shield',
  'pickpocket',
  'loaded_die',
  'free_pass',
  'jail_key',
]

/** Quand la carte peut être jouée. */
export const MARKET_TIMINGS = ['anytime', 'before_roll', 'on_rent', 'reaction'] as const
/** Qui la carte vise. */
export const MARKET_TARGETS = ['self', 'player', 'table'] as const

export const marketCardSchema = z.object({
  id: idSchema,
  name: z.string().min(2),
  emoji: z.string().min(1),
  description: z.string().min(8),
  /** Prix en euros. Le prix en gorgées en dérive (`SIPS_TO_CASH`). */
  priceCash: z.number().int().positive(),
  effect: z.enum(MARKET_EFFECTS),
  timing: z.enum(MARKET_TIMINGS),
  target: z.enum(MARKET_TARGETS),
  softVariant: z.string().min(4),
})
export type MarketCard = z.infer<typeof marketCardSchema>
