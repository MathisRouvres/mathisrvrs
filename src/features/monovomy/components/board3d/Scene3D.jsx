import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, MeshReflectorMaterial, Html } from '@react-three/drei'
import { soireeBoard } from '../../content'
import { createTileTexture, tileColor as accentColor, isPurchasable } from './tileTexture'
import { createCenterTexture } from './centerArt'
import { createDiceMaterials, TARGET_EULER } from './diceTexture'
import { PLAYER_COLORS } from './playerColors'
import { ownerColorBySpace as ownerColorMap } from '../../game/boardInsights'
import { ambianceFor } from './ambiance'

/** Texture radiale (halo) : violet/magenta au centre → transparent. Additive au sol. */
function createHaloTexture() {
  const cv = document.createElement('canvas')
  cv.width = 256; cv.height = 256
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
  g.addColorStop(0, 'rgba(150, 90, 255, 0.55)')
  g.addColorStop(0.45, 'rgba(124, 58, 237, 0.28)')
  g.addColorStop(0.75, 'rgba(236, 30, 121, 0.12)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Vecteur temporaire réutilisé pour l'auto-focus (évite les allocations par frame).
const FOCUS_TMP = new THREE.Vector3()

/** Lumières d'ambiance : couleurs + intensité pilotées par l'intensité de soirée,
 *  avec pulsation (tempo) qui s'accélère de Warm-up à Finale. */
function AmbianceLights({ ambiance, reducedMotion }) {
  const l1 = useRef()
  const l2 = useRef()
  useFrame((s) => {
    if (reducedMotion) return
    const t = s.clock.elapsedTime
    const amp = 0.4 * ambiance.pulse
    if (l1.current) l1.current.intensity = ambiance.i1 * (1 + Math.sin(t * ambiance.speed) * amp)
    if (l2.current) l2.current.intensity = ambiance.i2 * (1 + Math.sin(t * ambiance.speed + 1.7) * amp)
  })
  return (
    <>
      <ambientLight color="#6650c0" intensity={ambiance.ambient} />
      <pointLight ref={l1} color={ambiance.lightA} intensity={ambiance.i1} distance={34} position={[-9, 5, -7]} />
      <pointLight ref={l2} color={ambiance.lightB} intensity={ambiance.i2} distance={30} position={[9, 5, 7]} />
    </>
  )
}

function cellFor(i) {
  i = ((i % 40) + 40) % 40
  if (i === 0) return [11, 11]
  if (i === 10) return [11, 1]
  if (i === 20) return [1, 1]
  if (i === 30) return [1, 11]
  if (i < 10) return [11, 11 - i]
  if (i < 20) return [21 - i, 1]
  if (i < 30) return [1, i - 19]
  return [i - 29, 11]
}

/** Marqueur flottant à la couleur du propriétaire (gemme qui pivote/flotte). */
function OwnerMarker({ color, reducedMotion }) {
  const ref = useRef()
  useFrame((s) => {
    const g = ref.current
    if (!g || reducedMotion) return
    g.position.y = 0.62 + Math.sin(s.clock.elapsedTime * 2) * 0.06
    g.rotation.y += 0.03
  })
  return (
    <mesh ref={ref} position={[0.3, 0.62, 0.3]}>
      <octahedronGeometry args={[0.13]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} metalness={0.3} roughness={0.2} toneMapped={false} />
    </mesh>
  )
}

/** Petit fanion doré : la case appartient à un GROUPE complet (monopole). */
function MonopolyBadge() {
  return (
    <group position={[-0.32, 0.42, -0.32]}>
      <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.012, 0.012, 0.32, 8]} /><meshStandardMaterial color="#f5b21a" emissive="#f5b21a" emissiveIntensity={0.7} toneMapped={false} /></mesh>
      <mesh position={[0.08, 0.26, 0]}><boxGeometry args={[0.16, 0.1, 0.01]} /><meshStandardMaterial color="#f5b21a" emissive="#f5b21a" emissiveIntensity={0.9} toneMapped={false} /></mesh>
    </group>
  )
}

