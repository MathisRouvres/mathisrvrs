import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import SolidDecor from '../components/SolidDecor'
import { at, box, cyl, disc, fuse, polar, tableParts, tint } from '../geoKit'
import { FLOOR_Y, PROP_R, TABLE_EDGE, TABLE_R, TABLE_TOP } from '../stage'

/**
 * Warehouse underground.
 *
 * Ancien espace industriel aménagé pour une soirée privée : béton, plateforme
 * centrale, structures métalliques au-dessus, flight cases en guise de sièges,
 * rubans LED magenta et orange. Le plateau n'est plus « quelque part » : il est
 * posé sur l'estrade, et tout le reste rayonne autour.
 *
 * C'est le seul thème qui ÉVOLUE avec l'intensité de soirée : la rampe LED de la
 * plateforme et les traverses de la structure montent en luminosité de warm-up à
 * finale. Jamais de flash : une montée continue, coupée net en mouvement réduit.
 */

const SEG = 40
const PLATFORM_H = 0.72
const TRUSS_Y = 9.4

/** Flight case : caisse + arêtes métalliques + poignée. Sert de siège. */
function flightCase(angle, radius, colors, lite) {
  const [x, z] = polar(angle, radius)
  const y = FLOOR_Y + PLATFORM_H
  const parts = [box(2.3, 1.5, 1.8, colors.body, x, y + 0.75, z, angle)]
  if (lite) return parts
  // Arêtes : quatre barres métalliques, c'est ce qui fait « flight case ».
  for (const s of [-1, 1]) {
    parts.push(box(2.4, 0.1, 0.12, colors.metal, ...radial(angle, radius, y + 1.5, 0, s * 0.9), angle))
    parts.push(box(2.4, 0.1, 0.12, colors.metal, ...radial(angle, radius, y + 0.02, 0, s * 0.9), angle))
  }
  // Poignée encastrée côté plateau.
  parts.push(box(0.7, 0.16, 0.1, colors.metal, ...radial(angle, radius - 0.92, y + 0.8, 0, 0), angle))
  return parts
}

/** Point en repère local d'une place : radial + latéral. */
function radial(angle, radius, y, forward = 0, lateral = 0) {
  const [x, z] = polar(angle, radius + forward)
  return [x + Math.cos(angle) * lateral, y, z - Math.sin(angle) * lateral]
}

/** Bouteilles d'eau, gobelets, gaffer : le strict nécessaire d'un backstage. */
function backstageProps(seats, colors) {
  const step = seats.length ? (Math.PI * 2) / seats.length : 0
  const gaps = seats.map((s) => s.angle + step / 2)
  const parts = []

  const a0 = gaps[0] ?? 1
  const [bx, bz] = polar(a0, PROP_R)
  parts.push(cyl(0.17, 0.2, 0.72, 12, colors.bottle, bx, TABLE_TOP + 0.36, bz))
  parts.push(cyl(0.07, 0.07, 0.16, 10, colors.cap, bx, TABLE_TOP + 0.8, bz))
  parts.push(cyl(0.22, 0.16, 0.46, 12, colors.cup, bx + 0.7, TABLE_TOP + 0.23, bz - 0.35))

  const a1 = gaps[1] ?? 3.2
  const [gx, gz] = polar(a1, PROP_R)
  // Rouleau de gaffer + petite pile de gobelets.
  parts.push(tint(at(new THREE.TorusGeometry(0.3, 0.13, 8, 16).rotateX(Math.PI / 2), gx, TABLE_TOP + 0.13, gz), colors.gaffer))
  parts.push(cyl(0.24, 0.18, 0.9, 12, colors.cup, gx + 0.9, TABLE_TOP + 0.45, gz + 0.3))
  return parts
}

