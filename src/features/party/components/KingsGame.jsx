import { useState } from 'react'
import { createCardDeck } from '../engine'
import { KINGS_RULES, LAST_KING } from '../content/kings'
import { btnGhost, btnPrimary, cardEnter } from './buttons'

const RANK_LABEL = { A: 'As', J: 'Valet', Q: 'Dame', K: 'Roi' }
const RED_SUITS = new Set(['♥', '♦'])

/** Jeu du Roi : 52 cartes, une règle par valeur, le 4e Roi termine la coupe. */
export default function KingsGame({ game, level }) {
  const [deck, setDeck] = useState(() => createCardDeck())
  const [position, setPosition] = useState(-1)

  const card = position >= 0 ? deck[position] : null
  const kingsDrawn = deck.slice(0, position + 1).filter((c) => c.rank === 'K').length
  const isLastKing = card?.rank === 'K' && kingsDrawn === 4
  const finished = position >= deck.length - 1
  const rule = card ? KINGS_RULES[card.rank] : null

  function restart() {
    setDeck(createCardDeck())
    setPosition(-1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between text-sm text-[var(--text-secondary)]">
        <span>Rois tirés : {kingsDrawn}/4</span>
        <span>Cartes restantes : {deck.length - position - 1}</span>
      </div>

      {card ? (
        <div key={position} aria-live="polite" className={`flex flex-col gap-4 ${cardEnter}`}>
          <div className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className={`flex h-28 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-black/10 bg-white text-3xl font-bold shadow-lg ${
                RED_SUITS.has(card.suit) ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              <span>{card.rank}</span>
              <span>{card.suit}</span>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                {RANK_LABEL[card.rank] ?? card.rank} {card.suit}
              </p>
              <p className="font-display text-2xl font-bold">{isLastKing ? 'Dernier Roi !' : rule.title}</p>
            </div>
          </div>
          <div className={`rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl`}>
            <p className="font-display text-xl font-bold leading-snug">{isLastKing ? LAST_KING[level] : rule.text[level]}</p>
          </div>
        </div>
      ) : (
        <div
          className={`flex min-h-56 flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-center text-white shadow-xl`}
        >
          <p className="text-5xl" aria-hidden="true">
            👑
          </p>
          <p className="mt-3 font-display text-2xl font-bold">Posez une coupe au centre de la table</p>
          <p className="mt-2 text-white/85">Chacun tire une carte à son tour et applique la règle.</p>
        </div>
      )}

      {finished || isLastKing ? (
        <button type="button" className={`${btnPrimary} w-full`} onClick={restart}>
          Nouvelle partie
        </button>
      ) : (
        <button type="button" className={`${btnPrimary} w-full`} onClick={() => setPosition((p) => p + 1)}>
          {card ? 'Carte suivante' : 'Tirer la première carte'}
        </button>
      )}
      {card && !finished && !isLastKing && (
        <button type="button" className={btnGhost} onClick={restart}>
          Remélanger
        </button>
      )}
    </div>
  )
}
