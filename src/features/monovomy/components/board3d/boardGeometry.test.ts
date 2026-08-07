import { describe, it, expect } from 'vitest'
import { classicSquareMap } from '../../content/maps/classicSquare'
import { infinityPartyMap } from '../../content/maps/infinityParty'
import { boardGeometry, TILE_H } from './boardGeometry'

/** Ancien placement du plateau carré : grille 11×11, `col - 6` / `row - 6`. */
function legacyCell(i: number): [number, number] {
  const k = ((i % 40) + 40) % 40
  if (k === 0) return [11, 11]
  if (k === 10) return [11, 1]
  if (k === 20) return [1, 1]
  if (k === 30) return [1, 11]
  if (k < 10) return [11, 11 - k]
  if (k < 20) return [21 - k, 1]
  if (k < 30) return [1, k - 19]
  return [k - 29, 11]
}

describe('boardGeometry — non-régression du plateau carré', () => {
  const geo = boardGeometry(classicSquareMap)

  it('reproduit exactement les anciennes positions monde', () => {
    for (let i = 0; i < 40; i += 1) {
      const [row, col] = legacyCell(i)
      const [x, z] = geo.posOf(i)
      expect(x).toBeCloseTo(col - 6, 8)
      expect(z).toBeCloseTo(row - 6, 8)
    }
  })

  it('laisse les cases alignées sur le repère', () => {
    for (let i = 0; i < 40; i += 1) expect(geo.rotOf(i)).toBe(0)
  })

  it('reproduit la rotation en diagonale des quatre coins', () => {
    expect(geo.textureAngleOf(0)).toBeCloseTo(-Math.PI / 4, 8)
    expect(geo.textureAngleOf(10)).toBeCloseTo(Math.PI / 4, 8)
    expect(geo.textureAngleOf(20)).toBeCloseTo(-Math.PI / 4, 8)
    expect(geo.textureAngleOf(30)).toBeCloseTo(Math.PI / 4, 8)
    expect(geo.textureAngleOf(5)).toBe(0)
  })

  it('conserve la hauteur des cases et reste à plat', () => {
    expect(geo.tileTopY(1)).toBeCloseTo(TILE_H.prop + 0.04, 8)
    expect(geo.tileTopY(0)).toBeCloseTo(TILE_H.special + 0.04, 8)
    for (let i = 0; i < 40; i += 1) expect(geo.elevationOf(i)).toBe(0)
  })

  it('mémoïse la géométrie par map', () => {
    expect(boardGeometry(classicSquareMap)).toBe(geo)
  })

  it('reste dans l’emprise du socle historique', () => {
    expect(geo.extent.halfWidth).toBeCloseTo(5.75, 6)
    expect(geo.extent.halfDepth).toBeCloseTo(5.75, 6)
  })
})

describe('boardGeometry — plateau en 8', () => {
  const geo = boardGeometry(infinityPartyMap)

  it('place les 56 cases avec un pas d’une unité monde', () => {
    expect(geo.size).toBe(56)
    let min = Infinity
    let max = 0
    for (let i = 0; i < geo.size; i += 1) {
      const [ax, az] = geo.posOf(i)
      const [bx, bz] = geo.posOf(i + 1)
      const d = Math.hypot(bx - ax, bz - az)
      min = Math.min(min, d)
      max = Math.max(max, d)
    }
    expect(min).toBeGreaterThan(0.7)
    expect(max).toBeLessThan(2)
  })

  it('oriente les cases selon la trajectoire', () => {
    const rotations = new Set<number>()
    for (let i = 0; i < geo.size; i += 1) rotations.add(Math.round(geo.rotOf(i) * 100))
    expect(rotations.size).toBeGreaterThan(20)
  })

  it('surélève le passage supérieur et laisse l’inférieur au sol', () => {
    expect(geo.elevationOf(14)).toBeGreaterThan(0.5)
    expect(geo.elevationOf(42)).toBe(0)
    // Rampe : la montée est progressive de part et d'autre du pont.
    expect(geo.elevationOf(13)).toBeGreaterThan(0)
    expect(geo.elevationOf(13)).toBeLessThan(geo.elevationOf(14))
    expect(geo.elevationOf(12)).toBe(0)
    expect(geo.tileTopY(14)).toBeGreaterThan(geo.tileTopY(42))
  })

  it('sépare les deux passages du croisement dans le monde', () => {
    const [ux, uz] = geo.posOf(14)
    const [lx, lz] = geo.posOf(42)
    expect(Math.hypot(ux - lx, uz - lz)).toBeGreaterThan(1)
    expect(geo.tileAt(14).layer).toBe(2)
    expect(geo.tileAt(42).layer).toBe(0)
  })

  it('contre-pivote le contenu imprimé pour garder le texte lisible', () => {
    // Une rotation canvas `φ` vaut une rotation monde `−φ` : imprimer à `+rotY`
    // annule exactement la rotation de la case, donc le texte reste horizontal.
    for (let i = 0; i < geo.size; i += 1) {
      expect(geo.textureAngleOf(i)).toBeCloseTo(geo.rotOf(i), 10)
    }
    // Et au moins une case est réellement pivotée (sinon le test ne prouve rien).
    expect(geo.tiles.some((tile) => Math.abs(tile.rotY) > 0.2)).toBe(true)
  })

  it('couvre une emprise plus large que le plateau carré', () => {
    const classic = boardGeometry(classicSquareMap)
    expect(geo.extent.width).toBeGreaterThan(classic.extent.width)
    expect(geo.extent.depth).toBeLessThan(geo.extent.width)
  })

  it('regroupe les cases par couleur', () => {
    const group = geo.groupIndicesOf('inf_terrasse_soleil')
    expect(group).toHaveLength(4)
    expect(group).toContain(1)
    expect(geo.groupIndicesOf('inf_depart')).toEqual([0])
    expect(geo.groupIndicesOf('inconnue')).toEqual([])
  })
})
