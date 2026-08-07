import type { BoardSpace } from '../../content/schema'
import type { BoardMapDefinition, BoardSegmentId } from '../../content/maps/types'
import { boardPath, tileById } from '../../content/maps/navigation'

/**
 * Géométrie de rendu d'une map : convertit les positions normalisées déclarées
 * par la map (repère 0..100) en coordonnées monde three.js, une fois pour toutes.
 *
 * Aucune forme de plateau n'est supposée ici : le module lit `visual.positions`.
 * Le plateau carré retombe exactement sur son ancien placement (`col - 6`,
 * `row - 6`), ce que verrouille un test de non-régression.
 */

/** Une case, prête à poser dans la scène. */
export interface GeometryTile {
  index: number
  tileId: string
  space: BoardSpace | undefined
  /** Coordonnées monde (le plateau est en y ≈ 0). */
  x: number
  z: number
  /** Rotation autour de Y, en radians (0 sur un plateau aligné sur le repère). */
  rotY: number
  layer: number
  segment: BoardSegmentId | null
  /** Surélévation du socle (rampe du croisement). */
  elevation: number
  /** Rotation de la texture (coins d'un plateau en grille). */
  textureAngle: number
  /** Hauteur de la face supérieure au-dessus du socle. */
  top: number
}

export interface BoardGeometryExtent {
  width: number
  depth: number
  halfWidth: number
  halfDepth: number
  radius: number
}

export interface BoardGeometry {
  map: BoardMapDefinition
  size: number
  tiles: GeometryTile[]
  extent: BoardGeometryExtent
  indexById: Map<string, number>
  /** Centre d'une case en coordonnées monde `[x, z]`. */
  posOf: (index: number) => [number, number]
  /** Rotation d'une case autour de Y (radians). */
  rotOf: (index: number) => number
  /** Altitude du socle d'une case (rampe du pont comprise). */
  elevationOf: (index: number) => number
  /** Altitude de la surface d'une case — ce sur quoi pions et anneaux se posent. */
  tileTopY: (index: number) => number
  /** Angle de rotation de la texture (coins des plateaux en grille). */
  textureAngleOf: (index: number) => number
  tileAt: (index: number) => GeometryTile
  /** Index de toutes les cases du même groupe de couleur (la case seule sinon). */
  groupIndicesOf: (spaceId: string) => number[]
}

/** Hauteur des blocs : les cases spéciales (non achetables) sont surélevées. */
export const TILE_H = { prop: 0.24, special: 0.4 }

/** Hauteur du passage supérieur au croisement, et longueur de sa rampe (en cases). */
const BRIDGE_HEIGHT = 0.85
const BRIDGE_RAMP = 2

const CACHE = new WeakMap<BoardMapDefinition, BoardGeometry>()

function isBuyable(space: BoardSpace | undefined): boolean {
  return space !== undefined && 'price' in space
}

function groupIdOf(space: BoardSpace | undefined): string | null {
  return space && 'group' in space ? space.group : null
}

/** Médiane des écarts entre cases consécutives (robuste aux décalages du pont). */
function medianPitch(points: { x: number; y: number }[]): number {
  const gaps: number[] = []
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]!
    const next = points[(i + 1) % points.length]!
    gaps.push(Math.hypot(current.x - next.x, current.y - next.y))
  }
  gaps.sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)] || 1
}

/**
 * Élévation d'une case : nulle partout, sauf autour du passage supérieur d'un
 * croisement, où une rampe en cosinus fait monter puis redescendre le trajet.
 */
function buildElevations(size: number, segments: string[]): number[] {
  const elevations: number[] = new Array(size).fill(0)
  const bridge = segments.indexOf('upper_bridge')
  if (bridge < 0) return elevations
  for (let step = -BRIDGE_RAMP; step <= BRIDGE_RAMP; step += 1) {
    const index = (((bridge + step) % size) + size) % size
    const ramp = (1 + Math.cos((Math.PI * step) / BRIDGE_RAMP)) / 2
    elevations[index] = Math.max(elevations[index] ?? 0, BRIDGE_HEIGHT * ramp)
  }
  return elevations
}

