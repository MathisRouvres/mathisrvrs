import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import SolidDecor from '../components/SolidDecor'
import { at, ball, box, cyl, disc, fuse, polar, tableParts, tint } from '../geoKit'
import { FLOOR_Y, PROP_R, TABLE_EDGE, TABLE_R, TABLE_TOP } from '../stage'

/**
 * Appartement en soirée.
 *
 * Salon contemporain de nuit : le plateau est posé sur une table basse, un tapis
 * sombre sous les pieds, un canapé et des fauteuils autour, et une baie vitrée
 * sur la ville au fond. Stylisé, jamais photoréaliste — le décor doit rester
 * moins contrasté que les cases.
 *
 * C'est le thème CALME : pas de faisceaux (`spotlightEnabled: false`), ambiante
 * remontée, contre-jour et vignettage adoucis. Il tiendra les modes Facile,
 * Warm-up et Apéro tranquille.
 */

const SEG = 40
const WINDOW_Z = -33
const WINDOW_W = 46
const WINDOW_H = 18

/** Ville nocturne : bandes de fenêtres allumées, générées une fois. */
function createCityTexture() {
  const cv = document.createElement('canvas')
  cv.width = 512; cv.height = 256
  const ctx = cv.getContext('2d')
  const sky = ctx.createLinearGradient(0, 0, 0, 256)
  sky.addColorStop(0, '#120e22')
  sky.addColorStop(0.55, '#1b1533')
  sky.addColorStop(1, '#241a3c')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 512, 256)

  // Générateur déterministe : la ville doit être la même à chaque montage.
  let s = 0x2f6f >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }

  let x = -20
  while (x < 512) {
    const w = 22 + rnd() * 46
    const h = 60 + rnd() * 150
    const y = 256 - h
    ctx.fillStyle = `rgba(9, 6, 18, ${0.72 + rnd() * 0.22})`
    ctx.fillRect(x, y, w, h)
    // Fenêtres allumées : une sur trois environ, jamais alignées parfaitement.
    for (let wy = y + 8; wy < 250; wy += 12) {
      for (let wx = x + 5; wx < x + w - 6; wx += 10) {
        if (rnd() > 0.36) continue
        const warm = rnd()
        ctx.fillStyle = warm > 0.75
          ? 'rgba(236, 30, 121, 0.75)'
          : warm > 0.5
            ? 'rgba(124, 58, 237, 0.7)'
            : 'rgba(245, 205, 140, 0.72)'
        ctx.fillRect(wx, wy, 4, 6)
      }
    }
    x += w + 4 + rnd() * 14
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Fauteuil / place de canapé : assise, dossier, deux accoudoirs. */
function armchair(angle, radius, colors, lite) {
  const [x, z] = polar(angle, radius)
  const y = FLOOR_Y + 0.34
  const parts = [
    box(2.1, 0.55, 1.9, colors.seat, x, y, z, angle),
    box(2.1, 1.35, 0.42, colors.seat, ...offset(angle, radius + 0.86, y + 0.85), angle),
  ]
  if (lite) return parts
  parts.push(box(0.36, 0.7, 1.9, colors.arm, ...offset(angle, radius, y + 0.5, 0.92), angle))
  parts.push(box(0.36, 0.7, 1.9, colors.arm, ...offset(angle, radius, y + 0.5, -0.92), angle))
  // Coussin : la place se lit même sans personne dessus.
  parts.push(box(1.2, 0.26, 1.2, colors.cushion, x, y + 0.4, z, angle))
  return parts
}

/** Position décalée en repère local d'une place (avant/arrière, gauche/droite). */
function offset(angle, radius, y, lateral = 0) {
  const [x, z] = polar(angle, radius)
  return [x + Math.cos(angle) * lateral, y, z - Math.sin(angle) * lateral]
}

/** Enceinte, bol de snacks, bouteilles — trois objets, pas quinze. */
function livingProps(seats, colors) {
  const step = seats.length ? (Math.PI * 2) / seats.length : 0
  const gaps = seats.map((s) => s.angle + step / 2)
  const parts = []

  const a0 = gaps[0] ?? 0.9
  const [ex, ez] = polar(a0, PROP_R)
  // Enceinte bluetooth : cylindre couché + grille + bandeau.
  parts.push(cyl(0.42, 0.42, 1.35, 18, colors.speaker, ex, TABLE_TOP + 0.42, ez))
  parts.push(tint(
    at(new THREE.TorusGeometry(0.43, 0.05, 6, 18), ex, TABLE_TOP + 0.42, ez),
    colors.speakerTrim,
  ))

  const a1 = gaps[1] ?? 2.8
  const [bx, bz] = polar(a1, PROP_R)
  // Bol de chips.
  parts.push(ball(0.68, 16, 8, colors.bowl, bx, TABLE_TOP + 0.68, bz, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2))
  parts.push(ball(0.53, 12, 6, colors.snack, bx, TABLE_TOP + 0.44, bz, 0, Math.PI * 2, 0, Math.PI / 2.4))

  const a2 = gaps[2] ?? 4.7
  const [cx, cz] = polar(a2, PROP_R)
  // Deux canettes et un verre.
  parts.push(cyl(0.2, 0.2, 0.5, 14, colors.can, cx, TABLE_TOP + 0.25, cz))
  parts.push(cyl(0.2, 0.2, 0.5, 14, colors.can2, cx + 0.55, TABLE_TOP + 0.25, cz - 0.3))
  parts.push(cyl(0.24, 0.19, 0.52, 14, colors.glass, cx - 0.6, TABLE_TOP + 0.26, cz + 0.35))
  return parts
}

export default function ApartmentPartyEnvironment({ preset, seats, lite = false, compact = false }) {
  const p = preset.palette
  const radius = preset.playerLayout.furnitureRadius
  const shapeKey = `${seats.length}:${lite}:${compact}`

  const cityTex = useMemo(() => createCityTexture(), [])
  useEffect(() => () => cityTex.dispose(), [cityTex])

  const solid = useMemo(() => {
    const parts = tableParts({
      top: TABLE_TOP,
      bottom: FLOOR_Y,
      radius: TABLE_R,
      edgeRadius: TABLE_EDGE,
      withTop: true,
      colors: { top: p.tableTop, edge: p.tableEdge, body: p.tableBody },
    })
    // Tapis : plus clair que le sol, il délimite le coin salon.
    parts.push(disc(radius + 5, SEG, p.floorInner, FLOOR_Y + 0.006))
    parts.push(tint(
      at(new THREE.TorusGeometry(radius + 5, 0.07, 6, SEG).rotateX(Math.PI / 2), 0, FLOOR_Y + 0.05, 0),
      '#3a3247',
    ))
    if (!compact) {
      for (const seat of seats) {
        parts.push(...armchair(seat.angle, radius, {
          seat: p.seat,
          arm: '#232842',
          cushion: '#39406a',
        }, lite))
      }
    }
    if (!compact) {
      // Lampadaire d'angle : pied fin, matière. Son abat-jour, lui, est lumineux
      // et vit dans la couche `glow`.
      const [lx, lz] = polar(Math.PI * 0.72, radius + 4.6)
      parts.push(cyl(0.07, 0.07, 5.2, 8, '#4a4459', lx, FLOOR_Y + 2.6, lz))
      parts.push(cyl(0.34, 0.34, 0.08, 12, '#4a4459', lx, FLOOR_Y + 0.05, lz))
    }
    if (!lite) {
      parts.push(...livingProps(seats, {
        speaker: '#2b2b38',
        speakerTrim: p.propTrim,
        bowl: '#37313f',
        snack: '#d9a03a',
        can: '#b2452f',
        can2: '#2f6f4a',
        glass: p.prop,
      }))
    }
    return fuse(parts)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey, p.tableTop, p.tableEdge, p.tableBody, p.seat, p.floorInner, p.prop, p.propTrim, radius])

  const glow = useMemo(() => {
    const parts = []
    // Bandeau LED sous la table basse : l'éclairage d'ambiance du salon.
    parts.push(tint(
      at(new THREE.TorusGeometry(TABLE_R - 0.35, 0.07, 6, SEG).rotateX(Math.PI / 2), 0, TABLE_TOP - 0.72, 0),
      '#8f6dff',
    ))
    if (!compact) {
      // Abat-jour chaud du lampadaire : la seule source visible du salon.
      const [lx, lz] = polar(Math.PI * 0.72, radius + 4.6)
      parts.push(cyl(0.9, 0.62, 1.1, 14, '#ffd9a0', lx, FLOOR_Y + 5.5, lz))
    }
    return fuse(parts)
  }, [compact, radius])

  return (
    <>
      <SolidDecor solid={solid} glow={glow} lite={lite} metalness={0.12} roughness={0.72} />
      {/* Baie vitrée : un seul plan émissif très loin. C'est lui qui donne
          l'échelle de la pièce — sans lui, le salon n'a pas de dehors. */}
      <mesh position={[0, FLOOR_Y + WINDOW_H / 2 + 0.6, WINDOW_Z]} raycast={() => null}>
        <planeGeometry args={[WINDOW_W, WINDOW_H]} />
        <meshBasicMaterial map={cityTex} toneMapped={false} fog={false} transparent opacity={0.82} />
      </mesh>
      {/* Montants de la baie : ils cadrent la ville et la font lire comme une
          fenêtre, pas comme un fond d'écran. */}
      <mesh position={[0, FLOOR_Y + WINDOW_H / 2 + 0.6, WINDOW_Z + 0.1]} raycast={() => null}>
        <planeGeometry args={[WINDOW_W, 0.34]} />
        <meshBasicMaterial color="#0b0814" fog={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * WINDOW_W * 0.22, FLOOR_Y + WINDOW_H / 2 + 0.6, WINDOW_Z + 0.1]} raycast={() => null}>
          <planeGeometry args={[0.3, WINDOW_H]} />
          <meshBasicMaterial color="#0b0814" fog={false} />
        </mesh>
      ))}
    </>
  )
}
