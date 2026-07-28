import type { GameState, PlayerState, MarketAnnounce } from './types'
import {
  MARKET_LOG_MAX,
  MARKET_MAX_CARDS,
  MARKET_STOCK_SIZE,
  SIPS_TO_CASH,
} from './constants'
import { cloneState } from './clone'
import { createGameRng } from './rng'
import { getMarketCardById, marketCardPool } from '../content/market'
import type { MarketCard } from '../content/schema'

/**
 * Marché Noir (Phase 12) — cartes achetables en argent OU en gorgées.
 *
 * Modèle additif : `state.market`, `state.lastRent`, `state.marketLog` et
 * `player.marketCards` sont optionnels. Les snapshots antérieurs restent
 * restaurables sans migration (tout se lit avec des valeurs par défaut).
 *
 * Le moteur applique lui-même les effets mécaniques (bouclier, vol, dé truqué,
 * passe-droit, clé de cuve). Les effets déclaratifs (miroir, bâillon,
 * procuration, tournée) sont **annoncés** à la table : le jeu consomme la carte
 * et journalise, il n'impose jamais de boire — comme tout le contenu du projet.
 */

export type MarketError =
  | 'no_market'
  | 'not_in_stock'
  | 'inventory_full'
  | 'insufficient_cash'
  | 'unknown_card'
  | 'not_owned'
  | 'no_target'
  | 'invalid_target'
  | 'nothing_to_steal'
  | 'no_rent_to_cancel'
  | 'already_shielded'
  | 'wrong_timing'

export interface MarketResult {
  state: GameState
  error: MarketError | null
  /** Gorgées dues par l'achat (0 si payé en argent). */
  sipsPaid: number
}

export interface UseResult {
  state: GameState
  error: MarketError | null
  announce: MarketAnnounce | null
}

/** Prix en gorgées d'une carte, dérivé du prix en euros (1 gorgée = 50 €). */
export function sipsPriceFor(card: MarketCard): number {
  return Math.max(1, Math.round(card.priceCash / SIPS_TO_CASH))
}

/** Cartes de marché détenues par un joueur (jamais `undefined`). */
export function marketCardsOf(player: PlayerState | null | undefined): string[] {
  return player?.marketCards ?? []
}

/** Le joueur peut-il encore recevoir une carte ? */
export function hasRoom(player: PlayerState | null | undefined): boolean {
  return marketCardsOf(player).length < MARKET_MAX_CARDS
}

/**
 * (Re)tire le stock en vente. Mutation directe : à n'appeler que sur un état
 * frais ou déjà cloné.
 *
 * Déterministe **sur un flux PRNG dédié** (`seed:market:<n>`) : le marché ne
 * consomme jamais `rngState`, donc il ne décale pas la séquence des dés. Le
 * rejeu reste identique et l'équité d'ordre n'est pas touchée.
 */
export function fillMarketStock(state: GameState): void {
  const draw = (state.marketDraws ?? 0) + 1
  const rng = createGameRng(`${state.config.seed}:market:${draw}`)
  state.market = { stock: rng.shuffle(marketCardPool).slice(0, MARKET_STOCK_SIZE) }
  state.marketDraws = draw
}

/** Stock courant (tableau vide si le marché n'a jamais été approvisionné). */
export function marketStock(state: GameState): string[] {
  return state.market?.stock ?? []
}

function pushAnnounce(state: GameState, entry: Omit<MarketAnnounce, 'seq'>): MarketAnnounce {
  const seq = (state.marketSeq ?? 0) + 1
  const announce: MarketAnnounce = { seq, ...entry }
  state.marketSeq = seq
  state.marketLog = [...(state.marketLog ?? []), announce].slice(-MARKET_LOG_MAX)
  return announce
}

/**
 * Achète une carte du stock, en argent (`cash`) ou en gorgées (`sips`).
 * Le stock est intégralement re-tiré après chaque achat : les emplacements
 * sont toujours pleins, et personne ne peut compter sur la même offre.
 */
export function buyMarketCard(
  state: GameState,
  playerId: string,
  cardId: string,
  pay: 'cash' | 'sips',
): MarketResult {
  const card = getMarketCardById(cardId)
  if (!card) return { state, error: 'unknown_card', sipsPaid: 0 }
  if (!marketStock(state).includes(cardId)) return { state, error: 'not_in_stock', sipsPaid: 0 }

  const player = state.players.find((p) => p.id === playerId)
  if (!player) return { state, error: 'invalid_target', sipsPaid: 0 }
  if (!hasRoom(player)) return { state, error: 'inventory_full', sipsPaid: 0 }
  if (pay === 'cash' && player.cash < card.priceCash) {
    return { state, error: 'insufficient_cash', sipsPaid: 0 }
  }

  const next = cloneState(state)
  const me = next.players.find((p) => p.id === playerId)!
  const sipsPaid = pay === 'sips' ? sipsPriceFor(card) : 0
  if (pay === 'cash') me.cash -= card.priceCash
  me.marketCards = [...marketCardsOf(me), cardId]
  fillMarketStock(next)
  next.phase = 'turn_cleanup'
  return { state: next, error: null, sipsPaid }
}

