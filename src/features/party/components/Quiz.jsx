import { useState } from 'react'
import { advanceDeck, createDeck, currentCard } from '../engine'
import Scoreboard from './Scoreboard'
import { TEAMS } from './teams'
import { btnGhost, btnPrimary, cardEnter } from './buttons'

/** Quiz de culture G en deux équipes : question, réponse, point. */
export default function Quiz({ game, level }) {
  const questions = game.cards[level]
  const [deck, setDeck] = useState(() => createDeck(questions.length))
  const [revealed, setRevealed] = useState(false)
  const [team, setTeam] = useState(0)
  const [scores, setScores] = useState([0, 0])

  const item = questions[currentCard(deck) ?? 0]

  function score(correct) {
    if (correct) setScores((s) => s.map((v, i) => (i === team ? v + 1 : v)))
    setTeam((t) => 1 - t)
    setRevealed(false)
    setDeck((d) => advanceDeck(d))
  }

  return (
    <div className="flex flex-col gap-4">
      <Scoreboard scores={scores} active={team} />

      <div
        key={`${deck.position}-${item.question}`}
        className={`flex min-h-64 flex-col justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl ${cardEnter}`}
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-white/75">
          Question pour l’{TEAMS[team].toLowerCase()}
        </p>
        <p className="mt-3 font-display text-2xl font-bold leading-snug">{item.question}</p>
        {revealed && (
          <p aria-live="polite" className={`mt-5 rounded-2xl bg-black/25 p-4 text-xl font-bold ${cardEnter}`}>
            {item.answer}
          </p>
        )}
      </div>

      {!revealed ? (
        <button type="button" className={`${btnPrimary} min-h-14 w-full`} onClick={() => setRevealed(true)}>
          Voir la réponse
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={`${btnGhost} min-h-14`} onClick={() => score(false)}>
            Mauvaise réponse
          </button>
          <button
            type="button"
            className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-emerald-500 px-4 font-semibold text-white shadow-lg transition active:scale-[0.98]"
            onClick={() => score(true)}
          >
            Bonne réponse
          </button>
        </div>
      )}
      {(scores[0] > 0 || scores[1] > 0) && (
        <button type="button" className={btnGhost} onClick={() => setScores([0, 0])}>
          Remettre les scores à zéro
        </button>
      )}
    </div>
  )
}