/**
 * Angle de rotation appliqué à la TEXTURE des coins d'un plateau en grille
 * (le texte des coins se lit en diagonale). Zéro pour les plateaux libres.
 */
function cornerAngle(kind: string, segments: string[], index: number): number {
  if (kind !== 'grid_square') return 0
  const size = segments.length
  const current = segments[index]
  const previous = segments[(index - 1 + size) % size]
  if (current === previous) return 0
  return current === 'bottom' || current === 'top' ? -Math.PI / 4 : Math.PI / 4
}

function build(map: BoardMapDefinition): BoardGeometry {
  const path = boardPath(map)
  const size = path.length
  const byId = new Map(map.visual.positions.map((position) => [position.tileId, position]))
  const boxHeight = 100 / (map.visual.aspectRatio || 1)

  const normalized = path.map((tileId) => byId.get(tileId) ?? { tileId, x: 50, y: boxHeight / 2, rotation: 0, layer: 1, segment: undefined })
  // Une case occupe 1 unité monde : l'échelle vient du pas réel de la map, donc
  // les cases gardent la même taille quel que soit le nombre de cases.
  const scale = 1 / medianPitch(normalized)
  const segments = normalized.map((position) => position.segment ?? '')
  const elevations = buildElevations(size, segments)
  const orientToPath = map.visual.tileOrientation === 'path'

  const tiles: GeometryTile[] = normalized.map((position, index) => {
    const tileId = path[index]!
    const space = tileById(map, tileId)
    return {
      index,
      tileId,
      space,
      x: (position.x - 50) * scale,
      z: (position.y - boxHeight / 2) * scale,
      // `rotation` est en degrés horaires depuis le haut de l'écran ; dans le
      // monde, « haut de l'écran » = −Z, et une rotation horaire vue de dessus
      // est une rotation négative autour de Y.
      rotY: orientToPath ? (-position.rotation * Math.PI) / 180 : 0,
      layer: position.layer ?? 1,
      segment: position.segment ?? null,
      elevation: elevations[index] ?? 0,
      textureAngle: cornerAngle(map.visual.kind, segments, index),
      top: (isBuyable(space) ? TILE_H.prop : TILE_H.special) + 0.04,
    }
  })

  const xs = tiles.map((tile) => tile.x)
  const zs = tiles.map((tile) => tile.z)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  // Marge d'une demi-case plus un liseré : le socle ne coupe jamais une case.
  const margin = 0.75
  const extent: BoardGeometryExtent = {
    width: maxX - minX + margin * 2,
    depth: maxZ - minZ + margin * 2,
    halfWidth: (maxX - minX) / 2 + margin,
    halfDepth: (maxZ - minZ) / 2 + margin,
    radius: Math.hypot(maxX - minX, maxZ - minZ) / 2 + margin,
  }

  const indexById = new Map(tiles.map((tile) => [tile.tileId, tile.index]))
  const at = (index: number): GeometryTile => tiles[((Math.trunc(index) % size) + size) % size]!

  return {
    map,
    size,
    tiles,
    extent,
    indexById,
    posOf: (index) => {
      const tile = at(index)
      return [tile.x, tile.z]
    },
    rotOf: (index) => at(index).rotY,
    elevationOf: (index) => at(index).elevation,
    tileTopY: (index) => at(index).elevation + at(index).top,
    textureAngleOf: (index) => at(index).textureAngle,
    tileAt: at,
    groupIndicesOf: (spaceId) => {
      const index = indexById.get(spaceId)
      if (index == null) return []
      const group = groupIdOf(tiles[index]?.space)
      if (!group) return [index]
      return tiles.filter((tile) => groupIdOf(tile.space) === group).map((tile) => tile.index)
    },
  }
}

/** Géométrie d'une map (mémoïsée par définition de map). */
export function boardGeometry(map: BoardMapDefinition): BoardGeometry {
  const cached = CACHE.get(map)
  if (cached) return cached
  const geometry = build(map)
  CACHE.set(map, geometry)
  return geometry
}
