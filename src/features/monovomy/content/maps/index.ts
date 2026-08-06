export {
  BOARD_MAP_IDS,
  BOARD_SEGMENTS,
  BOARD_VISUAL_KINDS,
  DEFAULT_BOARD_MAP_ID,
  isBoardMapId,
  boardEconomySchema,
  boardTileVisualPositionSchema,
  boardVisualSchema,
  boardMapDefinitionSchema,
  type BoardMapId,
  type BoardMapDefinition,
  type BoardEconomyConfig,
  type BoardSegmentId,
  type BoardTileVisualPosition,
  type BoardVisualDefinition,
  type BoardVisualKind,
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

export {
  defaultBoardMap,
  getBoardMap,
  hasBoardMap,
  listBoardMaps,
  mapSupportsPlayerCount,
  resolveBoardMapId,
} from './registry'

export { getTileVisualPosition, visualPositionsById } from './visual'
