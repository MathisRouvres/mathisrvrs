import { useState } from 'react'
import { advanceDeck, createDeck, currentCard } from '../engine'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { buzz, useCountdown } from './useCountdown'

const DURATIONS = [30, 60, 90]

/** Ni oui ni non : tenir le chrono sans jamais dire « oui » ni « non ». */
export default function YesNo({ game, level }) {
  const questions = game.cards[level]
  const [duration, setDuration] = useState(60)
  const [phase, setPhase] = useState('ready')
  const [deck, setDeck] = useState(() => createDeck(questions.length))
  const [survived, setSurvived] = useState(0)
  // Durée figée au lancement : le réglage peut changer entre deux manches.
  const [roundDuration, setRoundDuration] = useState(duration)

  const timer = useCountdown(() => {
    buzz(600)
    setPhase('won')
  })

  const question = questions[currentCard(deck) ?? 0]

  function start() {
    setDeck((d) => advanceDeck(d))
    setRoundDuration(duration)
    setPhase('play')
    timer.start(duration)
  }

  function lose() {
    setSurvived(Math.max(0, roundDuration - timer.remaining))
    timer.stop()
    buzz(200)
    setPhase('lost')
  }

  if (phase === 'ready') {
    return (
      <div className="flex flex-col gap-4">
        <div className={`rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl`}>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Sur la sellette</p>
          <p className="mt-2 text-white/90">
            Un joueur répond aux questions lues par les autres, sans jamais dire « oui » ni « non », ni hocher la tête.
          </p>
        </div>
        <div role="radiogroup" aria-label="Durée" className="grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={duration === d}
              onClick={() => setDuration(d)}
              className={`min-h-12 rounded-2xl border font-semibold transition ${
                duration === d
                  ? 'border-transparent bg-[var(--accent)] text-white dark:text-[#070b14]'
                  : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]'
              }`}
            >
              {d} s
            </button>
          ))}
        </div>
        <button type="button" className={`${btnPrimary} w-full`} onClick={start}>
          C’est parti
        </button>
      </div>
    )
  }

  if (phase === 'play') {
    return (
      <div className="flex flex-col gap-4">
        <p
          className={`self-center rounded-full px-4 py-1 font-display text-2xl tabular-nums ${
            timer.remaining <= 10 ? 'bg-rose-500 text-white' : 'bg-[var(--bg-elevated)]'
          }`}
        >
          {timer.remaining} s
        </p>
        <div
          key={`${deck.position}-${question}`}
          aria-live="polite"
          className={`flex min-h-56 flex-col justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl ${cardEnter}`}
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Demande-lui</p>
          <p className="mt-3 font-display text-2xl font-bold leading-snug sm:text-3xl">{question}</p>
        </div>
        <button
          type="button"
          className={`${btnPrimary} min-h-16 w-full text-lg`}
          onClick={() => setDeck((d) => advanceDeck(d))}
        >
          Question suivante
        </button>
        <button
          type="button"
          className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-rose-500 px-5 font-semibold text-white shadow-lg transition active:scale-[0.98]"
          onClick={lose}
        >
          Il ou elle a dit oui ou non !
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`flex min-h-56 flex-col items-center justify-center rounded-3xl p-6 text-center text-white shadow-xl ${cardEnter} ${
          phase === 'won' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}
      >
        <p className="text-5xl" aria-hidden="true">
          {phase === 'won' ? '🏆' : '💥'}
        </p>
        <p className="mt-3 font-display text-3xl font-bold">{phase === 'won' ? 'Tenu jusqu’au bout !' : 'Perdu !'}</p>
        {phase === 'lost' && (
          <p className="mt-2 text-white/90">
            Tenu {survived} seconde{survived > 1 ? 's' : ''}.
          </p>
        )}
      </div>
      <button type="button" className={`${btnPrimary} w-full`} onClick={start}>
        Joueur suivant
      </button>
      <button type="button" className={btnGhost} onClick={() => setPhase('ready')}>
        Changer la durée
      </button>
    </div>
  )
}
