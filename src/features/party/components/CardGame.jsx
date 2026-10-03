import { useState } from 'react'
import { advanceDeck, createDeck, currentCard } from '../engine'
import { btnPrimary, cardEnter } from './buttons'

/**
 * Jeux à cartes (Je n'ai jamais, C'est un 10 mais, Qui pourrait, Tu préfères).
 * Le parent remonte ce composant à chaque changement de niveau (`key`), ce qui
 * remélange le paquet.
 */
export default function CardGame({ game, level }) {
  const cards = game.cards[level]
  const [deck, setDeck] = useState(() => createDeck(cards.length))
  const index = currentCard(deck) ?? 0
  const card = cards[index]

  return (
    <div className="flex flex-col gap-4">
      <div
        key={`${deck.position}-${index}`}
        aria-live="polite"
        className={`flex min-h-72 flex-col justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl sm:p-8 ${cardEnter}`}
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-white/75">{game.prefix}</p>
        {game.kind === 'choice' ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="rounded-2xl bg-white/15 p-4 font-display text-xl font-bold leading-snug sm:text-2xl">
              {card[0]}
            </p>
            <p className="text-center text-sm font-black uppercase tracking-[0.3em] text-white/80">ou</p>
            <p className="rounded-2xl bg-white/15 p-4 font-display text-xl font-bold leading-snug sm:text-2xl">
              {card[1]}
            </p>
          </div>
        ) : (
          <p className="mt-3 font-display text-2xl font-bold leading-snug sm:text-3xl">{card}</p>
        )}
      </div>

      <button type="button" className={`${btnPrimary} w-full`} onClick={() => setDeck((d) => advanceDeck(d))}>
        Carte suivante
      </button>
      <p className="text-center text-xs text-[var(--text-muted)]">
        Carte {deck.position + 1} sur {cards.length}
      </p>
    </div>
  )
}
