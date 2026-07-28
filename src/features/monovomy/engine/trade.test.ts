import { describe, it, expect } from 'vitest'
import { soireeBoard } from '../content/board.soiree'
import { actionCards } from '../content/cards'
import {
  createGame,
  createOffer,
  respondOffer,
  counterOffer,
  cancelOffer,
  expireTrades,
  incomingOffers,
  estimateTrade,
  cloneState,
  TRADE_TTL_MS,
} from './index'
import { applyIntent } from '../net'
import type { GameConfig, GameState, PlayerSetup } from './types'

const POOL = actionCards.map((c) => c.id)
const BOARD = soireeBoard
const PROPS = BOARD.spaces.filter((s) => s.kind === 'property')
const PA = PROPS[0]!.id
const PB = PROPS[1]!.id

function cfg(): GameConfig {
  return { difficulty: 'inter', durationMinutes: 60, bankruptcy: 'none', themeId: 'soiree', seed: 'trade' }
}
function setups(): PlayerSetup[] {
  return [
    { id: 'p1', name: 'A', avatar: 'A', drinkMode: 'alcohol' },
    { id: 'p2', name: 'B', avatar: 'B', drinkMode: 'alcohol' },
    { id: 'p3', name: 'C', avatar: 'C', drinkMode: 'alcohol' },
  ]
}

/** Attribue une propriété à un joueur (état de test). */
function give(state: GameState, playerId: string, spaceId: string): GameState {
  const s = cloneState(state)
  const p = s.players.find((pl) => pl.id === playerId)!
  if (!p.ownedSpaceIds.includes(spaceId)) p.ownedSpaceIds.push(spaceId)
  s.ownership[spaceId] = playerId
  return s
}

function baseState(): GameState {
  let s = createGame(cfg(), setups(), POOL)
  s = give(s, 'p1', PA)
  s = give(s, 'p2', PB)
  return s
}

const totals = (s: GameState) => ({
  cash: s.players.reduce((a, p) => a + p.cash, 0),
  props: s.players.reduce((a, p) => a + p.ownedSpaceIds.length, 0),
  cards: s.players.reduce((a, p) => a + (p.marketCards ?? []).length, 0),
})

/** Place des cartes de marché dans la main d'un joueur (état de test). */
function hand(state: GameState, playerId: string, cards: string[]): GameState {
  const s = cloneState(state)
  s.players.find((p) => p.id === playerId)!.marketCards = [...cards]
  return s
}

