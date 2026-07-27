import type { BoardSpace, BoardTheme } from '../content/schema'
import type { GameState } from './types'
import { cloneState } from './clone'

/**
 * Établissements & hypothèques (Phase 11B) — additif et host-authoritative.
 *
 * Modèle volontairement additif : `state.buildings` (spaceId → niveau 1..N) et
 * `state.mortgaged` (spaceId → true) sont OPTIONNELS. Les états/snapshots antérieurs
 * (sans ces champs) restent valides : tout se lit avec des valeurs par défaut
 * (niveau 0, non hypothéqué). Aucune rupture de protocole.
 *
 * Le moteur ne stocke aucune donnée de coût : le coût de construction dérive du
 * prix de la case (surchargable via `space.buildCost` en contenu, plus tard).
 */

export type BuildingError =
  | 'not_property'
  | 'not_owner'
  | 'not_monopoly'
  | 'is_mortgaged'
  | 'max_level'
  | 'uneven_build'
  | 'uneven_sell'
  | 'no_building'
  | 'insufficient_cash'
  | 'has_buildings'
  | 'already_mortgaged'
  | 'not_mortgaged'

/** Niveau max = base(0) + maisons + hôtel = rents.length - 1. */
export function maxLevel(space: BoardSpace): number {
  return 'rents' in space ? Math.max(0, space.rents.length - 1) : 0
}

export function getBuildingLevel(state: GameState, spaceId: string): number {
  return state.buildings?.[spaceId] ?? 0
}

export function isMortgaged(state: GameState, spaceId: string): boolean {
  return state.mortgaged?.[spaceId] === true
}

/** Coût d'une maison / hôtel (par palier) — moitié du prix, arrondi. */
export function buildCostFor(space: BoardSpace): number {
  if (!('price' in space)) return 0
  const override = (space as { buildCost?: number }).buildCost
  return override ?? Math.round(space.price / 2)
}

/** Remboursement à la revente d'un palier (moitié du coût de construction). */
export function sellRefundFor(space: BoardSpace): number {
  return Math.round(buildCostFor(space) / 2)
}

/** Crédit obtenu à l'hypothèque = moitié du prix. */
export function mortgageValueFor(space: BoardSpace): number {
  return 'price' in space ? Math.round(space.price / 2) : 0
}

/** Coût pour lever l'hypothèque = valeur + 10 % d'intérêt. */
export function unmortgageCostFor(space: BoardSpace): number {
  return Math.ceil(mortgageValueFor(space) * 1.1)
}

function findSpace(board: BoardTheme, spaceId: string): BoardSpace | undefined {
  return board.spaces.find((s) => s.id === spaceId)
}

/** Toutes les propriétés du groupe couleur d'une case (constructibles). */
function groupSpaces(board: BoardTheme, groupId: string): BoardSpace[] {
  return board.spaces.filter((s) => s.kind === 'property' && s.group === groupId)
}

/** Le joueur possède-t-il TOUT le groupe couleur (monopole) ? */
export function groupComplete(state: GameState, board: BoardTheme, groupId: string, ownerId: string): boolean {
  const spaces = groupSpaces(board, groupId)
  if (spaces.length === 0) return false
  return spaces.every((s) => state.ownership[s.id] === ownerId)
}

interface Guard {
  ok: boolean
  error: BuildingError | null
  space: BoardSpace | null
}

function ownedProperty(state: GameState, board: BoardTheme, playerId: string, spaceId: string): Guard {
  const space = findSpace(board, spaceId)
  if (!space || space.kind !== 'property') return { ok: false, error: 'not_property', space: null }
  if (state.ownership[spaceId] !== playerId) return { ok: false, error: 'not_owner', space }
  return { ok: true, error: null, space }
}

/** Peut-on construire un palier sur cette case ? (validation pure, sans muter) */
export function canBuild(state: GameState, board: BoardTheme, playerId: string, spaceId: string): Guard & { cost: number } {
  const g = ownedProperty(state, board, playerId, spaceId)
  if (!g.ok || !g.space) return { ...g, cost: 0 }
  const space = g.space
  const group = space.kind === 'property' ? space.group : ''
  if (!groupComplete(state, board, group, playerId)) return { ok: false, error: 'not_monopoly', space, cost: 0 }
  if (isMortgaged(state, spaceId)) return { ok: false, error: 'is_mortgaged', space, cost: 0 }

  const level = getBuildingLevel(state, spaceId)
  if (level >= maxLevel(space)) return { ok: false, error: 'max_level', space, cost: 0 }

  // Construction homogène : on ne peut monter une case qu'au niveau minimum du groupe.
  const siblings = groupSpaces(board, group)
  const minLevel = Math.min(...siblings.map((s) => getBuildingLevel(state, s.id)))
  if (level !== minLevel) return { ok: false, error: 'uneven_build', space, cost: 0 }

  const cost = buildCostFor(space)
  const player = state.players.find((p) => p.id === playerId)
  if (!player || player.cash < cost) return { ok: false, error: 'insufficient_cash', space, cost }
  return { ok: true, error: null, space, cost }
}

