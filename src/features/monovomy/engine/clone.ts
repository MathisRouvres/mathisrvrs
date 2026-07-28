import type { GameState } from './types'

/** Clone profond (suffisant) d’un état de partie : moteur pur, jamais de mutation partagée. */
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      ownedSpaceIds: [...p.ownedSpaceIds],
      ...(p.marketCards ? { marketCards: [...p.marketCards] } : {}),
    })),
    market: state.market ? { stock: [...state.market.stock] } : state.market,
    lastRent: state.lastRent ? { ...state.lastRent } : state.lastRent,
    marketLog: state.marketLog ? [...state.marketLog] : state.marketLog,
    ownership: { ...state.ownership },
    buildings: { ...(state.buildings ?? {}) },
    mortgaged: { ...(state.mortgaged ?? {}) },
    auction: state.auction ? { ...state.auction, activeBidders: [...state.auction.activeBidders] } : state.auction,
    order: [...state.order],
    deck: state.deck,
    trades: [...state.trades],
    activeRules: [...state.activeRules],
  }
}
