import { describe, it, expect } from 'vitest'
import { cellFor, cellCenter } from './boardLayout'

describe('MonoVomy — layout plateau', () => {
  it('mappe les 40 cases sur des cellules uniques', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 40; i += 1) {
      const c = cellFor(i)
      seen.add(`${c.row}-${c.col}`)
    }
    expect(seen.size).toBe(40)
  })

  it('place les 4 coins', () => {
    expect(cellFor(0)).toEqual({ row: 11, col: 11 })
    expect(cellFor(10)).toEqual({ row: 11, col: 1 })
    expect(cellFor(20)).toEqual({ row: 1, col: 1 })
    expect(cellFor(30)).toEqual({ row: 1, col: 11 })
  })

  it('reste dans la grille 11×11', () => {
    for (let i = 0; i < 40; i += 1) {
      const c = cellFor(i)
      expect(c.row).toBeGreaterThanOrEqual(1)
      expect(c.row).toBeLessThanOrEqual(11)
      expect(c.col).toBeGreaterThanOrEqual(1)
      expect(c.col).toBeLessThanOrEqual(11)
    }
  })

  it('donne un centre cohérent', () => {
    const c = cellCenter(0)
    expect(c.x).toBeGreaterThan(90)
    expect(c.y).toBeGreaterThan(90)
  })
})
