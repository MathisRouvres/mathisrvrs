import { playerColor } from './board3d/playerColors'
import { useCountUp } from '../game/useCountUp'

function PlayerChip({ player, index, active, reducedMotion, registerChip, money = null }) {
  const cash = useCountUp(player.cash, reducedMotion)
  const color = playerColor(index)
  const flow = money === 'pay' ? 'is-paying' : money === 'cash' ? 'is-cashing' : ''
  return (
    <div
      ref={(el) => registerChip(player.id, el)}
      className={`mv-pbar__chip mv-surface-2 ${active ? 'is-active' : ''} ${player.eliminated ? 'is-out' : ''} ${flow}`}
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

/**
 * Bandeau joueurs : avatars ronds, halo sur l'actif, argent animé.
 *
 * `moneyFx` ({ playerId: delta }) allume les pastilles concernées par le dernier
 * paiement : on voit QUI paie QUI, pas seulement un solde qui change.
 */
export default function MvPlayerBar({
  players,
  currentIndex,
  reducedMotion = false,
  registerChip,
  moneyFx = null,
}) {
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
          money={moneyFx?.[p.id] > 0 ? 'cash' : moneyFx?.[p.id] < 0 ? 'pay' : null}
        />
      ))}
    </div>
  )
}
