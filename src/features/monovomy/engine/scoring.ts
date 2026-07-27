import type { BoardTheme } from '../content/schema'
import type { GameState } from './types'
import { getBuildingLevel, isMortgaged, buildCostFor, mortgageValueFor } from './buildings'

/**
 * Patrimoine net d'un joueur = cash + valeur des propriétés + établissements,
 * moins la dette d'hypothèque (Phase 11B).
 */
export function netWorth(state: GameState, board: BoardTheme, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return 0
  let worth = player.cash
  for (const spaceId of player.ownedSpaceIds) {
    const space = board.spaces.find((s) => s.id === spaceId)
    if (!space || !('price' in space)) continue
    worth += space.price
    worth += getBuildingLevel(state, spaceId) * buildCostFor(space)
    if (isMortgaged(state, spaceId)) worth -= mortgageValueFor(space)
  }
  return worth
}

export interface RankingEntry {
  playerId: string
  name: string
  netWorth: number
  cash: number
  properties: number
  eliminated: boolean
}

/** Classement final : patrimoine net décroissant, joueurs éliminés en dernier. */
export function ranking(state: GameState, board: BoardTheme): RankingEntry[] {
  return state.players
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      netWorth: netWorth(state, board, p.id),
      cash: p.cash,
      properties: p.ownedSpaceIds.length,
      eliminated: p.eliminated,
    }))
    .sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1
      return b.netWorth - a.netWorth
    })
}
