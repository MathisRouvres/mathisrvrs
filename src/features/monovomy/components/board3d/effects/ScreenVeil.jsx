import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const DIR = new THREE.Vector3()

/**
 * Voile plein écran collé à la caméra : sert au flash blanc (montée d'intensité),
 * au voile de faillite et au fondu qui remplace tous les effets en mouvement réduit.
 * `peak` = opacité max, `rise` = fraction de la durée en montée.
 */
export default function ScreenVeil({ color = '#ffffff', peak = 0.5, dur = 0.4, rise = 0.15, onDone }) {
  const ref = useRef()
  const mat = useRef()
  const t = useRef(0)
  const done = useRef(false)

  useFrame((s, dt) => {
    t.current += dt
    const k = Math.min(1, t.current / dur)
    const mesh = ref.current
    const cam = s.camera
    if (mesh && cam) {
      // Plaque calée juste devant le plan proche, dimensionnée au champ de vision.
      const d = cam.near + 0.05
      DIR.set(0, 0, -1).applyQuaternion(cam.quaternion)
      mesh.position.copy(cam.position).addScaledVector(DIR, d)
      mesh.quaternion.copy(cam.quaternion)
      const h = 2 * d * Math.tan((cam.fov * Math.PI) / 360)
      mesh.scale.set(h * cam.aspect * 1.1, h * 1.1, 1)
    }
    if (mat.current) {
      mat.current.opacity = peak * (k < rise ? k / rise : 1 - (k - rise) / (1 - rise))
    }
    if (k >= 1 && !done.current) { done.current = true; onDone() }
  })

  return (
    <mesh ref={ref} renderOrder={999} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={mat} color={color} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
