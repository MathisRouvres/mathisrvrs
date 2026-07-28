import type { BoardTheme } from '../content/schema'
import type { GameState, PlayerState } from './types'
import { cloneState } from './clone'
import {
  JAIL_CARD_TRADE_VALUE,
  MARKET_MAX_CARDS,
  TRADE_BALANCE_THRESHOLD,
  TRADE_MAX_KEPT,
  TRADE_TTL_MS,
} from './constants'
import { getMarketCardById } from '../content/market'

/**
 * Négociation / échanges en temps réel (Phase 7).
 *
 * Les échanges sont un CANAL PARALLÈLE non bloquant : ils vivent dans `state.trades`
 * et n’altèrent jamais la machine à états du tour (la partie n’est jamais bloquée par
 * une offre — elle expire au bout de `TRADE_TTL_MS`). Tout est pur et sérialisable ;
 * le temps entre par un `now` injecté (déterminisme, comme l’horloge).
 *
 * On n’échange JAMAIS de gorgées : uniquement cash, propriétés, jetons « sortie de
 * prison » et cartes du Marché Noir. Le plafond d’inventaire (`MARKET_MAX_CARDS`)
 * est vérifié à l’acceptation : un échange ne peut pas faire déborder les poches.
 */

export const TRADE_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'countered',
  'expired',
  'cancelled',
] as const
export type TradeStatus = (typeof TRADE_STATUSES)[number]

/** Actifs d’un côté de l’échange (jamais de gorgées). */
export interface TradeBundle {
  cash: number
  properties: string[]
  jailCards: number
  /** Cartes du Marché Noir cédées (identifiants, doublons possibles). */
  cards: string[]
}

export interface TradeOffer {
  id: string
  senderId: string
  receiverId: string
  offeredAssets: TradeBundle
  requestedAssets: TradeBundle
  status: TradeStatus
  createdAt: number
  expiresAt: number
}

export type TradeError =
  | 'invalid_players'
  | 'self_trade'
  | 'player_inactive'
  | 'empty_offer'
  | 'trade_not_found'
  | 'trade_not_pending'
  | 'not_receiver'
  | 'not_sender'
  | 'not_participant'
  | 'asset_unavailable'
  | 'inventory_full'
  | 'expired'

export interface TradeResult {
  state: GameState
  offer: TradeOffer | null
  error: TradeError | null
}

export function emptyBundle(): TradeBundle {
  return { cash: 0, properties: [], jailCards: 0, cards: [] }
}

/**
 * Normalise un bundle : cash/jailCards entiers ≥ 0, propriétés dédupliquées,
 * cartes bornées au plafond d’inventaire (les doublons sont légitimes : deux
 * Boucliers restent deux Boucliers).
 */
export function normalizeBundle(b: Partial<TradeBundle> | undefined): TradeBundle {
  const cash = Math.max(0, Math.floor(b?.cash ?? 0))
  const jailCards = Math.max(0, Math.floor(b?.jailCards ?? 0))
  const properties = Array.from(new Set(b?.properties ?? []))
  const cards = (b?.cards ?? []).slice(0, MARKET_MAX_CARDS)
  return { cash, properties, jailCards, cards }
}

function bundleEmpty(b: TradeBundle): boolean {
  return b.cash === 0 && b.jailCards === 0 && b.properties.length === 0 && b.cards.length === 0
}

function findPlayer(state: GameState, id: string): PlayerState | undefined {
  return state.players.find((p) => p.id === id)
}

/** Le joueur détient-il RÉELLEMENT tous les actifs du bundle (cash, cartes, propriétés) ? */
function ownsBundle(state: GameState, player: PlayerState, bundle: TradeBundle): boolean {
  if (player.cash < bundle.cash) return false
  if (player.jailCards < bundle.jailCards) return false
  for (const spaceId of bundle.properties) {
    if (state.ownership[spaceId] !== player.id) return false
    if (!player.ownedSpaceIds.includes(spaceId)) return false
  }
  // Cartes : chaque exemplaire cédé doit exister dans la main (doublons compris).
  const hand = [...(player.marketCards ?? [])]
  for (const cardId of bundle.cards) {
    const at = hand.indexOf(cardId)
    if (at < 0) return false
    hand.splice(at, 1)
  }
  return true
}

/** L’échange laisse-t-il les deux mains sous le plafond d’inventaire ? */
function fitsInventory(player: PlayerState, given: TradeBundle, received: TradeBundle): boolean {
  const size = (player.marketCards ?? []).length - given.cards.length + received.cards.length
  return size <= MARKET_MAX_CARDS
}

