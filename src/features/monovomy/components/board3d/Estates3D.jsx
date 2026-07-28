import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { soireeBoard } from '../../content'
import { estates } from '../../game/estates'
import { PLAYER_COLORS } from './playerColors'
import { createDeedTexture, createNamePlateTexture } from './deedTexture'
import { isPurchasable } from './tileTexture'
import { cellFor, INDEX_BY_ID } from './boardCells'
import { layoutFan, CARD_W, CARD_H } from './estateLayout'
import { TABLE_TOP } from './Environment3D'

/**
 * Titres de propriété PHYSIQUES : de vrais cartons posés sur la table, pas un calque
 * d'écran. Ils sont rassemblés sur un RAIL au bord de table le plus proche de la
 * caméra, et ce rail pivote avec l'orbite : où qu'on regarde, les titres restent
 * devant nous, à portée de pouce — jamais à aller chercher à l'autre bout du plateau.
 *
 * Chaque joueur a sa travée : plaque nominative côté plateau, titres en éventail
 * devant. Survol → le carton se lève, se redresse face caméra et allume sa case sur
 * le plateau. Clic → fiche de la case.
 *
 * Les textures de carton sont statiques (nom, groupe, loyer de base, prix) : niveau
 * d'établissement, hypothèque et monopole sont rendus en volume par-dessus.
 */

// ── Géométrie du rail ────────────────────────────────────────────────────────
// Le plateau s'arrête à ±6,75 (socle compris) : le rail commence juste après, au
// plus près de la caméra sans mordre sur le jeu.
const RAIL_Z = 7.95        // profondeur des cartons
const PLATE_Z = 7.16       // plaque nominative, côté plateau
const RAIL_WIDTH = 15      // largeur utile devant la caméra
const SLOT_MAX = 4.2       // au-delà, une travée s'étale pour rien
const SLOT_GAP = 0.35      // séparation entre deux travées

const HOVER_LIFT = 0.85
const HOVER_SCALE = 1.9
const DAMP = 9
const RAIL_TURN = 6        // vitesse de suivi de l'orbite

const TMP_Q = new THREE.Quaternion()

/** Altitude du dessus d'une case (les spéciales sont surélevées) — pour les faisceaux. */
function tileTopY(i) {
  const space = soireeBoard.spaces[((i % 40) + 40) % 40]
  return (isPurchasable(space) ? 0.24 : 0.4) + 0.04
}

