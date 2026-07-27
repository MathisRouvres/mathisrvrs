import type { BoardTheme } from '../../content/schema'
import type { DifficultyId } from '../constants'
import { simulateGame } from './massSim'

export type OrderMode = 'fixed' | 'random' | 'random_comp'

export interface OrderModeStats {
  mode: OrderMode
  games: number
  /** Nombre de victoires par position d’ordre (0 = premier à jouer). */
  winsByPosition: number[]
  /** Taux de victoire par position (0..1). */
  rateByPosition: number[]
  /** Écart max entre positions (indicateur d’équité ; plus bas = plus juste). */
  spread: number
}

const MODE_CONFIG: Record<OrderMode, { shuffleOrder: boolean; startCompensation: boolean }> = {
  fixed: { shuffleOrder: false, startCompensation: false },
  random: { shuffleOrder: true, startCompensation: false },
  random_comp: { shuffleOrder: true, startCompensation: true },
}

/**
 * Étudie l’équité de l’ordre de jeu : sur `games` parties à `playerCount` joueurs,
 * compare 3 modes et mesure le taux de victoire PAR POSITION d’ordre.
 * Déterministe (seeds dérivées de l’index).
 */
export function runOrderStudy(
  games: number,
  playerCount: number,
  board: BoardTheme,
  cardPool: readonly string[],
  difficulty: DifficultyId = 'inter',
): OrderModeStats[] {
  const modes: OrderMode[] = ['fixed', 'random', 'random_comp']
  return modes.map((mode) => {
    const cfg = MODE_CONFIG[mode]
    const wins = new Array(playerCount).fill(0)
    for (let i = 0; i < games; i += 1) {
      const r = simulateGame(
        {
          seed: `order-${mode}-${i}`,
          playerCount,
          difficulty,
          bankruptcy: 'none',
          maxTurns: 120,
          buyReserve: 150,
          shuffleOrder: cfg.shuffleOrder,
          startCompensation: cfg.startCompensation,
        },
        board,
        cardPool,
      )
      const pos = Math.min(Math.max(r.winnerOrderPos, 0), playerCount - 1)
      wins[pos] += 1
    }
    const rate = wins.map((w) => w / games)
    const spread = Math.max(...rate) - Math.min(...rate)
    return { mode, games, winsByPosition: wins, rateByPosition: rate, spread }
  })
}
