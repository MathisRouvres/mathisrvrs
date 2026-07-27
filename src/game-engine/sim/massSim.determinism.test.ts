import { describe, expect, it } from 'vitest'
import { simulateCareer, emptyInvariants, emptyTally, STRATEGIES } from './massSim'

/**
 * Invariant §7 — même graine + mêmes décisions = même carrière.
 * Le harnais réutilise le moteur réel : la reproductibilité est structurelle.
 */
describe('simulation de masse — déterminisme', () => {
  it('deux carrières identiques produisent le même résultat', () => {
    const input = { countryId: 'capitale-miroir', macroPosition: 'attacker' as const, seed: 'det-seed-1' }
    const a = simulateCareer(input, 'ambitieux', emptyInvariants(), undefined, emptyTally())
    const b = simulateCareer(input, 'ambitieux', emptyInvariants(), undefined, emptyTally())
    expect(a).toEqual(b)
  })

  it('reproductible pour chaque profil de décision', () => {
    for (const strat of STRATEGIES) {
      const input = { countryId: 'baie-lumen', macroPosition: 'midfielder' as const, seed: `det-${strat}` }
      const a = simulateCareer(input, strat, emptyInvariants(), undefined, emptyTally())
      const b = simulateCareer(input, strat, emptyInvariants(), undefined, emptyTally())
      expect(a.tier, strat).toBe(b.tier)
      expect(a.peakLevel, strat).toBe(b.peakLevel)
      expect(a.trophies, strat).toBe(b.trophies)
      expect(a.awardsWon, strat).toBe(b.awardsWon)
    }
  })
})
