import { MIN_MIX_PLAYERS, buildMixCard } from '../mix'
import { useSessionState, when } from '../useSessionState'
import PlayersEditor from './PlayersEditor'
import { btnGhost, btnPrimary, cardEnter } from './buttons'

/** Mode Mix façon Picolo : toutes les cartes de la soirée, adressées aux joueurs. */
export default function MixGame({ game, level, players, onPlayersChange }) {
  const [playing, setPlaying] = useSessionState('playing', false)
  const [card, setCard] = useSessionState(
    'card',
    null,
    when((v) => typeof v?.label === 'string' && typeof v.text === 'string'),
  )
  const [count, setCount] = useSessionState('count', 0)
  const ready = players.length >= MIN_MIX_PLAYERS

  function next() {
    setCard(buildMixCard(level, players))
    setCount((c) => c + 1)
  }

  if (!playing || !ready || !card) {
    return (
      <div className="flex flex-col gap-4">
        <PlayersEditor players={players} onChange={onPlayersChange} min={MIN_MIX_PLAYERS} />
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={!ready}
          onClick={() => {
            next()
            setPlaying(true)
          }}
        >
          Lancer le mix
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        key={count}
        aria-live="polite"
        className={`flex min-h-80 flex-col justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl sm:p-8 ${cardEnter}`}
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-white/75">{card.label}</p>
        <p className="mt-3 font-display text-2xl font-bold leading-snug">{card.text}</p>
      </div>
      <button type="button" className={`${btnPrimary} w-full`} onClick={next}>
        Carte suivante
      </button>
      <button type="button" className={btnGhost} onClick={() => setPlaying(false)}>
        Modifier les joueurs
      </button>
      <p className="text-center text-xs text-[var(--text-muted)]">Carte {count}</p>
    </div>
  )
}
