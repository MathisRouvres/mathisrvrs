import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const DUR = 1.5
const HEIGHT = 6

const DUMMY = new THREE.Object3D()

/**
 * Colonnes de lumière verticales sur les cases d'un groupe (monopole complété).
 * Un seul InstancedMesh, une instance par case du groupe.
 */
export default function LightColumns({ positions, color, onDone }) {
  const ref = useRef()
  const mat = useRef()
  const t = useRef(0)
  const done = useRef(false)

  useEffect(() => {
    const mesh = ref.current
    return () => { mesh?.dispose?.() }
  }, [])

  useFrame((_, dt) => {
    t.current += dt
    const k = Math.min(1, t.current / DUR)
    const mesh = ref.current
    if (!mesh) return
    // Montée élastique en 0,25 s, puis maintien, puis extinction.
    const grow = Math.min(1, k / 0.17)
    positions.forEach((p, i) => {
      DUMMY.position.set(p[0], 0.3 + (HEIGHT * grow) / 2, p[1])
      DUMMY.scale.set(1, grow, 1)
      DUMMY.rotation.y = t.current * 0.8
      DUMMY.updateMatrix()
      mesh.setMatrixAt(i, DUMMY.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mat.current) mat.current.opacity = 0.55 * Math.min(1, k / 0.15) * (k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1)
    if (k >= 1 && !done.current) { done.current = true; onDone() }
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, positions.length)]} frustumCulled={false}>
      <cylinderGeometry args={[0.42, 0.42, HEIGHT, 18, 1, true]} />
      <meshBasicMaterial
        ref={mat}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  )
}
