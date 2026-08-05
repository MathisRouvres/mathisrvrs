import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Boîte à outils de fusion géométrique. Chaque environnement construit son décor
 * solide en UNE géométrie à couleurs de sommets : un seul draw call pour le sol,
 * le mobilier et les objets, quel que soit le nombre de pièces.
 *
 * C'est la contrainte de perf principale du décor : un canapé « propre » en 14
 * meshes séparés coûterait plus cher que les 40 cases du plateau réunies.
 */

/** Peint une géométrie d'une couleur unie (attribut `color`), pour la fusion. */
export function tint(geo, hex) {
  const c = new THREE.Color(hex)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

/** Translate une géométrie, avec rotation Y optionnelle appliquée AVANT. */
export function at(geo, x, y, z, spinY = 0) {
  if (spinY) geo.rotateY(spinY)
  geo.translate(x, y, z)
  return geo
}

/** Boîte teintée posée à (x, y, z) — y est le CENTRE, comme dans three. */
export function box(w, h, d, hex, x, y, z, spinY = 0) {
  return tint(at(new THREE.BoxGeometry(w, h, d), x, y, z, spinY), hex)
}

/** Cylindre teinté. */
export function cyl(rTop, rBottom, h, seg, hex, x, y, z, spinY = 0) {
  return tint(at(new THREE.CylinderGeometry(rTop, rBottom, h, seg), x, y, z, spinY), hex)
}

/** Disque horizontal teinté. */
export function disc(r, seg, hex, y) {
  return tint(new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2).translate(0, y, 0), hex)
}

/** Sphère (ou calotte) teintée. */
export function ball(r, wSeg, hSeg, hex, x, y, z, phiStart = 0, phiLen = Math.PI * 2, thetaStart = 0, thetaLen = Math.PI) {
  return tint(at(new THREE.SphereGeometry(r, wSeg, hSeg, phiStart, phiLen, thetaStart, thetaLen), x, y, z), hex)
}

/** Cône teinté (ouvert par défaut : moitié moins de triangles). */
export function cone(r, h, seg, hex, x, y, z, open = false) {
  return tint(at(new THREE.ConeGeometry(r, h, seg, 1, open), x, y, z), hex)
}

/**
 * Fusionne et libère les morceaux. Renvoie `null` sur une liste vide : un
 * `<mesh geometry={null}>` est simplement ignoré par three, pas une erreur.
 */
export function fuse(parts) {
  if (!parts.length) return null
  const merged = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  return merged
}

/** Coordonnées polaires → cartésiennes, angle 0 = +z (face caméra au repos). */
export function polar(angle, radius) {
  return [Math.sin(angle) * radius, Math.cos(angle) * radius]
}

/**
 * Table commune à tous les environnements : le plateau est POSÉ dessus, socle
 * compris. Seules les teintes changent d'un décor à l'autre — la cote, jamais.
 * `withTop` fusionne le dessus (rendu allégé, pas de miroir séparé).
 */
export function tableParts({ top, bottom, radius, edgeRadius, withTop, colors }) {
  const parts = [
    // Chanfrein du bord : la tranche accroche la lumière rasante.
    cyl(radius, edgeRadius, 0.12, 64, colors.edge, 0, top - 0.06, 0),
    // Corps.
    cyl(edgeRadius, edgeRadius - 0.6, 0.5, 64, colors.body, 0, top - 0.37, 0),
  ]
  if (withTop) parts.push(disc(radius, 64, colors.top, top))
  // Piètement central : la table ne flotte plus au-dessus du sol.
  const legH = top - 0.62 - bottom
  parts.push(cyl(1.15, 1.5, legH, 20, colors.body, 0, bottom + legH / 2, 0))
  parts.push(cyl(3.4, 3.8, 0.24, 28, colors.edge, 0, bottom + 0.12, 0))
  return parts
}

/** Texture de sol : dégradé radial + grain léger. 256² = 256 Ko en VRAM. */
export function createFloorTexture({ inner, outer, grain = 0.06, rings = 0 }) {
  const cv = document.createElement('canvas')
  cv.width = 256; cv.height = 256
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  if (rings > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 1; i <= rings; i++) {
      ctx.beginPath()
      ctx.arc(128, 128, (128 / (rings + 1)) * i, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  if (grain > 0) {
    // Grain déterministe : pas de Math.random, le sol doit être identique d'un
    // montage à l'autre (sinon le décor « scintille » au remontage du plateau).
    const img = ctx.getImageData(0, 0, 256, 256)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const p = i >> 2
      const n = ((p * 1103515245 + 12345) >> 16) & 0xff
      const k = (n / 255 - 0.5) * grain * 255
      d[i] = Math.max(0, Math.min(255, d[i] + k))
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + k))
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + k))
    }
    ctx.putImageData(img, 0, 0)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Dégradé vertical du dôme : sol → horizon → zénith. */
export function createDomeTexture({ zenith, upper, horizon, ground }) {
  const cv = document.createElement('canvas')
  cv.width = 4; cv.height = 128
  const ctx = cv.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, zenith)
  g.addColorStop(0.38, upper)
  g.addColorStop(0.62, horizon)
  g.addColorStop(1, ground)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 128)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
