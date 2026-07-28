import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const COUNT = 14
const DUR = 1.0
const SPREAD = 0.28 // décalage de départ entre la 1re et la dernière pièce

const DUMMY = new THREE.Object3D()

/** Décalages figés par pièce, tirés à la première frame (jamais pendant le rendu). */
function seedCoins() {
  return Array.from({ length: COUNT }, (_, i) => ({
    delay: (i / COUNT) * SPREAD,
    side: (Math.random() - 0.5) * 0.5,
    lift: 1.5 + Math.random() * 1.1,
    spin: 3 + Math.random() * 5,
  }))
}

/**
 * Pièces dorées qui volent de la case du payeur vers le pion du propriétaire, en
 * arc. Un seul InstancedMesh : 14 pièces = 1 draw call.
 */
export default function CashBurst({ from, to, onDone }) {
  const ref = useRef()
  const seeds = useRef(null)
  const t = useRef(0)
  const done = useRef(false)

  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    if (!seeds.current) seeds.current = seedCoins()
    t.current += dt
    const total = DUR + SPREAD
    for (let i = 0; i < COUNT; i++) {
      const s = seeds.current[i]
      const k = Math.min(1, Math.max(0, (t.current - s.delay) / DUR))
      // Arc : interpolation linéaire au sol + parabole verticale.
      const x = from[0] + (to[0] - from[0]) * k + s.side * Math.sin(k * Math.PI)
      const z = from[1] + (to[1] - from[1]) * k + s.side * Math.sin(k * Math.PI)
      DUMMY.position.set(x, 0.45 + Math.sin(k * Math.PI) * s.lift, z)
      DUMMY.rotation.set(t.current * s.spin, t.current * s.spin * 0.7, 0)
      // Les pièces éclosent au départ et se referment à l'arrivée.
      DUMMY.scale.setScalar(Math.min(1, k * 6) * Math.min(1, (1 - k) * 6))
      DUMMY.updateMatrix()
      mesh.setMatrixAt(i, DUMMY.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (t.current >= total && !done.current) { done.current = true; onDone() }
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <octahedronGeometry args={[0.075, 0]} />
      <meshStandardMaterial color="#ffd24a" emissive="#f5a11a" emissiveIntensity={0.9} metalness={0.7} roughness={0.25} toneMapped={false} />
    </instancedMesh>
  )
}
