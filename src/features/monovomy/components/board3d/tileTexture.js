import * as THREE from 'three'
import { drawIcon } from './neonIcons'
import { GROUP_COLORS } from '../../game/groupColors'

// Palette partagée avec les titres de propriété en HTML (voir game/groupColors).
const G = GROUP_COLORS
const ICON_PROP = { brun: 'glass', cyan: 'martini', rose: 'martini', orange: 'whisky', rouge: 'beer', jaune: 'whisky', vert: 'star', bleu: 'champagne' }
const SPECIAL_LABEL = {
  start: 'DÉPART', tax: 'TAXE', parking: 'TOUS BOIVENT', jail: 'PAUSE',
  gojail: 'AU POSTE', action: 'CARTE', station: 'GARE', utility: 'SERVICE',
  market: 'MARCHÉ NOIR',
}
/** Cases rendues « icône + libellé » (jamais de prix), y compris gares et services. */
const ICON_ONLY = new Set(['start', 'jail', 'gojail', 'parking', 'station', 'utility', 'tax', 'action', 'market'])

// Espace de dessin logique de la texture (carré). Toutes les coordonnées ci-dessous
// sont exprimées dans ce repère ; le canvas réel est sur-échantillonné (voir texScale).
const S = 512
export const FONT = "'Space Grotesk', 'Inter', system-ui, sans-serif"
const INK_DARK = '#0a0713'
const SHADOW = 'rgba(0,0,0,0.4)'

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
  if (kind === 'market') return 'cards'
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
  if (kind === 'market') return '#0f172a'
  return G[group] || '#8b5cf6'
}

/** Mélange deux couleurs hex (#rrggbb) : t=0 → a, t=1 → b. */
export function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// ── Contraste WCAG ───────────────────────────────────────────────────────────
function channel(v) {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
/** Luminance relative WCAG 2.x d'une couleur hex. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
/** Encre (noir ou blanc) offrant le meilleur ratio de contraste sur `hex`. */
export function inkOn(hex) {
  const l = luminance(hex)
  const onWhite = 1.05 / (l + 0.05)
  const onBlack = (l + 0.05) / 0.05
  return onBlack >= onWhite ? INK_DARK : '#ffffff'
}

// ── Primitives canvas ────────────────────────────────────────────────────────
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

function shadowOn(ctx) {
  ctx.shadowColor = SHADOW; ctx.shadowBlur = 3; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 2
}
function shadowOff(ctx) {
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
}

/** Découpe gloutonne en lignes selon la police courante. */
function wrapLines(ctx, text, max) {
  const lines = []
  let cur = ''
  // Découpe sur les espaces sécables uniquement : l'insécable U+00A0 lie ses mots.
  for (const w of text.split(/[ \t\n]+/)) {
    const t = cur ? `${cur} ${w}` : w
    if (cur && ctx.measureText(t).width > max) { lines.push(cur); cur = w } else cur = t
  }
  if (cur) lines.push(cur)
  return lines
}

function clampLine(ctx, line, max) {
  if (ctx.measureText(line).width <= max) return line
  let s = line
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1)
  return `${s}…`
}

/**
 * Cherche la plus grande taille de police (pas de 1 px) pour laquelle `text` tient
 * en `maxLines` lignes de `max` px de large. Laisse ctx.font sur la taille retenue.
 */
export function fitText(ctx, text, { max, maxLines, start, min, weight = 700, tracking = '-0.5px' }) {
  // Typographie française : espace insécable avant ! ? : ; » — évite « AU POSTE / ! ».
  const src = text.replace(/ ([!?:;»])/g, ' $1')
  ctx.letterSpacing = tracking
  for (let size = start; size >= min; size--) {
    ctx.font = `${weight} ${size}px ${FONT}`
    const lines = wrapLines(ctx, src, max)
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= max)) return { size, lines }
  }
  // Un mot reste plus large que la case même au minimum : coupe au caractère.
  ctx.font = `${weight} ${min}px ${FONT}`
  const lines = wrapLines(ctx, src, max).slice(0, maxLines)
  return { size: min, lines: lines.map((l) => clampLine(ctx, l, max)) }
}