/** Anneau de surbrillance sous la case active (destination / case à résoudre). */
function TargetHighlight({ cell, reducedMotion }) {
  const ref = useRef()
  const [r, c] = cellFor(cell)
  useFrame((s) => {
    const g = ref.current
    if (!g) return
    if (reducedMotion) { g.scale.setScalar(1); return }
    const k = 1 + Math.sin(s.clock.elapsedTime * 3.2) * 0.06
    g.scale.setScalar(k)
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[c - 6, 0.29, r - 6]}>
      <ringGeometry args={[0.42, 0.5, 40]} />
      <meshBasicMaterial color="#22c1c3" transparent opacity={0.85} toneMapped={false} />
    </mesh>
  )
}

/** Cadre lumineux à la couleur du propriétaire, tout autour du dessus de la case. */
function OwnerFrame({ color }) {
  const bar = { color, emissive: color, emissiveIntensity: 1, toneMapped: false }
  return (
    <group position={[0, 0.3, 0]}>
      <mesh position={[0, 0, 0.47]}><boxGeometry args={[0.98, 0.07, 0.07]} /><meshStandardMaterial {...bar} /></mesh>
      <mesh position={[0, 0, -0.47]}><boxGeometry args={[0.98, 0.07, 0.07]} /><meshStandardMaterial {...bar} /></mesh>
      <mesh position={[-0.47, 0, 0]}><boxGeometry args={[0.07, 0.07, 0.98]} /><meshStandardMaterial {...bar} /></mesh>
      <mesh position={[0.47, 0, 0]}><boxGeometry args={[0.07, 0.07, 0.98]} /><meshStandardMaterial {...bar} /></mesh>
    </group>
  )
}

/** Maisons alignées / hôtel selon le niveau d'établissement. */
function Buildings({ level }) {
  if (level <= 0) return null
  if (level >= 5) {
    return (
      <mesh castShadow position={[0, 0.5, -0.22]}>
        <boxGeometry args={[0.5, 0.34, 0.26]} />
        <meshStandardMaterial color="#ec1e79" emissive="#ec1e79" emissiveIntensity={0.5} roughness={0.4} toneMapped={false} />
      </mesh>
    )
  }
  const houses = Math.min(level, 4)
  return (
    <group position={[0, 0.42, -0.24]}>
      {Array.from({ length: houses }, (_, k) => (
        <mesh key={k} castShadow position={[(k - (houses - 1) / 2) * 0.22, 0, 0]}>
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshStandardMaterial color="#22c55e" emissive="#149042" emissiveIntensity={0.4} roughness={0.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Voile sombre + jeton « hypothéquée » sur le dessus de la case. */
function MortgageOverlay() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.271, 0]}>
        <planeGeometry args={[0.94, 0.94]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.7, 0.09, 0.02]} />
        <meshBasicMaterial color="#e11d48" toneMapped={false} />
      </mesh>
    </group>
  )
}

function Tile({ i, texture, onSelect, ownerColor, tint, special = false, isMonopoly, level = 0, mortgaged = false, pulse = false, reducedMotion }) {
  const [r, c] = cellFor(i)
  const gref = useRef()
  // Base sombre ; la teinte de catégorie n'agit qu'en émissif discret (plus marqué
  // pour les cases spéciales non achetables), sans « repeindre » toute la case.
  // Cases spéciales (non achetables) : bloc SURÉLEVÉ et LUMINEUX à sa couleur —
  // elles dominent le plateau. Cases achetables : socle plus bas, sobre.
  const boxH = special ? 0.4 : 0.24
  const faceY = boxH + 0.01
  const baseColor = ownerColor || (special ? tint : '#0c0722')
  const baseEmissive = ownerColor || tint || '#000000'
  const emissiveIntensity = ownerColor ? (isMonopoly ? 0.5 : 0.28) : special ? 0.45 : 0.08
  // « Claque » à l'achat : la case gonfle brièvement puis revient.
  useFrame(() => {
    if (!gref.current) return
    const t = !reducedMotion && pulse ? 1.16 : 1
    gref.current.scale.setScalar(THREE.MathUtils.lerp(gref.current.scale.x, t, 0.22))
  })
  return (
    <group ref={gref} position={[c - 6, 0, r - 6]} onClick={(e) => { e.stopPropagation(); onSelect(i) }}>
      <mesh castShadow receiveShadow position={[0, boxH / 2, 0]}>
        <boxGeometry args={[0.96, boxH, 0.96]} />
        <meshStandardMaterial color={baseColor} emissive={baseEmissive} emissiveIntensity={emissiveIntensity} roughness={special ? 0.45 : 0.7} metalness={special ? 0.35 : 0.2} toneMapped={!special} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, faceY, 0]}>
        <planeGeometry args={[0.94, 0.94]} />
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.9} roughness={0.6} toneMapped={false} />
      </mesh>
      {ownerColor && <OwnerFrame color={ownerColor} />}
      {ownerColor && <OwnerMarker color={ownerColor} reducedMotion={reducedMotion} />}
      {isMonopoly && !mortgaged && <MonopolyBadge />}
      {!mortgaged && <Buildings level={level} />}
      {mortgaged && <MortgageOverlay />}
    </group>
  )
}

