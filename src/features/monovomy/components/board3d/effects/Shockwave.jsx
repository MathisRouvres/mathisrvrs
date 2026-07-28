import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const DUR = 0.8

/** Onde de choc au sol : anneau qui s'étend et s'estompe (achat de propriété). */
export default function Shockwave({ position, color, onDone }) {
  const ref = useRef()
  const mat = useRef()
  const t = useRef(0)
  const done = useRef(false)

  useFrame((_, dt) => {
    t.current += dt
    const k = Math.min(1, t.current / DUR)
    // Expansion rapide au début puis ralentie (ease-out) : lecture « impact ».
    const s = 0.5 + (1 - (1 - k) ** 3) * 4.4
    ref.current?.scale.set(s, s, 1)
    if (mat.current) mat.current.opacity = (1 - k) ** 1.6
    if (k >= 1 && !done.current) { done.current = true; onDone() }
  })

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.31, position[1]]}>
      <ringGeometry args={[0.36, 0.5, 48]} />
      <meshBasicMaterial
        ref={mat}
        color={color}
        transparent
        opacity={1}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
