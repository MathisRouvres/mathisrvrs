import * as THREE from 'three'

/**
 * Génère les 6 faces d'un dé (points néon sur ivoire) en textures canvas.
 * Ordre BoxGeometry : [+x, -x, +y, -y, +z, -z] → valeurs [3, 4, 1, 6, 2, 5]
 * (faces opposées = 7). L'orientation de la valeur voulue vers le haut est
 * gérée par TARGET_EULER côté scène.
 */

const FACE_VALUES = [3, 4, 1, 6, 2, 5]

// Positions des points sur une grille 3×3 (col, row) par valeur.
const PIP_LAYOUT = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
}

function faceCanvas(value) {
  const S = 256
  const cvs = document.createElement('canvas')
  cvs.width = S
  cvs.height = S
  const g = cvs.getContext('2d')
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'

  // Fond ivoire dégradé.
  const grad = g.createLinearGradient(0, 0, S, S)
  grad.addColorStop(0, '#fdf6ff')
  grad.addColorStop(1, '#e9def7')
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)

  // Liseré violet.
  g.strokeStyle = 'rgba(124, 58, 237, 0.55)'
  g.lineWidth = 6
  g.strokeRect(3, 3, S - 6, S - 6)

  // Points magenta lumineux.
  const cell = S / 3
  const r = S * 0.085
  g.fillStyle = '#ec1e79'
  g.shadowColor = 'rgba(236, 30, 121, 0.8)'
  g.shadowBlur = 10
  for (const [col, row] of PIP_LAYOUT[value]) {
    const x = cell * col + cell / 2
    const y = cell * row + cell / 2
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }

  const tex = new THREE.CanvasTexture(cvs)
  tex.anisotropy = 16
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

let cachedMaterials = null

/** Renvoie le tableau de 6 matériaux (une par face) — mémoïsé. */
export function createDiceMaterials() {
  if (cachedMaterials) return cachedMaterials
  cachedMaterials = FACE_VALUES.map((v) => {
    const map = faceCanvas(v)
    return new THREE.MeshStandardMaterial({
      map,
      emissiveMap: map,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.28,
      roughness: 0.35,
      metalness: 0.1,
    })
  })
  return cachedMaterials
}

// Euler (x,y,z) qui amène la valeur voulue sur la face du haut (+y).
export const TARGET_EULER = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
}
