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
  resolveAuction,
  skipMarket,
  sipsForCard,
} from '../index'
import { getCardById } from '../../content'
import { boardPath, tileAt, tileById } from '../../content/maps/navigation'

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
  // ── Mesures d'équilibrage par map (Phase multi-map) ─────────────────────
  /** Passages par la case Départ, tous joueurs confondus. */
  laps: number
  /** Propriétés effectivement achetées. */
  purchases: number
  /** Occasions d'achat rencontrées (dénominateur du taux d'achat). */
  buyOffers: number
  /** Loyers payés (nombre d'événements) et montant cumulé. */
  rentEvents: number
  rentTotal: number
  /** Cases achetables encore libres à la fin. */
  unsold: number
  /** Groupes complets détenus à la fin, tous joueurs confondus. */
  monopolies: number
  /** Argent liquide moyen par joueur à la fin. */
  avgCash: number
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
  let state: GameState = createGame(config, buildSetups(options.playerCount), cardPool, board)
  let bankruptcies = 0
  let totalSips = 0
  let laps = 0
  let purchases = 0
  let buyOffers = 0
  let rentEvents = 0
  let rentTotal = 0

  const accountRoll = (r: {
    outcome: { kind: string; sips?: number; cardId?: string; amount?: number }
    bankruptcy: unknown
    passedStart?: boolean
  }) => {
    if (r.passedStart) laps += 1
    if (r.outcome.kind === 'pay_rent') {
      rentEvents += 1
      rentTotal += r.outcome.amount ?? 0
    }
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
        const space = tileAt(board, player?.position ?? 0)
        const price = space && 'price' in space ? space.price : 0
        const canAfford = (player?.cash ?? 0) - price >= options.buyReserve
        buyOffers += 1
        if (canAfford) purchases += 1
        state = decideBuy(state, board, canAfford)
        break
      }
      case 'awaiting_card':
        state = ackCard(state, getCardById(state.pendingCardId ?? '')?.effect === 'jail_free')
        break
      // Marché Noir : l'IA passe son tour. Sans ce cas, la simulation tombait
      // dans `default` et terminait la partie à la première visite du marché —
      // les parties duraient une poignée de tours.
      case 'awaiting_market':
        state = skipMarket(state)
        break
      // Enchère : personne ne surenchérit, on laisse le timer trancher.
      case 'awaiting_auction':
        state = resolveAuction(state, board)
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

  // Occupation du plateau en fin de partie : invendus, monopoles, trésorerie.
  let unsold = 0
  const groupSize = new Map<string, number>()
  const ownedByGroup = new Map<string, Map<string, number>>()
  for (const tileId of boardPath(board)) {
    const space = tileById(board, tileId)
    if (!space || !('price' in space)) continue
    if (!state.ownership[space.id]) unsold += 1
    if (space.kind !== 'property') continue
    groupSize.set(space.group, (groupSize.get(space.group) ?? 0) + 1)
    const owner = state.ownership[space.id]
    if (!owner) continue
    const byOwner = ownedByGroup.get(space.group) ?? new Map<string, number>()
    byOwner.set(owner, (byOwner.get(owner) ?? 0) + 1)
    ownedByGroup.set(space.group, byOwner)
  }
  let monopolies = 0
  for (const [group, byOwner] of ownedByGroup) {
    const size = groupSize.get(group) ?? 0
    for (const count of byOwner.values()) if (count === size) monopolies += 1
  }
  const avgCash = state.players.reduce((sum, p) => sum + p.cash, 0) / Math.max(1, state.players.length)

  return {
    turns: state.turn,
    finished: state.finished,
    bankruptcies,
    eliminations,
    totalSips,
    winnerSeat,
    winnerOrderPos: winnerOrderPos < 0 ? 0 : winnerOrderPos,
    netWorths: table.map((entry) => entry.netWorth),
    laps,
    purchases,
    buyOffers,
    rentEvents,
    rentTotal,
    unsold,
    monopolies,
    avgCash,
  }
}
