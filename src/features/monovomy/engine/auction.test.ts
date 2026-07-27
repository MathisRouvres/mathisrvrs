import { describe, it, expect } from 'vitest'
import { createGame } from './setup'
import { decideBuy } from './turn'
import {
  auctionsEnabled,
  placeBid,
  passBid,
  resolveAuction,
  auctionTimedOut,
  stampAuctionTimer,
  AUCTION_MIN_INCREMENT,
} from './auction'
import { soireeBoard } from '../content'
import type { GameConfig, GameState } from './types'

const SOIF_INDEX = soireeBoard.spaces.findIndex((s) => s.id === 'rue_soif')

function baseConfig(auctionOnPass: boolean): GameConfig {
  return { difficulty: 'inter', durationMinutes: 60, bankruptcy: 'none', themeId: 'soiree', seed: 'auc', auctionOnPass }
}

/** Partie à 3 joueurs, joueur courant posé sur rue_soif, phase awaiting_purchase. */
function atPurchase(auctionOnPass = true): GameState {
  const base = createGame(baseConfig(auctionOnPass), [
    { id: 'p1', name: 'A', avatar: 'A', drinkMode: 'alcohol' },
    { id: 'p2', name: 'B', avatar: 'B', drinkMode: 'alcohol' },
    { id: 'p3', name: 'C', avatar: 'C', drinkMode: 'alcohol' },
  ], [])
  const cur = base.currentPlayerIndex
  return {
    ...base,
    phase: 'awaiting_purchase',
    players: base.players.map((p, i) => (i === cur ? { ...p, position: SOIF_INDEX } : p)),
  }
}

describe('auctionsEnabled', () => {
  it('vrai via config, faux sinon', () => {
    expect(auctionsEnabled(atPurchase(true))).toBe(true)
    expect(auctionsEnabled(atPurchase(false))).toBe(false)
  })
})

describe('déclenchement', () => {
  it('refuser d’acheter ouvre une enchère quand activée', () => {
    const s = decideBuy(atPurchase(true), soireeBoard, false)
    expect(s.phase).toBe('awaiting_auction')
    expect(s.auction?.spaceId).toBe('rue_soif')
    expect(s.auction?.activeBidders).toHaveLength(3)
  })
  it('refuser d’acheter finit le tour quand désactivée', () => {
    const s = decideBuy(atPurchase(false), soireeBoard, false)
    expect(s.phase).toBe('turn_cleanup')
    expect(s.auction ?? null).toBeNull()
  })
})

describe('mises', () => {
  it('accepte une mise ≥ increment, refuse trop basse', () => {
    const s = decideBuy(atPurchase(true), soireeBoard, false)
    expect(placeBid(s, 'p2', AUCTION_MIN_INCREMENT - 1).error).toBe('bid_too_low')
    const r = placeBid(s, 'p2', AUCTION_MIN_INCREMENT)
    expect(r.error).toBeNull()
    expect(r.state.auction?.currentBid).toBe(AUCTION_MIN_INCREMENT)
    expect(r.state.auction?.highBidderId).toBe('p2')
  })
  it('refuse une mise au-dessus du cash', () => {
    const s = decideBuy(atPurchase(true), soireeBoard, false)
    expect(placeBid(s, 'p2', 999999).error).toBe('insufficient_cash')
  })
  it('impose l’increment au-dessus de la mise courante', () => {
    let s = decideBuy(atPurchase(true), soireeBoard, false)
    s = placeBid(s, 'p2', 100).state
    expect(placeBid(s, 'p3', 105).error).toBe('bid_too_low')
    expect(placeBid(s, 'p3', 110).error).toBeNull()
  })
})

describe('résolution', () => {
  it('attribue au meilleur enchérisseur quand tous les autres passent', () => {
    let s = decideBuy(atPurchase(true), soireeBoard, false)
    s = placeBid(s, 'p2', 120).state
    s = passBid(s, 'p1', soireeBoard).state
    s = passBid(s, 'p3', soireeBoard).state
    // Il ne reste que p2 (high bidder) → attribution.
    expect(s.phase).toBe('turn_cleanup')
    expect(s.auction ?? null).toBeNull()
    expect(s.ownership['rue_soif']).toBe('p2')
    const p2 = s.players.find((p) => p.id === 'p2')!
    expect(p2.ownedSpaceIds).toContain('rue_soif')
  })
  it('reste libre si personne ne mise', () => {
    let s = decideBuy(atPurchase(true), soireeBoard, false)
    s = passBid(s, 'p1', soireeBoard).state
    s = passBid(s, 'p2', soireeBoard).state
    s = passBid(s, 'p3', soireeBoard).state
    expect(s.phase).toBe('turn_cleanup')
    expect(s.ownership['rue_soif']).toBeUndefined()
  })
  it('timeout attribue au meilleur enchérisseur', () => {
    let s = decideBuy(atPurchase(true), soireeBoard, false)
    s = stampAuctionTimer(s, 1000)
    s = placeBid(s, 'p3', 200, 1000).state
    // Force l’expiration.
    const past = s.auction!.endsAt + 1
    expect(auctionTimedOut(s, past)).toBe(true)
    const resolved = resolveAuction(s, soireeBoard)
    expect(resolved.ownership['rue_soif']).toBe('p3')
    expect(resolved.phase).toBe('turn_cleanup')
  })
})
