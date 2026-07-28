import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const STEP = 0.08 // cascade : 80 ms entre deux cases
const FADE = 0.45 // durée de vidage d'une case

const DUMMY = new THREE.Object3D()

/**
 * Faillite : la couleur du joueur se vide de ses cases une par une (cascade de
 * 80 ms). Un seul InstancedMesh — une plaque colorée par case, qui rétrécit et
 * s'enfonce chacune à son tour.
 */
export default function BankruptDrain({ positions, color, onDone }) {
  const ref = useRef()
  const t = useRef(0)
  const done = useRef(false)
  const total = positions.length * STEP + FADE

  useEffect(() => {
    const mesh = ref.current
    return () => { mesh?.dispose?.() }
  }, [])

  useFrame((_, dt) => {
    t.current += dt
    const mesh = ref.current
    if (!mesh) return
    positions.forEach((p, i) => {
      const k = Math.min(1, Math.max(0, (t.current - i * STEP) / FADE))
      const s = 1 - k
      DUMMY.position.set(p[0], 0.33 - k * 0.3, p[1])
      // Les matrices d'instance sont en espace local : c'est chaque plaque qui est
      // couchée à plat, pas le mesh (sinon les positions monde partiraient de travers).
      DUMMY.rotation.set(-Math.PI / 2, 0, 0)
      DUMMY.scale.set(s, s, s)
      DUMMY.updateMatrix()
      mesh.setMatrixAt(i, DUMMY.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (t.current >= total && !done.current) { done.current = true; onDone() }
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, positions.length)]} frustumCulled={false}>
      <planeGeometry args={[0.9, 0.9]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  )
}