/** Dessine un bloc de lignes centré (horizontalement sur cx, verticalement sur cy). */
export function drawBlock(ctx, fit, cx, cy, fill) {
  ctx.fillStyle = fill
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lh = fit.size * 1.04
  const top = cy - ((fit.lines.length - 1) * lh) / 2
  fit.lines.forEach((l, i) => ctx.fillText(l, cx, top + i * lh))
}

/** Pastille dorée du prix, centrée sur (cx, cy). */
function drawPricePill(ctx, price, cx, cy) {
  const label = `${price}€`
  ctx.letterSpacing = '0px'
  ctx.font = `800 46px ${FONT}`
  const w = Math.min(S - 96, Math.max(190, ctx.measureText(label).width + 88))
  const h = 82
  const x = cx - w / 2
  const y = cy - h / 2
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, '#ffe9ad'); g.addColorStop(0.5, '#f7c33a'); g.addColorStop(1, '#e0930c')
  ctx.fillStyle = g
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 4
  roundRect(ctx, x, y, w, h, h / 2); ctx.stroke()
  ctx.fillStyle = '#2a1500'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy + 2)
}

/** Pastille sombre du libellé court (cases spéciales), centrée sur (cx, cy). */
function drawLabelPill(ctx, label, cx, cy, maxW) {
  const fit = fitText(ctx, label, { max: maxW - 56, maxLines: 1, start: 40, min: 20, weight: 800, tracking: '0.5px' })
  const h = 66
  const w = Math.min(maxW, Math.max(160, ctx.measureText(fit.lines[0]).width + 56))
  const x = cx - w / 2
  const y = cy - h / 2
  ctx.fillStyle = INK_DARK
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 3
  roundRect(ctx, x, y, w, h, h / 2); ctx.stroke()
  shadowOn(ctx)
  drawBlock(ctx, fit, cx, cy + 1, '#ffffff')
  shadowOff(ctx)
}

// ── Faces ────────────────────────────────────────────────────────────────────
const PAD = 14
const RADIUS = 44
const BAND_H = 126

/**
 * Case achetable, version téléphone. Une case y fait ~36 px : la hiérarchie
 * complète (bandeau + icône + nom + pastille de prix) ne tient pas, tout finit
 * sous le seuil de lisibilité. On sacrifie donc l'icône et la pastille pour
 * donner au NOM presque toute la surface — il triple de taille — et le prix
 * revient en simple ligne dorée.
 */
function drawPropertyFaceCompact(ctx, { name, color, price, angle = 0 }) {
  const bandH = 74
  const bg = ctx.createLinearGradient(0, PAD, 0, S - PAD)
  bg.addColorStop(0, '#160f2a'); bg.addColorStop(1, '#08050f')
  ctx.fillStyle = bg
  roundRect(ctx, PAD, PAD, S - 2 * PAD, S - 2 * PAD, RADIUS); ctx.fill()

  ctx.save()
  roundRect(ctx, PAD, PAD, S - 2 * PAD, S - 2 * PAD, RADIUS); ctx.clip()
  const band = ctx.createLinearGradient(0, PAD, 0, PAD + bandH)
  band.addColorStop(0, mix(color, '#ffffff', 0.2))
  band.addColorStop(1, mix(color, '#000000', 0.12))
  ctx.fillStyle = band
  ctx.fillRect(PAD, PAD, S - 2 * PAD, bandH)
  ctx.restore()

  ctx.strokeStyle = color; ctx.lineWidth = 7
  roundRect(ctx, PAD + 3, PAD + 3, S - 2 * PAD - 6, S - 2 * PAD - 6, RADIUS - 3); ctx.stroke()

  // Contenu textuel contre-pivoté : sur un plateau en courbe la case suit la
  // trajectoire, son texte reste lisible dans le même sens que les autres.
  ctx.save()
  if (angle) { ctx.translate(S / 2, S / 2); ctx.rotate(angle); ctx.translate(-S / 2, -S / 2) }
  // Le libellé court occupe toute la hauteur restante, sur 3 lignes au besoin.
  const fit = fitText(ctx, shortLabel(name), { max: S - 2 * (PAD + 16), maxLines: 3, start: 168, min: 42, tracking: '-1px' })
  shadowOn(ctx)
  drawBlock(ctx, fit, S / 2, PAD + bandH + (S - 2 * PAD - bandH - 92) / 2, '#ffffff')

  ctx.letterSpacing = '0px'
  ctx.font = `800 76px ${FONT}`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f7c33a'
  ctx.fillText(`${price}€`, S / 2, S - PAD - 52)
  shadowOff(ctx)
  ctx.restore()
}

