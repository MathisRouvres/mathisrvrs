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

/**
 * Décor central imprimé SUR le podium : illustrations néon en filigrane et
 * confettis, rien d'autre. Le logo et le ruban ont quitté la texture — ils sont
 * désormais en volume et face caméra (voir CenterStage), parce qu'imprimés au sol
 * ils devenaient illisibles dès que la caméra s'inclinait.
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

  // Fond opaque : la texture habille désormais le DESSUS du podium (un disque), pas
  // un plan transparent posé sur le plateau. Dégradé radial → effet piste de danse.
  const base = ctx.createRadialGradient(cx, cy, 40, cx, cy, N / 2)
  base.addColorStop(0, '#1d1440')
  base.addColorStop(0.55, '#120b2a')
  base.addColorStop(1, '#090515')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, N, N)

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

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 16
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
