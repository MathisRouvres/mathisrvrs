import { useEffect, useRef, useState } from 'react'
import { soireeBoard } from '../content'
import { cellFor, cellCenter } from './board/boardLayout'
import { useZoomPan } from './board/useZoomPan'
import MvCaseDetail from './MvCaseDetail'

const GROUP_COLOR = {
  brun: '#a0642e', cyan: '#22c1c3', rose: '#ec4899', orange: '#f97316',
  rouge: '#ef4444', jaune: '#f5b21a', vert: '#22c55e', bleu: '#3b82f6',
}
const KIND_ICON = {
  start: '🏁', action: '❓', tax: '💸', jail: '🔒', gojail: '🚨', parking: '🍹', station: '🚕', utility: '🚰',
}
const PAWN_COLORS = ['#7c3aed', '#ec1e79', '#22c1c3', '#f5b21a', '#f97316', '#22c55e', '#3b82f6', '#e11d48']

function sideFor(index) {
  if (index % 10 === 0) return null
  if (index < 10) return 'top'
  if (index < 20) return 'right'
  if (index < 30) return 'bottom'
  return 'left'
}

function Pawn({ targetPos, color, label, isActive, seatOffset }) {
  const [pos, setPos] = useState(targetPos)
  const posRef = useRef(targetPos)

  useEffect(() => {
    if (targetPos === posRef.current) return undefined
    const timers = []
    const step = () => {
      const nextPos = (posRef.current + 1) % 40
      posRef.current = nextPos
      setPos(nextPos)
      if (nextPos !== targetPos) timers.push(setTimeout(step, 170))
    }
    timers.push(setTimeout(step, 100))
    return () => timers.forEach(clearTimeout)
  }, [targetPos])

  const center = cellCenter(pos)
  const offX = (seatOffset % 2) * 10 - 5
  const offY = Math.floor(seatOffset / 2) * 10 - 5

  return (
    <div
      className={`mv-pawn ${isActive ? 'is-active' : ''}`}
      style={{ left: `calc(${center.x}% + ${offX}px)`, top: `calc(${center.y}% + ${offY}px)` }}
    >
      <span className="mv-pawn__pin" style={{ background: color }}>
        <i>{label}</i>
      </span>
    </div>
  )
}

export default function MvBoard({ state, active }) {
  const spaces = soireeBoard.spaces
  const { transform, handlers, reset, zoomIn, zoomOut } = useZoomPan()
  const [selected, setSelected] = useState(null)

  const activePlayer = state.players[state.currentPlayerIndex]
  const activePos = activePlayer ? activePlayer.position : -1

  const ownerName = (spaceId) => {
    const id = state.ownership[spaceId]
    if (!id) return null
    const owner = state.players.find((p) => p.id === id)
    return owner ? owner.name : null
  }

  const selectedSpace = selected != null ? spaces[selected] : null

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
        <div className="mv-board">
          <div className="mv-board__grid">
            {spaces.map((space, i) => {
              const cell = cellFor(i)
              const side = sideFor(i)
              const color = space.kind === 'property' ? GROUP_COLOR[space.group] : null
              const price = 'price' in space ? space.price : null
              const owned = Boolean(state.ownership[space.id])
              const corner = i % 10 === 0
              return (
                <button
                  key={space.id}
                  type="button"
                  className={[
                    'mv-case',
                    `mv-case--${space.kind}`,
                    corner ? 'mv-case--corner' : '',
                    side ? `mv-s-${side}` : '',
                    i === activePos ? 'mv-case--cur' : '',
                  ].join(' ').trim()}
                  style={{ gridRow: cell.row, gridColumn: cell.col }}
                  onClick={() => setSelected(i)}
                >
                  {color && <span className={`mv-case__band mv-band--${side}`} style={{ background: color }} />}
                  {!color && <span className="mv-case__icon">{KIND_ICON[space.kind] ?? ''}</span>}
                  <span className="mv-case__name">{space.name}</span>
                  {price != null && <span className="mv-case__price">{price}</span>}
                  {owned && <span className="mv-case__owned" />}
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
