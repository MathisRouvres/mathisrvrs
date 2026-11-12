import { describe, expect, it } from 'vitest'
import { centeredCrop, clampCrop, minCropSize, resizeCrop } from './avatar'

describe('cadre de la photo', () => {
  it('part du plus grand carré centré', () => {
    expect(centeredCrop(1200, 800)).toEqual({ x: 200, y: 0, size: 800 })
    expect(centeredCrop(600, 900)).toEqual({ x: 0, y: 150, size: 600 })
  })

  it('reste dans l’image quand on le déplace', () => {
    expect(clampCrop({ x: -50, y: 30, size: 400 }, 1200, 800)).toEqual({ x: 0, y: 30, size: 400 })
    expect(clampCrop({ x: 1000, y: 700, size: 400 }, 1200, 800)).toEqual({ x: 800, y: 400, size: 400 })
  })

  it('garde une taille entre 10 % du petit côté (32 px min) et le petit côté', () => {
    expect(minCropSize(1200, 800)).toBe(80)
    expect(minCropSize(200, 100)).toBe(32)
    expect(minCropSize(20, 20)).toBe(20)
    expect(clampCrop({ x: 0, y: 0, size: 5 }, 1200, 800).size).toBe(80)
    expect(clampCrop({ x: 0, y: 0, size: 5000 }, 1200, 800)).toEqual({ x: 0, y: 0, size: 800 })
  })

  it('change de taille autour de son centre', () => {
    expect(resizeCrop({ x: 400, y: 200, size: 400 }, 200, 1200, 800)).toEqual({ x: 500, y: 300, size: 200 })
    // Agrandi près d'un bord : recalé dans l'image.
    expect(resizeCrop({ x: 0, y: 0, size: 200 }, 600, 1200, 800)).toEqual({ x: 0, y: 0, size: 600 })
  })
})