describe('Phase 7 — négociation', () => {
  it('échange accepté : transfert atomique, aucune duplication', () => {
    const s0 = baseState()
    const before = totals(s0)
    const created = createOffer(s0, 'p1', 'p2', { cash: 300, properties: [PA] }, { properties: [PB] }, 1000)
    expect(created.error).toBeNull()
    const done = respondOffer(created.state, created.offer!.id, 'p2', true, 1500)
    expect(done.error).toBeNull()
    expect(done.offer!.status).toBe('accepted')

    const p1 = done.state.players.find((p) => p.id === 'p1')!
    const p2 = done.state.players.find((p) => p.id === 'p2')!
    expect(p1.cash).toBe(1500 - 300)
    expect(p2.cash).toBe(1500 + 300)
    expect(p1.ownedSpaceIds).toContain(PB)
    expect(p1.ownedSpaceIds).not.toContain(PA)
    expect(p2.ownedSpaceIds).toContain(PA)
    expect(done.state.ownership[PA]).toBe('p2')
    expect(done.state.ownership[PB]).toBe('p1')
    // Conservation globale : ni argent ni propriété créés/détruits.
    expect(totals(done.state)).toEqual(before)
  })

  it('échange refusé : statut declined, aucun transfert', () => {
    const s0 = baseState()
    const created = createOffer(s0, 'p1', 'p2', { cash: 300 }, { properties: [PB] }, 1000)
    const res = respondOffer(created.state, created.offer!.id, 'p2', false, 1200)
    expect(res.offer!.status).toBe('declined')
    expect(totals(res.state)).toEqual(totals(s0))
  })

  it('offre expirée : refus + passage en expired par le tick', () => {
    const s0 = baseState()
    const created = createOffer(s0, 'p1', 'p2', { cash: 100 }, {}, 1000)
    expect(created.offer!.expiresAt).toBe(1000 + TRADE_TTL_MS)
    const late = respondOffer(created.state, created.offer!.id, 'p2', true, 1000 + TRADE_TTL_MS + 1)
    expect(late.error).toBe('expired')
    const exp = expireTrades(created.state, 1000 + TRADE_TTL_MS + 1)
    expect(exp.changed).toBe(true)
    expect(exp.state.trades[0]!.status).toBe('expired')
    expect(incomingOffers(exp.state, 'p2', 1000 + TRADE_TTL_MS + 1)).toHaveLength(0)
  })

  it('contre-proposition : originale countered, nouvelle offre inversée', () => {
    const s0 = baseState()
    const created = createOffer(s0, 'p1', 'p2', { cash: 300 }, { properties: [PB] }, 1000)
    const counter = counterOffer(created.state, created.offer!.id, 'p2', { properties: [PB] }, { cash: 500 }, 1100)
    expect(counter.error).toBeNull()
    const original = counter.state.trades.find((o) => o.id === created.offer!.id)!
    expect(original.status).toBe('countered')
    expect(counter.offer!.senderId).toBe('p2')
    expect(counter.offer!.receiverId).toBe('p1')
    expect(counter.offer!.status).toBe('pending')
  })

  it('actif vendu entre création et acceptation → asset_unavailable', () => {
    const s0 = baseState()
    const created = createOffer(s0, 'p1', 'p2', { properties: [PA] }, { cash: 200 }, 1000)
    // PA change de main avant l’acceptation.
    const sold = give(created.state, 'p3', PA)
    const p1 = sold.players.find((p) => p.id === 'p1')!
    p1.ownedSpaceIds = p1.ownedSpaceIds.filter((id) => id !== PA)
    const res = respondOffer(sold, created.offer!.id, 'p2', true, 1200)
    expect(res.error).toBe('asset_unavailable')
  })

  it('joueur en faillite pendant une offre → player_inactive', () => {
    const s0 = baseState()
    const created = createOffer(s0, 'p1', 'p2', { cash: 100 }, { properties: [PB] }, 1000)
    const s1 = cloneState(created.state)
    s1.players.find((p) => p.id === 'p2')!.eliminated = true
    const res = respondOffer(s1, created.offer!.id, 'p2', true, 1200)
    expect(res.error).toBe('player_inactive')
  })

  it('double acceptation : la seconde échoue sans re-transfert', () => {
    const s0 = baseState()
    const created = createOffer(s0, 'p1', 'p2', { cash: 300 }, { properties: [PB] }, 1000)
    const first = respondOffer(created.state, created.offer!.id, 'p2', true, 1100)
    expect(first.error).toBeNull()
    const second = respondOffer(first.state, created.offer!.id, 'p2', true, 1150)
    expect(second.error).toBe('trade_not_pending')
    expect(totals(second.state)).toEqual(totals(first.state))
  })

  it('réception du même message réseau plusieurs fois → un seul transfert', () => {
    const seats = { c1: 0, c2: 1, c3: 2 }
    const s0 = baseState()
    const create = applyIntent(s0, 'c1', seats, { type: 'tradeCreate', receiverId: 'p2', offered: { cash: 300, properties: [], jailCards: 0, cards: [] }, requested: { cash: 0, properties: [PB], jailCards: 0, cards: [] } }, BOARD, 1000)
    expect(create.error).toBeNull()
    const offerId = create.state.trades[0]!.id
    const resp = { type: 'tradeRespond', offerId, accept: true } as const
    const a = applyIntent(create.state, 'c2', seats, resp, BOARD, 1100)
    expect(a.error).toBeNull()
    // Rejeu du même message (idempotence réseau).
    const b = applyIntent(a.state, 'c2', seats, resp, BOARD, 1100)
    expect(b.error).toBe('trade_not_pending')
    expect(totals(b.state)).toEqual(totals(a.state))
    const p2a = a.state.players.find((p) => p.id === 'p2')!
    expect(p2a.cash).toBe(1500 + 300)
  })

  it('estimation informative (n’empêche aucun échange)', () => {
    const s0 = baseState()
    const created = createOffer(s0, 'p1', 'p2', { cash: 1000 }, {}, 1000)
    const est = estimateTrade(BOARD, created.offer!)
    expect(est.label).toBe('avantageux') // le destinataire reçoit 1000 sans rien céder
    expect(est.receiverDelta).toBe(1000)
  })

  it('annulation par l’émetteur', () => {
    const s0 = baseState()
    const created = createOffer(s0, 'p1', 'p2', { cash: 100 }, {}, 1000)
    const cancelled = cancelOffer(created.state, created.offer!.id, 'p1')
    expect(cancelled.offer!.status).toBe('cancelled')
    // Après annulation, plus rien à répondre.
    const resp = respondOffer(cancelled.state, created.offer!.id, 'p2', true, 1200)
    expect(resp.error).toBe('trade_not_pending')
  })

  it('échange une carte du Marché Noir : transfert atomique des deux mains', () => {
    let s0 = baseState()
    s0 = hand(s0, 'p1', ['mk_bouclier'])
    s0 = hand(s0, 'p2', ['mk_miroir'])
    const before = totals(s0)

    const created = createOffer(s0, 'p1', 'p2', { cards: ['mk_bouclier'] }, { cards: ['mk_miroir'] }, 1000)
    expect(created.error).toBeNull()
    const done = respondOffer(created.state, created.offer!.id, 'p2', true, 1100)
    expect(done.error).toBeNull()

    expect(done.state.players.find((p) => p.id === 'p1')!.marketCards).toEqual(['mk_miroir'])
    expect(done.state.players.find((p) => p.id === 'p2')!.marketCards).toEqual(['mk_bouclier'])
    expect(totals(done.state)).toEqual(before)
  })

  it('carte absente de la main → asset_unavailable', () => {
    const s0 = hand(baseState(), 'p1', ['mk_bouclier'])
    const created = createOffer(s0, 'p1', 'p2', { cards: ['mk_miroir'] }, { cash: 100 }, 1000)
    expect(respondOffer(created.state, created.offer!.id, 'p2', true, 1100).error).toBe('asset_unavailable')
  })

  it('gère les doublons : deux Boucliers cédés, un seul reste', () => {
    const s0 = hand(baseState(), 'p1', ['mk_bouclier', 'mk_bouclier', 'mk_miroir'])
    const created = createOffer(s0, 'p1', 'p2', { cards: ['mk_bouclier', 'mk_bouclier'] }, { cash: 100 }, 1000)
    const done = respondOffer(created.state, created.offer!.id, 'p2', true, 1100)
    expect(done.error).toBeNull()
    expect(done.state.players.find((p) => p.id === 'p1')!.marketCards).toEqual(['mk_miroir'])
    expect(done.state.players.find((p) => p.id === 'p2')!.marketCards).toEqual(['mk_bouclier', 'mk_bouclier'])
  })

  it('refuse un échange qui ferait déborder l’inventaire (3 cartes max)', () => {
    let s0 = hand(baseState(), 'p1', ['mk_bouclier'])
    s0 = hand(s0, 'p2', ['mk_miroir', 'mk_baillon', 'mk_tournee'])
    const created = createOffer(s0, 'p1', 'p2', { cards: ['mk_bouclier'] }, { cash: 100 }, 1000)
    expect(respondOffer(created.state, created.offer!.id, 'p2', true, 1100).error).toBe('inventory_full')
  })

  it('accepte quand l’échange laisse la main pile au plafond', () => {
    let s0 = hand(baseState(), 'p1', ['mk_bouclier'])
    s0 = hand(s0, 'p2', ['mk_miroir', 'mk_baillon', 'mk_tournee'])
    // p2 cède une carte en même temps qu'il en reçoit une : la main reste à 3.
    const created = createOffer(s0, 'p1', 'p2', { cards: ['mk_bouclier'] }, { cards: ['mk_tournee'] }, 1000)
    const done = respondOffer(created.state, created.offer!.id, 'p2', true, 1100)
    expect(done.error).toBeNull()
    expect(done.state.players.find((p) => p.id === 'p2')!.marketCards).toHaveLength(3)
  })

  it('valorise une carte à son prix de marché dans l’estimation', () => {
    const s0 = hand(baseState(), 'p1', ['mk_miroir'])
    const created = createOffer(s0, 'p1', 'p2', { cards: ['mk_miroir'] }, {}, 1000)
    expect(estimateTrade(BOARD, created.offer!).receiverDelta).toBe(300)
  })
})
