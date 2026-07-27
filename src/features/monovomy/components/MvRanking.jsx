import { useEffect } from 'react'
import { MonovomyButton } from '../MonovomyShell'
import { sound } from '../game/sound'
import { haptics } from '../game/haptics'
import { useReducedMotion } from '../game/useReducedMotion'

const CONFETTI = ['#f5b21a', '#ec1e79', '#22c1c3', '#7c3aed', '#22c55e']

export default function MvRanking({ results, onReplay }) {
  const winner = results[0]
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    sound.play('win')
    haptics.vibrate('win')
  }, [])

  return (
    <div className="mv-ranking">
      {winner && !reducedMotion && (
        <div className="mv-confetti" aria-hidden="true">
          {Array.from({ length: 40 }, (_, k) => (
            <i
              key={k}
              className="mv-confetti__p"
              style={{
                left: `${(k * 2.5) % 100}%`,
                background: CONFETTI[k % CONFETTI.length],
                animationDelay: `${(k % 10) * 0.12}s`,
                animationDuration: `${2.4 + (k % 5) * 0.35}s`,
              }}
            />
          ))}
        </div>
      )}
      <section className="mv-hero">
        <p className="mv-eyebrow">Partie terminée</p>
        <h1 className="mv-hero__title">🏆 {winner ? winner.name : '—'}</h1>
        <p className="mv-hero__sub">{winner ? 'Roi de MonoVomy' : 'Aucun joueur'}</p>
      </section>

      <ol className="mv-rank">
        {results.map((entry, i) => (
          <li key={entry.playerId} className={`mv-rank__row ${i === 0 ? 'is-first' : ''}`}>
            <span className="mv-rank__pos">{i + 1}</span>
            <span className="mv-rank__name">{entry.name}</span>
            <span className="mv-rank__net">
              {entry.netWorth}€ <small>({entry.properties} propriété(s){entry.eliminated ? ' · éliminé' : ''})</small>
            </span>
          </li>
        ))}
      </ol>

      <div className="mv-actions">
        <MonovomyButton onClick={onReplay}>Rejouer</MonovomyButton>
      </div>
    </div>
  )
}