/** Peut-on revendre un palier ? (revente homogène : depuis le niveau max du groupe) */
export function canSell(state: GameState, board: BoardTheme, playerId: string, spaceId: string): Guard & { refund: number } {
  const g = ownedProperty(state, board, playerId, spaceId)
  if (!g.ok || !g.space) return { ...g, refund: 0 }
  const space = g.space
  const level = getBuildingLevel(state, spaceId)
  if (level <= 0) return { ok: false, error: 'no_building', space, refund: 0 }
  const group = space.kind === 'property' ? space.group : ''
  const siblings = groupSpaces(board, group)
  const maxGroup = Math.max(...siblings.map((s) => getBuildingLevel(state, s.id)))
  if (level !== maxGroup) return { ok: false, error: 'uneven_sell', space, refund: 0 }
  return { ok: true, error: null, space, refund: sellRefundFor(space) }
}

export function canMortgage(state: GameState, board: BoardTheme, playerId: string, spaceId: string): Guard & { value: number } {
  const g = ownedProperty(state, board, playerId, spaceId)
  if (!g.ok || !g.space) return { ...g, value: 0 }
  if (isMortgaged(state, spaceId)) return { ok: false, error: 'already_mortgaged', space: g.space, value: 0 }
  if (getBuildingLevel(state, spaceId) > 0) return { ok: false, error: 'has_buildings', space: g.space, value: 0 }
  return { ok: true, error: null, space: g.space, value: mortgageValueFor(g.space) }
}

export function canUnmortgage(state: GameState, board: BoardTheme, playerId: string, spaceId: string): Guard & { cost: number } {
  const g = ownedProperty(state, board, playerId, spaceId)
  if (!g.ok || !g.space) return { ...g, cost: 0 }
  if (!isMortgaged(state, spaceId)) return { ok: false, error: 'not_mortgaged', space: g.space, cost: 0 }
  const cost = unmortgageCostFor(g.space)
  const player = state.players.find((p) => p.id === playerId)
  if (!player || player.cash < cost) return { ok: false, error: 'insufficient_cash', space: g.space, cost }
  return { ok: true, error: null, space: g.space, cost }
}

export interface BuildingResult {
  state: GameState
  error: BuildingError | null
}

export function build(state: GameState, board: BoardTheme, playerId: string, spaceId: string): BuildingResult {
  const check = canBuild(state, board, playerId, spaceId)
  if (!check.ok) return { state, error: check.error }
  const next = cloneState(state)
  const player = next.players.find((p) => p.id === playerId)!
  player.cash -= check.cost
  next.buildings = { ...(next.buildings ?? {}), [spaceId]: getBuildingLevel(next, spaceId) + 1 }
  return { state: next, error: null }
}

export function sellBuilding(state: GameState, board: BoardTheme, playerId: string, spaceId: string): BuildingResult {
  const check = canSell(state, board, playerId, spaceId)
  if (!check.ok) return { state, error: check.error }
  const next = cloneState(state)
  const player = next.players.find((p) => p.id === playerId)!
  player.cash += check.refund
  const level = getBuildingLevel(next, spaceId) - 1
  const buildings = { ...(next.buildings ?? {}) }
  if (level <= 0) delete buildings[spaceId]
  else buildings[spaceId] = level
  next.buildings = buildings
  return { state: next, error: null }
}

export function mortgage(state: GameState, board: BoardTheme, playerId: string, spaceId: string): BuildingResult {
  const check = canMortgage(state, board, playerId, spaceId)
  if (!check.ok) return { state, error: check.error }
  const next = cloneState(state)
  const player = next.players.find((p) => p.id === playerId)!
  player.cash += check.value
  next.mortgaged = { ...(next.mortgaged ?? {}), [spaceId]: true }
  return { state: next, error: null }
}

export function unmortgage(state: GameState, board: BoardTheme, playerId: string, spaceId: string): BuildingResult {
  const check = canUnmortgage(state, board, playerId, spaceId)
  if (!check.ok) return { state, error: check.error }
  const next = cloneState(state)
  const player = next.players.find((p) => p.id === playerId)!
  player.cash -= check.cost
  const mortgaged = { ...(next.mortgaged ?? {}) }
  delete mortgaged[spaceId]
  next.mortgaged = mortgaged
  return { state: next, error: null }
}

/** Purge bâtiments + hypothèque d'un ensemble de cases (faillite « classic »). */
export function clearImprovements(state: GameState, spaceIds: string[]): void {
  if (state.buildings) for (const id of spaceIds) delete state.buildings[id]
  if (state.mortgaged) for (const id of spaceIds) delete state.mortgaged[id]
}

/** Vue agrégée pour l'UI (boutons de gestion d'une propriété). */
export function propertyManagement(state: GameState, board: BoardTheme, playerId: string | null, spaceId: string) {
  const space = findSpace(board, spaceId)
  const isProp = Boolean(space && space.kind === 'property')
  const level = getBuildingLevel(state, spaceId)
  const mortgaged = isMortgaged(state, spaceId)
  const owner = state.ownership[spaceId] ?? null
  const mine = playerId != null && owner === playerId
  return {
    isProperty: isProp,
    level,
    maxLevel: space ? maxLevel(space) : 0,
    mortgaged,
    isMonopoly: isProp && owner ? groupComplete(state, board, (space as { group: string }).group, owner) : false,
    buildCost: space ? buildCostFor(space) : 0,
    sellRefund: space ? sellRefundFor(space) : 0,
    unmortgageCost: space ? unmortgageCostFor(space) : 0,
    canBuild: mine ? canBuild(state, board, playerId!, spaceId).ok : false,
    canSell: mine ? canSell(state, board, playerId!, spaceId).ok : false,
    canMortgage: mine ? canMortgage(state, board, playerId!, spaceId).ok : false,
    canUnmortgage: mine ? canUnmortgage(state, board, playerId!, spaceId).ok : false,
  }
}
