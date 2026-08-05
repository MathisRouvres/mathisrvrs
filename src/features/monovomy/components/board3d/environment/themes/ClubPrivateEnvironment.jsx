import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'
import SolidDecor from '../components/SolidDecor'
import { at, ball, box, cone, cyl, disc, fuse, polar, tableParts, tint } from '../geoKit'
import { FLOOR_Y, PROP_R, TABLE_BOTTOM, TABLE_EDGE, TABLE_R, TABLE_TOP } from '../stage'

/**
 * Club privé — le décor par défaut.
 *
 * Un carré VIP : le plateau est encastré dans une table laquée, cernée d'une
 * banquette circulaire en velours sombre, avec liseré doré et rampe LED violette
 * au ras du sol. Pas de foule, pas de piste de danse : une table, des sièges,
 * quelques verres. C'est le lieu qui doit se lire en une seconde, pas le mobilier.
 *
 * Toute la matière tient en un mesh (couleurs de sommets), toutes les dorures et
 * LED en un second. Le dessus laqué réfléchissant reste un mesh à part : c'est le
 * seul effet coûteux du thème, et il tombe en rendu allégé.
 */

const SEG = 48

/** Banquette circulaire + dossier, ouverte côté caméra pour ne pas boucher la vue. */
function banquette(seats, radius, colors, lite) {
  const parts = []
  const seatY = FLOOR_Y + 0.62
  // Assise : un tore aplati. Un seul objet pour toute la banquette.
  parts.push(tint(
    at(new THREE.TorusGeometry(radius, 1.15, lite ? 6 : 10, lite ? 24 : SEG).rotateX(Math.PI / 2), 0, seatY, 0),
    colors.seat,
  ))
  // Dossier : tore plus haut et plus mince, légèrement en arrière.
  parts.push(tint(
    at(new THREE.TorusGeometry(radius + 0.95, 0.85, lite ? 6 : 10, lite ? 24 : SEG).rotateX(Math.PI / 2), 0, seatY + 1.15, 0),
    colors.seat,
  ))
  if (lite) return parts
  // Coussins : un par place, pour que chaque joueur ait visiblement SA place.
  for (const seat of seats) {
    const [x, z] = polar(seat.angle, radius)
    parts.push(box(1.55, 0.22, 1.4, colors.seatSoft, x, seatY + 1.02, z, seat.angle))
  }
  return parts
}

/** Verres, seau à glace et sous-verres — posés, pas éparpillés. */
function barProps(seats, colors) {
  const parts = []
  // Le décor de table vit ENTRE les places : jamais devant une plaque joueur.
  const step = seats.length ? (Math.PI * 2) / seats.length : 0
  const gaps = seats.map((s) => s.angle + step / 2)
  const slots = gaps.length >= 3 ? gaps.slice(0, 3) : [0.8, 2.6, 4.4]

  const a0 = slots[0] ?? 0.8
  const [gx, gz] = polar(a0, PROP_R)
  // Deux verres et un sous-verre.
  parts.push(cyl(0.26, 0.2, 0.58, 14, colors.prop, gx, TABLE_TOP + 0.29, gz))
  parts.push(cyl(0.28, 0.22, 0.44, 14, colors.prop, gx + 0.75, TABLE_TOP + 0.22, gz - 0.5))
  parts.push(cyl(0.44, 0.44, 0.02, 18, colors.propDark, gx - 0.7, TABLE_TOP + 0.01, gz + 0.4))

  const a1 = slots[1] ?? 2.6
  const [bx, bz] = polar(a1, PROP_R)
  // Seau à glace : cône tronqué + anses + bouteille qui dépasse.
  parts.push(cyl(0.62, 0.46, 0.82, 20, colors.metal, bx, TABLE_TOP + 0.41, bz))
  parts.push(tint(at(new THREE.TorusGeometry(0.63, 0.035, 6, 20).rotateX(Math.PI / 2), bx, TABLE_TOP + 0.78, bz), colors.gold))
  parts.push(cyl(0.16, 0.19, 0.62, 14, colors.bottle, bx + 0.12, TABLE_TOP + 1.02, bz))
  parts.push(cone(0.16, 0.2, 14, colors.bottle, bx + 0.12, TABLE_TOP + 1.42, bz, true))
  parts.push(cyl(0.07, 0.07, 0.26, 12, colors.bottle, bx + 0.12, TABLE_TOP + 1.65, bz))

  const a2 = slots[2] ?? 4.4
  const [sx, sz] = polar(a2, PROP_R)
  // Coupelle d'olives + cendrier bas.
  parts.push(ball(0.5, 16, 8, colors.propDark, sx, TABLE_TOP + 0.5, sz, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2))
  parts.push(ball(0.38, 12, 6, colors.olive, sx, TABLE_TOP + 0.34, sz, 0, Math.PI * 2, 0, Math.PI / 2.4))
  parts.push(cyl(0.5, 0.42, 0.12, 16, colors.metal, sx + 1.3, TABLE_TOP + 0.06, sz + 0.6))
  return parts
}

