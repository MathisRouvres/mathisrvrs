import type { GameConfig, GameState, PlayerSetup, PlayerState } from './types'
import { createGameRng } from './rng'
import { buildTurnOrder, compensationForRank } from './order'
import { fillMarketStock } from './market'
import { startIndex, startingCashOf } from '../content/maps/navigation'
import { DEFAULT_BOARD_MAP_ID, isBoardMapId, type NavigableBoard } from '../content/maps/types'
import { hasBoardMap, getBoardMap, resolveBoardMapId } from '../content/maps/registry'
import { boardForMapId } from './board'

/**
 * Crée l’état initial d’une partie. `cardPool` = identifiants des cartes action
 * (fournis par le contenu) ; le deck est mélangé de façon déterministe.
 *
 * L’ordre de jeu est mélangé (si `config.shuffleOrder`) avec le PRNG seedé, et
 * une compensation de départ par rang peut être appliquée (`config.startCompensation`).
 * L’horloge n’est pas démarrée ici : appeler `startClock(state, now)` au lancement.
 *
 * Le plateau est résolu depuis `config.mapId` (repli : plateau classique) et
 * **figé** dans l’état (`mapId` / `mapVersion`) : il ne change plus ensuite.
 */
export function createGame(
  config: GameConfig,
  setups: PlayerSetup[],
  cardPool: readonly string[],
  map: NavigableBoard = boardForMapId(config.mapId),
): GameState {
  const rng = createGameRng(config.seed)
  const deck = rng.shuffle(cardPool)
  const order = buildTurnOrder(rng, setups.length, config.shuffleOrder === true)

  // Le capital de départ vient de l'économie de la map (repli : barème historique).
  const startingCash = startingCashOf(map)
  // Les pions démarrent sur la case Départ déclarée par la map (pas sur l'index 0 supposé).
  const startPosition = Math.max(0, startIndex(map))
  const players: PlayerState[] = setups.map((setup) => ({
    ...setup,
    position: startPosition,
    cash: startingCash,
    ownedSpaceIds: [],
    jailTurns: 0,
    inJail: false,
    jailCards: 0,
    bankrupt: false,
    eliminated: false,
    marketCards: [],
  }))
  // Compensation : le k-ième joueur dans l’ordre reçoit un bonus croissant.
  order.forEach((playerIndex, rank) => {
    const player = players[playerIndex]
    if (player) player.cash += compensationForRank(config, rank)
  })

  // Identité de la map figée dans l'état : un snapshot / replay recharge
  // exactement ce plateau, jamais celui sélectionné plus tard dans le lobby.
  const mapId = isBoardMapId(map.id)
    ? map.id
    : resolveBoardMapId(config.mapId) ?? DEFAULT_BOARD_MAP_ID
  const mapVersion = map.version ?? (hasBoardMap(mapId) ? getBoardMap(mapId).version : '0.0.0')

  const durationMs = Math.max(0, config.durationMinutes) * 60_000
  const state: GameState = {
    config,
    mapId,
    mapVersion,
    players,
    currentPlayerIndex: order[0] ?? 0,
    turn: 1,
    phase: 'awaiting_roll',
    finished: false,
    ownership: {},
    buildings: {},
    mortgaged: {},
    doublesStreak: 0,
    rollAgain: false,
    deck,
    deckCursor: 0,
    rngState: rng.getState(),
    themeId: config.themeId,
    order,
    orderCursor: 0,
    pendingCardId: null,
    startedAt: 0,
    endsAt: 0,
    remainingTime: durationMs,
    turnEndsAt: 0,
    endReason: null,
    trades: [],
    tradeSeq: 0,
    partyIntensity: 'warmup',
    activeRules: [],
    cardsPlayed: 0,
    turnStep: 0,
    market: null,
    lastRent: null,
    marketLog: [],
    marketSeq: 0,
    marketDraws: 0,
    shieldedCardId: null,
  }
  // Stock initial du Marché Noir : visible dès le lancement (objectif partagé).
  fillMarketStock(state)
  return state
}
