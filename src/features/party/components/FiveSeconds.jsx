import { advanceDeck, createDeck, currentCard } from '../engine'
import { isDeck } from '../session'
import { oneOf, useSessionState, when } from '../useSessionState'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { buzz, chime, useCountdown } from './useCountdown'

const SECONDS = 5

/** Le jeu des 5 secondes : citer 3 éléments avant la fin du chrono. */
export default function FiveSeconds({ game, level }) {
  const cards = game.cards[level]
  const [deck, setDeck] = useSessionState('deck', () => createDeck(cards.length), when((v) => isDeck(v, cards.length)))
  // Chrono interrompu par un rechargement : la carte est considérée comme jouée.
  const [phase, setPhase] = useSessionState('phase', 'ready', oneOf(['ready', 'done'], { play: 'done' }))
  const [tally, setTally] = useSessionState(
    'tally',
    { won: 0, lost: 0 },
    when((v) => Number.isInteger(v?.won) && Number.isInteger(v?.lost)),
  )

  const timer = useCountdown(
    () => {
      buzz(400)
      chime('end')
      setPhase('done')
    },
    { ticks: SECONDS },
  )

  const text = cards[currentCard(deck) ?? 0]

  function next(result) {
    if (result) setTally((t) => ({ ...t, [result]: t[result] + 1 }))
    setDeck((d) => advanceDeck(d))
    setPhase('ready')
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        key={`${deck.position}-${text}`}
        aria-live="polite"
        className={`relative flex min-h-72 flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl ${cardEnter}`}
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-white/75">{game.prefix}</p>
        <p className="mt-3 font-display text-3xl font-bold leading-snug">{text}</p>
        {phase === 'play' && (
          <p
            key={timer.remaining}
            aria-hidden="true"
            className={`absolute right-5 top-4 font-display text-6xl font-bold text-white/90 ${cardEnter}`}
          >
            {timer.remaining || SECONDS}
          </p>
        )}
        {phase === 'done' && (
          <p className="mt-4 self-start rounded-full bg-black/25 px-4 py-1 font-semibold">Temps écoulé !</p>
        )}
      </div>

      {phase === 'ready' && (
        <>
          <button
            type="button"
            className={`${btnPrimary} min-h-16 w-full text-lg`}
            onClick={() => {
              setPhase('play')
              timer.start(SECONDS)
            }}
          >
            Top, 5 secondes !
          </button>
          <button type="button" className={btnGhost} onClick={() => next(null)}>
            Passer cette carte
          </button>
        </>
      )}
      {phase === 'play' && (
        <button
          type="button"
          className={`${btnPrimary} min-h-16 w-full text-lg`}
          onClick={() => {
            timer.stop()
            setPhase('done')
          }}
        >
          Les 3 sont dits !
        </button>
      )}
      {phase === 'done' && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={`${btnGhost} min-h-16`} onClick={() => next('lost')}>
            Raté
          </button>
          <button
            type="button"
            className="inline-flex min-h-16 items-center justify-center rounded-2xl bg-emerald-500 px-5 text-base font-semibold text-white shadow-lg transition active:scale-[0.98]"
            onClick={() => next('won')}
          >
            Réussi
          </button>
        </div>
      )}
      <p className="text-center text-xs text-[var(--text-muted)]">
        Réussis : {tally.won} · Ratés : {tally.lost}
      </p>
    </div>
  )
}
