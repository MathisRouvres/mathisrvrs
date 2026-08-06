import { classicSquareMap } from './classicSquare'
import { infinityPartyMap } from './infinityParty'
import { DEFAULT_BOARD_MAP_ID, isBoardMapId, type BoardMapDefinition, type BoardMapId } from './types'

/**
 * Registre des plateaux disponibles. Ajouter une map = l'enregistrer ici
 * (voir `docs/monovomy/architecture.md` § « Ajouter une nouvelle map »).
 */
const REGISTRY: Partial<Record<BoardMapId, BoardMapDefinition>> = {
  classic_square: classicSquareMap,
  infinity_party: infinityPartyMap,
}

/** Maps réellement jouables, dans l'ordre d'affichage du lobby. */
export function listBoardMaps(): BoardMapDefinition[] {
  return Object.values(REGISTRY).filter((map): map is BoardMapDefinition => map !== undefined)
}

/** Une map est-elle enregistrée et jouable ? */
export function hasBoardMap(mapId: unknown): mapId is BoardMapId {
  return isBoardMapId(mapId) && REGISTRY[mapId] !== undefined
}

/**
 * Définition d'une map. Lève si la map est inconnue : on ne bascule **jamais**
 * silencieusement sur un autre plateau (un snapshot doit échouer bruyamment).
 */
export function getBoardMap(mapId: BoardMapId): BoardMapDefinition {
  const map = REGISTRY[mapId]
  if (!map) throw new Error(`unknown_map: ${mapId}`)
  return map
}

/**
 * Normalise une valeur venue d'un snapshot / du réseau. Seule l'**absence**
 * de `mapId` (partie antérieure au multi-map) retombe sur le plateau par défaut ;
 * une valeur présente mais inconnue reste `null` et doit être traitée en erreur.
 */
export function resolveBoardMapId(raw: unknown): BoardMapId | null {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_BOARD_MAP_ID
  return hasBoardMap(raw) ? raw : null
}

/** Map par défaut (repli des parties sans `mapId`). */
export function defaultBoardMap(): BoardMapDefinition {
  return getBoardMap(DEFAULT_BOARD_MAP_ID)
}

/** La map accepte-t-elle ce nombre de joueurs ? */
export function mapSupportsPlayerCount(map: BoardMapDefinition, count: number): boolean {
  return count >= map.minPlayers && count <= map.maxPlayers
}
