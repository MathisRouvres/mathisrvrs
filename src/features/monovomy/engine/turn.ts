import type { BoardSpace, BoardTheme } from '../content/schema'
import type {
  BankruptcyInfo,
  DiceRoll,
  GameState,
  PlayerState,
  SpaceOutcome,
  TurnResult,
} from './types'
import type { EndReason } from './constants'
import {
  BANKRUPTCY_PENALTY_SIPS,
  BOARD_SIZE,
  JAIL_MAX_TURNS,
  RESCUE_CAPITAL,
  SALARY_PER_LAP,
} from './constants'
import { cloneState } from './clone'
import { getBuildingLevel, isMortgaged, groupComplete } from './buildings'
import { auctionsEnabled, beginAuction } from './auction'
import { createGameRng, rollDice } from './rng'
import { intensityRank, cardAllowedAtIntensity } from './ambiance'
import { consumeShield, fillMarketStock, marketStock } from './market'
import { getCardById } from '../content/cards'
import type { DrinkMode } from './constants'

export function currentPlayer(state: GameState): PlayerState {
  const player = state.players[state.currentPlayerIndex]
  if (!player) throw new Error('currentPlayer: index invalide')
  return player
}

interface Payment {
  paid: number
  shortfall: number
}

function payToBank(player: PlayerState, amount: number): Payment {
  const paid = Math.min(player.cash, amount)
  player.cash -= paid
  return { paid, shortfall: amount - paid }
}

function transfer(from: PlayerState, to: PlayerState, amount: number): Payment {
  const paid = Math.min(from.cash, amount)
  from.cash -= paid
  to.cash += paid
  return { paid, shortfall: amount - paid }
}

/** Résout une faillite selon le preset de l’hôte (voir GDD §8). */
export function applyBankruptcy(state: GameState, player: PlayerState): BankruptcyInfo {
  player.bankrupt = true
  const rule = state.config.bankruptcy
  if (rule === 'classic') {
    for (const spaceId of player.ownedSpaceIds) {
      delete state.ownership[spaceId]
      if (state.buildings) delete state.buildings[spaceId]
      if (state.mortgaged) delete state.mortgaged[spaceId]
    }
    player.ownedSpaceIds = []
    player.cash = 0
    player.eliminated = true
    player.inJail = false
    player.jailTurns = 0
    return { playerId: player.id, rule, eliminated: true, rescued: false, penaltySips: BANKRUPTCY_PENALTY_SIPS }
  }
  if (rule === 'none') {
    player.cash = RESCUE_CAPITAL
    return { playerId: player.id, rule, eliminated: false, rescued: true, penaltySips: BANKRUPTCY_PENALTY_SIPS }
  }
  // last_hunt : pas d’élimination, on continue à 0 (la sanction tombe à la fin)
  player.cash = Math.max(0, player.cash)
  return { playerId: player.id, rule, eliminated: false, rescued: false, penaltySips: BANKRUPTCY_PENALTY_SIPS }
}

function countStations(state: GameState, board: BoardTheme, ownerId: string): number {
  let count = 0
  for (const space of board.spaces) {
    if (space.kind === 'station' && state.ownership[space.id] === ownerId) count += 1
  }
  return count
}

export function computeRent(
  space: BoardSpace,
  roll: DiceRoll,
  state: GameState,
  board: BoardTheme,
  ownerId: string,
): number {
  // Propriété hypothéquée : aucun loyer perçu (Phase 11B).
  if (isMortgaged(state, space.id)) return 0
  if (space.kind === 'utility') return roll.total * 4
  if (space.kind === 'station') {
    const owned = countStations(state, board, ownerId)
    const index = Math.min(Math.max(owned - 1, 0), space.rents.length - 1)
    return space.rents[index] ?? space.rents[0] ?? 0
  }
  if (space.kind === 'property') {
    const level = getBuildingLevel(state, space.id)
    if (level > 0) {
      // Niveau d'établissement : loyer = rents[niveau] (1..N).
      return space.rents[Math.min(level, space.rents.length - 1)] ?? space.rents[0] ?? 0
    }
    // Terrain nu : loyer de base, doublé si le groupe complet appartient au même joueur.
    const base = space.rents[0] ?? 0
    return groupComplete(state, board, space.group, ownerId) ? base * 2 : base
  }
  return 0
}