/** Transfert atomique d’un bundle d’un joueur vers un autre (mute un état déjà cloné). */
function moveBundle(state: GameState, from: PlayerState, to: PlayerState, bundle: TradeBundle): void {
  from.cash -= bundle.cash
  to.cash += bundle.cash
  from.jailCards -= bundle.jailCards
  to.jailCards += bundle.jailCards
  if (bundle.cards.length > 0) {
    const hand = [...(from.marketCards ?? [])]
    for (const cardId of bundle.cards) {
      const at = hand.indexOf(cardId)
      if (at >= 0) hand.splice(at, 1)
    }
    from.marketCards = hand
    to.marketCards = [...(to.marketCards ?? []), ...bundle.cards]
  }
  for (const spaceId of bundle.properties) {
    from.ownedSpaceIds = from.ownedSpaceIds.filter((id) => id !== spaceId)
    to.ownedSpaceIds.push(spaceId)
    state.ownership[spaceId] = to.id
  }
}

function pushOffer(state: GameState, offer: TradeOffer): void {
  state.trades = [...state.trades, offer].slice(-TRADE_MAX_KEPT)
}

function replaceOffer(state: GameState, id: string, patch: Partial<TradeOffer>): TradeOffer | null {
  let updated: TradeOffer | null = null
  state.trades = state.trades.map((o) => {
    if (o.id !== id) return o
    updated = { ...o, ...patch }
    return updated
  })
  return updated
}

/** Crée une offre (`pending`). Validation légère : la vérification dure est à l’acceptation. */
export function createOffer(
  state: GameState,
  senderId: string,
  receiverId: string,
  offered: Partial<TradeBundle>,
  requested: Partial<TradeBundle>,
  now: number,
): TradeResult {
  if (senderId === receiverId) return { state, offer: null, error: 'self_trade' }
  const sender = findPlayer(state, senderId)
  const receiver = findPlayer(state, receiverId)
  if (!sender || !receiver) return { state, offer: null, error: 'invalid_players' }
  if (sender.eliminated || receiver.eliminated) return { state, offer: null, error: 'player_inactive' }

  const offeredAssets = normalizeBundle(offered)
  const requestedAssets = normalizeBundle(requested)
  if (bundleEmpty(offeredAssets) && bundleEmpty(requestedAssets)) {
    return { state, offer: null, error: 'empty_offer' }
  }

  const next = cloneState(state)
  next.tradeSeq += 1
  const offer: TradeOffer = {
    id: `t${next.tradeSeq}`,
    senderId,
    receiverId,
    offeredAssets,
    requestedAssets,
    status: 'pending',
    createdAt: now,
    expiresAt: now + TRADE_TTL_MS,
  }
  pushOffer(next, offer)
  return { state: next, offer, error: null }
}

function activePending(state: GameState, offerId: string, now: number): TradeOffer | TradeError {
  const offer = state.trades.find((o) => o.id === offerId)
  if (!offer) return 'trade_not_found'
  if (offer.status !== 'pending') return 'trade_not_pending'
  if (now >= offer.expiresAt) return 'expired'
  return offer
}

/**
 * Réponse à une offre. `accept` déclenche la validation métier COMPLÈTE puis un
 * échange ATOMIQUE (tout-ou-rien). Idempotent : une offre déjà résolue renvoie
 * `trade_not_pending` sans double transfert.
 */
export function respondOffer(
  state: GameState,
  offerId: string,
  byId: string,
  accept: boolean,
  now: number,
): TradeResult {
  const found = activePending(state, offerId, now)
  if (typeof found === 'string') return { state, offer: null, error: found }
  const offer = found
  if (offer.receiverId !== byId) return { state, offer: null, error: 'not_receiver' }

  if (!accept) {
    const next = cloneState(state)
    const updated = replaceOffer(next, offerId, { status: 'declined' })
    return { state: next, offer: updated, error: null }
  }

  const sender = findPlayer(state, offer.senderId)
  const receiver = findPlayer(state, offer.receiverId)
  if (!sender || !receiver) return { state, offer: null, error: 'invalid_players' }
  if (sender.eliminated || receiver.eliminated) return { state, offer: null, error: 'player_inactive' }
  // Re-validation au moment T de l’acceptation (les actifs ont pu bouger).
  if (!ownsBundle(state, sender, offer.offeredAssets)) return { state, offer: null, error: 'asset_unavailable' }
  if (!ownsBundle(state, receiver, offer.requestedAssets)) return { state, offer: null, error: 'asset_unavailable' }
  // Plafond d’inventaire : un deal ne peut pas faire déborder les poches.
  if (!fitsInventory(sender, offer.offeredAssets, offer.requestedAssets)) {
    return { state, offer: null, error: 'inventory_full' }
  }
  if (!fitsInventory(receiver, offer.requestedAssets, offer.offeredAssets)) {
    return { state, offer: null, error: 'inventory_full' }
  }

  const next = cloneState(state)
  const s2 = findPlayer(next, offer.senderId)!
  const r2 = findPlayer(next, offer.receiverId)!
  moveBundle(next, s2, r2, offer.offeredAssets) // sender → receiver
  moveBundle(next, r2, s2, offer.requestedAssets) // receiver → sender
  const updated = replaceOffer(next, offerId, { status: 'accepted' })
  return { state: next, offer: updated, error: null }
}

