import type { BoardTheme } from '../content/schema'
import type { GameState } from './types'
import { cloneState } from './clone'

/**
 * Enchères (Phase 11B-3) — host-authoritative, additif.
 *
 * Une propriété atterrie mais NON achetée (refus explicite ou fonds insuffisants)
 * part aux enchères si `config.auctionOnPass` ou la règle d'ambiance `rule_encheres`
 * est active. Tous les joueurs non éliminés peuvent miser (y compris celui qui a
 * refusé). Le timer est un timestamp absolu (comme l'horloge de tour), estampillé
 * par l'hôte, tolérant à la reconnexion.
 */

export const AUCTION_SECONDS = 20
export const AUCTION_MIN_INCREMENT = 10
/** Anti-snipe : chaque mise repousse la fin d'au moins ce délai. */
export const AUCTION_EXTEND_SECONDS = 8

export type AuctionError = 'no_auction' | 'not_bidder' | 'bid_too_low' | 'insufficient_cash'

export interface AuctionResult {
  state: GameState
  error: AuctionError | null
}

/** Les enchères sont-elles activées pour cette partie ? */
export function auctionsEnabled(state: GameState): boolean {
  if (state.config.auctionOnPass === true) return true
  return state.activeRules.some((r) => r.id === 'rule_encheres')
}

/** Ouvre une enchère (MUTE l'état déjà cloné). Résout d'emblée s'il n'y a aucun enchérisseur. */
export function beginAuction(state: GameState, board: BoardTheme, spaceId: string): GameState {
  const space = board.spaces.find((s) => s.id === spaceId)
  const bidders = state.players.filter((p) => !p.eliminated).map((p) => p.id)
  state.auction = {
    spaceId,
    name: space?.name ?? spaceId,
    currentBid: 0,
    highBidderId: null,
    activeBidders: bidders,
    minIncrement: AUCTION_MIN_INCREMENT,
    endsAt: 0,
  }
  state.phase = 'awaiting_auction'
  if (bidders.length === 0) finalizeAuction(state, board)
  return state
}

/** Estampille le timer d'enchère (hôte) au premier tick après ouverture. */
export function stampAuctionTimer(state: GameState, now: number): GameState {
  if (state.phase !== 'awaiting_auction' || !state.auction || state.auction.endsAt !== 0) return state
  const next = cloneState(state)
  next.auction!.endsAt = now + AUCTION_SECONDS * 1000
  return next
}

/** Mise minimale acceptable à cet instant. */
export function minBid(state: GameState): number {
  const a = state.auction
  if (!a) return 0
  return a.currentBid > 0 ? a.currentBid + a.minIncrement : a.minIncrement
}

export function placeBid(state: GameState, playerId: string, amount: number, now = 0): AuctionResult {
  if (state.phase !== 'awaiting_auction' || !state.auction) return { state, error: 'no_auction' }
  const a = state.auction
  if (!a.activeBidders.includes(playerId)) return { state, error: 'not_bidder' }
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return { state, error: 'not_bidder' }
  if (!Number.isFinite(amount) || amount < minBid(state)) return { state, error: 'bid_too_low' }
  if (amount > player.cash) return { state, error: 'insufficient_cash' }

  const next = cloneState(state)
  next.auction!.currentBid = amount
  next.auction!.highBidderId = playerId
  if (now > 0) next.auction!.endsAt = Math.max(next.auction!.endsAt, now + AUCTION_EXTEND_SECONDS * 1000)
  return { state: next, error: null }
}

export function passBid(state: GameState, playerId: string, board: BoardTheme): AuctionResult {
  if (state.phase !== 'awaiting_auction' || !state.auction) return { state, error: 'no_auction' }
  if (!state.auction.activeBidders.includes(playerId)) return { state, error: 'not_bidder' }
  const next = cloneState(state)
  next.auction!.activeBidders = next.auction!.activeBidders.filter((id) => id !== playerId)
  // Un seul (ou zéro) enchérisseur restant → attribution.
  if (next.auction!.activeBidders.length <= 1) finalizeAuction(next, board)
  return { state: next, error: null }
}

/** Attribue la propriété au meilleur enchérisseur (MUTE l'état cloné) puis clôt l'enchère. */
function finalizeAuction(state: GameState, board: BoardTheme): void {
  const a = state.auction
  if (a && a.highBidderId && a.currentBid > 0) {
    const winner = state.players.find((p) => p.id === a.highBidderId)
    const space = board.spaces.find((s) => s.id === a.spaceId)
    if (winner && space) {
      winner.cash -= a.currentBid
      state.ownership[a.spaceId] = winner.id
      if (!winner.ownedSpaceIds.includes(a.spaceId)) winner.ownedSpaceIds.push(a.spaceId)
    }
  }
  state.auction = null
  state.phase = 'turn_cleanup'
}

/** Clôture immédiate (timeout hôte) : attribue au meilleur enchérisseur ou laisse la case libre. */
export function resolveAuction(state: GameState, board: BoardTheme): GameState {
  if (state.phase !== 'awaiting_auction' || !state.auction) return state
  const next = cloneState(state)
  finalizeAuction(next, board)
  return next
}

export function auctionTimedOut(state: GameState, now: number): boolean {
  return (
    state.phase === 'awaiting_auction' &&
    !!state.auction &&
    state.auction.endsAt > 0 &&
    now >= state.auction.endsAt
  )
}
