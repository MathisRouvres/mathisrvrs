import { useState } from 'react'
import { drawLetter, pickSome } from '../engine'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { buzz, useCountdown } from './useCountdown'

const DURATIONS = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 0, label: 'Sans chrono' },
]
const COUNTS = [5, 6, 8, 10]

/** Petit Bac : une lettre, des catégories, un chrono. Les réponses se notent sur papier. */
export default function PetitBac({ game, level }) {
  const categories = game.cards[level]
  const [count, setCount] = useState(6)
  const [duration, setDuration] = useState(120)
  const [round, setRound] = useState(null)
  const [phase, setPhase] = useState('setup')

  const timer = useCountdown(() => {
    buzz(500)
    setPhase('done')
  })

  function newRound() {
    setRound({ letter: drawLetter(Math.random, round?.letter), list: pickSome(categories, count) })
    setPhase('play')
    if (duration > 0) timer.start(duration)
  }

  function stopRound() {
    timer.stop()
    buzz(200)
    setPhase('done')
  }

  const chooser = (label, options, value, onChange) => (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-11 rounded-2xl border px-4 text-sm font-semibold transition ${
              value === o.value
                ? 'border-transparent bg-[var(--accent)] text-white dark:text-[#070b14]'
                : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )

  if (phase === 'setup' || !round) {
    return (
      <div className="flex flex-col gap-4">
        <section className="glass-card flex flex-col gap-4 rounded-3xl p-5">
          {chooser(
            'Catégories par manche',
            COUNTS.map((c) => ({ value: c, label: String(c) })),
            count,
            setCount,
          )}
          {chooser('Durée', DURATIONS, duration, setDuration)}
        </section>
        <p className="text-sm text-[var(--text-secondary)]">
          Chacun prépare une feuille et un stylo. Mot unique : 2 points, mot trouvé par plusieurs : 1 point.
        </p>
        <button type="button" className={`${btnPrimary} w-full`} onClick={newRound}>
          Tirer une lettre
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        key={`${round.letter}-${round.list.join()}`}
        className={`flex flex-col items-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl ${cardEnter}`}
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Lettre</p>
        <p className="font-display text-8xl font-bold leading-none">{round.letter}</p>
        {phase === 'play' && duration > 0 && (
          <p
            className={`mt-3 rounded-full px-4 py-1 font-display text-xl tabular-nums ${
              timer.remaining <= 10 ? 'bg-rose-600' : 'bg-black/20'
            }`}
          >
            {timer.remaining} s
          </p>
        )}
        {phase === 'done' && <p className="mt-3 rounded-full bg-black/25 px-4 py-1 font-semibold">Stylos en l’air !</p>}
      </div>

      <ol className="glass-card list-decimal space-y-2 rounded-3xl py-4 pl-10 pr-4">
        {round.list.map((c) => (
          <li key={c} className="font-semibold">
            {c}
          </li>
        ))}
      </ol>

      {phase === 'play' ? (
        <button type="button" className={`${btnPrimary} w-full`} onClick={stopRound}>
          STOP&nbsp;!
        </button>
      ) : (
        <>
          <button type="button" className={`${btnPrimary} w-full`} onClick={newRound}>
            Nouvelle manche
          </button>
          <button type="button" className={btnGhost} onClick={() => setPhase('setup')}>
            Réglages
          </button>
        </>
      )}
    </div>
  )
}