/** Quitte le marché sans rien acheter. */
export function skipMarket(state: GameState): GameState {
  const next = cloneState(state)
  next.phase = 'turn_cleanup'
  return next
}

/**
 * Joue une carte de l'inventaire. Utilisable à tout moment (canal parallèle),
 * sauf `before_roll` (avant son propre lancer) et `on_rent` (loyer du tour courant).
 */
export function playMarketCard(
  state: GameState,
  playerId: string,
  cardId: string,
  targetId: string | null = null,
): UseResult {
  const card = getMarketCardById(cardId)
  if (!card) return { state, error: 'unknown_card', announce: null }

  const player = state.players.find((p) => p.id === playerId)
  if (!player || player.eliminated) return { state, error: 'invalid_target', announce: null }
  if (!marketCardsOf(player).includes(cardId)) return { state, error: 'not_owned', announce: null }

  if (card.target === 'player') {
    if (!targetId || targetId === playerId) return { state, error: 'no_target', announce: null }
    const target = state.players.find((p) => p.id === targetId)
    if (!target || target.eliminated) return { state, error: 'invalid_target', announce: null }
  }

  // Contrôles de timing (les seuls qui dépendent de la phase).
  if (card.timing === 'before_roll') {
    const isCurrent = state.players[state.currentPlayerIndex]?.id === playerId
    if (!isCurrent || state.phase !== 'awaiting_roll') {
      return { state, error: 'wrong_timing', announce: null }
    }
  }
  if (card.effect === 'shield' && player.shielded) {
    return { state, error: 'already_shielded', announce: null }
  }
  if (card.effect === 'free_pass') {
    const rent = state.lastRent
    if (!rent || rent.payerId !== playerId || rent.turnStep !== state.turnStep) {
      return { state, error: 'no_rent_to_cancel', announce: null }
    }
  }
  if (card.effect === 'pickpocket') {
    const target = state.players.find((p) => p.id === targetId)
    if (marketCardsOf(target).length === 0) {
      return { state, error: 'nothing_to_steal', announce: null }
    }
  }

  const next = cloneState(state)
  const me = next.players.find((p) => p.id === playerId)!
  const target = targetId ? next.players.find((p) => p.id === targetId) ?? null : null

  // Consommation de la carte jouée (une seule occurrence).
  const kept = [...marketCardsOf(me)]
  kept.splice(kept.indexOf(cardId), 1)
  me.marketCards = kept

  switch (card.effect) {
    case 'shield':
      me.shielded = true
      break
    case 'loaded_die':
      me.loadedDie = true
      break
    case 'jail_key':
      me.jailCards += 1
      break
    case 'free_pass': {
      const rent = next.lastRent!
      const owner = next.players.find((p) => p.id === rent.ownerId)
      me.cash += rent.amount
      if (owner) owner.cash = Math.max(0, owner.cash - rent.amount)
      next.lastRent = null
      break
    }
    case 'pickpocket': {
      const loot = marketCardsOf(target)
      // Flux dédié, comme le stock : le vol ne décale pas la séquence des dés.
      const rng = createGameRng(`${next.config.seed}:pick:${next.marketSeq ?? 0}`)
      const stolen = rng.pick(loot)
      const left = [...loot]
      left.splice(left.indexOf(stolen), 1)
      if (target) target.marketCards = left
      if (hasRoom(me)) me.marketCards = [...marketCardsOf(me), stolen]
      break
    }
    default:
      // Effets déclaratifs (miroir, bâillon, procuration, tournée) : annonce seule.
      break
  }

  const announce = pushAnnounce(next, {
    cardId,
    byId: playerId,
    targetId: targetId ?? null,
    effect: card.effect,
    turnStep: next.turnStep,
  })
  return { state: next, error: null, announce }
}

/**
 * Consomme le bouclier d'un joueur s'il est armé. Mutation directe : appelé par
 * le moteur de tour au moment où une sanction en gorgées est créée.
 * @returns true si le bouclier a absorbé la sanction.
 */
export function consumeShield(player: PlayerState): boolean {
  if (!player.shielded) return false
  player.shielded = false
  return true
}