/** Case spéciale, version téléphone : grande icône et nom, sans pastille. */
function drawSpecialFaceCompact(ctx, { name, color, icon, angle }) {
  const ink = inkOn(color)
  const g = ctx.createLinearGradient(0, PAD, 0, S - PAD)
  g.addColorStop(0, mix(color, '#ffffff', 0.16))
  g.addColorStop(1, mix(color, '#000000', 0.24))
  ctx.fillStyle = g
  roundRect(ctx, PAD, PAD, S - 2 * PAD, S - 2 * PAD, RADIUS); ctx.fill()

  ctx.strokeStyle = 'rgba(0,0,0,0.42)'; ctx.lineWidth = 12
  roundRect(ctx, PAD + 4, PAD + 4, S - 2 * PAD - 8, S - 2 * PAD - 8, RADIUS - 4); ctx.stroke()

  const corner = angle !== 0
  ctx.save()
  if (corner) { ctx.translate(S / 2, S / 2); ctx.rotate(angle); ctx.translate(-S / 2, -S / 2) }

  const nameMax = corner ? 300 : S - 2 * (PAD + 18)
  const fit = fitText(ctx, shortLabel(name), { max: nameMax, maxLines: 2, start: 132, min: 40, weight: 800, tracking: '-1px' })
  shadowOn(ctx)
  drawBlock(ctx, fit, S / 2, corner ? S / 2 - 96 : 150, ink)
  shadowOff(ctx)
  drawIcon(ctx, icon, S / 2, corner ? S / 2 + 78 : 330, corner ? 190 : 168, ink, 0.3)

  ctx.restore()
}

/** Case achetable : bandeau groupe → nom → prix. Hiérarchie stricte, fond sombre. */
function drawPropertyFace(ctx, { name, color, icon, price, angle = 0 }) {
  const bg = ctx.createLinearGradient(0, PAD, 0, S - PAD)
  bg.addColorStop(0, '#150e28'); bg.addColorStop(1, '#07040f')
  ctx.fillStyle = bg
  roundRect(ctx, PAD, PAD, S - 2 * PAD, S - 2 * PAD, RADIUS); ctx.fill()

  // Bandeau de groupe : couleur pleine + dégradé vertical léger, coins hauts suivant
  // l'arrondi de la carte (clip) pour un raccord net.
  ctx.save()
  roundRect(ctx, PAD, PAD, S - 2 * PAD, S - 2 * PAD, RADIUS); ctx.clip()
  const band = ctx.createLinearGradient(0, PAD, 0, PAD + BAND_H)
  band.addColorStop(0, mix(color, '#ffffff', 0.14))
  band.addColorStop(1, mix(color, '#000000', 0.2))
  ctx.fillStyle = band
  ctx.fillRect(PAD, PAD, S - 2 * PAD, BAND_H)
  ctx.restore()

  const ink = inkOn(color)
  drawIcon(ctx, icon, S / 2, PAD + BAND_H / 2, 78, ink, 0.25)

  // Liseré extérieur à la couleur du groupe (repère à distance).
  ctx.strokeStyle = color; ctx.lineWidth = 6
  roundRect(ctx, PAD + 3, PAD + 3, S - 2 * PAD - 6, S - 2 * PAD - 6, RADIUS - 3); ctx.stroke()

  // Contenu textuel contre-pivoté (voir version compacte).
  ctx.save()
  if (angle) { ctx.translate(S / 2, S / 2); ctx.rotate(angle); ctx.translate(-S / 2, -S / 2) }
  // Nom : blanc pur sur fond sombre, 2 lignes max, ajusté pour ne jamais déborder.
  const fit = fitText(ctx, name.toUpperCase(), { max: S - 2 * (PAD + 28), maxLines: 2, start: 62, min: 24 })
  shadowOn(ctx)
  drawBlock(ctx, fit, S / 2, 278, '#ffffff')
  shadowOff(ctx)

  drawPricePill(ctx, price, S / 2, S - PAD - 58)
  ctx.restore()
}

