import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * Faisceaux tombant du hors-champ.
 *
 * Volontairement DISCRETS : cônes fins (rayon ≈ 1,4 au lieu de 3,1), opacité de
 * l'ordre de 0,03, et surtout inclinés vers l'EXTÉRIEUR. L'ancien décor braquait
 * deux cônes larges sur le plateau : ils passaient sur les cases et sur les
 * textes, et c'est eux qu'on voyait en premier sur la capture. Ici ils balaient
 * l'anneau des places, jamais le jeu.
 *
 * Un seul `instancedMesh` : le nombre de faisceaux ne coûte pas de draw call.
 */

const DUMMY = new THREE.Object3D()
// Ordre YXZ : le lacet place le faisceau sur l'anneau, PUIS l'inclinaison se fait
// dans son repère — sinon le cône part de travers dès qu'on quitte l'axe +z.
DUMMY.rotation.order = 'YXZ'

/** Rayon du cercle balayé : hors du plateau (6,75) ET hors du rail des titres (11,3). */
const SWEEP_R = 12.6
/** Inclinaison : négative, la base du cône s'écarte du centre. */
const TILT = -0.22
/** Hauteur du cône et altitude de son centre : il descend jusqu'au ras du sol. */
const BEAM_H = 14
const BEAM_Y = 3

export default function Spotbeams({ count, opacity, radius, color, speed, pulse, reducedMotion }) {
  const ref = useRef()
  const matRef = useRef()

  useFrame((s) => {
    const mesh = ref.current
    if (!mesh) return
    const t = reducedMotion ? 0 : s.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const base = (i / count) * Math.PI * 2
      // Balayage lent AUTOUR du plateau : le faisceau ne passe jamais sur les
      // cases ni sur les textes, c'est ce qui le rendait envahissant avant.
      const a = base + (reducedMotion ? 0 : Math.sin(t * 0.09 + i * 1.3) * 0.35)
      DUMMY.position.set(Math.sin(a) * SWEEP_R, BEAM_Y, Math.cos(a) * SWEEP_R)
      DUMMY.rotation.set(TILT, a, 0)
      DUMMY.updateMatrix()
      mesh.setMatrixAt(i, DUMMY.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (matRef.current) {
      const amp = reducedMotion ? 0 : 0.35 * pulse
      matRef.current.opacity = opacity * (1 + Math.sin(t * speed * 0.4) * amp)
    }
  })

  if (count <= 0) return null

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} raycast={() => null} frustumCulled={false}>
      <coneGeometry args={[radius, BEAM_H, 16, 1, true]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        fog={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  )
}
