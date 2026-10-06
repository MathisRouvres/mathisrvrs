import { useState } from 'react'
import { advanceDeck, createDeck, currentCard } from '../engine'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { buzz, useCountdown } from './useCountdown'
import Scoreboard from './Scoreboard'
import { TEAMS } from './teams'

const DURATIONS = [30, 60, 90]

const INSTRUCTIONS = {
  headsUp: 'Un joueur pose le téléphone sur son front, écran vers son équipe. Les autres lui font deviner le mot sans le dire.',
  mimes: 'Le mimeur lit le mot et le fait deviner à son équipe uniquement par gestes, sans un bruit.',
  taboo: 'Le joueur fait deviner le mot à son équipe sans prononcer le mot ni les mots interdits. L’équipe adverse surveille !',
}

const RESULT_STYLE = {
  found: { label: 'Trouvé', className: 'text-emerald-500' },
  pass: { label: 'Passé', className: 'text-[var(--text-muted)]' },
  buzz: { label: 'Interdit', className: 'text-rose-500' },
}

/**
 * Jeux au chrono en deux équipes : Devine-tête, Mimes, Mot interdit.
 * Trouvé : +1, passé : 0, mot interdit prononcé : −1.
 */
export default function TimedGame({ game, level }) {
  const cards = game.cards[level]
  const isTaboo = game.variant === 'taboo'
  const [duration, setDuration] = useState(60)
  const [phase, setPhase] = useState('ready')
  const [team, setTeam] = useState(0)
  const [scores, setScores] = useState([0, 0])
  const [results, setResults] = useState([])
  const [deck, setDeck] = useState(() => createDeck(cards.length))

  const timer = useCountdown((restart) => {
    if (phase === 'countdown') {
      setPhase('play')
      restart(duration)
    } else if (phase === 'play') {
      buzz(400)
      setPhase('recap')
    }
  })

  const card = cards[currentCard(deck) ?? 0]
  const word = isTaboo ? card.word : card
  const points = results.reduce((sum, r) => sum + (r.result === 'found' ? 1 : r.result === 'buzz' ? -1 : 0), 0)

  function startRound() {
    setResults([])
    setPhase('countdown')
    timer.start(3)
  }

  function record(result) {
    setResults((r) => [...r, { word, result }])
    setDeck((d) => advanceDeck(d))
    if (result === 'found') buzz(40)
  }

  function validate() {
    setScores((s) => s.map((v, i) => (i === team ? v + points : v)))
    setTeam((t) => 1 - t)
    setPhase('ready')
  }

  const scoreboard = <Scoreboard scores={scores} active={team} />

  if (phase === 'ready') {
    return (
      <div className="flex flex-col gap-4">
        {scoreboard}
        <div className={`rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl`}>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/75">À vous de jouer</p>
          <p className="mt-1 font-display text-3xl font-bold">{TEAMS[team]}</p>
          <p className="mt-3 text-white/90">{INSTRUCTIONS[game.variant]}</p>
        </div>
        <div role="radiogroup" aria-label="Durée de la manche" className="grid grid-cols-3 gap-2">
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
        <button type="button" className={`${btnPrimary} w-full`} onClick={startRound}>
          Lancer le chrono
        </button>
        {(scores[0] !== 0 || scores[1] !== 0) && (
          <button type="button" className={btnGhost} onClick={() => setScores([0, 0])}>
            Remettre les scores à zéro
          </button>
        )}
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div
        aria-live="assertive"
        className={`flex min-h-96 flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${game.gradient} text-white shadow-xl`}
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-white/75">{TEAMS[team]}, prêts ?</p>
        <p key={timer.remaining} className={`font-display text-8xl font-bold ${cardEnter}`}>
          {timer.remaining || 3}
        </p>
      </div>
    )
  }

  if (phase === 'play') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>{TEAMS[team]}</span>
          <span
            className={`rounded-full px-3 py-1 font-display text-lg tabular-nums ${
              timer.remaining <= 10 ? 'bg-rose-500 text-white' : 'bg-[var(--bg-elevated)]'
            }`}
          >
            {timer.remaining} s
          </span>
          <span>
            {points} pt{Math.abs(points) > 1 ? 's' : ''}
          </span>
        </div>

        <div
          key={`${deck.position}-${word}`}
          className={`flex min-h-72 flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-center text-white shadow-xl ${cardEnter}`}
        >
          <p className="break-words font-display text-4xl font-bold leading-tight sm:text-5xl">{word}</p>
          {isTaboo && (
            <ul className="mt-5 w-full space-y-1 rounded-2xl bg-black/20 p-3">
              <li className="text-xs font-semibold uppercase tracking-wider text-white/70">Interdit de dire</li>
              {card.forbidden.map((f) => (
                <li key={f} className="text-lg font-semibold">
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`grid gap-3 ${isTaboo ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button type="button" className={`${btnGhost} min-h-20 text-lg`} onClick={() => record('pass')}>
            Passer
          </button>
          {isTaboo && (
            <button
              type="button"
              className={`${btnGhost} min-h-20 border-rose-500/60 text-lg text-rose-500`}
              onClick={() => record('buzz')}
            >
              Buzz&nbsp;−1
            </button>
          )}
          <button
            type="button"
            className="inline-flex min-h-20 items-center justify-center rounded-2xl bg-emerald-500 px-5 text-lg font-semibold text-white shadow-lg transition active:scale-[0.98]"
            onClick={() => record('found')}
          >
            Trouvé&nbsp;!
          </button>
        </div>
        <button
          type="button"
          className="text-sm text-[var(--text-muted)] underline-offset-4 hover:underline"
          onClick={() => {
            timer.stop()
            setPhase('recap')
          }}
        >
          Arrêter la manche
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`glass-card rounded-3xl p-6 text-center ${cardEnter}`}>
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Temps écoulé !</p>
        <p className="mt-1 font-display text-4xl font-bold">
          {points} point{Math.abs(points) > 1 ? 's' : ''}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">pour l’{TEAMS[team].toLowerCase()}</p>
      </div>
      {results.length > 0 && (
        <ul className="glass-card divide-y divide-[var(--border-color)] rounded-3xl px-4">
          {results.map((r, i) => (
            <li key={`${r.word}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{r.word}</span>
              <span className={`font-semibold ${RESULT_STYLE[r.result].className}`}>{RESULT_STYLE[r.result].label}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={`${btnPrimary} w-full`} onClick={validate}>
        Valider et passer à l’{TEAMS[1 - team].toLowerCase()}
      </button>
    </div>
  )
}
