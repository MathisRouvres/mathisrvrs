import { describe, it, expect } from 'vitest'
import { soireeBoard } from '../../content/board.soiree'
import { actionCards } from '../../content/cards'
import { simulateGame } from './massSim'
import type { SimOptions } from './massSim'
import type { BankruptcyRule, DifficultyId } from '../constants'

const POOL = actionCards.map((c) => c.id)
const REPORT = process.env.MASS_SIM_REPORT === '1'
const GAMES = REPORT ? 2000 : 400
const DIFFICULTIES: DifficultyId[] = ['facile', 'inter', 'difficile', 'hardcore']
const RULES: BankruptcyRule[] = ['none', 'classic', 'last_hunt']

function opts(i: number): SimOptions {
  return {
    seed: `sim-${i}`,
    playerCount: 3 + (i % 6), // 3..8
    difficulty: DIFFICULTIES[i % DIFFICULTIES.length] as DifficultyId,
    bankruptcy: RULES[i % RULES.length] as BankruptcyRule,
    maxTurns: 120,
    buyReserve: 150,
  }
}

describe('MonoVomy — simulation de masse', () => {
  it('produit des parties valides et déterministes', () => {
    const a = simulateGame(opts(7), soireeBoard, POOL)
    const b = simulateGame(opts(7), soireeBoard, POOL)
    expect(a).toEqual(b)
    expect(a.turns).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(a.totalSips)).toBe(true)
    expect(a.totalSips).toBeGreaterThanOrEqual(0)
  })

  it('respecte les invariants sur un large échantillon + rapport d’équilibrage', () => {
    let totalTurns = 0
    let totalSips = 0
    let finishedClassic = 0
    let classicGames = 0
    const seat0WinsBy4 = { wins: 0, games: 0 }
    const sipsByDifficulty: Record<string, { sips: number; games: number }> = {}

    for (let i = 0; i < GAMES; i += 1) {
      const o = opts(i)
      const r = simulateGame(o, soireeBoard, POOL)

      expect(Number.isFinite(r.totalSips)).toBe(true)
      expect(r.winnerSeat).toBeGreaterThanOrEqual(0)
      expect(r.winnerSeat).toBeLessThan(o.playerCount)
      expect(r.turns).toBeLessThanOrEqual(o.maxTurns + 1)

      totalTurns += r.turns
      totalSips += r.totalSips
      if (o.bankruptcy === 'classic') {
        classicGames += 1
        if (r.finished) finishedClassic += 1
      }
      if (o.playerCount === 4) {
        seat0WinsBy4.games += 1
        if (r.winnerSeat === 0) seat0WinsBy4.wins += 1
      }
      const bucket = sipsByDifficulty[o.difficulty] ?? { sips: 0, games: 0 }
      bucket.sips += r.totalSips
      bucket.games += 1
      sipsByDifficulty[o.difficulty] = bucket
    }

    // Équité : le siège 0 ne doit pas gagner de façon absurde (≈25% attendu à 4 joueurs).
    const seat0Rate = seat0WinsBy4.games > 0 ? seat0WinsBy4.wins / seat0WinsBy4.games : 0
    expect(seat0Rate).toBeLessThan(0.55)

    // Le preset « classic » doit pouvoir se terminer par élimination.
    if (classicGames > 0) expect(finishedClassic).toBeGreaterThan(0)

    if (REPORT) {
      const line = (k: string, v: string) => `  ${k.padEnd(22)} ${v}`
      const rows = [
        '── MonoVomy · rapport d’équilibrage ──',
        line('parties', String(GAMES)),
        line('tours moyens', (totalTurns / GAMES).toFixed(1)),
        line('gorgées moy./partie', (totalSips / GAMES).toFixed(1)),
        line('classic terminées', `${finishedClassic}/${classicGames}`),
        line('siège 0 (4j) gagne', `${(seat0Rate * 100).toFixed(1)}%`),
      ]
      for (const d of DIFFICULTIES) {
        const b = sipsByDifficulty[d]
        if (b) rows.push(line(`gorgées/partie ${d}`, (b.sips / b.games).toFixed(1)))
      }
      // eslint-disable-next-line no-console
      console.log(rows.join('\n'))
    }
  }, 60000)
})
