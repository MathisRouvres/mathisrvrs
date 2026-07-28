import { playerColor } from './board3d/playerColors'
import { useCountUp } from '../game/useCountUp'

function PlayerChip({ player, index, active, reducedMotion, registerChip }) {
  const cash = useCountUp(player.cash, reducedMotion)
  const color = playerColor(index)
  return (
    <div
      ref={(el) => registerChip(player.id, el)}
      className={`mv-pbar__chip mv-surface-2 ${active ? 'is-active' : ''} ${player.eliminated ? 'is-out' : ''}`}
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
