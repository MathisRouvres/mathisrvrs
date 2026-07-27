import { useEffect, useRef, useState } from 'react'
import { playerColor } from './board3d/playerColors'

/** Compteur animé (tween) — respecte reduced-motion (affiche direct). */
function useCountUp(value, reducedMotion, ms = 500) {
  const [disp, setDisp] = useState(value)
  const fromRef = useRef(value)
  useEffect(() => {
    if (reducedMotion) return undefined
    const from = fromRef.current
    const to = value
    if (from === to) return undefined
    let raf = 0
    const start = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - start) / ms)
      setDisp(Math.round(from + (to - from) * k))
      if (k < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reducedMotion, ms])
  return reducedMotion ? value : disp
}

function PlayerChip({ player, index, active, reducedMotion, registerChip }) {
  const cash = useCountUp(player.cash, reducedMotion)
  const color = playerColor(index)
  return (
    <div
      ref={(el) => registerChip(player.id, el)}
      className={`mv-pbar__chip ${active ? 'is-active' : ''} ${player.eliminated ? 'is-out' : ''}`}
      style={{ '--pc': color }}
    >
      <span className="mv-pbar__avatar">{player.avatar}</span>
      <span className="mv-pbar__meta">
        <span className="mv-pbar__name">{player.name}{player.inJail ? ' 🔒' : ''}</span>
        <span className="mv-pbar__cash">{cash}€</span>
      </span>
    </div>
  )
}

/** Bandeau joueurs : avatars ronds, halo sur l'actif, argent animé (Phase 12 polish). */
export default function MvPlayerBar({ players, currentIndex, reducedMotion = false, registerChip }) {
  return (
    <div className="mv-pbar">
      {players.map((p, i) => (
        <PlayerChip
          key={p.id}
          player={p}
          index={i}
          active={i === currentIndex}
          reducedMotion={reducedMotion}
          registerChip={registerChip}
        />
      ))}
    </div>
  )
}
