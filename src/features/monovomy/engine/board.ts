import type { BoardMapDefinition, BoardMapId } from '../content/maps/types'
import { defaultBoardMap, getBoardMap, resolveBoardMapId } from '../content/maps/registry'

/**
 * Résolution du plateau d'une partie. Point d'entrée unique : le moteur, le
 * réseau et l'interface passent tous par ici pour obtenir la map active.
 *
 * Règle : une partie **sans** `mapId` (antérieure au multi-map) retombe sur le
 * plateau classique ; une partie avec un `mapId` **inconnu** lève — on ne
 * restaure jamais silencieusement sur un autre plateau.
 */

/** Définition d'une map à partir d'un identifiant brut (snapshot, réseau, URL). */
export function boardForMapId(mapId: unknown): BoardMapDefinition {
  const resolved = resolveBoardMapId(mapId)
  if (!resolved) throw new Error(`unknown_map: ${String(mapId)}`)
  return getBoardMap(resolved)
}

/** Identifiant de map d'un état, normalisé (repli plateau classique). */
export function mapIdOfState(state: { mapId?: unknown } | null | undefined): BoardMapId | null {
  if (!state) return null
  return resolveBoardMapId(state.mapId)
}

/** Plateau d'un état de partie. `null` → plateau par défaut (aucune partie en cours). */
export function boardForState(state: { mapId?: unknown } | null | undefined): BoardMapDefinition {
  if (!state) return defaultBoardMap()
  return boardForMapId(state.mapId)
}

/** La map d'un état est-elle disponible dans ce build ? */
export function isStateMapAvailable(state: { mapId?: unknown } | null | undefined): boolean {
  if (!state) return true
  return resolveBoardMapId(state.mapId) !== null
}
