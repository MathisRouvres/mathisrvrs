import { describe, expect, it } from 'vitest'
import { createRng } from './createRng'

describe('createRng', () => {
  it('produit la même séquence pour la même seed', () => {
    const a = createRng('career-seed-42')
    const b = createRng('career-seed-42')

    const seqA = [
      a.randomFloat(),
      a.randomInt(1, 100),
      a.chance(0.5),
      a.pick(['x', 'y', 'z']),
      a.weightedPick(['a', 'b', 'c'], [1, 2, 3]),
      a.shuffle([1, 2, 3, 4, 5]),
    ]
    const seqB = [
      b.randomFloat(),
      b.randomInt(1, 100),
      b.chance(0.5),
      b.pick(['x', 'y', 'z']),
      b.weightedPick(['a', 'b', 'c'], [1, 2, 3]),
      b.shuffle([1, 2, 3, 4, 5]),
    ]

    expect(seqA).toEqual(seqB)
  })

  it(' diverge pour des seeds différentes', () => {
    const a = createRng('alpha')
    const b = createRng('beta')
    const floatsA = Array.from({ length: 20 }, () => a.randomFloat())
    const floatsB = Array.from({ length: 20 }, () => b.randomFloat())
    expect(floatsA).not.toEqual(floatsB)
  })

  it('reprend exactement après setState', () => {
    const rng = createRng('resume-test')
    rng.randomFloat()
    rng.randomInt(0, 10)
    const saved = rng.getState()
    const next = rng.randomFloat()

    const resumed = createRng('ignored-because-setState')
    resumed.setState(saved)
    expect(resumed.randomFloat()).toBe(next)
  })
})
