import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createDomeTexture, createFloorTexture } from '../geoKit'
import { BOARD_HALF, FLOOR_Y, TABLE_R, TABLE_TOP } from '../stage'

/**
 * Coquille de la pièce, commune aux trois décors : dôme, sol, ombre portée de la
 * table et ombre de contact du plateau.
 *
 * Ce sont les couches `background`, `floor` et `boardShadow`. Elles ne racontent
 * rien à elles seules — c'est le mobilier du thème qui donne le lieu — mais elles
 * fournissent la profondeur : le plateau ne flotte plus dans le noir, il est posé
 * sur une table, elle-même posée sur un sol qui reçoit son ombre.
 *
 * Quatre meshes, aucun blur d'écran, aucune animation permanente sauf la teinte
 * du dôme qui suit l'ambiance en fondu (une lerp de couleur par frame).
 */

const TMP = new THREE.Color()

/** Ombre douce : disque opaque au centre, transparent au bord. */
function createShadowTexture(strength) {
  const cv = document.createElement('canvas')
  cv.width = 128; cv.height = 128
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
  g.addColorStop(0, `rgba(0,0,0,${strength})`)
  g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.62})`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(cv)
}

export default function RoomShell({ palette, ambiance, lite, haze = 0 }) {
  const domeRef = useRef()
  const blend = useRef(null)

  const domeTex = useMemo(
    () => createDomeTexture({
      zenith: palette.domeZenith,
      upper: palette.domeUpper,
      horizon: palette.domeHorizon,
      ground: palette.domeGround,
    }),
    [palette.domeZenith, palette.domeUpper, palette.domeHorizon, palette.domeGround],
  )
  useEffect(() => () => domeTex.dispose(), [domeTex])

  const floorTex = useMemo(
    () => createFloorTexture({ inner: palette.floorInner, outer: palette.floorOuter, grain: 0.07, rings: 0 }),
    [palette.floorInner, palette.floorOuter],
  )
  useEffect(() => () => floorTex.dispose(), [floorTex])

  const shadowTex = useMemo(() => createShadowTexture(0.72), [])
  const contactTex = useMemo(() => createShadowTexture(0.55), [])
  useEffect(() => () => { shadowTex.dispose(); contactTex.dispose() }, [shadowTex, contactTex])

  useFrame((_, dt) => {
    const dome = domeRef.current
    if (!dome) return
    if (!blend.current) blend.current = new THREE.Color(ambiance.fog)
    blend.current.lerp(TMP.set(ambiance.fog), Math.min(1, dt * 2))
    dome.color.copy(blend.current).multiplyScalar(2.4).addScalar(0.12)
  })

  return (
    <group>
      {/* Dôme : sphère retournée, dégradé vertical. Hors brouillard, sinon il vire
          à l'aplat. On ne verra jamais de mur — c'est le fond du lieu. */}
      <mesh scale={[-1, 1, 1]} raycast={() => null}>
        <sphereGeometry args={[58, 24, 16]} />
        <meshBasicMaterial ref={domeRef} map={domeTex} toneMapped={false} fog={false} depthWrite={false} side={THREE.FrontSide} />
      </mesh>

      {/* Sol de la pièce. Un seul disque : le dôme ferme l'horizon bien avant son bord. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow={!lite} raycast={() => null}>
        <circleGeometry args={[46, 48]} />
        <meshStandardMaterial map={floorTex} roughness={0.92} metalness={0.08} />
      </mesh>

      {/* Ombre portée de la table au sol : elle assoit le meuble dans la pièce. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.012, 0]} raycast={() => null}>
        <planeGeometry args={[TABLE_R * 3, TABLE_R * 3]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.85} />
      </mesh>

      {/* Ombre de contact du plateau sur la table : sans elle, le socle a beau
          poser, il continue de « décoller » sous une lumière rasante. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_TOP + 0.008, 0]} raycast={() => null}>
        <planeGeometry args={[BOARD_HALF * 3.4, BOARD_HALF * 3.4]} />
        <meshBasicMaterial map={contactTex} transparent depthWrite={false} opacity={0.9} />
      </mesh>

      {/* Brume au ras du sol : un anneau translucide, pas un volume. Coupée en
          rendu allégé — c'est le premier transparent plein écran qu'on perd. */}
      {!lite && haze > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 1.1, 0]} raycast={() => null}>
          <ringGeometry args={[13, 34, 40]} />
          <meshBasicMaterial
            color={ambiance.lightB}
            transparent
            opacity={haze * 0.5}
            depthWrite={false}
            toneMapped={false}
            fog={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}
