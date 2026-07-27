import type { BoardTheme } from '../../content/schema'
import type { BankruptcyRule, DifficultyId } from '../constants'
import { DIFFICULTY_MULTIPLIER } from '../constants'
import type { GameState, PlayerSetup } from '../types'
import {
  createGame,
  takeTurn,
  decideBuy,
  ackCard,
  endTurn,
  endGame,
  jailAttemptDouble,
  ranking,
  sipsForCard,
} from '../index'
import { getCardById } from '../../content'

export interface SimOptions {
  seed: string
  playerCount: number
  difficulty: DifficultyId
  bankruptcy: BankruptcyRule
  maxTurns: number
  buyReserve: number
  /** Mélange l’ordre de jeu (défaut false). */
  shuffleOrder?: boolean
  /** Active la compensation de départ (défaut false). */
  startCompensation?: boolean
  /** Pas de compensation (€/rang). */
  compensationStep?: number
}

export interface SimResult {
  turns: number
  finished: boolean
  bankruptcies: number
  eliminations: number
  totalSips: number
  /** Index (siège) du vainqueur. */
  winnerSeat: number
  /** Position du vainqueur dans l’ordre de jeu (0 = premier à jouer). */
  winnerOrderPos: number
  netWorths: number[]
}

function buildSetups(count: number): PlayerSetup[] {
  const setups: PlayerSetup[] = []
  for (let i = 0; i < count; i += 1) {
    setups.push({ id: `p${i + 1}`, name: `J${i + 1}`, avatar: `${i + 1}`, drinkMode: 'alcohol' })
  }
  return setups
}

/** Gorgées produites par un résultat de mouvement/prison, pour l’équilibrage. */
function sipsFromOutcome(outcome: { kind: string; sips?: number }, difficulty: DifficultyId): number {
  const mult = DIFFICULTY_MULTIPLIER[difficulty]
  if (outcome.kind === 'pay_rent' || outcome.kind === 'tax') return (outcome.sips ?? 0) * mult
  if (outcome.kind === 'jail_stay' || outcome.kind === 'jail_out') return (outcome.sips ?? 0) * mult
  if (outcome.kind === 'draw_card') return 0 // compté séparément
  return 0
}

/** Joue une partie de bout en bout avec une IA « achat glouton ». */
export function simulateGame(options: SimOptions, board: BoardTheme, cardPool: readonly string[]): SimResult {
  const config = {
    difficulty: options.difficulty,
    durationMinutes: 60,
    bankruptcy: options.bankruptcy,
    themeId: board.id,
    seed: options.seed,
    shuffleOrder: options.shuffleOrder ?? false,
    startCompensation: options.startCompensation ?? false,
    compensationStep: options.compensationStep,
  }
  let state: GameState = createGame(config, buildSetups(options.playerCount), cardPool)
  let bankruptcies = 0
  let totalSips = 0

  const accountRoll = (r: { outcome: { kind: string; sips?: number; cardId?: string }; bankruptcy: unknown }) => {
    totalSips += sipsFromOutcome(r.outcome, options.difficulty)
    if (r.outcome.kind === 'draw_card' && r.outcome.cardId) {
      const card = getCardById(r.outcome.cardId)
      if (card) totalSips += sipsForCard(card.baseSips, options.difficulty)
    }
    if (r.bankruptcy) {
      bankruptcies += 1
      totalSips += (r.bankruptcy as { penaltySips: number }).penaltySips * DIFFICULTY_MULTIPLIER[options.difficulty]
    }
  }

  while (!state.finished && state.turn <= options.maxTurns) {
    switch (state.phase) {
      case 'awaiting_roll': {
        const r = takeTurn(state, board)
        state = r.state
        accountRoll(r)
        break
      }
      case 'awaiting_jail': {
        const r = jailAttemptDouble(state, board)
        state = r.state
        accountRoll(r)
        break
      }
      case 'awaiting_purchase': {
        const player = state.players[state.currentPlayerIndex]
        const space = board.spaces[player?.position ?? 0]
        const price = space && 'price' in space ? space.price : 0
        const canAfford = (player?.cash ?? 0) - price >= options.buyReserve
        state = decideBuy(state, board, canAfford)
        break
      }
      case 'awaiting_card':
        state = ackCard(state, getCardById(state.pendingCardId ?? '')?.effect === 'jail_free')
        break
      case 'turn_cleanup':
        state = endTurn(state)
        break
      default:
        state = endGame(state)
    }
  }

  if (!state.finished) state = endGame(state)

  const table = ranking(state, board)
  const winner = table[0]
  const winnerSeat = winner ? state.players.findIndex((p) => p.id === winner.playerId) : 0
  const winnerOrderPos = winnerSeat >= 0 ? state.order.indexOf(winnerSeat) : 0
  const eliminations = state.players.filter((p) => p.eliminated).length

  return {
    turns: state.turn,
    finished: state.finished,
    bankruptcies,
    eliminations,
    totalSips,
    winnerSeat,
    winnerOrderPos: winnerOrderPos < 0 ? 0 : winnerOrderPos,
    netWorths: table.map((entry) => entry.netWorth),
  }
}