// Matériaux réutilisables pour les pions-boissons.
const GLASS = { transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.15 }
const glass = (color, emi) => <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emi * 0.5} {...GLASS} />
const solid = (color, emi) => <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emi} metalness={0.4} roughness={0.25} toneMapped={false} />
const foam = () => <meshStandardMaterial color="#fff8e7" emissive="#fff2cf" emissiveIntensity={0.3} roughness={0.5} />
const gold = () => <meshStandardMaterial color="#f5b21a" emissive="#f5b21a" emissiveIntensity={0.5} metalness={0.6} roughness={0.3} toneMapped={false} />

// 8 boissons — une par joueur (index de siège). Tout est teinté par sa couleur.
const DRINK_SHAPES = [
  // 0 · Cocktail (martini)
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.34, 0]}><cylinderGeometry args={[0.17, 0.17, 0.05, 24]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.03, 0.03, 0.36, 12]} />{glass(c, e)}</mesh>
      <mesh castShadow position={[0, 0.86, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.29, 0.28, 24, 1, true]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.82, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.24, 0.2, 20]} />{solid(c, e)}</mesh>
      <mesh position={[0.16, 0.86, 0]}><sphereGeometry args={[0.05, 12, 12]} /><meshStandardMaterial color="#9be15d" emissive="#3f7d1e" emissiveIntensity={0.3} roughness={0.5} /></mesh>
    </group>
  ),
  // 1 · Chope de bière
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.6, 0]}><cylinderGeometry args={[0.22, 0.2, 0.52, 28]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.19, 0.17, 0.4, 24]} />{solid(c, e)}</mesh>
      <mesh position={[0.26, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.11, 0.032, 12, 20]} />{glass(c, e)}</mesh>
      <mesh castShadow position={[0, 0.9, 0]}><cylinderGeometry args={[0.22, 0.21, 0.1, 28]} />{foam()}</mesh>
      <mesh position={[0.08, 0.97, 0.06]}><sphereGeometry args={[0.07, 12, 12]} />{foam()}</mesh>
      <mesh position={[-0.09, 0.96, -0.04]}><sphereGeometry args={[0.06, 12, 12]} />{foam()}</mesh>
    </group>
  ),
  // 2 · Verre à vin
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.33, 0]}><cylinderGeometry args={[0.17, 0.17, 0.04, 24]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.025, 0.025, 0.34, 12]} />{glass(c, e)}</mesh>
      <mesh castShadow position={[0, 0.82, 0]}><cylinderGeometry args={[0.21, 0.09, 0.34, 28, 1, true]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.76, 0]}><cylinderGeometry args={[0.16, 0.08, 0.2, 24]} />{solid(c, e)}</mesh>
    </group>
  ),
  // 3 · Bouteille
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.56, 0]}><cylinderGeometry args={[0.17, 0.19, 0.5, 28]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.56, 0]}><cylinderGeometry args={[0.15, 0.17, 0.42, 24]} />{solid(c, e)}</mesh>
      <mesh castShadow position={[0, 0.84, 0]}><coneGeometry args={[0.17, 0.14, 24, 1, true]} />{glass(c, e)}</mesh>
      <mesh castShadow position={[0, 0.98, 0]}><cylinderGeometry args={[0.06, 0.06, 0.18, 16]} />{glass(c, e)}</mesh>
      <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.065, 0.065, 0.06, 16]} />{gold()}</mesh>
    </group>
  ),
  // 4 · Shot
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.44, 0]}><cylinderGeometry args={[0.16, 0.13, 0.28, 24]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.14, 0.11, 0.2, 24]} />{solid(c, e)}</mesh>
      <mesh position={[0.13, 0.56, 0]} rotation={[0, 0, -0.5]}><boxGeometry args={[0.02, 0.16, 0.1]} /><meshStandardMaterial color="#d7f56a" emissive="#7da61e" emissiveIntensity={0.3} roughness={0.5} /></mesh>
    </group>
  ),
  // 5 · Flûte de champagne
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.33, 0]}><cylinderGeometry args={[0.15, 0.15, 0.04, 24]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.022, 0.022, 0.32, 12]} />{glass(c, e)}</mesh>
      <mesh castShadow position={[0, 0.9, 0]}><cylinderGeometry args={[0.1, 0.05, 0.52, 24, 1, true]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.82, 0]}><cylinderGeometry args={[0.08, 0.05, 0.34, 20]} />{solid(c, e)}</mesh>
      <mesh position={[0.02, 1.0, 0]}><sphereGeometry args={[0.02, 8, 8]} />{foam()}</mesh>
      <mesh position={[-0.03, 0.92, 0.02]}><sphereGeometry args={[0.015, 8, 8]} />{foam()}</mesh>
    </group>
  ),
  // 6 · Canette
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.55, 0]}><cylinderGeometry args={[0.17, 0.17, 0.46, 28]} />{solid(c, e)}</mesh>
      <mesh position={[0, 0.79, 0]}><cylinderGeometry args={[0.15, 0.16, 0.06, 24]} />{gold()}</mesh>
      <mesh position={[0, 0.31, 0]}><cylinderGeometry args={[0.16, 0.15, 0.05, 24]} />{gold()}</mesh>
      <mesh position={[0.05, 0.82, 0]}><torusGeometry args={[0.04, 0.012, 8, 16]} />{gold()}</mesh>
    </group>
  ),
  // 7 · Verre à whisky (tumbler + glaçons)
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.47, 0]}><cylinderGeometry args={[0.21, 0.19, 0.34, 28]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.19, 0.17, 0.22, 24]} />{solid(c, e)}</mesh>
      <mesh position={[0.05, 0.6, 0.03]} rotation={[0.4, 0.6, 0.2]}><boxGeometry args={[0.12, 0.12, 0.12]} />{glass('#dff3ff', 0.4)}</mesh>
      <mesh position={[-0.07, 0.56, -0.04]} rotation={[0.2, 1.0, 0.5]}><boxGeometry args={[0.1, 0.1, 0.1]} />{glass('#dff3ff', 0.4)}</mesh>
    </group>
  ),
  // 8 · Baril de bière
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.58, 0]}><cylinderGeometry args={[0.23, 0.23, 0.54, 28]} />{solid(c, e)}</mesh>
      <mesh position={[0, 0.74, 0]}><torusGeometry args={[0.235, 0.022, 8, 28]} />{gold()}</mesh>
      <mesh position={[0, 0.42, 0]}><torusGeometry args={[0.235, 0.022, 8, 28]} />{gold()}</mesh>
      <mesh position={[0.24, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 0.12, 12]} />{gold()}</mesh>
    </group>
  ),
  // 9 · Shaker à cocktail
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}><cylinderGeometry args={[0.16, 0.2, 0.42, 24]} />{solid(c, e)}</mesh>
      <mesh castShadow position={[0, 0.75, 0]}><cylinderGeometry args={[0.13, 0.16, 0.12, 24]} />{gold()}</mesh>
      <mesh position={[0, 0.85, 0]}><cylinderGeometry args={[0.07, 0.1, 0.08, 20]} />{gold()}</mesh>
      <mesh position={[0, 0.92, 0]}><sphereGeometry args={[0.05, 16, 16]} />{gold()}</mesh>
    </group>
  ),
  // 10 · Flasque
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.55, 0]}><boxGeometry args={[0.34, 0.44, 0.13]} />{solid(c, e)}</mesh>
      <mesh position={[0, 0.55, 0.07]}><boxGeometry args={[0.22, 0.28, 0.02]} />{gold()}</mesh>
      <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.06, 0.07, 0.1, 16]} />{solid(c, e)}</mesh>
      <mesh position={[0, 0.88, 0]}><cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />{gold()}</mesh>
    </group>
  ),
  // 11 · Gobelet rouge (party cup)
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.51, 0]}><cylinderGeometry args={[0.22, 0.15, 0.46, 24, 1, true]} />{solid(c, e)}</mesh>
      <mesh position={[0, 0.73, 0]}><torusGeometry args={[0.215, 0.018, 8, 24]} />{solid(c, e * 1.3)}</mesh>
      <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.2, 0.18, 0.06, 24]} />{glass(c, e)}</mesh>
    </group>
  ),
  // 12 · Verre botte (Das Boot)
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.62, 0]}><cylinderGeometry args={[0.13, 0.15, 0.52, 20]} />{glass(c, e)}</mesh>
      <mesh castShadow position={[0.14, 0.37, 0]} rotation={[0, 0, -0.6]}><cylinderGeometry args={[0.11, 0.09, 0.3, 20]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.58, 0]}><cylinderGeometry args={[0.11, 0.13, 0.42, 20]} />{solid(c, e)}</mesh>
    </group>
  ),
  // 13 · Tiki ananas
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.58, 0]} scale={[1, 1.25, 1]}><sphereGeometry args={[0.22, 20, 20]} />{solid(c, e)}</mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[Math.cos(k * 1.3) * 0.05, 0.88, Math.sin(k * 1.3) * 0.05]} rotation={[0.35 * Math.cos(k), k, 0.35 * Math.sin(k)]}>
          <coneGeometry args={[0.04, 0.24, 8]} />
          <meshStandardMaterial color="#3fae4a" emissive="#1f6b28" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0.15, 0.82, 0]} rotation={[0, 0, -0.4]}><cylinderGeometry args={[0.014, 0.014, 0.34, 8]} /><meshStandardMaterial color="#ff5aa8" emissive="#ff5aa8" emissiveIntensity={0.5} toneMapped={false} /></mesh>
    </group>
  ),
  // 14 · Cubi (goon bag)
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.52, 0]}><boxGeometry args={[0.42, 0.4, 0.3]} />{solid(c, e)}</mesh>
      <mesh position={[0, 0.54, 0.151]}><boxGeometry args={[0.3, 0.24, 0.02]} />{glass('#fff8e7', 0.25)}</mesh>
      <mesh position={[0.2, 0.36, 0.12]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.09, 12]} />{gold()}</mesh>
    </group>
  ),
  // 15 · Beer bong (entonnoir)
  (c, e) => (
    <group>
      <mesh castShadow position={[0, 0.74, 0]}><cylinderGeometry args={[0.25, 0.04, 0.34, 24, 1, true]} />{glass(c, e)}</mesh>
      <mesh position={[0, 0.74, 0]}><cylinderGeometry args={[0.21, 0.035, 0.28, 20, 1, true]} />{solid(c, e)}</mesh>
      <mesh castShadow position={[0, 0.42, 0]}><cylinderGeometry args={[0.032, 0.032, 0.36, 16]} />{glass(c, e)}</mesh>
    </group>
  ),
]

