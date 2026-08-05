import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * Lueurs d'arrière-plan et fumée — les deux seuls effets « volumétriques » du
 * décor, tous deux faux et tous deux bon marché.
 *
 * - bokeh : un nuage de points, très loin et très haut, aux couleurs de
 *   l'ambiance. C'est lui qui donne l'impression de salle. Un draw call.
 * - fumée : trois plans horizontaux additifs qui tournent lentement. Pas de
 *   particules, pas de blur : la fumée d'un warehouse ne doit pas coûter plus
 *   cher que le plateau qu'elle entoure.
 *
 * Les deux disparaissent en rendu allégé, et la fumée ne tourne plus en mouvement
 * réduit.
 */

const COUNT_CAP = 64
const SMOKE_LAYERS = 3
const TMP = new THREE.Color()

/** Générateur déterministe : le décor doit être identique à chaque montage. */
function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function buildBokeh(n, colorA, colorB) {
  const count = Math.min(n, COUNT_CAP)
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const a = new THREE.Color(colorA)
  const b = new THREE.Color(colorB)
  const rnd = lcg(0x5eed)
  for (let i = 0; i < count; i++) {
    // Anneau large et haut : jamais dans le champ du plateau.
    const ang = (i / count) * Math.PI * 2 + rnd() * 0.4
    const rad = 21 + rnd() * 16
    pos[i * 3] = Math.cos(ang) * rad
    pos[i * 3 + 1] = 1.5 + rnd() * 15
    pos[i * 3 + 2] = Math.sin(ang) * rad
    TMP.copy(rnd() < 0.5 ? a : b).multiplyScalar(0.55 + rnd() * 0.45)
    col[i * 3] = TMP.r; col[i * 3 + 1] = TMP.g; col[i * 3 + 2] = TMP.b
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return geo
}

/** Nappe de fumée : dégradé radial très doux, transparent au centre ET au bord. */
function createSmokeTexture() {
  const cv = document.createElement('canvas')
  cv.width = 128; cv.height = 128
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.5)')
  g.addColorStop(0.82, 'rgba(255,255,255,0.22)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(cv)
}

export default function Atmosphere({ ambiance, bokeh = 0, smoke = 0, reducedMotion, floorY }) {
  const bokehRef = useRef()
  const smokeRef = useRef()

  // Couleurs figées à la construction : les lueurs sont trop diffuses pour qu'un
  // changement d'intensité vaille une reconstruction du nuage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bokehGeo = useMemo(() => (bokeh > 0 ? buildBokeh(bokeh, ambiance.lightA, ambiance.lightB) : null), [bokeh])
  useEffect(() => () => bokehGeo?.dispose(), [bokehGeo])

  const smokeTex = useMemo(() => (smoke > 0 ? createSmokeTexture() : null), [smoke])
  useEffect(() => () => smokeTex?.dispose(), [smokeTex])

  useFrame((_, dt) => {
    if (reducedMotion) return
    const bok = bokehRef.current
    if (bok) bok.rotation.y += dt * 0.012
    const sm = smokeRef.current
    if (sm) sm.rotation.y -= dt * 0.018
  })

  return (
    <group>
      {bokehGeo && (
        <points ref={bokehRef} geometry={bokehGeo} raycast={() => null} frustumCulled={false}>
          <pointsMaterial
            size={1.7}
            sizeAttenuation
            vertexColors
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
            fog={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {smokeTex && (
        <group ref={smokeRef}>
          {Array.from({ length: SMOKE_LAYERS }, (_, i) => (
            <mesh
              key={i}
              rotation={[-Math.PI / 2, 0, (i * Math.PI * 2) / SMOKE_LAYERS]}
              position={[0, floorY + 1.6 + i * 1.5, 0]}
              raycast={() => null}
            >
              <planeGeometry args={[62, 62]} />
              <meshBasicMaterial
                map={smokeTex}
                color={i % 2 ? ambiance.lightB : ambiance.lightA}
                transparent
                opacity={smoke * (0.05 - i * 0.012)}
                depthWrite={false}
                toneMapped={false}
                fog={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
