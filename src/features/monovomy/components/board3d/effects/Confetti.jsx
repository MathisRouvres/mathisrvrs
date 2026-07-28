import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const COUNT = 200
const DUR = 2.5
const GRAVITY = 5.2

/**
 * Amorce le nuage : positions, couleurs et vitesses. Appelé à la première frame
 * (jamais pendant le rendu : du tirage aléatoire en rendu casserait la pureté et
 * relancerait l'effet à chaque re-render).
 */
function seedCloud(geometry, origin, colors) {
  const pos = new Float32Array(COUNT * 3)
  const col = new Float32Array(COUNT * 3)
  const vel = new Float32Array(COUNT * 3)
  const c = new THREE.Color()
  for (let i = 0; i < COUNT; i++) {
    const j = i * 3
    // Départ dans un petit disque autour de l'origine.
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * 0.7
    pos[j] = origin[0] + Math.cos(a) * r
    pos[j + 1] = 0.5 + Math.random() * 0.3
    pos[j + 2] = origin[1] + Math.sin(a) * r
    // Cône vers le haut, un peu évasé.
    const sa = Math.random() * Math.PI * 2
    vel[j] = Math.cos(sa) * (0.7 + Math.random() * 1.5)
    vel[j + 1] = 1.4 + Math.random() * 3.2
    vel[j + 2] = Math.sin(sa) * (0.7 + Math.random() * 1.5)
    c.set(colors[i % colors.length])
    col[j] = c.r; col[j + 1] = c.g; col[j + 2] = c.b
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return vel
}

/**
 * Confettis : un seul THREE.Points de 200 particules (jamais 200 meshes). Gravité,
 * rebond mou sur le plateau, extinction sur la dernière seconde. La géométrie est
 * déclarative : R3F la libère au démontage.
 */
export default function Confetti({ origin, colors, onDone }) {
  const ref = useRef()
  const mat = useRef()
  const vel = useRef(null)
  const t = useRef(0)
  const done = useRef(false)

  useFrame((_, dt) => {
    const points = ref.current
    if (!points) return
    const geometry = points.geometry
    if (!vel.current) vel.current = seedCloud(geometry, origin, colors)

    t.current += dt
    const k = Math.min(1, t.current / DUR)
    const v = vel.current
    const pos = geometry.attributes.position.array
    const step = Math.min(dt, 0.05)
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3
      v[j + 1] -= GRAVITY * step
      pos[j] += v[j] * step
      pos[j + 1] += v[j + 1] * step
      pos[j + 2] += v[j + 2] * step
      // Rebond mou sur le plateau, sinon les confettis le traversent.
      if (pos[j + 1] < 0.32) { pos[j + 1] = 0.32; v[j + 1] *= -0.28 }
    }
    geometry.attributes.position.needsUpdate = true
    if (mat.current) mat.current.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4
    if (k >= 1 && !done.current) { done.current = true; onDone() }
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry />
      <pointsMaterial
        ref={mat}
        size={0.13}
        sizeAttenuation
        vertexColors
        transparent
        opacity={1}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}