/** Index de la case prison sur le plateau. */
export function jailIndex(board: BoardTheme): number {
  return board.spaces.findIndex((s) => s.kind === 'jail')
}

/**
 * Tire une carte pondérée par l’intensité d’ambiance (Phase 8). Les cartes dont
 * `intensity` dépasse le niveau courant sont exclues ; celles du niveau courant
 * (ou tagguées finale/rattrapage au bon moment) sont favorisées. Déterministe :
 * fait avancer `rngState`. Renvoie `null` seulement si le deck est vide.
 */
function drawWeightedCard(state: GameState): string | null {
  if (state.deck.length === 0) return null
  const rank = intensityRank(state.partyIntensity)
  const eligible = state.deck.filter((id) => cardAllowedAtIntensity(getCardById(id)?.intensity, state.partyIntensity))
  const pool = eligible.length > 0 ? eligible : state.deck
  const weights = pool.map((id) => {
    const card = getCardById(id)
    let w = 1
    if (card?.intensity && intensityRank(card.intensity) === rank) w += 3
    const tags = card?.tags ?? []
    if (state.partyIntensity === 'finale' && tags.includes('finale')) w += 3
    if ((state.partyIntensity === 'chaos' || state.partyIntensity === 'finale') && tags.includes('catchup')) w += 2
    if (rank >= intensityRank('party') && tags.includes('collective')) w += 1
    return w
  })
  const rng = createGameRng(state.config.seed, state.rngState)
  const picked = rng.weightedPick(pool, weights)
  state.rngState = rng.getState()
  return picked
}

interface Resolved {
  outcome: SpaceOutcome
  bankruptcy: BankruptcyInfo | null
}

function resolveLanding(
  state: GameState,
  space: BoardSpace,
  roll: DiceRoll,
  board: BoardTheme,
): Resolved {
  const player = currentPlayer(state)

  switch (space.kind) {
    case 'start':
      return { outcome: { kind: 'nothing', name: space.name }, bankruptcy: null }
    case 'parking':
      return { outcome: { kind: 'parking', name: space.name }, bankruptcy: null }
    case 'jail':
      return { outcome: { kind: 'jail_visit', name: space.name }, bankruptcy: null }
    case 'gojail': {
      const ji = jailIndex(board)
      if (ji >= 0) player.position = ji
      player.jailTurns = JAIL_MAX_TURNS
      player.inJail = true
      return { outcome: { kind: 'go_jail', name: space.name }, bankruptcy: null }
    }
    case 'tax': {
      const payment = payToBank(player, space.amount)
      const bankruptcy = payment.shortfall > 0 ? applyBankruptcy(state, player) : null
      // Bouclier : absorbe les gorgées, jamais l'argent.
      const sips = consumeShield(player) ? 0 : space.sips
      return { outcome: { kind: 'tax', name: space.name, amount: payment.paid, sips }, bankruptcy }
    }
    case 'market': {
      // Le stock est re-tiré à chaque visite : l'offre n'est jamais figée.
      fillMarketStock(state)
      return { outcome: { kind: 'market', name: space.name, offers: marketStock(state) }, bankruptcy: null }
    }
    case 'action': {
      const cardId = drawWeightedCard(state)
      state.deckCursor += 1
      if (!cardId) return { outcome: { kind: 'nothing', name: space.name }, bankruptcy: null }
      state.pendingCardId = cardId
      state.cardsPlayed += 1
      // Bouclier : absorbé dès le tirage, l'affichage lit `shieldedCardId`.
      const drawn = getCardById(cardId)
      state.shieldedCardId = drawn && drawn.baseSips > 0 && consumeShield(player) ? cardId : null
      return { outcome: { kind: 'draw_card', cardId }, bankruptcy: null }
    }
    case 'property':
    case 'station':
    case 'utility': {
      const ownerId = state.ownership[space.id]
      if (ownerId === undefined) {
        if (player.cash >= space.price) {
          return { outcome: { kind: 'buy_offer', spaceId: space.id, name: space.name, price: space.price }, bankruptcy: null }
        }
        return { outcome: { kind: 'cannot_afford', name: space.name, price: space.price }, bankruptcy: null }
      }
      if (ownerId === player.id) {
        return { outcome: { kind: 'own_property', name: space.name }, bankruptcy: null }
      }
      const owner = state.players.find((pl) => pl.id === ownerId)
      if (!owner) return { outcome: { kind: 'nothing', name: space.name }, bankruptcy: null }
      const rent = computeRent(space, roll, state, board, ownerId)
      const payment = transfer(player, owner, rent)
      const bankruptcy = payment.shortfall > 0 ? applyBankruptcy(state, player) : null
      const sips = consumeShield(player) ? 0 : space.sipTier
      // Mémorise le loyer : le Passe-Droit peut l'annuler pendant le même tour.
      state.lastRent = {
        payerId: player.id,
        ownerId: owner.id,
        spaceId: space.id,
        amount: payment.paid,
        sips,
        turnStep: state.turnStep,
      }
      return {
        outcome: {
          kind: 'pay_rent',
          name: space.name,
          toPlayerId: owner.id,
          toName: owner.name,
          amount: payment.paid,
          sips,
        },
        bankruptcy,
      }
    }
    default:
      return { outcome: { kind: 'nothing', name: 'Case' }, bankruptcy: null }
  }
}

