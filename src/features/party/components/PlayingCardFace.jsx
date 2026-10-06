import { isRedSuit } from '../engine'

/** Carte à jouer dessinée (valeur + enseigne), ou dos de carte si `card` est vide. */
export default function PlayingCardFace({ card, size = 'md' }) {
  const box = size === 'sm' ? 'h-20 w-14 text-xl' : 'h-28 w-20 text-3xl'

  if (!card) {
    return (
      <div
        aria-hidden="true"
        className={`${box} shrink-0 rounded-xl border-2 border-white/70 bg-[repeating-linear-gradient(45deg,#4f46e5_0_6px,#6366f1_6px_12px)] shadow-lg`}
      />
    )
  }

  return (
    <div
      aria-label={`${card.rank} ${card.suit}`}
      role="img"
      className={`${box} flex shrink-0 flex-col items-center justify-center rounded-xl border border-black/10 bg-white font-bold shadow-lg ${
        isRedSuit(card.suit) ? 'text-rose-600' : 'text-slate-900'
      }`}
    >
      <span>{card.rank}</span>
      <span>{card.suit}</span>
    </div>
  )
}
