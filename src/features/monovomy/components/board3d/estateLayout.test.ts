import { describe, it, expect } from 'vitest'
// Module JS sans déclarations de types (comme le reste de board3d).
// @ts-expect-error -- pas de .d.ts pour estateLayout.js
import { layoutFan, fanWidth, CARD_W, STEP_MAX, STEP_MIN } from './estateLayout'

const group = (id: string, n: number) => ({
  id,
  items: Array.from({ length: n }, (_, k) => ({ spaceId: `${id}${k}` })),
})

describe('layoutFan', () => {
  it('garde l’ordre du plateau et centre l’éventail sur la travée', () => {
    const placed = layoutFan([group('a', 3), group('b', 2)], 4)
    expect(placed.map((p: { spaceId: string }) => p.spaceId)).toEqual(['a0', 'a1', 'a2', 'b0', 'b1'])
    expect((placed[0].x + placed[placed.length - 1].x) / 2).toBeCloseTo(0, 6)
  })

  it('ne s’étale jamais au-delà du pas maximal, même avec toute la place', () => {
    const placed = layoutFan([group('a', 3)], 40)
    expect(placed[1].x - placed[0].x).toBeCloseTo(STEP_MAX, 6)
  })

  it('resserre le chevauchement quand la travée est étroite, sans passer sous le minimum', () => {
    const wide = layoutFan([group('a', 10)], 6)
    const tight = layoutFan([group('a', 10)], 1.5)
    const stepWide = wide[1].x - wide[0].x
    const stepTight = tight[1].x - tight[0].x
    expect(stepWide).toBeGreaterThan(stepTight)
    expect(stepTight).toBeCloseTo(STEP_MIN, 6)
  })

  it('respire entre deux groupes de couleur : le saut y est plus grand', () => {
    const placed = layoutFan([group('a', 2), group('b', 2)], 4)
    const inside = placed[1].x - placed[0].x
    const between = placed[2].x - placed[1].x
    expect(between).toBeGreaterThan(inside)
  })

  it('empile les cartons en hauteur : chacun passe au-dessus du précédent', () => {
    const placed = layoutFan([group('a', 4)], 4)
    for (let i = 1; i < placed.length; i++) expect(placed[i].y).toBeGreaterThan(placed[i - 1].y)
  })

  it('tient dans la travée allouée tant que le pas minimal le permet', () => {
    const placed = layoutFan([group('a', 6)], 3)
    expect(fanWidth(placed)).toBeLessThanOrEqual(3 + 1e-9)
  })

  it('un titre seul est centré, éventail de largeur d’un carton', () => {
    const placed = layoutFan([group('a', 1)], 4)
    expect(placed[0].x).toBeCloseTo(0, 6)
    expect(fanWidth(placed)).toBeCloseTo(CARD_W, 6)
  })

  it('sans titre, rien à poser', () => {
    expect(layoutFan([], 4)).toEqual([])
  })
})