/** Phase de repos consécutive à une résolution de case. */
function phaseForOutcome(outcome: SpaceOutcome): GameState['phase'] {
  if (outcome.kind === 'buy_offer') return 'awaiting_purchase'
  if (outcome.kind === 'draw_card') return 'awaiting_card'
  if (outcome.kind === 'market') return 'awaiting_market'
  return 'turn_cleanup'
}

/**
 * Déplace le joueur courant de `roll.total` cases, applique le salaire de tour,
 * résout la case et fixe la phase de repos. `next` doit déjà être un clone.
 * Cœur de mouvement partagé entre le tour normal et la sortie de prison.
 */
export function resolveMovement(
  next: GameState,
  board: BoardTheme,
  roll: DiceRoll,
): { result: TurnResult } {
  const player = currentPlayer(next)
  const arrival = player.position + roll.total
  const passedStart = arrival >= BOARD_SIZE
  player.position = arrival % BOARD_SIZE
  const salary = passedStart ? SALARY_PER_LAP : 0
  if (salary > 0) player.cash += salary

  const space = board.spaces[player.position]
  if (!space) throw new Error('resolveMovement: case introuvable')

  const resolved = resolveLanding(next, space, roll, board)
  next.phase = phaseForOutcome(resolved.outcome)

  // Propriété inatteignable (fonds insuffisants) → enchère si activée (Phase 11B-3).
  if (resolved.outcome.kind === 'cannot_afford' && auctionsEnabled(next)) {
    beginAuction(next, board, space.id)
  }

  return {
    result: {
      state: next,
      roll,
      passedStart,
      salary,
      outcome: resolved.outcome,
      bankruptcy: resolved.bankruptcy,
    },
  }
}

/** Retient le lancer au total le plus élevé (Dé Truqué). */
function bestOf(a: DiceRoll, b: DiceRoll): DiceRoll {
  return b.total > a.total ? b : a
}

/** Lance le dé pour le joueur courant (hors prison), le déplace et résout la case. */
export function takeTurn(state: GameState, board: BoardTheme): TurnResult {
  if (state.phase !== 'awaiting_roll' || state.finished) {
    throw new Error('takeTurn: phase invalide')
  }
  const rng = createGameRng(state.config.seed, state.rngState)
  // Dé Truqué (Marché Noir) : deux lancers, le plus haut total est retenu.
  const loaded = currentPlayer(state).loadedDie === true
  const first = rollDice(rng)
  const roll = loaded ? bestOf(first, rollDice(rng)) : first
  const next = cloneState(state)
  next.rngState = rng.getState()
  if (loaded) currentPlayer(next).loadedDie = false

  // 3e double consécutif → direction la prison, sans se déplacer.
  if (roll.isDouble && (next.doublesStreak ?? 0) + 1 >= 3) {
    const player = currentPlayer(next)
    const ji = jailIndex(board)
    if (ji >= 0) player.position = ji
    player.inJail = true
    player.jailTurns = JAIL_MAX_TURNS
    next.doublesStreak = 0
    next.rollAgain = false
    next.phase = 'turn_cleanup'
    return {
      state: next,
      roll,
      passedStart: false,
      salary: 0,
      outcome: { kind: 'go_jail', name: 'Triple double' },
      bankruptcy: null,
    }
  }

  // Double → le joueur rejouera après ce tour ; sinon, tour normal.
  if (roll.isDouble) {
    next.doublesStreak = (next.doublesStreak ?? 0) + 1
    next.rollAgain = true
  } else {
    next.doublesStreak = 0
    next.rollAgain = false
  }

  const out = resolveMovement(next, board, roll).result
  // Atterrir en prison (case « au poste ») annule le rejoue.
  if (currentPlayer(out.state).inJail) {
    out.state.doublesStreak = 0
    out.state.rollAgain = false
  }
  return out
}

