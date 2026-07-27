import type { GameConfig, GameState, PlayerSetup, PlayerState } from './types'
import { STARTING_CASH } from './constants'
import { createGameRng } from './rng'
import { buildTurnOrder, compensationForRank } from './order'

/**
 * Crée l’état initial d’une partie. `cardPool` = identifiants des cartes action
 * (fournis par le contenu) ; le deck est mélangé de façon déterministe.
 *
 * L’ordre de jeu est mélangé (si `config.shuffleOrder`) avec le PRNG seedé, et
 * une compensation de départ par rang peut être appliquée (`config.startCompensation`).
 * L’horloge n’est pas démarrée ici : appeler `startClock(state, now)` au lancement.
 */
export function createGame(
  config: GameConfig,
  setups: PlayerSetup[],
  cardPool: readonly string[],
): GameState {
  const rng = createGameRng(config.seed)
  const deck = rng.shuffle(cardPool)
  const order = buildTurnOrder(rng, setups.length, config.shuffleOrder === true)

  const players: PlayerState[] = setups.map((setup) => ({
    ...setup,
    position: 0,
    cash: STARTING_CASH,
    ownedSpaceIds: [],
    jailTurns: 0,
    inJail: false,
    jailCards: 0,
    bankrupt: false,
    eliminated: false,
  }))
  // Compensation : le k-ième joueur dans l’ordre reçoit un bonus croissant.
  order.forEach((playerIndex, rank) => {
    const player = players[playerIndex]
    if (player) player.cash += compensationForRank(config, rank)
  })

  const durationMs = Math.max(0, config.durationMinutes) * 60_000
  return {
    config,
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
  }
}
