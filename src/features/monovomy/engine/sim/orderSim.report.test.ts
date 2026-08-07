import { describe, it, expect } from 'vitest'
import { getBoardMap } from '../../content/maps/registry'
import { isBoardMapId } from '../../content/maps/types'
import { actionCards } from '../../content/cards'
import { runOrderStudy } from './orderSim'

/** Map étudiée : `MV_SIM_MAP=infinity_party` (défaut : plateau classique). */
const MAP_ID = process.env.MV_SIM_MAP
const BOARD = getBoardMap(isBoardMapId(MAP_ID) ? MAP_ID : 'classic_square')

const POOL = actionCards.map((c) => c.id)
const REPORT = process.env.MASS_SIM_REPORT === '1'
const GAMES = REPORT ? 3000 : 300
const PLAYERS = 4

describe('MonoVomy — équité de l’ordre de jeu', () => {
  it('compare ordre fixe / aléatoire / aléatoire+compensation', () => {
    const stats = runOrderStudy(GAMES, PLAYERS, BOARD, POOL)
    const fixed = stats.find((s) => s.mode === 'fixed')!
    const random = stats.find((s) => s.mode === 'random')!

    // Invariants : distributions valides, somme = 100 %.
    for (const s of stats) {
      expect(s.winsByPosition).toHaveLength(PLAYERS)
      const total = s.winsByPosition.reduce((a, b) => a + b, 0)
      expect(total).toBe(GAMES)
      expect(s.rateByPosition.every((r) => r >= 0 && r <= 1)).toBe(true)
    }

    // L’ordre aléatoire lisse l’avantage de position. Le spread est bruité sur petit
    // échantillon : tolérance serrée en mode rapport (grand N), large par défaut.
    const tol = REPORT ? 0.02 : 0.1
    expect(random.spread).toBeLessThanOrEqual(fixed.spread + tol)

    if (REPORT) {
      const pct = (r: number) => `${(r * 100).toFixed(1)}%`
      const rows = ['── MonoVomy · équité de l’ordre (4 joueurs) ──', `parties/mode : ${GAMES}`]
      for (const s of stats) {
        rows.push(`  ${s.mode.padEnd(12)} pos=[${s.rateByPosition.map(pct).join(', ')}] spread=${pct(s.spread)}`)
      }
      // eslint-disable-next-line no-console
      console.log(rows.join('\n'))
    }
  }, 60000)
})
