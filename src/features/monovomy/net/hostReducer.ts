import type { BoardTheme } from '../content/schema'
import type { GameState } from '../engine/types'
import {
  takeTurn,
  decideBuy,
  ackCard,
  endTurn,
  endGame,
  jailPayBail,
  jailUseCard,
  jailAttemptDouble,
  currentPlayer,
  createOffer,
  respondOffer,
  counterOffer,
  cancelOffer,
  activateRule,
  setDrinkMode,
  build,
  sellBuilding,
  mortgage,
  unmortgage,
  placeBid,
  passBid,
  buyMarketCard,
  skipMarket,
  playMarketCard,
  type TradeError,
  type MarketError,
  type BuildingError,
  type AuctionError,
} from '../engine'
import { validatePhaseIntent, type IntentError, type IntentType } from '../engine/stateMachine'
import { getCardById, getRuleById } from '../content'
import type { ClientId, Intent, SyncResult } from './protocol'

export interface ApplyResult {
  state: GameState
  sync: SyncResult | null
  error: IntentError | TradeError | BuildingError | AuctionError | MarketError | null
}

/** Intentions « canal parallèle » : hors machine à états du tour (négociation + ambiance). */
const SIDE_TYPES = new Set([
  'tradeCreate',
  'tradeRespond',
  'tradeCounter',
  'tradeCancel',
  'setDrinkMode',
  'marketUse',
])

/** Intentions d'enchère : tout joueur non éliminé, uniquement en phase awaiting_auction. */
const AUCTION_TYPES = new Set(['bid', 'passBid'])

/**
 * Applique l’intention d’un client à l’état autoritaire, avec contrôle du tour
 * ET de la phase (machine à états). Fonction pure : cœur transposable en serveur.
 * Toute intention invalide renvoie un code d’erreur métier clair sans muter l’état.
 */
