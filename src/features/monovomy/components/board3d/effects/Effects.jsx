import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { soireeBoard } from '../../../content'
import { PLAYER_COLORS } from '../playerColors'
import { tileColor } from '../tileTexture'
import { INDEX_BY_ID, cellPos, groupIndicesOf } from '../boardCells'
import Shockwave from './Shockwave'
import Confetti from './Confetti'
import CashBurst from './CashBurst'
import LightColumns from './LightColumns'
import BankruptDrain from './BankruptDrain'
import ScreenVeil from './ScreenVeil'

// Au-delà, les effets les plus anciens sont abandonnés : une rafale de coups (fin
// de partie) ne doit pas empiler des dizaines de systèmes de particules.
const MAX_ACTIVE = 6

// Secousse caméra : amplitude et durée (montée d'intensité).
const SHAKE_DUR = 0.4
const SHAKE_AMP = 0.08

// Teinte du fondu qui remplace chaque effet en mouvement réduit.
const FADE_COLOR = {
  buy: '#7ce8b0', monopoly: '#ffd24a', rent: '#ffd24a',
  bankrupt: '#e11d48', intensity: '#ffffff',
}

/**
 * File d'effets ponctuels du plateau. Point d'entrée unique : la prop `fx`
 * ({ type, spaceId, playerId, id }). Chaque `id` inédit empile un effet, qui se
 * retire lui-même de la file à la fin de son animation (et libère sa géométrie).
 *
 * Mouvement réduit : aucun effet de particules ni secousse, seulement un fondu
 * d'opacité plein écran à la couleur de l'événement.
 */
export default function Effects({ fx, reducedMotion = false, players = [], ownership = {} }) {
  const [items, setItems] = useState([])
  const lastId = useRef(null)
  const shake = useRef({ t: 0, x: 0, y: 0, z: 0 })

  // Propriétaire de chaque case AVANT la mise à jour courante : à la faillite,
  // l'état a déjà été purgé, donc seule la photo précédente sait quoi vider.
  const prevOwnership = useRef(ownership)

  const colorOfPlayer = useCallback((playerId) => {
    const i = players.findIndex((p) => p.id === playerId)
    return i < 0 ? '#ffffff' : PLAYER_COLORS[i % PLAYER_COLORS.length]
  }, [players])

  const pawnPos = useCallback((playerId) => {
    const p = players.find((q) => q.id === playerId)
    return p ? cellPos(p.position) : [0, 0]
  }, [players])

  useEffect(() => {
    if (!fx || fx.id == null || fx.id === lastId.current) {
      prevOwnership.current = ownership
      return
    }
    lastId.current = fx.id
    const snapshot = prevOwnership.current
    prevOwnership.current = ownership
    setItems((list) => [...list, { ...fx, key: String(fx.id), snapshot }].slice(-MAX_ACTIVE))
    if (fx.type === 'intensity' && !reducedMotion) shake.current.t = SHAKE_DUR
  }, [fx, ownership, reducedMotion])

  const done = useCallback((key) => {
    setItems((list) => list.filter((e) => e.key !== key))
  }, [])

  // Secousse caméra : on annule l'offset AVANT qu'OrbitControls ne recalcule son
  // orbite (priorité −2, les contrôles de drei tournent à −1), on le réapplique
  // juste avant le rendu. Sans ça, l'offset serait absorbé par les contrôles.
  useFrame((s) => {
    const k = shake.current
    if (k.x || k.y || k.z) {
      s.camera.position.x -= k.x; s.camera.position.y -= k.y; s.camera.position.z -= k.z
      k.x = 0; k.y = 0; k.z = 0
    }
  }, -2)

  useFrame((s, dt) => {
    const k = shake.current
    if (k.t <= 0) return
    k.t = Math.max(0, k.t - dt)
    const decay = k.t / SHAKE_DUR
    const a = SHAKE_AMP * decay * decay
    k.x = (Math.random() * 2 - 1) * a
    k.y = (Math.random() * 2 - 1) * a
    k.z = (Math.random() * 2 - 1) * a
    s.camera.position.x += k.x; s.camera.position.y += k.y; s.camera.position.z += k.z
  })

  const rendered = useMemo(() => items.map((e) => {
    const key = e.key
    if (reducedMotion) {
      return <ScreenVeil key={key} color={FADE_COLOR[e.type] || '#ffffff'} peak={0.22} dur={0.5} onDone={() => done(key)} />
    }
    const idx = e.spaceId != null ? INDEX_BY_ID.get(e.spaceId) : null

    if (e.type === 'buy' && idx != null) {
      return <Shockwave key={key} position={cellPos(idx)} color={tileColor(soireeBoard.spaces[idx])} onDone={() => done(key)} />
    }

    if (e.type === 'monopoly' && idx != null) {
      const group = groupIndicesOf(e.spaceId)
      const color = tileColor(soireeBoard.spaces[idx])
      const positions = group.map(cellPos)
      const center = positions.reduce((acc, p) => [acc[0] + p[0] / positions.length, acc[1] + p[1] / positions.length], [0, 0])
      // Deux effets, une seule entrée de file : les confettis durent le plus
      // longtemps (2,5 s), c'est eux qui libèrent la place.
      return (
        <group key={key}>
          <LightColumns positions={positions} color={color} onDone={() => {}} />
          <Confetti origin={center} colors={[color, '#ffd24a', '#ffffff']} onDone={() => done(key)} />
        </group>
      )
    }

    if (e.type === 'rent' && idx != null) {
      return <CashBurst key={key} from={cellPos(idx)} to={pawnPos(e.playerId)} onDone={() => done(key)} />
    }

    if (e.type === 'bankrupt') {
      const owned = Object.entries(e.snapshot || {})
        .filter(([, owner]) => owner === e.playerId)
        .map(([spaceId]) => INDEX_BY_ID.get(spaceId))
        .filter((i) => i != null)
        .map(cellPos)
      return (
        <group key={key}>
          {owned.length > 0 && <BankruptDrain positions={owned} color={colorOfPlayer(e.playerId)} onDone={() => {}} />}
          {/* « Désaturation » approchée : voile gris qui lave les couleurs 0,6 s. */}
          <ScreenVeil color="#8d8aa0" peak={0.42} dur={0.6} rise={0.25} onDone={() => done(key)} />
        </group>
      )
    }

    if (e.type === 'intensity') {
      return <ScreenVeil key={key} color="#ffffff" peak={0.55} dur={0.28} rise={0.1} onDone={() => done(key)} />
    }

    return null
  }), [items, reducedMotion, done, pawnPos, colorOfPlayer])

  return <>{rendered}</>
}