export default function UndergroundEnvironment({ preset, seats, ambiance, intensity, lite = false, compact = false, reducedMotion = false }) {
  const p = preset.palette
  const radius = preset.playerLayout.furnitureRadius
  const shapeKey = `${seats.length}:${lite}:${compact}`
  const glowRef = useRef()

  const solid = useMemo(() => {
    // Plateforme centrale : le plateau est posé sur une estrade, pas au sol.
    const parts = [
      cyl(radius + 2.4, radius + 2.9, PLATFORM_H, SEG, p.floorInner, 0, FLOOR_Y + PLATFORM_H / 2, 0),
      disc(radius + 2.4, SEG, '#201e28', FLOOR_Y + PLATFORM_H + 0.004),
    ]
    parts.push(...tableParts({
      top: TABLE_TOP,
      bottom: FLOOR_Y + PLATFORM_H,
      radius: TABLE_R,
      edgeRadius: TABLE_EDGE,
      withTop: true,
      colors: { top: p.tableTop, edge: p.tableEdge, body: p.tableBody },
    }))
    if (!compact) {
      for (const seat of seats) {
        parts.push(...flightCase(seat.angle, radius, { body: p.seat, metal: '#6e6c78' }, lite))
      }
      // Structure métallique au-dessus : deux poutres croisées + montants.
      // Elle ferme le volume par le haut — sans elle, le hangar n'a pas de toit.
      parts.push(box(52, 0.34, 0.34, '#3c3a46', 0, TRUSS_Y, -5))
      parts.push(box(52, 0.34, 0.34, '#3c3a46', 0, TRUSS_Y, 5))
      parts.push(box(0.34, 0.34, 11, '#3c3a46', -14, TRUSS_Y, 0))
      parts.push(box(0.34, 0.34, 11, '#3c3a46', 14, TRUSS_Y, 0))
      if (!lite) {
        for (const s of [-1, 1]) {
          parts.push(box(0.42, TRUSS_Y - FLOOR_Y, 0.42, '#333140', s * 25, FLOOR_Y + (TRUSS_Y - FLOOR_Y) / 2, -5))
        }
      }
    }
    if (!lite) {
      parts.push(...backstageProps(seats, {
        bottle: '#7f8b93', cap: p.propTrim, cup: '#b8bcc6', gaffer: '#26242e',
      }))
    }
    return fuse(parts)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey, p.tableTop, p.tableEdge, p.tableBody, p.seat, p.floorInner, p.propTrim, radius])

  const glow = useMemo(() => {
    const parts = [
      // Rampe LED au nez de l'estrade : elle dessine la scène.
      tint(at(new THREE.TorusGeometry(radius + 2.65, 0.09, 6, SEG).rotateX(Math.PI / 2), 0, FLOOR_Y + PLATFORM_H - 0.12, 0), '#ec1e79'),
    ]
    if (!compact) {
      // Barres orange sous la structure : quatre traits, pas un mur de lumière.
      for (const z of [-5, 5]) {
        parts.push(box(24, 0.1, 0.14, '#f97316', 0, TRUSS_Y - 0.28, z))
      }
      // Marquage au sol autour de la plateforme.
      parts.push(tint(at(new THREE.TorusGeometry(radius + 6.4, 0.06, 6, SEG).rotateX(Math.PI / 2), 0, FLOOR_Y + 0.02, 0), '#f97316'))
    }
    return fuse(parts)
  }, [compact, radius])

  // La couche lumineuse est rendue ici (et non par <SolidDecor>) : c'est elle
  // qui porte la montée en puissance, donc son matériau doit rester pilotable.
  useEffect(() => () => glow?.dispose(), [glow])

  // Montée en puissance : la lumière du décor suit l'intensité de soirée. Une
  // seule opacité pilotée, aucun matériau reconstruit.
  const level = intensity === 'finale' ? 1 : intensity === 'chaos' ? 0.82 : intensity === 'party' ? 0.62 : 0.42
  useFrame((s) => {
    const m = glowRef.current
    if (!m) return
    if (reducedMotion) { m.opacity = level; return }
    m.opacity = level * (0.88 + Math.sin(s.clock.elapsedTime * ambiance.speed * 0.5) * 0.12 * ambiance.pulse)
  })

  return (
    <>
      <SolidDecor solid={solid} lite={lite} metalness={0.34} roughness={0.78} />
      {glow && (
        <mesh geometry={glow} raycast={() => null}>
          <meshBasicMaterial ref={glowRef} vertexColors transparent opacity={level} toneMapped={false} fog={false} />
        </mesh>
      )}
    </>
  )
}
