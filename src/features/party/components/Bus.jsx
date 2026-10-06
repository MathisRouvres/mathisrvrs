import { useState } from 'react'
import { BUS_STEPS, CARD_SUITS, busCorrect, createCardDeck } from '../engine'
import PlayersEditor from './PlayersEditor'
import PlayingCardFace from './PlayingCardFace'
import { btnGhost, btnPrimary, cardEnter } from './buttons'

const MIN_PLAYERS = 2
const RANK_LABEL = { A: 'As', J: 'Valet', Q: 'Dame', K: 'Roi' }
// Espace insécable + sélecteur de variante texte : « As ♥ » ne se coupe pas et
// l'enseigne garde sa couleur de texte au lieu de devenir un emoji.
const label = (card) => `${RANK_LABEL[card.rank] ?? card.rank}\u00a0${card.suit}\uFE0E`

const OPTION_BASE =
  'inline-flex min-h-16 items-center justify-center rounded-2xl px-3 text-lg font-semibold shadow-lg transition active:scale-[0.98]'
const RED = new Set(['red', '♥', '♦'])
const BLACK = new Set(['black', '♠', '♣'])

function optionClass(value) {
  if (RED.has(value)) return `${OPTION_BASE} bg-rose-600 text-white`
  if (BLACK.has(value)) return `${OPTION_BASE} bg-slate-900 text-white ring-1 ring-white/20`
  return `${OPTION_BASE} bg-[var(--accent)] text-white dark:text-[#070b14]`
}

/** Pénalité d'une erreur à l'étape `step` (0 à 3) : elle grandit à chaque étape. */
function penalty(level, step) {
  const n = step + 1
  const sips = `${n} gorgée${n > 1 ? 's' : ''}`
  if (level === 'soft') return n === 1 ? 'Un gage choisi par le groupe.' : `${n} gages choisis par le groupe, ou un gros.`
  if (level === 'spicy') return `Tu bois ${sips}.`
  return `Tu retires un accessoire ou tu bois ${sips}.`
}

function questionFor(step, drawn) {
  switch (BUS_STEPS[step]) {
    case 'color':
      return { text: 'Rouge ou noir ?', options: [['red', 'Rouge'], ['black', 'Noir']] }
    case 'higherLower':
      return {
        text: `Plus haut ou plus bas que ${label(drawn[0])} ?`,
        options: [['higher', 'Plus haut'], ['lower', 'Plus bas']],
      }
    case 'insideOutside':
      return {
        text: `Entre ${label(drawn[0])} et ${label(drawn[1])}, ou à l’extérieur ?`,
        options: [['inside', 'Entre les deux'], ['outside', 'À l’extérieur']],
      }
    default:
      return { text: 'Quelle enseigne ?', options: CARD_SUITS.map((s) => [s, s]) }
  }
}

/**
 * Le Bus : quatre questions sur quatre cartes (couleur, plus ou moins, entre ou
 * dehors, enseigne). Une erreur coûte autant que l'étape atteinte.
 */
export default function Bus({ level, players, onPlayersChange }) {
  const [playing, setPlaying] = useState(false)
  const [deck, setDeck] = useState(() => createCardDeck())
  const [pos, setPos] = useState(0)
  const [turn, setTurn] = useState(0)
  const [drawn, setDrawn] = useState([])
  const [status, setStatus] = useState('ask')

  const ready = players.length >= MIN_PLAYERS
  const step = drawn.length - (status === 'ask' ? 0 : 1)
  const player = players[turn % Math.max(players.length, 1)]

  function answer(value) {
    const card = deck[pos]
    const next = [...drawn, card]
    setDrawn(next)
    setPos((p) => p + 1)
    if (!busCorrect(drawn.length, next, value)) setStatus('wrong')
    else if (next.length === BUS_STEPS.length) setStatus('won')
  }

  function nextPlayer() {
    // Il faut toujours 4 cartes d'avance : sinon, on remélange.
    if (pos + BUS_STEPS.length > deck.length) {
      setDeck(createCardDeck())
      setPos(0)
    }
    setDrawn([])
    setStatus('ask')
    setTurn((t) => (t + 1) % players.length)
  }

  if (!playing || !ready) {
    return (
      <div className="flex flex-col gap-4">
        <PlayersEditor players={players} onChange={onPlayersChange} min={MIN_PLAYERS} />
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={!ready}
          onClick={() => {
            setTurn(0)
            setDrawn([])
            setStatus('ask')
            setPlaying(true)
          }}
        >
          Monter dans le bus
        </button>
      </div>
    )
  }

  const question = status === 'ask' ? questionFor(drawn.length, drawn) : null

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        Au tour de <span className="text-[var(--text-primary)]">{player}</span>
      </p>

      <div className="flex justify-center gap-2">
        {BUS_STEPS.map((id, i) => (
          <div key={id} className={drawn[i] ? cardEnter : undefined}>
            <PlayingCardFace card={drawn[i]} size="sm" />
          </div>
        ))}
      </div>

      {question && (
        <>
          <p aria-live="polite" className="text-center font-display text-2xl font-bold">
            {question.text}
          </p>
          <div className={`grid gap-3 ${question.options.length > 2 ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {question.options.map(([value, text]) => (
              <button key={value} type="button" className={optionClass(value)} onClick={() => answer(value)}>
                {text}
              </button>
            ))}
          </div>
        </>
      )}

      {status !== 'ask' && (
        <div
          aria-live="polite"
          className={`rounded-3xl p-6 text-center text-white shadow-xl ${cardEnter} ${status === 'won' ? 'bg-emerald-600' : 'bg-rose-600'}`}
        >
          <p className="font-display text-2xl font-bold">
            {status === 'won' ? 'Tu descends du bus !' : `Raté : ${label(drawn[drawn.length - 1])}`}
          </p>
          <p className="mt-2 text-white/90">{status === 'won' ? 'Quatre bonnes réponses, bravo.' : penalty(level, step)}</p>
        </div>
      )}

      {status !== 'ask' && (
        <button type="button" className={`${btnPrimary} w-full`} onClick={nextPlayer}>
          Joueur suivant
        </button>
      )}
      <button type="button" className={btnGhost} onClick={() => setPlaying(false)}>
        Modifier les joueurs
      </button>
    </div>
  )
}
