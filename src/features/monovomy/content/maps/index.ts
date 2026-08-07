export {
  BOARD_MAP_IDS,
  BOARD_SEGMENTS,
  BOARD_VISUAL_KINDS,
  TILE_ORIENTATIONS,
  DEFAULT_BOARD_MAP_ID,
  isBoardMapId,
  boardEconomySchema,
  boardTileVisualPositionSchema,
  boardVisualSchema,
  boardMapDefinitionSchema,
  boardGroupSchema,
  type BoardMapId,
  type BoardMapDefinition,
  type BoardEconomyConfig,
  type BoardSegmentId,
  type BoardTileVisualPosition,
  type BoardVisualDefinition,
  type BoardVisualKind,
  type TileOrientation,
  type BoardGroupDefinition,
  type NavigableBoard,
} from './types'

export {
  DEFAULT_ECONOMY,
  advance,
  boardEconomy,
  boardPath,
  boardSize,
  findNextTile,
  findNextTileOfKind,
  goToJailIndexOf,
  jailIndexOf,
  logicalDistance,
  normalizeIndex,
  salaryOnPassStart,
  startIndex,
  startingCashOf,
  tileAt,
  tileById,
  tileIdAt,
  tileIndex,
  tilesBetween,
  tilesOfKind,
  type AdvanceResult,
  type TileSearchResult,
} from './navigation'

export { CLASSIC_SQUARE_TILES, classicSquareMap } from './classicSquare'
export { INFINITY_PARTY_TILES, infinityPartyMap } from './infinityParty'

export {
  defaultBoardMap,
  getBoardMap,
  hasBoardMap,
  listBoardMaps,
  mapSupportsPlayerCount,
  resolveBoardMapId,
} from './registry'

export { getTileVisualPosition, visualPositionsById } from './visual'

export {
  FALLBACK_GROUP_COLOR,
  allBoardGroups,
  groupColor,
  groupLabel,
  groupOf,
  groupsOf,
} from './groups'

export {
  formatValidationReport,
  validateAllBoardMaps,
  validateBoardMap,
  type MapValidationReport,
} from './validate'