/** Contre-proposition : clôt l’offre (`countered`) et en crée une nouvelle, sens inversé. */
export function counterOffer(
  state: GameState,
  offerId: string,
  byId: string,
  offered: Partial<TradeBundle>,
  requested: Partial<TradeBundle>,
  now: number,
): TradeResult {
  const found = activePending(state, offerId, now)
  if (typeof found === 'string') return { state, offer: null, error: found }
  const offer = found
  if (offer.receiverId !== byId) return { state, offer: null, error: 'not_receiver' }

  let next = cloneState(state)
  replaceOffer(next, offerId, { status: 'countered' })
  // Le destinataire devient émetteur ; ce qu’il « offre » et « demande » repart de son point de vue.
  const created = createOffer(next, byId, offer.senderId, offered, requested, now)
  if (created.error) return { state, offer: null, error: created.error }
  next = created.state
  return { state: next, offer: created.offer, error: null }
}

/** Annulation par l’émetteur. */
export function cancelOffer(state: GameState, offerId: string, byId: string): TradeResult {
  const offer = state.trades.find((o) => o.id === offerId)
  if (!offer) return { state, offer: null, error: 'trade_not_found' }
  if (offer.status !== 'pending') return { state, offer: null, error: 'trade_not_pending' }
  if (offer.senderId !== byId) return { state, offer: null, error: 'not_sender' }
  const next = cloneState(state)
  const updated = replaceOffer(next, offerId, { status: 'cancelled' })
  return { state: next, offer: updated, error: null }
}

/** Passe en `expired` toute offre `pending` échue. Appelé par le tick de l’hôte. */
export function expireTrades(state: GameState, now: number): { state: GameState; changed: boolean } {
  const hasExpired = state.trades.some((o) => o.status === 'pending' && now >= o.expiresAt)
  if (!hasExpired) return { state, changed: false }
  const next = cloneState(state)
  next.trades = next.trades.map((o) =>
    o.status === 'pending' && now >= o.expiresAt ? { ...o, status: 'expired' } : o,
  )
  return { state: next, changed: true }
}

/** Offres `pending` (non échues) où `playerId` est destinataire. */
export function incomingOffers(state: GameState, playerId: string, now: number): TradeOffer[] {
  return state.trades.filter(
    (o) => o.status === 'pending' && o.receiverId === playerId && now < o.expiresAt,
  )
}

/** Valeur indicative d’un bundle (€). */
export function bundleValue(board: BoardTheme, bundle: TradeBundle): number {
  let value = bundle.cash + bundle.jailCards * JAIL_CARD_TRADE_VALUE
  for (const spaceId of bundle.properties) {
    const space = board.spaces.find((s) => s.id === spaceId)
    if (space && 'price' in space) value += space.price
  }
  for (const cardId of bundle.cards) {
    value += getMarketCardById(cardId)?.priceCash ?? 0
  }
  return value
}

export type TradeBalanceLabel = 'avantageux' | 'équilibré' | 'risqué'

export interface TradeEstimate {
  /** Gain net pour le DESTINATAIRE (€) = valeur reçue − valeur cédée. */
  receiverDelta: number
  label: TradeBalanceLabel
}

/**
 * Estimation INFORMATIVE de l’équilibre, du point de vue du destinataire.
 * Ne décide jamais à la place du joueur (n’empêche aucun échange déséquilibré).
 */
export function estimateTrade(board: BoardTheme, offer: TradeOffer): TradeEstimate {
  const received = bundleValue(board, offer.offeredAssets)
  const given = bundleValue(board, offer.requestedAssets)
  const receiverDelta = received - given
  let label: TradeBalanceLabel = 'équilibré'
  if (receiverDelta > TRADE_BALANCE_THRESHOLD) label = 'avantageux'
  else if (receiverDelta < -TRADE_BALANCE_THRESHOLD) label = 'risqué'
  return { receiverDelta, label }
}