export function applyIntent(
  state: GameState,
  fromClientId: ClientId,
  seatByClient: Readonly<Record<ClientId, number>>,
  intent: Intent,
  board: BoardTheme,
  now = 0,
): ApplyResult {
  const seat = seatByClient[fromClientId]
  const isCurrent = seat !== undefined && seat === state.currentPlayerIndex

  // endGame : autorité hôte, accepté à tout moment.
  if (intent.type === 'endGame') {
    return { state: endGame(state), sync: null, error: null }
  }

  // Canal parallèle (négociation + ambiance) : tout joueur actif, hors tour/phase.
  if (SIDE_TYPES.has(intent.type)) {
    if (state.finished) return { state, sync: null, error: 'game_over' }
    const meId = seat !== undefined ? state.players[seat]?.id : undefined
    if (!meId) return { state, sync: null, error: 'not_participant' }
    return applySideChannel(state, meId, intent, now)
  }

  // Enchères : tout joueur non éliminé peut miser/passer, uniquement en phase auction.
  if (AUCTION_TYPES.has(intent.type)) {
    if (state.finished) return { state, sync: null, error: 'game_over' }
    if (state.phase !== 'awaiting_auction') return { state, sync: null, error: 'wrong_phase' }
    const meId = seat !== undefined ? state.players[seat]?.id : undefined
    if (!meId) return { state, sync: null, error: 'not_participant' }
    if (intent.type === 'bid') {
      const r = placeBid(state, meId, intent.amount, now)
      return { state: r.state, sync: null, error: r.error }
    }
    const r = passBid(state, meId, board)
    return { state: r.state, sync: null, error: r.error }
  }

  // Contrôle du tour d’abord (l’émetteur doit être le joueur courant).
  if (!isCurrent) return { state, sync: null, error: 'not_your_turn' }

  // Contrôle de phase (machine à états). Les intentions de trade sont déjà traitées.
  const phaseError = validatePhaseIntent(state.phase, intent.type as IntentType)
  if (phaseError) return { state, sync: null, error: phaseError }

  switch (intent.type) {
    case 'roll': {
      const r = takeTurn(state, board)
      return { state: r.state, sync: toSync(r, fromClientId), error: null }
    }
    case 'buy':
      return { state: decideBuy(state, board, intent.yes), sync: null, error: null }
    case 'ackCard': {
      const card = state.pendingCardId ? getCardById(state.pendingCardId) : null
      let s = ackCard(state, card?.effect === 'jail_free')
      // Carte RÈGLE → active la règle temporaire associée (data-driven).
      if (card?.ruleId) {
        const def = getRuleById(card.ruleId)
        if (def) s = activateRule(s, def, now).state
      }
      return { state: s, sync: null, error: null }
    }
    case 'jail': {
      if (intent.action === 'card' && currentPlayer(state).jailCards <= 0) {
        return { state, sync: null, error: 'no_jail_card' }
      }
      const r =
        intent.action === 'bail'
          ? jailPayBail(state)
          : intent.action === 'card'
            ? jailUseCard(state)
            : intent.action === 'double'
              ? jailAttemptDouble(state, board)
              : null
      if (!r) return { state, sync: null, error: 'invalid_jail_action' }
      return { state: r.state, sync: toSync(r, fromClientId), error: null }
    }
    case 'endTurn':
      return { state: endTurn(state), sync: null, error: null }
    case 'marketBuy': {
      const meId = state.players[state.currentPlayerIndex]?.id
      if (!meId) return { state, sync: null, error: 'not_participant' }
      if (intent.cardId === null) return { state: skipMarket(state), sync: null, error: null }
      const r = buyMarketCard(state, meId, intent.cardId, intent.pay)
      return { state: r.state, sync: null, error: r.error }
    }
    case 'build':
    case 'sellBuilding':
    case 'mortgage':
    case 'unmortgage': {
      const meId = state.players[state.currentPlayerIndex]?.id
      if (!meId) return { state, sync: null, error: 'not_participant' }
      const fn =
        intent.type === 'build' ? build
          : intent.type === 'sellBuilding' ? sellBuilding
            : intent.type === 'mortgage' ? mortgage
              : unmortgage
      const r = fn(state, board, meId, intent.spaceId)
      return { state: r.state, sync: null, error: r.error }
    }
    default:
      return { state, sync: null, error: 'unknown_intent' }
  }
}

/** Applique une intention de canal parallèle (négociation + ambiance). */
function applySideChannel(state: GameState, meId: string, intent: Intent, now: number): ApplyResult {
  switch (intent.type) {
    case 'tradeCreate': {
      const r = createOffer(state, meId, intent.receiverId, intent.offered, intent.requested, now)
      return { state: r.state, sync: null, error: r.error }
    }
    case 'tradeRespond': {
      const r = respondOffer(state, intent.offerId, meId, intent.accept, now)
      return { state: r.state, sync: null, error: r.error }
    }
    case 'tradeCounter': {
      const r = counterOffer(state, intent.offerId, meId, intent.offered, intent.requested, now)
      return { state: r.state, sync: null, error: r.error }
    }
    case 'tradeCancel': {
      const r = cancelOffer(state, intent.offerId, meId)
      return { state: r.state, sync: null, error: r.error }
    }
    case 'setDrinkMode':
      return { state: setDrinkMode(state, meId, intent.mode), sync: null, error: null }
    case 'marketUse': {
      const r = playMarketCard(state, meId, intent.cardId, intent.targetId ?? null)
      return { state: r.state, sync: null, error: r.error }
    }
    default:
      return { state, sync: null, error: 'trade_not_found' }
  }
}

interface RollLike {
  roll: SyncResult['roll']
  outcome: SyncResult['outcome']
  salary: number
  passedStart: boolean
  bankruptcy: SyncResult['bankruptcy']
}

function toSync(r: RollLike, byClientId: ClientId): SyncResult {
  return {
    roll: r.roll,
    outcome: r.outcome,
    salary: r.salary,
    passedStart: r.passedStart,
    byClientId,
    bankruptcy: r.bankruptcy,
  }
}