/**
 * Case spéciale (départ, prison, gare, service, taxe, carte…) : bloc plein à sa
 * couleur, grande icône néon centrée et libellé court. Jamais de prix.
 * `angle` ≠ 0 → coin : contenu pivoté vers l'extérieur, icône 1,6×.
 */
function drawSpecialFace(ctx, { name, color, icon, label, angle }) {
  const ink = inkOn(color)
  const g = ctx.createLinearGradient(0, PAD, 0, S - PAD)
  g.addColorStop(0, mix(color, '#ffffff', 0.12))
  g.addColorStop(1, mix(color, '#000000', 0.26))
  ctx.fillStyle = g
  roundRect(ctx, PAD, PAD, S - 2 * PAD, S - 2 * PAD, RADIUS); ctx.fill()

  ctx.strokeStyle = 'rgba(0,0,0,0.42)'; ctx.lineWidth = 12
  roundRect(ctx, PAD + 4, PAD + 4, S - 2 * PAD - 8, S - 2 * PAD - 8, RADIUS - 4); ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 4
  roundRect(ctx, PAD + 16, PAD + 16, S - 2 * PAD - 32, S - 2 * PAD - 32, RADIUS - 14); ctx.stroke()

  const corner = angle !== 0
  ctx.save()
  if (corner) { ctx.translate(S / 2, S / 2); ctx.rotate(angle); ctx.translate(-S / 2, -S / 2) }

  // Coin : le contenu vit dans le carré pivoté, soit un losange de demi-diagonale
  // (256 − marges)·√2 ≈ 328. La largeur utile à la distance |v| du centre vaut donc
  // 2·(328 − |v|) : d'où des blocs plus étroits et resserrés que sur une case droite.
  const nameMax = corner ? 260 : S - 2 * (PAD + 26)
  const nameY = corner ? S / 2 - 128 : 118
  const iconY = corner ? S / 2 + 20 : 264
  const iconSize = corner ? 200 : 150
  const pillY = corner ? S / 2 + 150 : S - PAD - 62
  const pillMax = corner ? 260 : S - 2 * (PAD + 30)

  const fit = fitText(ctx, name.toUpperCase(), { max: nameMax, maxLines: 2, start: corner ? 56 : 66, min: 22, weight: 800 })
  shadowOn(ctx)
  drawBlock(ctx, fit, S / 2, nameY, ink)
  shadowOff(ctx)

  drawIcon(ctx, icon, S / 2, iconY, iconSize, ink, 0.3)
  drawLabelPill(ctx, label, S / 2, pillY, pillMax)

  ctx.restore()
}

/**
 * Résolution de la texture. 512² logiques ; on double la définition seulement sur
 * grand écran rétina — 40 cases en VRAM, 1024² partout ferait exploser le mobile
 * alors qu'une case y mesure ~60 px à l'écran.
 */
