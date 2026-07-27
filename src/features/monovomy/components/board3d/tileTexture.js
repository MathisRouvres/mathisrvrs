import * as THREE from 'three'
import { drawIcon } from './neonIcons'

const G = { brun: '#c07a3a', cyan: '#22c1c3', rose: '#ec4899', orange: '#f97316', rouge: '#ef4444', jaune: '#f5b21a', vert: '#22c55e', bleu: '#3b82f6' }
const ICON_PROP = { brun: 'glass', cyan: 'martini', rose: 'martini', orange: 'whisky', rouge: 'beer', jaune: 'whisky', vert: 'star', bleu: 'champagne' }
const SPECIAL_LABEL = { start: 'DÉPART', tax: 'TAXE', parking: 'TOUS BOIVENT', jail: 'PAUSE', gojail: 'AU POSTE', action: 'CARTE' }

/** Une case est-elle achetable (propriété / gare / service) ? */
export function isPurchasable(space) {
  return 'price' in space
}

function iconFor(kind, group) {
  if (kind === 'start') return 'arrow'
  if (kind === 'action') return 'cards'
  if (kind === 'tax') return 'receipt'
  if (kind === 'station') return 'car'
  if (kind === 'parking') return 'cheers'
  if (kind === 'jail') return 'glass'
  if (kind === 'gojail') return 'arrow'
  if (kind === 'utility') return 'shot'
  return ICON_PROP[group] || 'glass'
}

/** Couleur d'accent d'une case (partagée UI 2D/3D). */
export function tileColor(space) {
  return colorFor(space.kind, space.group)
}

function colorFor(kind, group) {
  // Palette resserrée (néon raffiné) : moins de rouge/bleu purs, tons harmonisés.
  if (kind === 'start') return '#34d17e'
  if (kind === 'action') return '#ec1e79'
  if (kind === 'tax') return '#f5b21a'
  if (kind === 'station') return '#4aa6e6'
  if (kind === 'parking') return '#8b5cf6'
  if (kind === 'jail') return '#22c1c3'
  if (kind === 'gojail') return '#ef4d63'
  if (kind === 'utility') return '#22c1c3'
  return G[group] || '#8b5cf6'
}
/** Mélange deux couleurs hex (#rrggbb) : t=0 → a, t=1 → b. */
function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function wrap(ctx, text, x, y, max, lh, maxLines) {
  const words = text.split(' '); let l = ''; let lines = []
  for (const w of words) { const t = l ? l + ' ' + w : w; if (ctx.measureText(t).width > max && l) { lines.push(l); l = w } else l = t }
  if (l) lines.push(l)
  lines.slice(0, maxLines).forEach((ln, i) => ctx.fillText(ln, x, y + i * lh))
}

/**
 * Génère la texture néon d'une case.
 *
 * Achetable (propriété/gare/service) : lavis léger + prix → la case « appelle » à
 * l'achat. Non achetable (départ, taxe, prison, carte…) : lavis fort + bordure
 * épaisse + pastille pleine de libellé → immédiatement identifiable comme case
 * spéciale, pas une propriété.
 */
export function createTileTexture(space) {
  const kind = space.kind
  const group = space.group
  const purchasable = isPurchasable(space)
  const color = colorFor(kind, group)
  const icon = iconFor(kind, group)
  const price = purchasable ? space.price : null
  const label = purchasable ? null : (SPECIAL_LABEL[kind] || 'SPÉCIAL')

  const SCALE = 2 // super-sampling → cases nettes au zoom
  const cv = document.createElement('canvas')
  cv.width = 256 * SCALE; cv.height = 256 * SCALE
  const ctx = cv.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const NAME_FONT = "700 20px 'Space Grotesk', 'Inter', system-ui, sans-serif"

  if (purchasable) {
    // ── Case ACHETABLE : néon coloré, code couleur du groupe, prix ──
    ctx.fillStyle = '#0a0713'
    roundRect(ctx, 4, 4, 248, 248, 22); ctx.fill()

    // Bandeau accent fin + lavis très léger.
    ctx.save()
    ctx.globalAlpha = 0.95
    ctx.fillStyle = color
    roundRect(ctx, 16, 16, 224, 12, 6); ctx.fill()
    ctx.globalAlpha = 0.08
    roundRect(ctx, 14, 14, 228, 228, 18); ctx.fill()
    ctx.restore()

    ctx.strokeStyle = color; ctx.lineWidth = 5
    ctx.shadowColor = color; ctx.shadowBlur = 12
    roundRect(ctx, 14, 14, 228, 228, 18); ctx.stroke(); ctx.shadowBlur = 0

    ctx.fillStyle = '#f5f1ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    ctx.letterSpacing = '0.4px'
    ctx.font = NAME_FONT
    wrap(ctx, space.name.toUpperCase(), 128, 56, 208, 22, 2)
    ctx.letterSpacing = '0px'

    drawIcon(ctx, icon, 128, 148, 62, color)

    ctx.font = "700 25px 'Space Grotesk', 'Inter', system-ui, sans-serif"
    ctx.fillStyle = '#f5f1ff'
    ctx.fillText(`${price}€`, 128, 236)
  } else {
    // ── Case SPÉCIALE (non achetable) : BLOC PLEIN couleur, lumineux ──
    // Inverse des propriétés (cartes sombres) : ici la case EST la couleur.
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, color)
    g.addColorStop(1, mix(color, '#000000', 0.32))
    ctx.fillStyle = g
    roundRect(ctx, 4, 4, 248, 248, 22); ctx.fill()

    // Reflet supérieur (effet « bouton » brillant).
    ctx.save()
    ctx.globalAlpha = 0.16
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, 16, 16, 224, 96, 16); ctx.fill()
    ctx.restore()

    // Liseré intérieur sombre → contraste net avec les propriétés.
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 7
    roundRect(ctx, 15, 15, 226, 226, 18); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2
    roundRect(ctx, 20, 20, 216, 216, 15); ctx.stroke()

    // Nom (2 lignes, texte SOMBRE sur fond vif).
    ctx.fillStyle = '#0a0713'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    ctx.letterSpacing = '0.5px'
    ctx.font = "800 20px 'Space Grotesk', 'Inter', system-ui, sans-serif"
    wrap(ctx, space.name.toUpperCase(), 128, 58, 206, 22, 2)
    ctx.letterSpacing = '0px'

    // Icône sombre sur fond vif.
    drawIcon(ctx, icon, 128, 148, 66, '#0a0713')

    // Pastille libellé : sombre, texte clair.
    const w = 190, h = 38, x = 128 - w / 2, y = 202
    ctx.fillStyle = '#0a0713'
    roundRect(ctx, x, y, w, h, 19); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = "800 17px 'Space Grotesk', 'Inter', system-ui, sans-serif"
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = '0.5px'
    ctx.fillText(label, 128, y + h / 2 + 1)
    ctx.letterSpacing = '0px'
    ctx.textBaseline = 'alphabetic'
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 16
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