export default function ClubPrivateEnvironment({ preset, seats, lite = false, compact = false }) {
  const p = preset.palette
  const radius = preset.playerLayout.furnitureRadius

  const shapeKey = `${seats.length}:${lite}:${compact}`

  const solid = useMemo(() => {
    const parts = tableParts({
      top: TABLE_TOP,
      bottom: FLOOR_Y,
      radius: TABLE_R,
      edgeRadius: TABLE_EDGE,
      // En rendu allégé, le dessus est mat et fusionné : pas de miroir séparé.
      withTop: lite,
      colors: { top: p.tableTop, edge: p.tableEdge, body: p.tableBody },
    })
    // Tapis sous la table : la pièce a un sol traité, pas juste une couleur.
    parts.push(disc(radius + 4.2, SEG, p.floorInner, FLOOR_Y + 0.006))
    if (!compact) {
      parts.push(...banquette(seats, radius, {
        seat: p.seat,
        seatSoft: '#3a1d4e',
      }, lite))
    }
    if (!lite) {
      parts.push(...barProps(seats, {
        prop: p.prop,
        propDark: '#2f2740',
        metal: '#8d8f9c',
        gold: p.seatTrim,
        bottle: '#1d4527',
        olive: '#6f8f3a',
      }))
    }
    return fuse(parts)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey, p.tableTop, p.tableEdge, p.tableBody, p.seat, p.floorInner, p.prop, p.seatTrim, radius])

  const glow = useMemo(() => {
    const parts = []
    // Liseré doré au bord de table : c'est le détail « cher » du décor.
    parts.push(tint(
      at(new THREE.TorusGeometry(TABLE_R + 0.06, 0.035, 6, SEG).rotateX(Math.PI / 2), 0, TABLE_TOP - 0.06, 0),
      p.seatTrim,
    ))
    if (!compact) {
      // Rampe LED au pied de la banquette : elle décolle le mobilier du sol.
      parts.push(tint(
        at(new THREE.TorusGeometry(radius + 1.9, 0.06, 6, SEG).rotateX(Math.PI / 2), 0, FLOOR_Y + 0.14, 0),
        '#7c3aed',
      ))
      // Filet doré sur le dossier.
      parts.push(tint(
        at(new THREE.TorusGeometry(radius + 1.78, 0.035, 6, SEG).rotateX(Math.PI / 2), 0, FLOOR_Y + 1.98, 0),
        p.seatTrim,
      ))
    }
    return fuse(parts)
  }, [compact, p.seatTrim, radius])

  return (
    <>
      <SolidDecor solid={solid} glow={glow} lite={lite} metalness={0.2} roughness={0.58} />
      {/* Dessus laqué réfléchissant : le seul effet coûteux du thème. */}
      {!lite && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_TOP, 0]} receiveShadow raycast={() => null}>
          <circleGeometry args={[TABLE_R, SEG]} />
          <MeshReflectorMaterial
            resolution={512}
            blur={[200, 80]}
            mixBlur={1}
            mixStrength={3.2}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color={p.tableTop}
            metalness={0.35}
            roughness={0.92}
            mirror={0.12}
          />
        </mesh>
      )}
      {/* Sous la table : un renfoncement sombre, sinon le piètement paraît posé
          sur un aplat. Une seule face, jamais vue de dessus. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, TABLE_BOTTOM - 0.02, 0]} raycast={() => null}>
        <circleGeometry args={[TABLE_EDGE - 0.6, 24]} />
        <meshBasicMaterial color="#05030a" fog={false} />
      </mesh>
    </>
  )
}
