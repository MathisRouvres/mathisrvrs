import { MAX_PLAYERS, advanceDeck, createDeck, currentCard } from '../engine'
import { isDeck, isIntIn } from '../session'
import { oneOf, useSessionState, when } from '../useSessionState'
import PlayersEditor from './PlayersEditor'
import { btnGhost, btnPrimary, cardEnter } from './buttons'

const KIND_LABEL = { truth: 'Vérité', dare: 'Action' }

/** Action ou Vérité : le jeu désigne le joueur, qui choisit son défi. */
export default function TruthOrDare({ game, level, players, onPlayersChange }) {
  const [playing, setPlaying] = useSessionState('playing', false)
  const [turn, setTurn] = useSessionState('turn', 0, when((v) => isIntIn(v, 0, MAX_PLAYERS - 1)))
  const [choice, setChoice] = useSessionState('choice', null, oneOf(['truth', 'dare']))
  const [decks, setDecks] = useSessionState(
    'decks',
    () => ({
      truth: createDeck(game.cards.truth[level].length),
      dare: createDeck(game.cards.dare[level].length),
    }),
    when((v) => isDeck(v?.truth, game.cards.truth[level].length) && isDeck(v?.dare, game.cards.dare[level].length)),
  )

  const ready = players.length >= game.minPlayers

  if (!playing || !ready) {
    return (
      <div className="flex flex-col gap-4">
        <PlayersEditor players={players} onChange={onPlayersChange} min={game.minPlayers} />
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={!ready}
          onClick={() => {
            setTurn(Math.floor(Math.random() * players.length))
            setChoice(null)
            setPlaying(true)
          }}
        >
          Commencer
        </button>
      </div>
    )
  }

  const player = players[turn % players.length]
  const draw = (kind) => setDecks((d) => ({ ...d, [kind]: advanceDeck(d[kind]) }))

  if (!choice) {
    return (
      <div className="flex flex-col gap-4">
        <div
          key={`turn-${turn}`}
          aria-live="polite"
          className={`flex min-h-56 flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-center text-white shadow-xl ${cardEnter}`}
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Au tour de</p>
          <p className="mt-2 break-words font-display text-4xl font-bold">{player}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={btnPrimary} onClick={() => setChoice('dare')}>
            Action
          </button>
          <button type="button" className={btnPrimary} onClick={() => setChoice('truth')}>
            Vérité
          </button>
        </div>
        <button type="button" className={btnGhost} onClick={() => setPlaying(false)}>
          Modifier les joueurs
        </button>
      </div>
    )
  }

  const cards = game.cards[choice][level]
  const prompt = cards[currentCard(decks[choice]) ?? 0]

  return (
    <div className="flex flex-col gap-4">
      <div
        key={`${choice}-${decks[choice].position}-${decks[choice].order.join()}`}
        aria-live="polite"
        className={`flex min-h-72 flex-col justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl sm:p-8 ${cardEnter}`}
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-white/75">
          {KIND_LABEL[choice]} pour {player}
        </p>
        <p className="mt-3 font-display text-2xl font-bold leading-snug sm:text-3xl">{prompt}</p>
      </div>
      <button
        type="button"
        className={`${btnPrimary} w-full`}
        onClick={() => {
          draw(choice)
          setChoice(null)
          setTurn((t) => (t + 1) % players.length)
        }}
      >
        Joueur suivant
      </button>
      <button type="button" className={btnGhost} onClick={() => draw(choice)}>
        Autre {KIND_LABEL[choice].toLowerCase()}
      </button>
    </div>
  )
}