export function texScale() {
  if (typeof window === 'undefined') return 1
  const dpr = window.devicePixelRatio || 1
  return isSmallScreen() ? 1 : Math.min(dpr, 2)
}

/** Écran de téléphone : une case y mesure ~36 px de côté, tout doit y grossir. */
export function isSmallScreen() {
  if (typeof window === 'undefined') return false
  return Math.min(window.innerWidth, window.innerHeight) < 820
}

// Mots qui n'identifient rien : type de voie en tête, puis liaisons. « Rue de la
// Soif » et « Rue de la Vodka » ne se distinguent que par leur dernier mot.
const STREET_TYPE = new Set(['RUE', 'AVENUE', 'PLACE', 'BOULEVARD', 'IMPASSE', 'ALLÉE', 'PASSAGE', 'QUAI', 'CHEMIN', 'SQUARE', 'VILLA'])
const LINK = new Set(['DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'À', 'AU', 'AUX', 'D', 'L'])

/**
 * Libellé court d'une case, pour les écrans où elle ne fait qu'une trentaine de
 * pixels. « Boulevard de la Bière » → « BIÈRE » : un seul mot tient deux fois
 * plus gros que quatre, et c'est lui qui identifie la case.
 *
 * Le raccourci ne s'applique qu'aux noms bâtis sur un type de voie, seul motif où
 * la tête est purement décorative. « Chance à Boire » ou « Au Poste ! » ne perdent
 * rien : les amputer donnerait « CHANCE BOIRE ». Le nom complet reste partout
 * ailleurs — fiche de case, feuille des biens, journal.
 */
export function shortLabel(name) {
  const words = name
    .toUpperCase()
    .replace(/\([^)]*\)/g, ' ')
    // Élisions : « L’AUBE » → « L AUBE », pour que la liaison tombe seule.
    .replace(/[’']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return name.toUpperCase()
  if (!STREET_TYPE.has(words[0])) return words.join(' ')
  const kept = words.slice(1).filter((w) => !LINK.has(w))
  return kept.length ? kept.join(' ') : words.join(' ')
}

/**
 * Génère la texture néon d'une case.
 *
 * Achetable (propriété) : carte sombre, bandeau de groupe en haut, nom au centre,
 * prix en pastille dorée. Spéciale (départ, gare, service, taxe, carte…) : bloc
 * plein à sa couleur, grande icône et libellé court — identifiable d'un coup d'œil.
 * `index` (0..39) sert à détecter les coins (0, 10, 20, 30) et à orienter leur
 * contenu à 45° vers l'extérieur du plateau.
 */
export function createTileTexture(space, index = -1, angleOverride = null) {
  const kind = space.kind
  const color = colorFor(kind, space.group)
  const icon = iconFor(kind, space.group)
  const iconOnly = ICON_ONLY.has(kind)
  // Rotation du texte : imposée par la géométrie de la map (coins d'un plateau en
  // grille). Repli historique sur l'index tant qu'aucun angle n'est fourni.
  const corner = index >= 0 && index % 10 === 0
  const angle = angleOverride ?? (corner ? (index % 20 === 0 ? -Math.PI / 4 : Math.PI / 4) : 0)

  const scale = texScale()
  const cv = document.createElement('canvas')
  cv.width = Math.round(S * scale); cv.height = Math.round(S * scale)
  const ctx = cv.getContext('2d')
  ctx.scale(scale, scale)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const compact = isSmallScreen()
  if (iconOnly) {
    if (compact) drawSpecialFaceCompact(ctx, { name: space.name, color, icon, angle })
    else drawSpecialFace(ctx, { name: space.name, color, icon, label: SPECIAL_LABEL[kind] || 'SPÉCIAL', angle })
  } else if (compact) {
    drawPropertyFaceCompact(ctx, { name: space.name, color, price: space.price, angle })
  } else {
    drawPropertyFace(ctx, { name: space.name, color, icon, price: space.price, angle })
  }
  ctx.letterSpacing = '0px'

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 8
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
