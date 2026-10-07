import { advanceDeck, createDeck, currentCard } from '../engine'
import { isDeck } from '../session'
import { useSessionState, when } from '../useSessionState'
import { useRoomPlayer } from '../room/hooks'
import RoomVote from './RoomVote'
import { btnPrimary, cardEnter } from './buttons'

const SCORES = Array.from({ length: 11 }, (_, i) => ({ value: 10 - i, label: String(10 - i) }))

/** Options et affichage du vote d'une carte, selon le jeu. */
function voteProps(vote, card, players) {
  switch (vote.kind) {
    case 'players':
      return { options: players.map((p) => ({ value: p, label: p })) }
    case 'options':
      return { options: vote.options.map((o) => ({ value: o, label: o })), reveal: 'mine', showVoters: true }
    case 'card':
      return { options: card.map((o, i) => ({ value: i, label: o })), reveal: 'mine', showVoters: true }
    case 'score':
      return { options: SCORES, reveal: 'mine', showVoters: true, average: true }
    default:
      return null
  }
}

/**
 * Jeux à cartes (Je n'ai jamais, C'est un 10 mais, Qui pourrait, Tu préfères).
 * Le parent remonte ce composant à chaque changement de niveau (`key`), ce qui
 * remélange le paquet. Partie à plusieurs téléphones : chacun vote sur le sien.
 */
export default function CardGame({ game, level }) {
  const cards = game.cards[level]
  const [deck, setDeck] = useSessionState('deck', () => createDeck(cards.length), when((v) => isDeck(v, cards.length)))
  const index = currentCard(deck) ?? 0
  const card = cards[index]
  const { inRoom, players } = useRoomPlayer()
  const vote = inRoom && game.vote ? voteProps(game.vote, card, players) : null

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

      {vote && (
        <RoomVote
          key={`vote-${deck.position}-${index}`}
          field={`vote-${deck.position}-${index}`}
          title={game.vote.title}
          players={players}
          {...vote}
        />
      )}

      <button type="button" className={`${btnPrimary} w-full`} onClick={() => setDeck((d) => advanceDeck(d))}>
        Carte suivante
      </button>
      <p className="text-center text-xs text-[var(--text-muted)]">
        Carte {deck.position + 1} sur {cards.length}
      </p>
    </div>
  )
}
