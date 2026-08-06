import { z } from 'zod'
import { boardSpaceSchema, type BoardSpace } from '../schema'

/**
 * Registre des plateaux MonoVomy.
 *
 * Une map décrit **deux choses strictement séparées** :
 *  - un **chemin logique** (`path`) : l'ordre cyclique des cases, seule source de
 *    vérité du déplacement ;
 *  - une **géométrie visuelle** (`visual`) : où et comment chaque case est dessinée.
 *
 * Le moteur ne connaît que `path` / `tiles`. Changer la forme d'un plateau ne
 * doit jamais changer une règle.
 */
export const BOARD_MAP_IDS = ['classic_square', 'infinity_party'] as const
export type BoardMapId = (typeof BOARD_MAP_IDS)[number]

/**
 * Repli unique pour toute partie / tout snapshot antérieur au multi-map.
 * Ne jamais dupliquer cette constante : l'importer.
 */
export const DEFAULT_BOARD_MAP_ID: BoardMapId = 'classic_square'

export function isBoardMapId(value: unknown): value is BoardMapId {
  return typeof value === 'string' && (BOARD_MAP_IDS as readonly string[]).includes(value)
}

// ── Économie par map ────────────────────────────────────────────────────────

/**
 * Économie propre à une map. Les multiplicateurs sont optionnels : absent = 1,
 * ce qui laisse le barème du contenu intact (cas du plateau classique).
 */
export interface BoardEconomyConfig {
  startingCash: number
  salaryOnPassStart: number
  propertyPriceMultiplier?: number
  rentMultiplier?: number
  upgradeMultiplier?: number
}

export const boardEconomySchema = z.object({
  startingCash: z.number().int().positive(),
  salaryOnPassStart: z.number().int().nonnegative(),
  propertyPriceMultiplier: z.number().positive().optional(),
  rentMultiplier: z.number().positive().optional(),
  upgradeMultiplier: z.number().positive().optional(),
})

// ── Géométrie visuelle ──────────────────────────────────────────────────────

/**
 * Segment visuel d'une case. Purement décoratif / de rendu : aucun segment
 * n'influence le déplacement (le croisement du 8 est un chevauchement de calques,
 * pas une bifurcation).
 */
export const BOARD_SEGMENTS = [
  // plateau carré
  'bottom',
  'left',
  'top',
  'right',
  // plateau en 8
  'left_loop',
  'right_loop',
  'upper_bridge',
  'lower_bridge',
] as const
export type BoardSegmentId = (typeof BOARD_SEGMENTS)[number]

/**
 * Position normalisée d'une case. Repère `0..100` sur les deux axes (origine en
 * haut à gauche) : le rendu reste responsive quelle que soit la taille écran.
 * `rotation` en degrés (0 = case orientée vers le haut du repère).
 * `layer` ordonne les chevauchements (pont supérieur > pont inférieur).
 */
export interface BoardTileVisualPosition {
  tileId: string
  x: number
  y: number
  rotation: number
  scale?: number
  layer?: number
  segment?: BoardSegmentId
}

export const boardTileVisualPositionSchema = z.object({
  tileId: z.string().min(1),
  x: z.number().min(-50).max(150),
  y: z.number().min(-50).max(150),
  rotation: z.number(),
  scale: z.number().positive().optional(),
  layer: z.number().int().optional(),
  segment: z.enum(BOARD_SEGMENTS).optional(),
})

/**
 * Stratégie de rendu attendue :
 *  - `grid_square` : anneau sur grille régulière (plateau classique) ;
 *  - `free_path` : cases posées librement le long de courbes (plateau en 8).
 */
export const BOARD_VISUAL_KINDS = ['grid_square', 'free_path'] as const
export type BoardVisualKind = (typeof BOARD_VISUAL_KINDS)[number]

export interface BoardVisualDefinition {
  kind: BoardVisualKind
  /** Largeur / hauteur du repère normalisé (1 = carré). */
  aspectRatio: number
  positions: BoardTileVisualPosition[]
}

export const boardVisualSchema = z.object({
  kind: z.enum(BOARD_VISUAL_KINDS),
  aspectRatio: z.number().positive(),
  positions: z.array(boardTileVisualPositionSchema).min(1),
})

// ── Définition d'une map ────────────────────────────────────────────────────

/**
 * Définition complète d'un plateau.
 *
 * `spaces` est **dérivé** de `path` + `tiles` (même ordre) et n'existe que pour
 * la compatibilité avec l'ancien type `BoardTheme` : ne jamais l'éditer à la main,
 * ne jamais s'en servir comme source d'ordre dans du nouveau code (utiliser `path`).
 */
export interface BoardMapDefinition {
  id: BoardMapId
  /** Version de contenu (semver). Un snapshot mémorise la version jouée. */
  version: string
  name: string
  /** Compat `BoardTheme` — reprend `shortDescription`. */
  description: string
  shortDescription: string
  longDescription: string
  minPlayers: number
  maxPlayers: number
  /** Durée indicative affichée dans le lobby (minutes). */
  estimatedMinutes: number

  startTileId: string
  jailTileId?: string
  goToJailTileId?: string

  /** Ordre logique et cyclique des cases — seule source de vérité du déplacement. */
  path: readonly string[]
  tiles: Readonly<Record<string, BoardSpace>>
  /** @deprecated dérivé de `path` — compat `BoardTheme`. */
  spaces: BoardSpace[]

  economy: BoardEconomyConfig
  visual: BoardVisualDefinition
}

export const boardMapDefinitionSchema = z.object({
  id: z.enum(BOARD_MAP_IDS),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version semver requise'),
  name: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().min(1),
  longDescription: z.string().min(1),
  minPlayers: z.number().int().min(2),
  maxPlayers: z.number().int().min(2),
  estimatedMinutes: z.number().int().positive(),
  startTileId: z.string().min(1),
  jailTileId: z.string().min(1).optional(),
  goToJailTileId: z.string().min(1).optional(),
  path: z.array(z.string().min(1)).min(8),
  tiles: z.record(z.string(), boardSpaceSchema),
  spaces: z.array(boardSpaceSchema).min(8),
  economy: boardEconomySchema,
  visual: boardVisualSchema,
})

/**
 * Plateau parcourable par les helpers de navigation. Accepte aussi bien une
 * `BoardMapDefinition` qu'un ancien `BoardTheme` (repli sur `spaces`), ce qui
 * garde les anciennes signatures moteur valides pendant la migration.
 */
export interface NavigableBoard {
  id?: string
  version?: string
  path?: readonly string[]
  tiles?: Readonly<Record<string, BoardSpace>>
  spaces: readonly BoardSpace[]
  startTileId?: string
  jailTileId?: string
  goToJailTileId?: string
  economy?: BoardEconomyConfig
}