/** Pion thématisé « boisson » (verre, chope, bouteille…), teinté par couleur joueur. */
function Pawn3D({ target, color, seatOffset, shapeIndex, isActive, reducedMotion, name, cash }) {
  const ref = useRef()
  const haloRef = useRef()
  const cellIdx = useRef(target)
  const acc = useRef(0)
  const ox = (seatOffset % 2) * 0.34 - 0.17
  const oz = Math.floor(seatOffset / 2) * 0.34 - 0.17
  const init = useMemo(() => {
    const [r, c] = cellFor(target)
    return [c - 6 + ox, 0, r - 6 + oz]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useFrame((s, dt) => {
    if (cellIdx.current !== target) {
      // Déplacement case par case ; en reduced-motion on saute directement.
      acc.current += dt
      if (reducedMotion || acc.current > 0.15) { acc.current = 0; cellIdx.current = (cellIdx.current + 1) % 40 }
    }
    const [r, c] = cellFor(cellIdx.current)
    const g = ref.current
    if (g) {
      const k = reducedMotion ? 1 : Math.min(1, dt * 12)
      g.position.x += (c - 6 + ox - g.position.x) * k
      g.position.z += (r - 6 + oz - g.position.z) * k
      const bob = reducedMotion
        ? 0
        : isActive
          ? Math.abs(Math.sin(s.clock.elapsedTime * 4)) * 0.14
          : Math.sin(s.clock.elapsedTime * 1.6 + seatOffset) * 0.02
      g.position.y = bob
    }
    if (haloRef.current && !reducedMotion) haloRef.current.rotation.z += dt * 1.6
  })
  const emi = isActive ? 0.85 : 0.55
  const idx = Number.isInteger(shapeIndex) ? shapeIndex : seatOffset
  const shape = DRINK_SHAPES[((idx % DRINK_SHAPES.length) + DRINK_SHAPES.length) % DRINK_SHAPES.length]
  return (
    <group ref={ref} position={init}>
      {/* Ombre de contact */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.28, 0]}>
        <circleGeometry args={[0.26, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
      {shape(color, emi)}
      {/* Anneau couleur du joueur au sol (repère qui est où). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.295, 0]}>
        <ringGeometry args={[0.24, 0.32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 0.9 : 0.55} toneMapped={false} />
      </mesh>
      {/* Halo joueur actif */}
      {isActive && (
        <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
          <torusGeometry args={[0.38, 0.03, 8, 40]} />
          <meshBasicMaterial color="#f5b21a" toneMapped={false} />
        </mesh>
      )}
      {/* Étiquette billboard (nom + argent) au-dessus du pion actif. */}
      {isActive && name && (
        <Html position={[0, 1.5, 0]} center distanceFactor={9} zIndexRange={[20, 0]} wrapperClass="mv-pawnlabel-wrap">
          <div className="mv-pawnlabel" style={{ '--pc': color }}>
            <span className="mv-pawnlabel__name">{name}</span>
            <span className="mv-pawnlabel__cash">{cash}€</span>
          </div>
        </Html>
      )}
    </group>
  )
}

const REST_Y = 0.62
const DUR = 1.05

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }

/** Un dé qui tombe sur le plateau, tournoie, puis se cale sur sa valeur. */
function Die({ value, slotX, seed, playId }) {
  const ref = useRef()
  const anim = useRef({ id: null, t: 0, spin: [0, 0, 0], start: [0, 0, 0] })
  const materials = useMemo(() => createDiceMaterials(), [])
  const target = TARGET_EULER[value] || [0, 0, 0]

  useFrame((_, dt) => {
    const a = anim.current
    if (a.id !== playId) {
      // Nouveau lancer : recalcule trajectoire.
      a.id = playId
      a.t = 0
      const turns = () => (2 + Math.floor(((seed * 7 + value) % 3))) * Math.PI * 2
      a.spin = [turns() + (seed % 2 ? Math.PI : 0), turns(), turns()]
      a.start = [target[0] + a.spin[0], target[1] + a.spin[1], target[2] + a.spin[2]]
    }
    const g = ref.current
    if (!g) return
    a.t = Math.min(DUR, a.t + dt)
    const p = easeOutCubic(a.t / DUR)
    // Rotation : de start (multi-tours) vers target.
    g.rotation.x = a.start[0] + (target[0] - a.start[0]) * p
    g.rotation.y = a.start[1] + (target[1] - a.start[1]) * p
    g.rotation.z = a.start[2] + (target[2] - a.start[2]) * p
    // Trajectoire : arc + rebond amorti à l'atterrissage.
    const hop = Math.sin(Math.min(1, a.t / DUR) * Math.PI) * 2.6
    const bounce = a.t > DUR * 0.82 ? Math.abs(Math.sin((a.t - DUR * 0.82) * 22)) * 0.12 * (1 - p) : 0
    g.position.y = REST_Y + hop * (1 - p) + bounce
    g.position.x = slotX + Math.sin(p * Math.PI) * (seed % 2 ? 0.4 : -0.4)
    g.position.z = 0.4 + Math.cos(p * Math.PI) * 0.5
  })

  return (
    <mesh ref={ref} material={materials} castShadow position={[slotX, REST_Y, 0.4]}>
      <boxGeometry args={[0.82, 0.82, 0.82]} />
    </mesh>
  )
}

function DiceSet({ dice }) {
  if (!dice) return null
  return (
    <group>
      <Die value={dice.d1} slotX={-0.75} seed={1} playId={dice.id} />
      <Die value={dice.d2} slotX={0.75} seed={2} playId={dice.id} />
    </group>
  )
}

export default function Scene3D({ state, onSelect, dice, reducedMotion = false, lite = false, topDown = false, ambiance, monopolySpaces, buildings, mortgaged, justOwned, targetSpace, controlsRef }) {
  // Re-génère les textures une fois les polices web prêtes (sinon fallback système).
  const [fontTick, setFontTick] = useState(0)
  useEffect(() => {
    let alive = true
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => { if (alive) setFontTick((t) => t + 1) })
    }
    return () => { alive = false }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const textures = useMemo(() => soireeBoard.spaces.map((s) => createTileTexture(s)), [fontTick])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const centerTex = useMemo(() => createCenterTexture(), [fontTick])
  const haloTex = useMemo(() => createHaloTexture(), [])
  // Couleur du propriétaire par case (spaceId → couleur du joueur).
  const ownerColorBySpace = useMemo(
    () => ownerColorMap(state, PLAYER_COLORS),
    [state],
  )
  const monopolySet = monopolySpaces || new Set()

  // Auto-focus (mobile) : à chaque changement de case active, recentre doucement la
  // caméra sur le pion actif pendant ~1,2 s (puis rend la main). Pan désactivé donc
  // aucun conflit avec le geste utilisateur.
  const focusRef = useRef({ t: 0, x: 0, z: 0 })
  useEffect(() => {
    if (!topDown || targetSpace == null) return
    const [r, c] = cellFor(targetSpace)
    focusRef.current = { t: 1.2, x: c - 6, z: r - 6 }
  }, [topDown, targetSpace])
  useFrame((_, dt) => {
    const controls = controlsRef?.current
    const f = focusRef.current
    if (!controls || f.t <= 0) return
    f.t -= dt
    FOCUS_TMP.set(f.x, controls.target.y, f.z)
    controls.target.lerp(FOCUS_TMP, Math.min(1, dt * 3))
    controls.update()
  })
  const frame = [
    [0, -6.15, [12.7, 0.08, 0.07]],
    [0, 6.15, [12.7, 0.08, 0.07]],
    [-6.15, 0, [0.07, 0.08, 12.7]],
    [6.15, 0, [0.07, 0.08, 12.7]],
  ]
  return (
    <>
      <OrbitControls ref={controlsRef} makeDefault enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.08} minDistance={topDown ? 8 : 11} maxDistance={26} minPolarAngle={topDown ? 0.12 : 0.5} maxPolarAngle={1.25} target={[0, 0, 0]} />
      <AmbianceLights ambiance={ambiance ?? ambianceFor('warmup')} reducedMotion={reducedMotion} />
      <directionalLight castShadow position={[7, 16, 7]} intensity={1.05} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={44} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={11} shadow-camera-bottom={-11} shadow-bias={-0.0004} />

      {/* Sol réfléchissant subtil (reflet néon du plateau) → profondeur premium.
          Fallback plaque mate en reduced-motion / bas de gamme. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]} receiveShadow>
        <planeGeometry args={[46, 46]} />
        {lite ? (
          <meshStandardMaterial color="#070311" roughness={0.9} metalness={0.2} />
        ) : (
          <MeshReflectorMaterial
            resolution={512}
            blur={[320, 110]}
            mixBlur={1}
            mixStrength={10}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#0a0518"
            metalness={0.55}
            roughness={0.9}
            mirror={0.35}
          />
        )}
      </mesh>
      {/* Halo radial derrière le plateau (glow au sol). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial map={haloTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.9} />
      </mesh>

      <mesh position={[0, -0.4, 0]} receiveShadow>
        <boxGeometry args={[12.8, 0.7, 12.8]} />
        <meshStandardMaterial color="#0c0620" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[9.1, 0.06, 9.1]} />
        <meshStandardMaterial color="#0d0722" emissive="#140a34" emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial map={centerTex} emissive="#ffffff" emissiveMap={centerTex} emissiveIntensity={0.72} transparent depthWrite={false} toneMapped={false} roughness={0.6} />
      </mesh>
      {frame.map(([x, z, args], k) => (
        <mesh key={k} position={[x, 0.04, z]}>
          <boxGeometry args={args} />
          <meshStandardMaterial color="#4a2aa0" emissive="#6d3ad9" emissiveIntensity={0.75} metalness={0.4} roughness={0.4} toneMapped={false} />
        </mesh>
      ))}
      {soireeBoard.spaces.map((space, i) => (
        <Tile
          key={space.id}
          i={i}
          texture={textures[i]}
          onSelect={onSelect}
          ownerColor={ownerColorBySpace[space.id]}
          tint={accentColor(space)}
          special={!isPurchasable(space)}
          isMonopoly={monopolySet.has(space.id)}
          level={buildings?.[space.id] ?? 0}
          mortgaged={mortgaged?.[space.id] === true}
          pulse={justOwned === space.id}
          reducedMotion={reducedMotion}
        />
      ))}
      {targetSpace != null && <TargetHighlight cell={targetSpace} reducedMotion={reducedMotion} />}
      {state.players.map((p, i) =>
        p.eliminated ? null : (
          <Pawn3D
            key={p.id}
            target={p.position}
            color={PLAYER_COLORS[i % PLAYER_COLORS.length]}
            seatOffset={i}
            shapeIndex={p.pawn}
            isActive={i === state.currentPlayerIndex}
            reducedMotion={reducedMotion}
            name={p.name}
            cash={p.cash}
          />
        ),
      )}
      <DiceSet dice={dice} />
    </>
  )
}
