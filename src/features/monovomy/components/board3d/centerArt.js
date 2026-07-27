import * as THREE from 'three'
import { drawIcon } from './neonIcons'

const CONFETTI = ['#ec1e79', '#7c3aed', '#22c1c3', '#f5b21a', '#f97316', '#22c55e', '#3b82f6', '#ffffff']
const DRINKS = [
  { icon: 'dice', color: '#ec1e79' },
  { icon: 'martini', color: '#22c1c3' },
  { icon: 'champagne', color: '#f5b21a' },
  { icon: 'cheers', color: '#a855f7' },
  { icon: 'party', color: '#f97316' },
  { icon: 'beer', color: '#22c55e' },
  { icon: 'star', color: '#3b82f6' },
  { icon: 'drop', color: '#ec4899' },
]

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/**
 * Décor central imprimé SUR le plateau : logo MONOVOMY + ruban, illustrations
 * néon et confettis (le tout tourne avec le plateau, ne flotte pas).
 */
export function createCenterTexture() {
  const N = 1024
  const SCALE = 2 // super-sampling → net au zoom
  const cv = document.createElement('canvas')
  cv.width = N * SCALE; cv.height = N * SCALE
  const ctx = cv.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const cx = N / 2, cy = N / 2
  // Logo remonté vers le haut du plateau → laisse le centre libre pour la scène.
  const ly = cy - 268

  // Confettis en filigrane, périphérie seulement (ne concurrencent jamais l'info).
  for (let i = 0; i < 30; i += 1) {
    const x = Math.random() * N
    const y = Math.random() * N
    if (Math.hypot(x - cx, y - cy) < 320) continue // centre libre
    if (Math.hypot(x - cx, y - cy) > 500) continue
    const col = CONFETTI[(Math.random() * CONFETTI.length) | 0]
    const w = 6 + Math.random() * 9
    const h = 4 + Math.random() * 7
    ctx.save()
    ctx.translate(x, y); ctx.rotate(Math.random() * Math.PI)
    ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.shadowColor = col; ctx.shadowBlur = 4
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.restore()
  }

  // Illustrations néon en périphérie, discrètes (filigrane).
  const R = 424
  ctx.save()
  ctx.globalAlpha = 0.24
  DRINKS.forEach((d, i) => {
    const a = -Math.PI / 2 + (i / DRINKS.length) * Math.PI * 2
    drawIcon(ctx, d.icon, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 66, d.color)
  })
  ctx.restore()

  // Logo MONOVOMY — police de marque, glow net et maîtrisé (imprimé en haut).
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.font = "800 92px 'Fredoka', 'Poppins', sans-serif"
  const mono = 'MONO', vomy = 'VOMY'
  const wm = ctx.measureText(mono).width
  const wv = ctx.measureText(vomy).width
  const x0 = cx - (wm + wv) / 2
  ctx.shadowBlur = 11; ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(245, 178, 26, 0.7)'; ctx.fillStyle = '#f5b21a'; ctx.fillText(mono, x0, ly)
  ctx.shadowColor = 'rgba(236, 30, 121, 0.7)'; ctx.fillStyle = '#ec1e79'; ctx.fillText(vomy, x0 + wm, ly)

  // Ruban « signature » sous le logo, compact.
  ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(236, 30, 121, 0.55)'
  roundRect(ctx, cx - 148, ly + 60, 296, 42, 21); ctx.fillStyle = '#ec1e79'; ctx.fill()
  ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'
  ctx.letterSpacing = '2px'
  ctx.font = "700 21px 'Fredoka', 'Poppins', sans-serif"; ctx.fillText('LE MONOPOLY À BOIRE', cx, ly + 82)
  ctx.letterSpacing = '0px'

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 16
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
