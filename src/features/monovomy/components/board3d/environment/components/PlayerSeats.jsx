import { memo, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { fuse, tint } from '../geoKit'
import { TABLE_TOP } from '../stage'

/**
 * Les places des joueurs — la réponse au « les joueurs sont des éléments
 * flottants ».
 *
 * Chaque joueur a UNE place matérielle : une plaque inclinée, posée sur le bord
 * de table devant son siège, avec un liseré à sa couleur. Le pseudo, l'argent et
 * les indicateurs sont ancrés SUR cette plaque, pas suspendus dans le vide : ils
 * suivent la perspective (`distanceFactor`) et se rapprochent quand on zoome,
 * comme n'importe quel objet de la scène.
 *
 * Coût : une géométrie fusionnée pour toutes les plaques (1 draw call), un
 * liseré émissif par joueur (≤ 8), et UNE seule vraie lumière — celle du joueur
 * actif. Huit `pointLight` auraient coûté plus cher que les 40 cases.
 *
 * Les plaques DOM sont en `pointer-events: none` : elles ne peuvent jamais voler
 * un tap destiné au plateau.
 */

// Cotes de la plaque, en mode large (desktop) et compact (téléphone).
const PLATE = {
  wide: { w: 2.35, d: 0.72, h: 0.07, tilt: -0.34, label: 14 },
  compact: { w: 1.55, d: 0.5, h: 0.06, tilt: -0.22, label: 10 },
}

/** Transforme locale d'une place : sur le bord de table, tournée vers le centre. */
function seatMatrix(seat) {
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, seat.angle, 0))
  m.compose(new THREE.Vector3(seat.x, TABLE_TOP + 0.02, seat.z), q, new THREE.Vector3(1, 1, 1))
  return m
}

/** Socle de toutes les plaques, fusionné : la matière est la même pour tous. */
function buildPlates(seats, size, color) {
  const parts = seats.map((seat) => {
    const g = new THREE.BoxGeometry(size.w, size.h, size.d)
    g.rotateX(size.tilt)
    // L'inclinaison enfonce le bord avant : on relève d'autant, sinon la plaque
    // disparaît dans la table au lieu d'y être posée.
    g.translate(0, (size.d / 2) * Math.abs(Math.sin(size.tilt)) + size.h * 0.5, 0)
    g.applyMatrix4(seatMatrix(seat))
    return tint(g, color)
  })
  return fuse(parts)
}

/** Liseré lumineux d'une place : c'est lui qui porte la couleur du joueur. */
const SeatLight = memo(function SeatLight({ seat, size, reducedMotion }) {
  const matRef = useRef()
  useFrame((s) => {
    const m = matRef.current
    if (!m) return
    if (seat.eliminated) { m.emissiveIntensity = 0.06; return }
    if (!seat.active) { m.emissiveIntensity = 0.55; return }
    m.emissiveIntensity = reducedMotion ? 1.5 : 1.15 + Math.sin(s.clock.elapsedTime * 3) * 0.45
  })
  return (
    <mesh position={[0, (size.d / 2) * Math.abs(Math.sin(size.tilt)) + size.h, -size.d * 0.36]} rotation={[size.tilt, 0, 0]} raycast={() => null}>
      <boxGeometry args={[size.w * 0.86, 0.045, 0.075]} />
      <meshStandardMaterial
        ref={matRef}
        color={seat.color}
        emissive={seat.color}
        emissiveIntensity={0.55}
        metalness={0.35}
        roughness={0.35}
        toneMapped={false}
      />
    </mesh>
  )
})

/** Étiquette de la place : pseudo, argent, état. Ancrée au-dessus de la plaque. */
function SeatLabel({ seat, size, compact }) {
  const cls = [
    'mv-seat',
    seat.active ? 'is-active' : '',
    seat.eliminated ? 'is-out' : '',
    compact ? 'is-compact' : '',
  ].filter(Boolean).join(' ')
  return (
    <Html
      position={[0, size.h + 0.42, -size.d * 0.05]}
      center
      distanceFactor={size.label}
      zIndexRange={[18, 0]}
      wrapperClass="mv-seat-wrap"
    >
      <div className={cls} style={{ '--pc': seat.color }}>
        <span className="mv-seat__pip" aria-hidden="true" />
        {seat.avatar && <span className="mv-seat__avatar">{seat.avatar}</span>}
        <span className="mv-seat__id">
          <span className="mv-seat__name">{seat.name}{seat.inJail ? ' 🔒' : ''}</span>
          <span className="mv-seat__cash">{seat.eliminated ? 'éliminé' : `${seat.cash}€`}</span>
        </span>
        {seat.connected !== null && (
          <span
            className={`mv-seat__net ${seat.connected ? 'is-on' : 'is-off'}`}
            title={seat.connected ? 'Connecté' : 'Déconnecté'}
            aria-hidden="true"
          />
        )}
      </div>
    </Html>
  )
}

/** Lumière du joueur actif : la seule vraie source ajoutée par les places. */
function ActiveSeatGlow({ seat, reducedMotion }) {
  const ref = useRef()
  useFrame((s) => {
    const l = ref.current
    if (!l || reducedMotion) return
    l.intensity = 5 + Math.sin(s.clock.elapsedTime * 3) * 1.6
  })
  return <pointLight ref={ref} color={seat.color} intensity={5} distance={5.5} decay={1.8} position={[seat.x, TABLE_TOP + 0.75, seat.z]} />
}

export default function PlayerSeats({ seats, palette, compact = false, reducedMotion = false }) {
  const size = compact ? PLATE.compact : PLATE.wide
  // Reconstruit seulement si le nombre de places ou le rayon change — pas à
  // chaque euro dépensé.
  const shapeKey = seats.length ? `${seats.length}:${seats[0].radius}:${compact}` : 'none'
  const plateGeo = useMemo(
    () => buildPlates(seats, size, palette.seatPlate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shapeKey, palette.seatPlate],
  )
  useEffect(() => () => plateGeo?.dispose(), [plateGeo])

  const active = seats.find((s) => s.active) ?? null

  return (
    <group>
      {plateGeo && (
        <mesh geometry={plateGeo} receiveShadow raycast={() => null}>
          <meshStandardMaterial vertexColors metalness={0.42} roughness={0.44} />
        </mesh>
      )}
      {seats.map((seat) => (
        <group key={seat.playerId} position={[seat.x, TABLE_TOP + 0.02, seat.z]} rotation={[0, seat.angle, 0]}>
          <SeatLight seat={seat} size={size} reducedMotion={reducedMotion} />
          <SeatLabel seat={seat} size={size} compact={compact} />
        </group>
      ))}
      {active && <ActiveSeatGlow seat={active} reducedMotion={reducedMotion} />}
    </group>
  )
}
