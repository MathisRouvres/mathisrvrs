import type { BoardMapDefinition, BoardTileVisualPosition } from './types'

/**
 * Accès à la géométrie visuelle d'une map. Le rendu lit **toujours** ces
 * positions ; la logique de jeu, jamais (elle n'utilise que `path`).
 */

const cache = new WeakMap<BoardMapDefinition, Map<string, BoardTileVisualPosition>>()

/** Index `tileId → position visuelle` (mémoïsé par map). */
export function visualPositionsById(map: BoardMapDefinition): Map<string, BoardTileVisualPosition> {
  const cached = cache.get(map)
  if (cached) return cached
  const index = new Map(map.visual.positions.map((position) => [position.tileId, position]))
  cache.set(map, index)
  return index
}

/** Position visuelle d'une case. `undefined` si la map n'en déclare pas. */
export function getTileVisualPosition(
  map: BoardMapDefinition,
  tileId: string,
): BoardTileVisualPosition | undefined {
  return visualPositionsById(map).get(tileId)
}
