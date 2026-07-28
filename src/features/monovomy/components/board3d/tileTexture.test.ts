import { describe, expect, it, beforeAll } from 'vitest'
import { soireeBoard } from '../../content'

/**
 * Lisibilité des cases 3D : le nom d'une case ne doit jamais déborder ni être
 * tronqué. On rejoue le dessin avec un contexte canvas factice dont les métriques
 * de texte sont volontairement pessimistes (police plus large que la vraie), puis
 * on vérifie chaque appel fillText.
 */

type Drawn = { text: string; x: number; y: number; size: number; width: number }

// Largeur moyenne d'un caractère, en fraction de la taille de police. Space Grotesk
// en capitales tourne autour de 0,58 em ; on majore pour rester conservateur.
const CHAR_W = 0.62

function fakeCtx(drawn: Drawn[]) {
  const grad = { addColorStop() {} }
  const state = { font: '400 10px sans-serif', letterSpacing: '0px' }
  const size = () => parseFloat(state.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? '10')
  const tracking = () => parseFloat(state.letterSpacing) || 0
  const measure = (t: string) => t.length * (size() * CHAR_W + tracking())
  const ctx = {
    get font() { return state.font },
    set font(v: string) { state.font = v },
    get letterSpacing() { return state.letterSpacing },
    set letterSpacing(v: string) { state.letterSpacing = v },
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineJoin: '', lineCap: '',
    shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    textAlign: '', textBaseline: '', globalAlpha: 1,
    imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, clip() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arcTo() {}, arc() {},
    bezierCurveTo() {}, fill() {}, stroke() {}, fillRect() {}, strokeRect() {},
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    measureText: (t: string) => ({ width: measure(t) }),
    fillText(t: string, x: number, y: number) { drawn.push({ text: t, x, y, size: size(), width: measure(t) }) },
  }
  return ctx
}

let drawn: Drawn[] = []
let createTileTexture: (space: unknown, index?: number) => unknown

beforeAll(async () => {
  const canvas = { width: 0, height: 0, getContext: () => fakeCtx(drawn) }
  Object.assign(globalThis, {
    document: { createElement: () => canvas },
    window: { devicePixelRatio: 2, innerWidth: 1440, innerHeight: 900 },
  })
  // Module JS sans déclarations de types : import dynamique volontairement non typé.
  // @ts-expect-error -- pas de .d.ts pour tileTexture.js
  ;({ createTileTexture } = await import('./tileTexture.js'))
})

// Zone utile d'une case dans le repère 512² de la texture (marges + arrondis compris).
const MAX_LINE = 512 - 2 * (14 + 26)
// Coins : contenu pivoté à 45°, largeur utile plus étroite.
const MAX_LINE_CORNER = 260

describe('createTileTexture — lisibilité', () => {
  it('affiche le nom complet des 40 cases, sans troncature', () => {
    soireeBoard.spaces.forEach((space, i) => {
      drawn = []
      createTileTexture(space, i)
      const words = space.name.toUpperCase().split(/\s+/)
      const painted = drawn.map((d) => d.text).join(' ')
      expect(painted, `case ${i}`).not.toContain('…')
      for (const w of words) expect(painted, `case ${i} — mot « ${w} »`).toContain(w)
    })
  })

  it('ne fait jamais déborder une ligne de texte', () => {
    soireeBoard.spaces.forEach((space, i) => {
      drawn = []
      createTileTexture(space, i)
      const max = i % 10 === 0 ? MAX_LINE_CORNER : MAX_LINE
      for (const d of drawn) expect(d.width, `case ${i} — « ${d.text} »`).toBeLessThanOrEqual(max)
    })
  })

  it('garde le nom sur 2 lignes maximum et à une taille lisible', () => {
    soireeBoard.spaces.forEach((space, i) => {
      drawn = []
      createTileTexture(space, i)
      // Le nom est le bloc de plus grande police ; ses lignes partagent cette taille.
      const top = Math.max(...drawn.map((d) => d.size))
      const nameLines = drawn.filter((d) => d.size === top)
      expect(nameLines.length, `case ${i}`).toBeLessThanOrEqual(2)
      expect(top, `case ${i}`).toBeGreaterThanOrEqual(28)
    })
  })

  it('n’affiche aucun prix sur les cases spéciales (gares et services compris)', () => {
    const special = new Set(['start', 'jail', 'gojail', 'parking', 'station', 'utility', 'tax', 'action'])
    soireeBoard.spaces.forEach((s, i) => {
      if (!special.has(s.kind)) return
      drawn = []
      createTileTexture(s, i)
      expect(drawn.some((d) => d.text.includes('€')), `case ${i}`).toBe(false)
    })
  })

  it('affiche le prix des propriétés en pastille', () => {
    soireeBoard.spaces.forEach((s, i) => {
      if (s.kind !== 'property') return
      drawn = []
      createTileTexture(s, i)
      expect(drawn.some((d) => d.text === `${(s as { price: number }).price}€`), `case ${i}`).toBe(true)
    })
  })
})