/** Maisons / hôtel posés sur le carton, à l'échelle du titre. */
function DeedBuildings({ level, maxLevel }) {
  if (level <= 0) return null
  const y = CARD_H / 2 - 0.15
  if (level >= maxLevel) {
    return (
      <mesh position={[0, y, 0.045]} raycast={() => null}>
        <boxGeometry args={[0.24, 0.11, 0.08]} />
        <meshStandardMaterial color="#ec1e79" emissive="#ec1e79" emissiveIntensity={0.55} roughness={0.4} toneMapped={false} />
      </mesh>
    )
  }
  const n = Math.min(level, 4)
  return (
    <group position={[0, y, 0.04]}>
      {Array.from({ length: n }, (_, k) => (
        <mesh key={k} position={[(k - (n - 1) / 2) * 0.115, 0, 0]} raycast={() => null}>
          <boxGeometry args={[0.085, 0.085, 0.07]} />
          <meshStandardMaterial color="#22c55e" emissive="#149042" emissiveIntensity={0.45} roughness={0.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Un titre de propriété. Au repos : posé à plat dans l'éventail, seule sa tranche
 * gauche dépasse du carton suivant. Au survol : il se lève, sort du paquet et pivote
 * face à la caméra, jusqu'à être lisible sans zoom.
 *
 * Le carton visuel ne reçoit AUCUN rayon : c'est un plan de contact fixe, posé à sa
 * place de repos, qui capte le pointeur. Sans lui, le carton qui se lève sortirait
 * du rayon et retomberait aussitôt (clignotement). Ce plan a la largeur du PAS de
 * l'éventail, pas celle du carton : deux zones de contact ne se recouvrent jamais,
 * donc chaque tranche visible est bien la sienne.
 */
function Deed({ item, texture, ownerColor, hitW, hovered, onHover, onPick, reducedMotion, lite }) {
  const ref = useRef()
  const k = useRef(0)
  const rest = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.1, 0, 0)), [])
  const frame = item.monopoly ? '#f5b21a' : ownerColor

  useFrame((s, dt) => {
    const g = ref.current
    if (!g) return
    const target = hovered ? 1 : 0
    k.current = reducedMotion ? target : THREE.MathUtils.damp(k.current, target, DAMP, dt)
    const t = k.current
    // Le carton survolé sort du paquet vers la caméra : il ne peut plus être masqué.
    g.position.set(item.x, item.y + 0.012 + t * HOVER_LIFT, t * 0.45)
    g.scale.setScalar(1 + t * (HOVER_SCALE - 1))
    if (t < 0.001) { g.quaternion.copy(rest); return }
    g.quaternion.copy(rest)
    g.lookAt(s.camera.position)
    TMP_Q.copy(g.quaternion)
    g.quaternion.copy(rest).slerp(TMP_Q, t)
  })

  return (
    <>
      {/* Zone de contact : immobile, invisible, large d'un pas d'éventail. */}
      <mesh
        position={[item.x - (CARD_W - hitW) / 2, item.y + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(e) => { e.stopPropagation(); onHover(item.spaceId) }}
        onPointerOut={(e) => { e.stopPropagation(); onHover(null) }}
        onClick={(e) => { e.stopPropagation(); onPick(item.index) }}
      >
        <planeGeometry args={[hitW, CARD_H]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <group ref={ref} position={[item.x, item.y + 0.012, 0]} quaternion={rest}>
        {/* Dos du carton : couleur du propriétaire, doré si le groupe est complet. */}
        <mesh position={[0, 0, -0.006]} castShadow={!lite} raycast={() => null}>
          <boxGeometry args={[CARD_W + 0.06, CARD_H + 0.06, 0.012]} />
          <meshStandardMaterial color={frame} emissive={frame} emissiveIntensity={hovered ? 0.7 : 0.35} metalness={0.4} roughness={0.35} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.004]} raycast={() => null}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={hovered ? 0.75 : 0.5} roughness={0.7} toneMapped={false} />
        </mesh>
        {!item.mortgaged && <DeedBuildings level={item.level} maxLevel={item.maxLevel} />}
        {item.mortgaged && (
          <group position={[0, 0, 0.02]}>
            <mesh raycast={() => null}>
              <planeGeometry args={[CARD_W, CARD_H]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.004]} rotation={[0, 0, Math.PI / 4]} raycast={() => null}>
              <planeGeometry args={[CARD_W * 1.3, 0.07]} />
              <meshBasicMaterial color="#e11d48" toneMapped={false} />
            </mesh>
          </group>
        )}
      </group>
    </>
  )
}

/** Faisceau + anneau sur la case du plateau correspondant au titre survolé. */
function SpaceBeacon({ index, color, reducedMotion }) {
  const ringRef = useRef()
  const beamMat = useRef()
  const [r, c] = cellFor(index)
  useFrame((s) => {
    if (reducedMotion) return
    const t = s.clock.elapsedTime
    const p = 1 + Math.sin(t * 5) * 0.09
    ringRef.current?.scale.set(p, p, 1)
    if (beamMat.current) beamMat.current.opacity = 0.2 + Math.sin(t * 5) * 0.07
  })
  return (
    <group position={[c - 6, tileTopY(index), r - 6]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <ringGeometry args={[0.46, 0.58, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.95, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.3, 0.46, 1.9, 20, 1, true]} />
        <meshBasicMaterial ref={beamMat} color={color} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Plaque nominative : elle pulse quand c'est au tour du joueur. */
function NamePlate({ texture, color, width, active, reducedMotion }) {
  const mat = useRef()
  useFrame((s) => {
    if (!mat.current) return
    if (reducedMotion || !active) { mat.current.emissiveIntensity = active ? 0.7 : 0.25; return }
    mat.current.emissiveIntensity = 0.7 + Math.sin(s.clock.elapsedTime * 3) * 0.3
  })
  return (
    <mesh position={[0, 0.012, PLATE_Z - RAIL_Z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[width, width * 0.19]} />
      <meshStandardMaterial ref={mat} map={texture} emissive={color} emissiveMap={texture} emissiveIntensity={0.25} roughness={0.6} toneMapped={false} />
    </mesh>
  )
}

/**
 * Le rail : il tourne pour rester face à la caméra. On ne suit QUE l'azimut (pas la
 * hauteur), et en amorti — l'orbite ne doit pas donner l'impression que la table
 * glisse sous les cartons.
 */
function Rail({ children, reducedMotion }) {
  const ref = useRef()
  useFrame((s, dt) => {
    const g = ref.current
    if (!g) return
    const want = Math.atan2(s.camera.position.x, s.camera.position.z)
    const d = Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y))
    g.rotation.y += reducedMotion ? d : d * Math.min(1, dt * RAIL_TURN)
  })
  return <group ref={ref} position={[0, TABLE_TOP + 0.01, 0]}>{children}</group>
}

export default function Estates3D({ state, onSelect, reducedMotion = false, lite = false }) {
  const list = useMemo(() => estates(state, soireeBoard, PLAYER_COLORS), [state])
  const [hovered, setHovered] = useState(null)

  // Un carton par case achetable, généré une fois : la propriété ne fait que
  // déplacer les cartons d'une travée à l'autre.
  const deeds = useMemo(() => {
    const map = new Map()
    for (const s of soireeBoard.spaces) if (isPurchasable(s)) map.set(s.id, createDeedTexture(s))
    return map
  }, [])
  useEffect(() => () => { deeds.forEach((t) => t.dispose()) }, [deeds])

  // Plaques nominatives : refaites seulement si les noms ou les places changent.
  const nameKey = state.players.map((p) => p.name).join(' ')
  const plates = useMemo(() => {
    const map = new Map()
    state.players.forEach((p, i) => map.set(p.id, createNamePlateTexture(p.name, PLAYER_COLORS[i % PLAYER_COLORS.length])))
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameKey])
  useEffect(() => () => { plates.forEach((t) => t.dispose()) }, [plates])

  const activeId = state.players[state.currentPlayerIndex]?.id ?? null

  // Case survolée → faisceau sur le plateau, à la couleur du propriétaire.
  const beacon = useMemo(() => {
    if (!hovered) return null
    const owner = list.find((e) => e.spaceIds.includes(hovered))
    const index = INDEX_BY_ID.get(hovered)
    if (index == null) return null
    return { index, color: owner?.color ?? '#ffffff' }
  }, [hovered, list])

  // Travées : largeur partagée, centrées sur le bord proche.
  const slot = Math.min(SLOT_MAX, RAIL_WIDTH / Math.max(1, list.length))
  const railStart = -((list.length - 1) * slot) / 2

  return (
    <>
      <Rail reducedMotion={reducedMotion}>
        {list.map((estate, i) => {
          const cards = layoutFan(estate.groups, slot - SLOT_GAP)
          const step = cards.length > 1 ? cards[1].x - cards[0].x : CARD_W
          return (
            <group key={estate.playerId} position={[railStart + i * slot, 0, RAIL_Z]}>
              <NamePlate
                texture={plates.get(estate.playerId)}
                color={estate.color}
                width={Math.min(2, slot - SLOT_GAP)}
                active={estate.playerId === activeId}
                reducedMotion={reducedMotion}
              />
              {cards.map((item, k) => (
                <Deed
                  key={item.spaceId}
                  item={item}
                  texture={deeds.get(item.spaceId)}
                  ownerColor={estate.color}
                  // Dernier carton : rien ne le recouvre, il capte toute sa largeur.
                  hitW={k === cards.length - 1 ? CARD_W : Math.min(CARD_W, step)}
                  hovered={hovered === item.spaceId}
                  onHover={setHovered}
                  onPick={onSelect}
                  reducedMotion={reducedMotion}
                  lite={lite}
                />
              ))}
            </group>
          )
        })}
      </Rail>
      {beacon && <SpaceBeacon index={beacon.index} color={beacon.color} reducedMotion={reducedMotion} />}
    </>
  )
}