/** Applique (ou non) l’achat de la propriété où se trouve le joueur courant. */
export function decideBuy(state: GameState, board: BoardTheme, buy: boolean): GameState {
  if (state.phase !== 'awaiting_purchase') {
    throw new Error('decideBuy: aucune décision en attente')
  }
  const next = cloneState(state)
  const player = currentPlayer(next)
  const space = board.spaces[player.position]
  if (buy && space && 'price' in space && player.cash >= space.price) {
    player.cash -= space.price
    player.ownedSpaceIds.push(space.id)
    next.ownership[space.id] = player.id
    next.phase = 'turn_cleanup'
    return next
  }
  // Refus (ou achat impossible) : enchère si activée, sinon fin de tour (Phase 11B-3).
  if (!buy && space && 'price' in space && auctionsEnabled(next)) {
    return beginAuction(next, board, space.id)
  }
  next.phase = 'turn_cleanup'
  return next
}

/**
 * Accuse réception de la carte tirée. `grantJailCard` (calculé par l’appelant à
 * partir de l’effet de la carte — le moteur reste découplé du contenu) accorde
 * un jeton « sortie de prison ».
 */
export function ackCard(state: GameState, grantJailCard = false): GameState {
  if (state.phase !== 'awaiting_card') {
    throw new Error('ackCard: aucune carte en attente')
  }
  const next = cloneState(state)
  if (grantJailCard) currentPlayer(next).jailCards += 1
  next.pendingCardId = null
  next.phase = 'turn_cleanup'
  return next
}

/** Passe au prochain joueur non éliminé (ordre de jeu) ; termine si un seul survivant. */
export function endTurn(state: GameState): GameState {
  if (state.finished) throw new Error('endTurn: partie terminée')
  const next = cloneState(state)
  next.pendingCardId = null
  next.turnStep += 1

  const alive = next.players.filter((p) => !p.eliminated)
  if (alive.length <= 1) {
    next.finished = true
    next.phase = 'finished'
    next.endReason = 'last_standing'
    next.turnEndsAt = 0
    return next
  }

  // Double au dernier lancer : le même joueur rejoue (sauf s'il vient d'aller en prison).
  if (next.rollAgain && !currentPlayer(next).inJail) {
    next.rollAgain = false
    next.phase = 'awaiting_roll'
    return next
  }
  next.rollAgain = false
  next.doublesStreak = 0

  const size = next.order.length
  let cursor = next.orderCursor
  let wrapped = false
  for (let step = 0; step < size; step += 1) {
    cursor += 1
    if (cursor >= size) {
      cursor -= size
      wrapped = true
    }
    const idx = next.order[cursor]
    if (idx !== undefined && !next.players[idx]?.eliminated) break
  }
  if (wrapped) next.turn += 1
  next.orderCursor = cursor
  next.currentPlayerIndex = next.order[cursor] ?? next.currentPlayerIndex
  next.phase = currentPlayer(next).inJail ? 'awaiting_jail' : 'awaiting_roll'
  return next
}

/**
 * Change le mode de boisson d’un joueur (Phase 8). Le passage en soft est libre à
 * tout moment ; le moteur ne conditionne rien (la confirmation du retour alcool est
 * gérée côté UI). Aucune sanction n’est jamais imposée.
 */
export function setDrinkMode(state: GameState, playerId: string, mode: DrinkMode): GameState {
  const next = cloneState(state)
  const player = next.players.find((p) => p.id === playerId)
  if (player) player.drinkMode = mode
  return next
}

/** Termine la partie (timer / hôte). */
export function endGame(state: GameState, reason: EndReason = 'host'): GameState {
  const next = cloneState(state)
  next.finished = true
  next.phase = 'finished'
  next.endReason = state.endReason ?? reason
  next.turnEndsAt = 0
  return next
}
