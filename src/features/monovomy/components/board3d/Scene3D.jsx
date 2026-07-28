import { memo, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { soireeBoard } from '../../content'
import { createTileTexture, tileColor as accentColor, isPurchasable } from './tileTexture'
import { createCenterTexture } from './centerArt'
import { createDiceMaterials, TARGET_EULER } from './diceTexture'
import { PLAYER_COLORS } from './playerColors'
import { ownerColorBySpace as ownerColorMap } from '../../game/boardInsights'
import { ambianceFor } from './ambiance'
import { cellFor } from './boardCells'
import Effects from './effects/Effects'
import Environment3D, { TABLE_TOP } from './Environment3D'
import Estates3D from './Estates3D'
import CenterStage from './CenterStage'

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

/** Fausse vignette au sol : centre transparent → bords très sombres. */
function createGroundVignette() {
  const cv = document.createElement('canvas')
  cv.width = 128; cv.height = 128
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 16, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.34, 'rgba(3,1,8,0.18)')
  g.addColorStop(0.6, 'rgba(3,1,8,0.62)')
  g.addColorStop(0.85, 'rgba(2,1,5,0.9)')
  g.addColorStop(1, 'rgba(1,0,3,0.98)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Rebond de la case achetée : durée et pic de exp(−4,5t)·sin(9t), pour normaliser
// l'amplitude à 0,15 exactement.
const LIFT_DUR = 1
const LIFT_PEAK = Math.exp(-4.5 * 0.123) * Math.sin(9 * 0.123)

// Hauteur des blocs de cases : les spéciales (non achetables) sont surélevées.
const TILE_H = { prop: 0.24, special: 0.4 }
/** Altitude de la surface d'une case — ce sur quoi pions et anneaux se posent. */
function tileTopY(i) {
  const space = soireeBoard.spaces[((i % 40) + 40) % 40]
  return (isPurchasable(space) ? TILE_H.prop : TILE_H.special) + 0.04
}

// Temporaire réutilisé chaque frame (fondu d'ambiance) : zéro allocation.
const TMP_COLOR = new THREE.Color()

// RectAreaLight a besoin des tables LTC : initialisation unique et paresseuse
// (elle construit deux textures, inutile de la payer en rendu allégé).
let rectAreaReady = false
function ensureRectAreaLights() {
  if (rectAreaReady) return
  RectAreaLightUniformsLib.init()
  rectAreaReady = true
}

// Constante de temps du fondu entre intensités : ~95 % atteint en 1,5 s.
const BLEND_RATE = 2

/**
 * Rig d'ambiance : éclairage 3 points + exposition + brouillard + vignette, le tout
 * interpolé (couleurs et intensités) au lieu de basculer sec au changement
 * d'intensité de soirée.
 *
 * - key   : la directionnelle (dans Scene3D) — seule source d'ombres ;
 * - fill  : ambiante froide et faible, juste de quoi ne pas boucher les noirs ;
 * - rim   : spot derrière le plateau braqué vers la caméra → liseré sur les pions
 *           et les tranches de cases, c'est lui qui fait le « photo produit » ;
 * - deux rectAreaLight au-dessus des côtés : reflet doux et large sur le sol
 *   métallique. Remplacées par les deux pointLight historiques en rendu allégé
 *   (les aires coûtent un bloc LTC par matériau éclairé).
 */
function AmbianceLights({ ambiance, reducedMotion, lite, vignetteRef }) {
  const fill = useRef()
  const rim = useRef()
  const sideA = useRef()
  const sideB = useRef()

  useMemo(() => { if (!lite) ensureRectAreaLights() }, [lite])

  // État courant du fondu (mutable, jamais re-rendu) et scène capturée à la 1re frame.
  const blend = useRef(null)
  const sceneRef = useRef(null)

  // Les aires n'ont pas d'orientation par défaut : on les braque sur le plateau.
  useEffect(() => {
    sideA.current?.lookAt(0, 0, 0)
    sideB.current?.lookAt(0, 0, 0)
  }, [lite])

  // Fond et brouillard sont pilotés par le fondu (donc imposés impérativement) :
  // on les rend à la scène au démontage.
  useEffect(() => () => {
    const sc = sceneRef.current
    if (sc) { sc.background = null; sc.fog = null }
  }, [])

  useFrame((s, dt) => {
    if (!blend.current) {
      blend.current = {
        a: new THREE.Color(ambiance.lightA), b: new THREE.Color(ambiance.lightB),
        rim: new THREE.Color(ambiance.rim.color), fog: new THREE.Color(ambiance.fog),
        bg: new THREE.Color(ambiance.bg),
        i1: ambiance.i1, i2: ambiance.i2, ambient: ambiance.ambient,
        rimI: ambiance.rim.intensity, exposure: ambiance.exposure, vignette: ambiance.vignette,
      }
    }
    const b = blend.current
    if (!sceneRef.current) {
      sceneRef.current = s.scene
      s.scene.background = b.bg.clone()
      s.scene.fog = new THREE.Fog(b.fog.clone(), 19, 40)
    }
    // k = 1 en mouvement réduit → bascule immédiate, pas de transition à regarder.
    const k = reducedMotion ? 1 : Math.min(1, dt * BLEND_RATE)
    b.a.lerp(TMP_COLOR.set(ambiance.lightA), k)
    b.b.lerp(TMP_COLOR.set(ambiance.lightB), k)
    b.rim.lerp(TMP_COLOR.set(ambiance.rim.color), k)
    b.fog.lerp(TMP_COLOR.set(ambiance.fog), k)
    b.bg.lerp(TMP_COLOR.set(ambiance.bg), k)
    b.i1 += (ambiance.i1 - b.i1) * k
    b.i2 += (ambiance.i2 - b.i2) * k
    b.ambient += (ambiance.ambient - b.ambient) * k
    b.rimI += (ambiance.rim.intensity - b.rimI) * k
    b.exposure += (ambiance.exposure - b.exposure) * k
    b.vignette += (ambiance.vignette - b.vignette) * k

    // Pulsation (tempo de la soirée) appliquée aux sources colorées et au rim.
    const t = s.clock.elapsedTime
    const amp = reducedMotion ? 0 : 0.4 * ambiance.pulse
    const p1 = 1 + Math.sin(t * ambiance.speed) * amp
    const p2 = 1 + Math.sin(t * ambiance.speed + 1.7) * amp

    if (fill.current) {
      fill.current.intensity = b.ambient * (lite ? 0.9 : 0.45)
    }
    if (rim.current) {
      rim.current.color.copy(b.rim)
      rim.current.intensity = b.rimI * (1 + (p1 - 1) * 0.5)
    }
    if (sideA.current) {
      sideA.current.color.copy(b.a)
      sideA.current.intensity = b.i1 * (lite ? 1 : 0.22) * p1
    }
    if (sideB.current) {
      sideB.current.color.copy(b.b)
      sideB.current.intensity = b.i2 * (lite ? 1 : 0.22) * p2
    }
    s.scene.background?.copy(b.bg)
    if (s.scene.fog) s.scene.fog.color.copy(b.fog)
    s.gl.toneMappingExposure = b.exposure
    if (vignetteRef?.current) vignetteRef.current.opacity = 0.45 + 0.55 * b.vignette
  })

  return (
    <>
      <ambientLight ref={fill} color="#4f5da6" intensity={ambiance.ambient * (lite ? 0.9 : 0.45)} />
      {/* Rim : derrière le plateau (−z), braqué vers la caméra (+z). Angle serré. */}
      <spotLight
        ref={rim}
        color={ambiance.rim.color}
        intensity={ambiance.rim.intensity}
        position={[0, 5.2, -13.5]}
        angle={0.42}
        penumbra={0.75}
        distance={42}
        decay={1.4}
      />
      {lite ? (
        <>
          <pointLight ref={sideA} color={ambiance.lightA} intensity={ambiance.i1} distance={34} position={[-9, 5, -7]} />
          <pointLight ref={sideB} color={ambiance.lightB} intensity={ambiance.i2} distance={30} position={[9, 5, 7]} />
        </>
      ) : (
        <>
          <rectAreaLight ref={sideA} color={ambiance.lightA} intensity={ambiance.i1 * 0.22} width={6.5} height={13} position={[-8.5, 5.5, 0]} />
          <rectAreaLight ref={sideB} color={ambiance.lightB} intensity={ambiance.i2 * 0.22} width={6.5} height={13} position={[8.5, 5.5, 0]} />
        </>
      )}
    </>
  )
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
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[c - 6, tileTopY(cell) + 0.005, r - 6]}>
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

/**
 * Liserés lumineux des 40 arêtes hautes, fusionnés en UNE géométrie à couleurs de
 * sommets : détache les cases les unes des autres pour un seul draw call (40 meshes
 * séparés coûtaient +24 appels/frame, soit −13 % de FPS sur le profil mobile).
 * La couleur porte déjà l'intensité voulue (0,25) : matériau non éclairé, la lumière
 * de la scène ne doit pas la faire varier d'une case à l'autre.
 */
function buildTileRims() {
  const parts = soireeBoard.spaces.map((space, i) => {
    const [r, c] = cellFor(i)
    const boxH = isPurchasable(space) ? 0.24 : 0.4
    const g = new THREE.BoxGeometry(0.99, 0.028, 0.99)
    g.translate(c - 6, boxH - 0.014, r - 6)
    const col = new THREE.Color(accentColor(space)).multiplyScalar(0.55)
    const n = g.attributes.position.count
    const colors = new Float32Array(n * 3)
    for (let k = 0; k < n; k++) { colors[k * 3] = col.r; colors[k * 3 + 1] = col.g; colors[k * 3 + 2] = col.b }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  })
  const merged = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  return merged
}

/**
 * Socle du plateau : deux niveaux séparés par un chanfrein (cylindre 4 segments =
 * tronc de pyramide à base carrée). Matériau sombre et métallique : il ne renvoie
 * que les néons, ce qui creuse la silhouette au lieu de la laisser plate.
 */
function buildBoardBase() {
  const tint = (g, hex) => {
    const col = new THREE.Color(hex)
    const n = g.attributes.position.count
    const colors = new Float32Array(n * 3)
    for (let k = 0; k < n; k++) { colors[k * 3] = col.r; colors[k * 3 + 1] = col.g; colors[k * 3 + 2] = col.b }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }
  // Niveau bas débordant.
  const low = new THREE.BoxGeometry(13.5, 0.34, 13.5).translate(0, -0.58, 0)
  // Chanfrein : cylindre à 4 segments = tronc de pyramide (rayon = côté / √2),
  // pivoté de 45° pour aligner ses faces sur celles du plateau. 13,5 → 12,75.
  const bevel = new THREE.CylinderGeometry(12.75 / Math.SQRT2, 13.5 / Math.SQRT2, 0.16, 4, 1)
  bevel.rotateY(Math.PI / 4).translate(0, -0.33, 0)
  // Niveau haut : la table de jeu, juste sous les cases.
  const top = new THREE.BoxGeometry(12.75, 0.24, 12.75).translate(0, -0.13, 0)
  const parts = [tint(low, '#07040e'), tint(bevel, '#0d0820'), tint(top, '#0a0616')]
  const merged = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  return merged
}

/**
 * Cadre néon : dégradé de la couleur A vers la couleur B de l'ambiance courante,
 * pulsation calée sur `ambiance.speed` (coupée en mouvement réduit).
 */
function NeonFrame({ ambiance, reducedMotion }) {
  const mats = useRef([])
  const bars = [
    [0, -6.15, [12.7, 0.08, 0.07]],
    [0, 6.15, [12.7, 0.08, 0.07]],
    [-6.15, 0, [0.07, 0.08, 12.7]],
    [6.15, 0, [0.07, 0.08, 12.7]],
  ]
  const colors = useMemo(() => {
    const a = new THREE.Color(ambiance.lightA)
    const b = new THREE.Color(ambiance.lightB)
    return bars.map((_, k) => a.clone().lerp(b, k / (bars.length - 1)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambiance.lightA, ambiance.lightB])
  useFrame((s) => {
    if (reducedMotion) return
    const t = s.clock.elapsedTime
    for (let k = 0; k < mats.current.length; k++) {
      const m = mats.current[k]
      if (m) m.emissiveIntensity = 0.75 + Math.sin(t * ambiance.speed + k * 1.2) * 0.45 * ambiance.pulse
    }
  })
  return (
    <>
      {bars.map(([x, z, args], k) => (
        <mesh key={k} position={[x, 0.04, z]}>
          <boxGeometry args={args} />
          <meshStandardMaterial
            ref={(m) => { mats.current[k] = m }}
            color={colors[k]}
            emissive={colors[k]}
            emissiveIntensity={0.75}
            metalness={0.4}
            roughness={0.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}

// Mémoïsé : le survol des titres de propriété re-rend la scène, les 40 cases n'ont
// aucune raison de suivre (leurs props sont des primitives + un setter stable).
const Tile = memo(function Tile({ i, texture, onSelect, ownerColor, tint, special = false, isMonopoly, level = 0, mortgaged = false, pulse = false, reducedMotion }) {
  const [r, c] = cellFor(i)
  const gref = useRef()
  // Base sombre ; la teinte de catégorie n'agit qu'en émissif discret (plus marqué
  // pour les cases spéciales non achetables), sans « repeindre » toute la case.
  // Cases spéciales (non achetables) : bloc SURÉLEVÉ et LUMINEUX à sa couleur —
  // elles dominent le plateau. Cases achetables : socle plus bas, sobre.
  const boxH = special ? TILE_H.special : TILE_H.prop
  const faceY = boxH + 0.01
  const baseColor = ownerColor || (special ? tint : '#0c0722')
  const baseEmissive = ownerColor || tint || '#000000'
  const emissiveIntensity = ownerColor ? (isMonopoly ? 0.5 : 0.28) : special ? 0.45 : 0.08
  // « Claque » à l'achat : la case gonfle, monte de 0,15 et retombe en oscillation
  // amortie (exp(−4,5t)·sin(9t), normalisée sur son pic) — le rebond élastique.
  const lift = useRef({ t: LIFT_DUR })
  useFrame((_, dt) => {
    const g = gref.current
    if (!g) return
    const t = !reducedMotion && pulse ? 1.16 : 1
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, t, 0.22))
    if (pulse && lift.current.t >= LIFT_DUR) lift.current.t = 0
    if (lift.current.t < LIFT_DUR) {
      lift.current.t += dt
      const k = lift.current.t
      g.position.y = reducedMotion ? 0 : 0.15 * (Math.exp(-4.5 * k) * Math.sin(9 * k)) / LIFT_PEAK
    } else if (g.position.y !== 0) {
      g.position.y = 0
    }
  })
  return (
    <group ref={gref} position={[c - 6, 0, r - 6]} onClick={(e) => { e.stopPropagation(); onSelect(i) }}>
      <mesh castShadow receiveShadow position={[0, boxH / 2, 0]}>
        <boxGeometry args={[0.96, boxH, 0.96]} />
        <meshStandardMaterial color={baseColor} emissive={baseEmissive} emissiveIntensity={emissiveIntensity} roughness={special ? 0.45 : 0.7} metalness={special ? 0.35 : 0.2} toneMapped={!special} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, faceY, 0]}>
        <planeGeometry args={[0.94, 0.94]} />
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.55} roughness={0.6} toneMapped={false} />
      </mesh>
      {ownerColor && <OwnerFrame color={ownerColor} />}
      {ownerColor && <OwnerMarker color={ownerColor} reducedMotion={reducedMotion} />}
      {isMonopoly && !mortgaged && <MonopolyBadge />}
      {!mortgaged && <Buildings level={level} />}
      {mortgaged && <MortgageOverlay />}
    </group>
  )
})

// ── Pions ────────────────────────────────────────────────────────────────────
const HOP_DUR = 0.18   // 180 ms par case
const HOP_H = 0.45     // hauteur de l'arc
const SQUASH_DUR = 0.12
const SQUASH_Y = 0.82
const SQUASH_XZ = 1.1
const TRAIL_N = 6
// Les pions sont modélisés posés sur une case ORDINAIRE : au-dessus d'une case
// surélevée, le groupe est remonté de la différence (sinon ils la traversent).
const PAWN_BASE = TILE_H.prop + 0.04
const PAWN_DUMMY = new THREE.Object3D()
const PAWN_TMP = new THREE.Vector3()

// Matériaux réutilisables pour les pions-boissons. Le verre passe en physical :
// le vernis (clearcoat) donne le reflet net de surface qui fait « objet cher ».
const GLASS = { transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.15 }
const glass = (color, emi) => <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={emi * 0.5} {...GLASS} />
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
  const ref = useRef()       // groupe pion : position monde
  const bodyRef = useRef()   // groupe interne : squash & stretch + inclinaison
  const haloRef = useRef()
  const ringRef = useRef()
  const shadowRef = useRef()
  const shadowMat = useRef()
  const trailRef = useRef()
  const rimRef = useRef()
  const labelRef = useRef()

  const ox = (seatOffset % 2) * 0.34 - 0.17
  const oz = Math.floor(seatOffset / 2) * 0.34 - 0.17
  const posOf = (i) => {
    const [r, c] = cellFor(i)
    return [c - 6 + ox, r - 6 + oz]
  }
  // Décalage vertical pour se poser sur le dessus de la case (0 sur une propriété,
  // +0,16 sur une case spéciale surélevée).
  const standOf = (i) => tileTopY(i) - PAWN_BASE
  const init = useMemo(() => {
    const [r, c] = cellFor(target)
    return [c - 6 + ox, standOf(target), r - 6 + oz]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Machine à sauts : une case par bond, l'atterrissage arme l'écrasement.
  const hop = useRef({ from: target, to: target, t: 0, flying: false })
  const squash = useRef(SQUASH_DUR)
  const trail = useRef([])

  useFrame((s, dt) => {
    const g = ref.current
    if (!g) return
    const h = hop.current

    if (reducedMotion) {
      // Mouvement réduit : pas de saut, pas de traînée — on se pose sur la case.
      h.from = target; h.to = target; h.flying = false; h.t = 0
    } else {
      if (h.flying) {
        h.t += dt
        if (h.t >= HOP_DUR) { h.flying = false; h.from = h.to; h.t = 0; squash.current = 0 }
      }
      if (!h.flying && h.to !== target) {
        h.from = h.to
        h.to = (h.to + 1) % 40
        h.t = 0
        h.flying = true
      }
    }

    const k = h.flying ? Math.min(1, h.t / HOP_DUR) : 1
    const [ax, az] = posOf(h.from)
    const [bx, bz] = posOf(h.to)
    g.position.x = ax + (bx - ax) * k
    g.position.z = az + (bz - az) * k
    const arc = h.flying ? Math.sin(Math.PI * k) * HOP_H : 0
    const idle = reducedMotion || h.flying
      ? 0
      : isActive
        ? Math.abs(Math.sin(s.clock.elapsedTime * 4)) * 0.1
        : Math.sin(s.clock.elapsedTime * 1.6 + seatOffset) * 0.02
    // Le sol suit la hauteur de la case, et se raccorde pendant le bond : on ne
    // traverse plus les cases spéciales, on grimpe dessus.
    const standA = standOf(h.from)
    const stand = standA + (standOf(h.to) - standA) * k
    const lift = arc + idle
    g.position.y = stand + lift

    // ── Squash & stretch ───────────────────────────────────────────────────────
    const body = bodyRef.current
    if (body) {
      let sy = 1
      let sxz = 1
      if (h.flying) {
        // Étiré au décollage, ramassé juste avant de toucher (cos : +1 → −1).
        const c = Math.cos(Math.PI * k)
        sy = 1 + 0.1 * c
        sxz = 1 - 0.06 * c
      } else if (squash.current < SQUASH_DUR) {
        squash.current += dt
        const u = Math.min(1, squash.current / SQUASH_DUR)
        // Oscillation amortie : part de l'écrasement, dépasse légèrement, se cale.
        const f = Math.exp(-5 * u) * Math.cos(14 * u)
        sy = 1 + (SQUASH_Y - 1) * f
        sxz = 1 + (SQUASH_XZ - 1) * f
      }
      body.scale.set(sxz, sy, sxz)
      // Le pion est modélisé au-dessus de son socle : on compense pour que la base
      // reste collée à la case au lieu de s'enfoncer avec l'échelle.
      body.position.y = PAWN_BASE * (1 - sy)
      // Inclinaison vers l'avant du joueur actif pendant le bond.
      const lean = isActive && h.flying ? Math.sin(Math.PI * k) * 0.16 : 0
      const dx = bx - ax
      const dz = bz - az
      const len = Math.hypot(dx, dz) || 1
      body.rotation.x = (dz / len) * lean
      body.rotation.z = -(dx / len) * lean
    }

    // ── Ombre de contact : reste au sol, rétrécit et pâlit avec l'altitude ──────
    // Ombre, anneau et halo restent sur la surface de la case : on ne compense que
    // ce que le pion a pris en altitude (`lift`), pas la hauteur de la case.
    const sh = shadowRef.current
    if (sh) {
      sh.position.y = PAWN_BASE + 0.001 - lift
      const up = Math.min(1, lift / HOP_H)
      const sc = 1 - 0.45 * up
      sh.scale.set(sc, sc, 1)
      if (shadowMat.current) shadowMat.current.opacity = 0.42 * (1 - 0.75 * up)
    }

    const ring = ringRef.current
    if (ring) {
      ring.position.y = PAWN_BASE + 0.015 - lift
      const p = isActive && !reducedMotion ? 1 + Math.sin(s.clock.elapsedTime * 4.5) * 0.12 : 1
      ring.scale.set(p, p, 1)
    }
    if (haloRef.current) {
      haloRef.current.position.y = PAWN_BASE + 0.02 - lift
      if (!reducedMotion) haloRef.current.rotation.z += dt * 1.6
    }

    // Rim light du joueur actif : à l'opposé de la caméra, un peu en hauteur.
    const rim = rimRef.current
    if (rim) {
      PAWN_TMP.copy(s.camera.position).sub(g.position)
      PAWN_TMP.y = 0
      if (PAWN_TMP.lengthSq() > 0) PAWN_TMP.normalize()
      rim.position.set(-PAWN_TMP.x * 0.95, 0.8, -PAWN_TMP.z * 0.95)
    }

    // ── Traînée : ruban court de sphères instanciées, en espace monde ──────────
    const tr = trailRef.current
    if (tr) {
      const buf = trail.current
      if (h.flying && !reducedMotion) {
        buf.unshift([g.position.x, g.position.y + PAWN_BASE + 0.35, g.position.z])
        if (buf.length > TRAIL_N) buf.pop()
      } else if (buf.length) {
        buf.pop()
      }
      for (let i = 0; i < TRAIL_N; i++) {
        const p = buf[i]
        const f = p ? 1 - i / TRAIL_N : 0
        PAWN_DUMMY.position.set(p ? p[0] : 0, p ? p[1] : -10, p ? p[2] : 0)
        PAWN_DUMMY.scale.setScalar(0.17 * f)
        PAWN_DUMMY.updateMatrix()
        tr.setMatrixAt(i, PAWN_DUMMY.matrix)
      }
      tr.instanceMatrix.needsUpdate = true
      tr.visible = buf.length > 0
    }

    // Caméra quasi à la verticale : l'étiquette se superpose au plateau, on la coupe.
    const lab = labelRef.current
    if (lab) {
      const cam = s.camera
      const d = cam.position.length() || 1
      const polar = Math.acos(THREE.MathUtils.clamp(cam.position.y / d, -1, 1))
      lab.style.opacity = polar < 0.3 ? '0' : '1'
    }
  })

  const emi = isActive ? 0.85 : 0.55
  const idx = Number.isInteger(shapeIndex) ? shapeIndex : seatOffset
  const shape = DRINK_SHAPES[((idx % DRINK_SHAPES.length) + DRINK_SHAPES.length) % DRINK_SHAPES.length]
  return (
    <>
      <group ref={ref} position={init}>
        {/* Ombre de contact */}
        <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, PAWN_BASE + 0.001, 0]}>
          <circleGeometry args={[0.26, 24]} />
          <meshBasicMaterial ref={shadowMat} color="#000000" transparent opacity={0.42} depthWrite={false} />
        </mesh>
        <group ref={bodyRef}>{shape(color, emi)}</group>
        {/* Anneau couleur du joueur au sol (repère qui est où). */}
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, PAWN_BASE + 0.015, 0]}>
          <ringGeometry args={[0.24, 0.32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={isActive ? 0.9 : 0.55} toneMapped={false} />
        </mesh>
        {/* Halo + rim light du joueur actif. */}
        {isActive && (
          <>
            <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, PAWN_BASE + 0.02, 0]}>
              <torusGeometry args={[0.38, 0.03, 8, 40]} />
              <meshBasicMaterial color="#f5b21a" toneMapped={false} />
            </mesh>
            <pointLight ref={rimRef} color={color} intensity={7} distance={2.6} decay={1.6} />
          </>
        )}
        {/* Étiquette billboard (nom + argent) au-dessus du pion actif. */}
        {isActive && name && (
          <Html position={[0, 1.5, 0]} center distanceFactor={9} zIndexRange={[20, 0]} wrapperClass="mv-pawnlabel-wrap">
            <div ref={labelRef} className="mv-pawnlabel" style={{ '--pc': color }}>
              <span className="mv-pawnlabel__dot" />
              <span className="mv-pawnlabel__name">{name}</span>
              <span className="mv-pawnlabel__cash">{cash}€</span>
            </div>
          </Html>
        )}
      </group>
      {/* Traînée : hors du groupe, ses positions sont en coordonnées monde. */}
      <instancedMesh ref={trailRef} args={[undefined, undefined, TRAIL_N]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </instancedMesh>
    </>
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

export default function Scene3D({ state, onSelect, dice, reducedMotion = false, lite = false, topDown = false, showEstates = true, ambiance, monopolySpaces, buildings, mortgaged, justOwned, targetSpace, controlsRef, fx = null, center = null, centerSlot = null }) {
  // Re-génère les textures une fois les polices web prêtes (sinon fallback système).
  const [fontTick, setFontTick] = useState(0)
  useEffect(() => {
    let alive = true
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => { if (alive) setFontTick((t) => t + 1) })
    }
    return () => { alive = false }
  }, [])
  // L'index sert à orienter les coins (0, 10, 20, 30) vers l'extérieur du plateau.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const textures = useMemo(() => soireeBoard.spaces.map((s, i) => createTileTexture(s, i)), [fontTick])
  // Textures 512² × 40 : on libère le jeu précédent lors de la régénération (polices
  // prêtes) et au démontage, sinon la VRAM double.
  useEffect(() => () => { textures.forEach((t) => t.dispose()) }, [textures])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const centerTex = useMemo(() => createCenterTexture(), [fontTick])
  const haloTex = useMemo(() => createHaloTexture(), [])
  const vignetteTex = useMemo(() => (lite ? null : createGroundVignette()), [lite])
  const vignetteMatRef = useRef()
  const rimGeometry = useMemo(() => buildTileRims(), [])
  const baseGeometry = useMemo(() => buildBoardBase(), [])
  useEffect(() => () => { rimGeometry.dispose(); baseGeometry.dispose() }, [rimGeometry, baseGeometry])
  const amb = ambiance ?? ambianceFor('warmup')
  // Couleur du propriétaire par case (spaceId → couleur du joueur).
  const ownerColorBySpace = useMemo(
    () => ownerColorMap(state, PLAYER_COLORS),
    [state],
  )
  const monopolySet = monopolySpaces || new Set()

  // La caméra n'est plus pilotée ici : tout passe par <CameraDirector> (suivi du
  // pion actif compris), seul endroit autorisé à la toucher.
  return (
    <>
      <OrbitControls ref={controlsRef} makeDefault enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.08} minDistance={topDown ? 8 : 11} maxDistance={26} minPolarAngle={topDown ? 0.12 : 0.5} maxPolarAngle={1.25} target={[0, 0, 0]} />
      {/* Faces de cases moins auto-illuminées (0,9 → 0,55) : le relief vient
          maintenant de la lumière, donc ambiante et clé sont remontées d'autant. */}
      <AmbianceLights ambiance={amb} reducedMotion={reducedMotion} lite={lite} vignetteRef={vignetteMatRef} />
      {/* Key : seule source d'ombres. Frustum resserré sur le plateau réel (±7 au
          lieu de ±11) → même carte d'ombre, deux fois plus de texels par mètre. */}
      <directionalLight castShadow position={[7, 16, 7]} intensity={1.5} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={44} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-0.0004} />

      {/* Décor : table de bar + dôme + faisceaux. Il remplace l'ancien sol infini,
          c'est lui qui porte le plateau (surface réfléchissante comprise). */}
      <Environment3D ambiance={amb} lite={lite} />
      {/* Vignette : éteint les bords du reflet, garde le centre lisible.
          Inutile en rendu allégé (pas de miroir) → un mesh transparent de moins. */}
      {!lite && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_TOP + 0.015, 0]} raycast={() => null}>
          <circleGeometry args={[13.4, 48]} />
          <meshBasicMaterial ref={vignetteMatRef} map={vignetteTex} transparent depthWrite={false} toneMapped={false} opacity={0.45 + 0.55 * amb.vignette} />
        </mesh>
      )}
      {/* Halo radial autour du plateau : la lueur des néons sur la table. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_TOP + 0.03, 0]} raycast={() => null}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial map={haloTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.6} />
      </mesh>

      {/* Socle deux niveaux + chanfrein, fusionné en une géométrie (1 draw call,
          comme l'ancienne boîte unique) — les deux tons passent par les sommets. */}
      <mesh geometry={baseGeometry} receiveShadow>
        <meshStandardMaterial vertexColors metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[9.1, 0.06, 9.1]} />
        <meshStandardMaterial color="#0d0722" emissive="#140a34" emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
      {/* Centre en volume : podium, logo billboardé, jauge de temps, carte 3D. */}
      <CenterStage
        texture={centerTex}
        ambiance={amb}
        intensity={state.partyIntensity}
        reducedMotion={reducedMotion}
        panel={center?.panel ?? null}
        turn={center?.turn ?? state.turn}
        timerLeft={center?.timerLeft ?? -1}
        timerTotal={center?.timerTotal ?? 0}
        centerSlot={centerSlot}
      />
      <NeonFrame ambiance={amb} reducedMotion={reducedMotion} />
      {/* Liserés des 40 cases : une seule géométrie fusionnée = un seul draw call. */}
      <mesh geometry={rimGeometry}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
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
      {/* Effets ponctuels (achat, monopole, loyer, faillite, montée d'intensité) :
          une seule prop `fx` en entrée, la file est gérée dans <Effects>. */}
      <Effects fx={fx} reducedMotion={reducedMotion} players={state.players} ownership={state.ownership} />
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
      {/* Titres de propriété posés sur la table, un présentoir par joueur. Masqués
          sur téléphone : illisibles à cette taille, et leur largeur imposait un
          cadrage qui rapetissait le plateau (voir la feuille « Biens »). */}
      {showEstates && <Estates3D state={state} onSelect={onSelect} reducedMotion={reducedMotion} lite={lite} />}
      <DiceSet dice={dice} />
    </>
  )
}
