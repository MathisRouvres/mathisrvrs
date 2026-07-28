import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// La table : le plateau de jeu (12,8 de côté) est POSÉ dessus, socle compris.
export const TABLE_TOP = -0.8
const TABLE_R = 13.6      // rayon du plateau de table
const TABLE_EDGE = 14     // rayon max, au bas du chanfrein
// Les objets de décor vivent entre les rayons 11 et 12,9 : au-delà de la diagonale
// du plateau (9,05), et même sur la diagonale le point tombe à 7,8 en x et z, hors
// des 6,4 occupés par le jeu.
const BOKEH_N = 56
const BEAMS = 2

const DUMMY = new THREE.Object3D()
const TMP_COLOR = new THREE.Color()

/** Peint une géométrie d'une couleur unie (attribut `color`), pour la fusion. */
function tint(geo, hex) {
  const c = new THREE.Color(hex)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

/**
 * Pose une géométrie sur la table. Coordonnées explicites (x, z) et non polaires :
 * les objets doivent tomber dans le champ de la caméra de jeu, pas juste « quelque
 * part sur un anneau ». Tous restent entre les rayons 11 et 12,5 : au-delà des
 * présentoirs de titres (qui occupent 7 à 11), et bien en deçà du bord (13,6).
 */
function place(geo, x, z, y, spin = 0) {
  if (spin) geo.rotateY(spin)
  geo.translate(x, TABLE_TOP + y, z)
  return geo
}

/**
 * Table + objets de bar, fusionnés en UNE géométrie à couleurs de sommets : tout
 * le décor solide tient en un seul draw call.
 *
 * Les objets rejouent les primitives des pions (cylindres, cônes, sphères de
 * `DRINK_SHAPES`) en beaucoup plus grossier : le catalogue expose du JSX, pas des
 * géométries, donc impossible de le fusionner tel quel — on en reprend les formes.
 */
function buildTable({ withTop, withProps }) {
  const parts = []

  // Chanfrein du bord + corps : la tranche accroche la lumière rasante.
  parts.push(tint(new THREE.CylinderGeometry(TABLE_R, TABLE_EDGE, 0.12, 64).translate(0, TABLE_TOP - 0.06, 0), '#3b2a20'))
  parts.push(tint(new THREE.CylinderGeometry(TABLE_EDGE, TABLE_EDGE - 0.6, 0.5, 64).translate(0, TABLE_TOP - 0.37, 0), '#1b120e'))
  // En rendu allégé, le dessus fait partie de la fusion (pas de miroir séparé).
  if (withTop) {
    parts.push(tint(new THREE.CircleGeometry(TABLE_R, 64).rotateX(-Math.PI / 2).translate(0, TABLE_TOP, 0), '#241813'))
  }

  // Placements repoussés au bord de la table (rayon 11,5 à 12,5) : l'anneau 7 à 11
  // appartient désormais aux présentoirs de titres de propriété (voir Estates3D).
  // Rendu allégé : on s'arrête à la table nue, les objets ne sont pas construits.
  if (!withProps) {
    const bare = mergeGeometries(parts)
    parts.forEach((g) => g.dispose())
    return bare
  }

  // ── Deux verres vides + un verre à pied renversé ───────────────────────────
  parts.push(tint(place(new THREE.CylinderGeometry(0.26, 0.2, 0.58, 14), 3.4, 11.7, 0.29), '#93a4b1'))
  parts.push(tint(place(new THREE.CylinderGeometry(0.28, 0.22, 0.44, 14), 5.6, 10.9, 0.22), '#8496a2'))
  parts.push(tint(place(new THREE.ConeGeometry(0.3, 0.5, 14, 1, true).rotateZ(Math.PI), -3.8, 11.6, 0.3), '#9aabb7'))

  // ── Bouteille : corps + épaule conique + goulot + capsule ──────────────────
  const bx = -11.1
  const bz = 5.1
  parts.push(tint(place(new THREE.CylinderGeometry(0.26, 0.29, 0.8, 16), bx, bz, 0.4), '#1d4527'))
  parts.push(tint(place(new THREE.ConeGeometry(0.26, 0.3, 16, 1, true), bx, bz, 0.95), '#1d4527'))
  parts.push(tint(place(new THREE.CylinderGeometry(0.09, 0.09, 0.34, 12), bx, bz, 1.27), '#1d4527'))
  parts.push(tint(place(new THREE.CylinderGeometry(0.1, 0.1, 0.09, 12), bx, bz, 1.48), '#c9a13a'))

  // ── Bol de chips : demi-sphère ouverte + contenu ───────────────────────────
  parts.push(tint(place(new THREE.SphereGeometry(0.72, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 12.1, 1.5, 0.72), '#3a3145'))
  parts.push(tint(place(new THREE.SphereGeometry(0.56, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), 12.1, 1.5, 0.46), '#d9a03a'))

  // ── Téléphone posé à plat, légèrement de biais ─────────────────────────────
  parts.push(tint(place(new THREE.BoxGeometry(0.62, 0.05, 1.26), 0.4, 12.4, 0.025, 0.5), '#15151f'))

  // ── Cendrier : coupelle basse ──────────────────────────────────────────────
  parts.push(tint(place(new THREE.CylinderGeometry(0.58, 0.48, 0.14, 18), -12.2, -1.1, 0.07), '#4d4d59'))
  parts.push(tint(place(new THREE.CylinderGeometry(0.46, 0.4, 0.07, 18), -12.2, -1.1, 0.12), '#17171d'))

  const merged = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  return merged
}

/** Dégradé vertical du dôme : sombre en bas, un souffle de lumière en haut. */
function createDomeGradient() {
  const cv = document.createElement('canvas')
  cv.width = 4; cv.height = 128
  const ctx = cv.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, '#3a2a5e')   // zénith
  g.addColorStop(0.38, '#1a1030')
  g.addColorStop(0.62, '#0a0616')
  g.addColorStop(1, '#030106')   // sous l'horizon : noir profond
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 128)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Bokeh d'arrière-plan : points flous très loin, aux couleurs de l'ambiance. */
function buildBokeh(colorA, colorB) {
  const pos = new Float32Array(BOKEH_N * 3)
  const col = new Float32Array(BOKEH_N * 3)
  const a = new THREE.Color(colorA)
  const b = new THREE.Color(colorB)
  for (let i = 0; i < BOKEH_N; i++) {
    // Anneau large et haut : jamais dans le champ du plateau.
    const ang = (i / BOKEH_N) * Math.PI * 2 + Math.random() * 0.4
    const rad = 20 + Math.random() * 16
    pos[i * 3] = Math.cos(ang) * rad
    pos[i * 3 + 1] = 1.5 + Math.random() * 15
    pos[i * 3 + 2] = Math.sin(ang) * rad
    TMP_COLOR.copy(Math.random() < 0.5 ? a : b).multiplyScalar(0.55 + Math.random() * 0.45)
    col[i * 3] = TMP_COLOR.r; col[i * 3 + 1] = TMP_COLOR.g; col[i * 3 + 2] = TMP_COLOR.b
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return geo
}

/**
 * Décor : le plateau n'est plus suspendu dans le vide mais posé sur une table, dans
 * un bar dont on ne voit jamais les murs — juste un dôme dégradé, des lueurs floues
 * et deux faisceaux qui tombent du hors-champ.
 *
 * Rendu allégé : table + dôme seulement (les objets, les faisceaux et le bokeh
 * disparaissent). Rien n'est cliquable ni ne gêne l'orbite : `raycast` neutralisé
 * partout, tout le décor vit au-delà du rayon 10,5 ou sous la table.
 */
export default function Environment3D({ ambiance, lite = false }) {
  const beamsRef = useRef()
  const bokehRef = useRef()
  const domeRef = useRef()
  const blend = useRef(null)

  // En allégé : dessus mat fusionné (pas de miroir séparé) et aucun objet.
  const tableGeo = useMemo(() => buildTable({ withTop: lite, withProps: !lite }), [lite])
  useEffect(() => () => tableGeo.dispose(), [tableGeo])

  const domeTex = useMemo(() => createDomeGradient(), [])
  useEffect(() => () => domeTex.dispose(), [domeTex])

  const bokehGeo = useMemo(
    () => (lite ? null : buildBokeh(ambiance.lightA, ambiance.lightB)),
    // Couleurs figées à la construction : les lueurs sont trop diffuses pour qu'un
    // changement d'intensité vaille une reconstruction du nuage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lite],
  )
  useEffect(() => () => bokehGeo?.dispose(), [bokehGeo])

  useFrame((s, dt) => {
    // Teinte du dôme : suit l'ambiance en douceur, comme le brouillard.
    const dome = domeRef.current
    if (dome) {
      if (!blend.current) blend.current = new THREE.Color(ambiance.fog)
      blend.current.lerp(TMP_COLOR.set(ambiance.fog), Math.min(1, dt * 2))
      dome.color.copy(blend.current).multiplyScalar(2.4).addScalar(0.12)
    }
    if (lite) return

    // Dérive quasi imperceptible du bokeh : c'est ce qui donne la profondeur.
    const bok = bokehRef.current
    if (bok) bok.rotation.y += dt * 0.012

    // Faisceaux : balayage lent, intensité qui respire au tempo de la soirée.
    const beams = beamsRef.current
    if (beams) {
      const t = s.clock.elapsedTime
      for (let i = 0; i < BEAMS; i++) {
        const dir = i === 0 ? 1 : -1
        DUMMY.position.set(dir * 5.2, 5.4, dir * -3.4)
        DUMMY.rotation.set(Math.sin(t * 0.14 + i) * 0.12, t * 0.05 * dir, dir * 0.2 + Math.cos(t * 0.11 + i) * 0.08)
        DUMMY.scale.setScalar(1)
        DUMMY.updateMatrix()
        beams.setMatrixAt(i, DUMMY.matrix)
      }
      beams.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Table : un seul draw call pour le bois, le chanfrein et tous les objets. */}
      <mesh geometry={tableGeo} receiveShadow raycast={() => null}>
        <meshStandardMaterial vertexColors metalness={0.18} roughness={0.62} />
      </mesh>

      {/* Dessus laqué réfléchissant — remplace l'ancien sol infini de 46×46. */}
      {!lite && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_TOP, 0]} receiveShadow raycast={() => null}>
          <circleGeometry args={[TABLE_R, 64]} />
          <MeshReflectorMaterial
            resolution={512}
            blur={[200, 80]}
            mixBlur={1}
            mixStrength={3.2}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#0c0709"
            metalness={0.35}
            roughness={0.92}
            mirror={0.12}
          />
        </mesh>
      )}

      {/* Dôme : sphère retournée, dégradé vertical. Hors brouillard, sinon il vire
          au aplat. C'est le fond du bar — on ne verra jamais de mur. */}
      <mesh scale={[-1, 1, 1]} raycast={() => null}>
        <sphereGeometry args={[58, 24, 16]} />
        <meshBasicMaterial ref={domeRef} map={domeTex} toneMapped={false} fog={false} depthWrite={false} side={THREE.FrontSide} />
      </mesh>

      {!lite && (
        <>
          {/* Lueurs floues très loin derrière : la profondeur vient de là. */}
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

          {/* Deux faisceaux tombant du hors-champ : cônes ouverts, quasi invisibles
              un par un, décisifs à l'image. */}
          <instancedMesh ref={beamsRef} args={[undefined, undefined, BEAMS]} raycast={() => null} frustumCulled={false}>
            <coneGeometry args={[3.1, 11, 22, 1, true]} />
            <meshBasicMaterial
              color={ambiance.lightB}
              transparent
              opacity={0.06}
              depthWrite={false}
              toneMapped={false}
              fog={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </instancedMesh>
        </>
      )}
    </group>
  )
}
