import * as THREE from 'three'
import { FONT, mix, inkOn, roundRect, fitText, drawBlock, texScale, tileColor } from './tileTexture'
import { GROUP_LABEL } from '../../game/groupColors'

/**
 * Titres de propriété : les cartons posés sur la table devant chaque joueur.
 *
 * Contenu VOLONTAIREMENT statique (nom, groupe, loyer de base, prix) : une texture
 * par case achetable, générée une fois pour toute la partie. Ce qui bouge — niveau
 * d'établissement, hypothèque, monopole — est rendu en 3D par-dessus le carton
 * (maisons, voile, liseré doré) : aucune texture à régénérer en cours de jeu.
 */

// Espace de dessin logique du carton (proportions d'une carte à jouer).
const W = 320
const H = 440
const PAD = 10
const RADIUS = 26
const BAND_H = 84
const EDGE_W = 37                       // tranche de groupe à gauche (toujours visible)
const CX = (PAD + EDGE_W + (W - PAD)) / 2  // centre du contenu, tranche déduite

const KIND_LABEL = { station: 'GARE', utility: 'SERVICE' }

function label(space) {
  if (space.kind === 'property') return (GROUP_LABEL[space.group] ?? space.group ?? '').toUpperCase()
  return KIND_LABEL[space.kind] ?? 'TITRE'
}

/** Loyer de base affiché sur le carton (les services dépendent du lancer). */
function baseRent(space) {
  if (space.kind === 'utility') return null
  return space.rents?.[0] ?? 0
}

function drawPill(ctx, text, cx, cy, w, h, from, to, ink) {
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2)
  g.addColorStop(0, from); g.addColorStop(1, to)
  ctx.fillStyle = g
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke()
  ctx.fillStyle = ink
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy + 1)
}

/** Texture d'un titre de propriété (case achetable uniquement). */
export function createDeedTexture(space) {
  const color = tileColor(space)
  const scale = texScale()
  const cv = document.createElement('canvas')
  cv.width = Math.round(W * scale); cv.height = Math.round(H * scale)
  const ctx = cv.getContext('2d')
  ctx.scale(scale, scale)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Carton : papier sombre, légèrement plus clair en haut (lumière rasante).
  const bg = ctx.createLinearGradient(0, PAD, 0, H - PAD)
  bg.addColorStop(0, '#171029'); bg.addColorStop(1, '#080511')
  ctx.fillStyle = bg
  roundRect(ctx, PAD, PAD, W - 2 * PAD, H - 2 * PAD, RADIUS); ctx.fill()

  // Bandeau de groupe, coins hauts suivant l'arrondi du carton.
  ctx.save()
  roundRect(ctx, PAD, PAD, W - 2 * PAD, H - 2 * PAD, RADIUS); ctx.clip()
  const band = ctx.createLinearGradient(0, PAD, 0, PAD + BAND_H)
  band.addColorStop(0, mix(color, '#ffffff', 0.16))
  band.addColorStop(1, mix(color, '#000000', 0.22))
  ctx.fillStyle = band
  ctx.fillRect(PAD, PAD, W - 2 * PAD, BAND_H)
  ctx.restore()

  const ink = inkOn(color)
  ctx.letterSpacing = '3px'
  ctx.font = `800 26px ${FONT}`
  ctx.fillStyle = ink
  ctx.fillText(label(space), CX, PAD + BAND_H / 2 + 1)
  ctx.letterSpacing = '0px'

  // Tranche gauche : c'est la SEULE partie visible quand le carton est chevauché
  // dans l'éventail. Elle porte donc la couleur de groupe sur toute la hauteur.
  ctx.save()
  roundRect(ctx, PAD, PAD, W - 2 * PAD, H - 2 * PAD, RADIUS); ctx.clip()
  const edge = ctx.createLinearGradient(PAD, 0, PAD + EDGE_W, 0)
  edge.addColorStop(0, mix(color, '#ffffff', 0.2))
  edge.addColorStop(1, mix(color, '#000000', 0.25))
  ctx.fillStyle = edge
  ctx.fillRect(PAD, PAD, EDGE_W - 3, H - 2 * PAD)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(PAD + EDGE_W - 3, PAD, 3, H - 2 * PAD)
  ctx.restore()

  // Liseré de groupe : reconnaissable à distance, même texte illisible.
  ctx.strokeStyle = color; ctx.lineWidth = 4
  roundRect(ctx, PAD + 2, PAD + 2, W - 2 * PAD - 4, H - 2 * PAD - 4, RADIUS - 2); ctx.stroke()

  // Nom : le bloc dominant du carton.
  const fit = fitText(ctx, space.name.toUpperCase(), { max: W - 2 * PAD - EDGE_W - 34, maxLines: 3, start: 42, min: 16 })
  drawBlock(ctx, fit, CX, 218, '#ffffff')

  // Loyer de base : la seule valeur chiffrée mise en avant.
  ctx.letterSpacing = '2px'
  ctx.font = `700 18px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText('LOYER', CX, 306)
  ctx.letterSpacing = '0px'
  const rent = baseRent(space)
  ctx.font = `800 34px ${FONT}`
  drawPill(ctx, rent == null ? '×4 dés' : `${rent}€`, CX, 348, 166, 56, '#ffe9ad', '#e0930c', '#2a1500')

  // Prix d'achat, discret en pied de carton.
  ctx.font = `700 22px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText(`Prix ${space.price}€`, CX, H - PAD - 30)

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 8
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Plaque nominative posée devant le présentoir d'un joueur. */
export function createNamePlateTexture(name, color) {
  const scale = texScale()
  const w = 512
  const h = 96
  const cv = document.createElement('canvas')
  cv.width = Math.round(w * scale); cv.height = Math.round(h * scale)
  const ctx = cv.getContext('2d')
  ctx.scale(scale, scale)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, mix(color, '#ffffff', 0.1))
  g.addColorStop(1, mix(color, '#000000', 0.45))
  ctx.fillStyle = g
  roundRect(ctx, 3, 3, w - 6, h - 6, 26); ctx.fill()
  ctx.strokeStyle = mix(color, '#ffffff', 0.4); ctx.lineWidth = 4
  roundRect(ctx, 3, 3, w - 6, h - 6, 26); ctx.stroke()

  const fit = fitText(ctx, name.toUpperCase(), { max: w - 60, maxLines: 1, start: 54, min: 20, weight: 800, tracking: '2px' })
  drawBlock(ctx, fit, w / 2, h / 2 + 1, inkOn(color))
  ctx.letterSpacing = '0px'

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
