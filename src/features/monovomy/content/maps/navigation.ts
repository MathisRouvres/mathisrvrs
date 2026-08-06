import type { BoardSpace } from '../schema'
import { STARTING_CASH, SALARY_PER_LAP } from '../../engine/constants'
import type { BoardEconomyConfig, NavigableBoard } from './types'

/**
 * Navigation générique sur un plateau MonoVomy.
 *
 * Toutes ces fonctions travaillent sur `path` (ordre logique cyclique) et sont
 * indépendantes du nombre de cases comme de la forme du plateau. Aucune règle ne
 * doit dépendre d'un index numérique écrit en dur.
 */

/** Économie appliquée quand une map n'en déclare pas (barème historique). */
export const DEFAULT_ECONOMY: BoardEconomyConfig = {
  startingCash: STARTING_CASH,
  salaryOnPassStart: SALARY_PER_LAP,
}

/** Chemin logique. Repli sur l'ordre de `spaces` pour un ancien `BoardTheme`. */
export function boardPath(board: NavigableBoard): readonly string[] {
  return board.path ?? board.spaces.map((space) => space.id)
}

/** Nombre de cases du plateau. */
export function boardSize(board: NavigableBoard): number {
  return boardPath(board).length
}

/** Ramène un index quelconque (négatif ou > taille) dans `[0, taille[`. */
export function normalizeIndex(board: NavigableBoard, index: number): number {
  const size = boardSize(board)
  if (size === 0) return 0
  return ((Math.trunc(index) % size) + size) % size
}

/** Identifiant de la case à un index logique (index normalisé). */
export function tileIdAt(board: NavigableBoard, index: number): string | undefined {
  return boardPath(board)[normalizeIndex(board, index)]
}

/** Case par identifiant. */
export function tileById(board: NavigableBoard, tileId: string): BoardSpace | undefined {
  if (board.tiles) return board.tiles[tileId]
  return board.spaces.find((space) => space.id === tileId)
}

/** Case à un index logique. */
export function tileAt(board: NavigableBoard, index: number): BoardSpace | undefined {
  const id = tileIdAt(board, index)
  return id === undefined ? undefined : tileById(board, id)
}

/** Index logique d'une case, ou `-1` si elle n'appartient pas au plateau. */
export function tileIndex(board: NavigableBoard, tileId: string): number {
  return boardPath(board).indexOf(tileId)
}

export interface AdvanceResult {
  /** Index logique d'arrivée (normalisé). */
  index: number
  tileId: string
  /** Nombre de tours complets effectués (0 ou plus ; 0 en marche arrière). */
  laps: number
  /** Au moins un passage par la case Départ. */
  passedStart: boolean
}

/**
 * Avance (ou recule si `steps < 0`) depuis un index logique.
 * Un recul ne fait jamais toucher de salaire, même s'il repasse par le Départ.
 */
export function advance(board: NavigableBoard, fromIndex: number, steps: number): AdvanceResult {
  const size = boardSize(board)
  if (size === 0) return { index: 0, tileId: '', laps: 0, passedStart: false }
  const from = normalizeIndex(board, fromIndex)
  const raw = from + Math.trunc(steps)
  const laps = steps > 0 ? Math.floor(raw / size) : 0
  const index = normalizeIndex(board, raw)
  return { index, tileId: boardPath(board)[index] ?? '', laps, passedStart: laps > 0 }
}

/**
 * Distance logique (toujours vers l'avant) entre deux cases : nombre de pas à
 * jouer pour aller de `fromTileId` à `toTileId`. `-1` si une case est inconnue.
 */
export function logicalDistance(board: NavigableBoard, fromTileId: string, toTileId: string): number {
  const from = tileIndex(board, fromTileId)
  const to = tileIndex(board, toTileId)
  if (from < 0 || to < 0) return -1
  const size = boardSize(board)
  return ((to - from) % size + size) % size
}

/**
 * Cases traversées par un déplacement, case de départ exclue, case d'arrivée
 * incluse — dans l'ordre. Sert aux animations de pion.
 */
export function tilesBetween(board: NavigableBoard, fromIndex: number, steps: number): string[] {
  const count = Math.abs(Math.trunc(steps))
  const direction = steps < 0 ? -1 : 1
  const out: string[] = []
  for (let step = 1; step <= count; step += 1) {
    const id = tileIdAt(board, fromIndex + step * direction)
    if (id !== undefined) out.push(id)
  }
  return out
}

export interface TileSearchResult {
  index: number
  tileId: string
  /** Nombre de pas depuis `fromIndex` (1 ou plus). */
  steps: number
}

/**
 * Première case satisfaisant `predicate` en avançant depuis `fromIndex`
 * (case de départ exclue). Base des cartes « avance jusqu'à… ».
 */
export function findNextTile(
  board: NavigableBoard,
  fromIndex: number,
  predicate: (space: BoardSpace, tileId: string) => boolean,
): TileSearchResult | null {
  const size = boardSize(board)
  for (let steps = 1; steps <= size; steps += 1) {
    const index = normalizeIndex(board, fromIndex + steps)
    const tileId = boardPath(board)[index]
    const space = tileId === undefined ? undefined : tileById(board, tileId)
    if (space && tileId !== undefined && predicate(space, tileId)) return { index, tileId, steps }
  }
  return null
}

/** Première case d'un genre donné (`kind`) en avançant. */
export function findNextTileOfKind(
  board: NavigableBoard,
  fromIndex: number,
  kind: BoardSpace['kind'],
): TileSearchResult | null {
  return findNextTile(board, fromIndex, (space) => space.kind === kind)
}

/** Toutes les cases d'un genre donné, dans l'ordre du chemin. */
export function tilesOfKind(board: NavigableBoard, kind: BoardSpace['kind']): string[] {
  return boardPath(board).filter((tileId) => tileById(board, tileId)?.kind === kind)
}

/**
 * Index d'une case de référence : identifiant déclaré par la map en priorité,
 * repli sur le premier `kind` correspondant. `-1` si la map n'en possède pas.
 */
function referenceIndex(board: NavigableBoard, declared: string | undefined, kind: BoardSpace['kind']): number {
  if (declared) {
    const index = tileIndex(board, declared)
    if (index >= 0) return index
  }
  return boardPath(board).findIndex((tileId) => tileById(board, tileId)?.kind === kind)
}

/** Index de la case Départ. */
export function startIndex(board: NavigableBoard): number {
  return referenceIndex(board, board.startTileId, 'start')
}

/** Index de la case Prison (visite). `-1` si la map n'en a pas. */
export function jailIndexOf(board: NavigableBoard): number {
  return referenceIndex(board, board.jailTileId, 'jail')
}

/** Index de la case « Au poste ». `-1` si la map n'en a pas. */
export function goToJailIndexOf(board: NavigableBoard): number {
  return referenceIndex(board, board.goToJailTileId, 'gojail')
}

/** Économie de la map (repli sur le barème historique). */
export function boardEconomy(board: NavigableBoard): BoardEconomyConfig {
  return board.economy ?? DEFAULT_ECONOMY
}

/** Capital de départ de la map. */
export function startingCashOf(board: NavigableBoard): number {
  return boardEconomy(board).startingCash
}

/** Salaire perçu à chaque passage par la case Départ. */
export function salaryOnPassStart(board: NavigableBoard): number {
  return boardEconomy(board).salaryOnPassStart
}
