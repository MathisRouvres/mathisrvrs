import { useEffect, useMemo, useRef, useState } from 'react'
import { boardForState } from '../engine'
import { groupColor } from '../content'
import { useZoomPan } from './board/useZoomPan'
import MvCaseDetail from './MvCaseDetail'

/**
 * Plateau 2D — rendu à plat, piloté par `visual.positions` de la map active.
 * Aucune grille n'est supposée : les cases sont posées en pourcentage dans un
 * repère dont le ratio vient de la map (carré 1:1, ou 2:1 pour le plateau en 8).
 */
const KIND_ICON = {
  start: '🏁', action: '❓', tax: '💸', jail: '🔒', gojail: '🚨', parking: '🍹', market: '🕶️', station: '🚕', utility: '🚰',
}
const PAWN_COLORS = ['#7c3aed', '#ec1e79', '#22c1c3', '#f5b21a', '#f97316', '#22c55e', '#3b82f6', '#e11d48']

/** Positions normalisées indexées par ordre du chemin logique. */
function layoutOf(map) {
  const byId = new Map(map.visual.positions.map((p) => [p.tileId, p]))
  const height = 100 / (map.visual.aspectRatio || 1)
  return {
    height,
    aspectRatio: map.visual.aspectRatio || 1,
    // Coordonnées en pourcentage du conteneur (x sur 100, y sur la hauteur du repère).
    cells: map.path.map((tileId) => {
      const p = byId.get(tileId) ?? { x: 50, y: height / 2, rotation: 0, layer: 1 }
      return { tileId, x: p.x, y: (p.y / height) * 100, rotation: p.rotation, layer: p.layer ?? 1 }
    }),
  }
}

function Pawn({ targetPos, cells, color, label, isActive, seatOffset }) {
  const [pos, setPos] = useState(targetPos)
  const posRef = useRef(targetPos)
  const size = cells.length

  useEffect(() => {
    if (targetPos === posRef.current) return undefined
    const timers = []
    const step = () => {
      const nextPos = (posRef.current + 1) % size
      posRef.current = nextPos
      setPos(nextPos)
      if (nextPos !== targetPos) timers.push(setTimeout(step, 170))
    }
    timers.push(setTimeout(step, 100))
    return () => timers.forEach(clearTimeout)
  }, [targetPos, size])

  const cell = cells[pos] ?? cells[0]
  const offX = (seatOffset % 2) * 10 - 5
  const offY = Math.floor(seatOffset / 2) * 10 - 5

  return (
    <div
      className={`mv-pawn ${isActive ? 'is-active' : ''}`}
      style={{ left: `calc(${cell.x}% + ${offX}px)`, top: `calc(${cell.y}% + ${offY}px)`, zIndex: 10 + cell.layer }}
    >
      <span className="mv-pawn__pin" style={{ background: color }}>
        <i>{label}</i>
      </span>
    </div>
  )
}

export default function MvBoard({ state, active }) {
  const map = useMemo(() => boardForState(state), [state])
  const layout = useMemo(() => layoutOf(map), [map])
  const { transform, handlers, reset, zoomIn, zoomOut } = useZoomPan()
  const [selected, setSelected] = useState(null)

  const activePlayer = state.players[state.currentPlayerIndex]
  const activePos = activePlayer ? activePlayer.position : -1
  // Une case occupe le pas réel du plateau : les 56 cases du 8 ne sont pas
  // dessinées à la taille des 40 cases du carré.
  const cellSize = 100 / (map.visual.kind === 'grid_square' ? 11 : 15)

  const ownerName = (spaceId) => {
    const id = state.ownership[spaceId]
    if (!id) return null
    const owner = state.players.find((p) => p.id === id)
    return owner ? owner.name : null
  }

  const selectedSpace = selected != null ? map.spaces[selected] ?? null : null

  return (
    <div className="mv-boardwrap">
      <div className="mv-zoomctrl">
        <button type="button" onClick={zoomOut} aria-label="Dézoomer">−</button>
        <button type="button" onClick={reset} aria-label="Recentrer">⤢</button>
        <button type="button" onClick={zoomIn} aria-label="Zoomer">+</button>
      </div>

      <div
        className="mv-boardzoom"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
        {...handlers}
      >
        <div className="mv-board" style={{ aspectRatio: String(layout.aspectRatio) }}>
          <div className="mv-board__free">
            {map.spaces.map((space, i) => {
              const cell = layout.cells[i]
              const color = space.kind === 'property' ? groupColor(space.group) : null
              const price = 'price' in space ? space.price : null
              const owned = Boolean(state.ownership[space.id])
              return (
                <button
                  key={space.id}
                  type="button"
                  className={[
                    'mv-case',
                    'mv-case--free',
                    `mv-case--${space.kind}`,
                    i === activePos ? 'mv-case--cur' : '',
                  ].join(' ').trim()}
                  style={{
                    left: `${cell.x}%`,
                    top: `${cell.y}%`,
                    width: `${cellSize}%`,
                    zIndex: cell.layer,
                    // La case suit la trajectoire ; son contenu est contre-pivoté
                    // pour rester lisible.
                    '--mv-rot': `${map.visual.tileOrientation === 'path' ? cell.rotation : 0}deg`,
                  }}
                  onClick={() => setSelected(i)}
                >
                  <span className="mv-case__inner">
                    {color && <span className="mv-case__band" style={{ background: color }} />}
                    {!color && <span className="mv-case__icon">{KIND_ICON[space.kind] ?? ''}</span>}
                    <span className="mv-case__name">{space.name}</span>
                    {price != null && <span className="mv-case__price">{price}</span>}
                    {owned && <span className="mv-case__owned" />}
                  </span>
                </button>
              )
            })}

            <div className="mv-board__center">
              <div className="mv-board__logo">
                <span className="mv-mono">MONO</span>
                <span className="mv-vomy">VOMY</span>
              </div>
              <p className="mv-board__turn">Tour {state.turn}</p>
              {active && <p className="mv-board__active">🎲 {active.name}</p>}
            </div>
          </div>

          <div className="mv-pawns">
            {state.players.map((p, i) =>
              p.eliminated ? null : (
                <Pawn
                  key={p.id}
                  targetPos={p.position}
                  cells={layout.cells}
                  color={PAWN_COLORS[i % PAWN_COLORS.length]}
                  label={p.avatar}
                  isActive={i === state.currentPlayerIndex}
                  seatOffset={i}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {selectedSpace && (
        <MvCaseDetail space={selectedSpace} ownerName={ownerName(selectedSpace.id)} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
