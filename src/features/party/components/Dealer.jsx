import {
  CARD_RANKS,
  DEALER_MAX_PENALTY,
  DEALER_MISSES_TO_PASS,
  MAX_PLAYERS,
  createCardDeck,
  dealerPenalty,
  dealerValue,
  dealerVerdict,
} from '../engine'
import { isCardDeck, isIntIn } from '../session'
import { useSessionState, when } from '../useSessionState'
import PlayersEditor from './PlayersEditor'
import PlayingCardFace from './PlayingCardFace'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { sips } from './penalty'

const MIN_PLAYERS = 3
const RANK_LABEL = { A: 'As', J: 'Valet', Q: 'Dame', K: 'Roi' }
const rankName = (rank) => RANK_LABEL[rank] ?? rank

const isPlayerIndex = (v) => isIntIn(v, 0, MAX_PLAYERS - 1)
const isFirstGuess = (v) => v === null || (CARD_RANKS.includes(v?.rank) && (v.verdict === 'higher' || v.verdict === 'lower'))
const isOutcome = (v) =>
  v === null ||
  ((v?.kind === 'dealer' || v?.kind === 'guesser') &&
    isIntIn(v.amount, 1, DEALER_MAX_PENALTY) &&
    typeof v.text === 'string')

/** Prochain joueur après `from`, en sautant le croupier. */
function nextGuesser(from, dealer, count) {
  let i = (from + 1) % count
  if (i === dealer) i = (i + 1) % count
  return i
}

/**
 * Le Croupier : le joueur devine la valeur de la carte en deux essais (le
 * croupier dit « plus haut » ou « plus bas » après le premier). Trouvé : le
 * croupier boit. Raté : le joueur boit l'écart. Trois ratés d'affilée et le
 * croupier passe la main.
 */
export default function Dealer({ level, players, onPlayersChange }) {
  const [playing, setPlaying] = useSessionState('playing', false)
  const [deck, setDeck] = useSessionState('deck', () => createCardDeck(), when(isCardDeck))
  const [pos, setPos] = useSessionState('pos', 0, when((v) => isIntIn(v, 0, 51)))
  const [dealer, setDealer] = useSessionState('dealer', 0, when(isPlayerIndex))
  const [guesser, setGuesser] = useSessionState('guesser', 1, when(isPlayerIndex))
  const [firstGuess, setFirstGuess] = useSessionState('firstGuess', null, when(isFirstGuess))
  const [outcome, setOutcome] = useSessionState('outcome', null, when(isOutcome))
  const [misses, setMisses] = useSessionState('misses', 0, when((v) => isIntIn(v, 0, DEALER_MISSES_TO_PASS)))

  const ready = players.length >= MIN_PLAYERS
  const card = deck[pos]
  const seen = deck.slice(0, outcome ? pos + 1 : pos)

  function start() {
    setDeck(createCardDeck())
    setPos(0)
    setDealer(0)
    setGuesser(1)
    setFirstGuess(null)
    setOutcome(null)
    setMisses(0)
    setPlaying(true)
  }

  function guess(rank) {
    const value = dealerValue(rank)
    if (firstGuess === null) {
      const verdict = dealerVerdict(card, value)
      if (verdict === 'exact') {
        setOutcome({ kind: 'dealer', amount: 2, text: 'Trouvé du premier coup !' })
        setMisses(0)
      } else {
        setFirstGuess({ rank, verdict })
      }
      return
    }
    if (dealerVerdict(card, value) === 'exact') {
      setOutcome({ kind: 'dealer', amount: 1, text: 'Trouvé au deuxième essai.' })
      setMisses(0)
      return
    }
    const nextMisses = misses + 1
    setMisses(nextMisses)
    setOutcome({
      kind: 'guesser',
      amount: dealerPenalty(card, value),
      text: `Raté : c’était ${rankName(card.rank)}.`,
      passes: nextMisses >= DEALER_MISSES_TO_PASS,
    })
  }

  function next() {
    let newDealer = dealer
    let newMisses = misses
    if (outcome?.passes) {
      newDealer = (dealer + 1) % players.length
      newMisses = 0
    }
    if (pos + 1 >= deck.length) {
      setDeck(createCardDeck())
      setPos(0)
    } else {
      setPos(pos + 1)
    }
    setDealer(newDealer)
    setMisses(newMisses)
    setGuesser(nextGuesser(outcome?.passes ? newDealer : guesser, newDealer, players.length))
    setFirstGuess(null)
    setOutcome(null)
  }

  if (!playing || !ready || dealer >= players.length || guesser >= players.length) {
    return (
      <div className="flex flex-col gap-4">
        <PlayersEditor players={players} onChange={onPlayersChange} min={MIN_PLAYERS} />
        <button type="button" className={`${btnPrimary} w-full`} disabled={!ready} onClick={start}>
          Distribuer
        </button>
      </div>
    )
  }

  const counts = Object.fromEntries(CARD_RANKS.map((r) => [r, seen.filter((c) => c.rank === r).length]))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Croupier</p>
          <p className="truncate font-display text-lg font-bold">{players[dealer]}</p>
        </div>
        <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Devine</p>
          <p className="truncate font-display text-lg font-bold">{players[guesser]}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div key={`${pos}-${Boolean(outcome)}`} className={cardEnter}>
          <PlayingCardFace card={outcome ? card : null} />
        </div>
        <p aria-live="polite" className="max-w-[60%] font-display text-xl font-bold leading-snug">
          {outcome
            ? outcome.text
            : firstGuess
              ? `Pas ${rankName(firstGuess.rank)} : c’est plus ${firstGuess.verdict === 'higher' ? 'haut' : 'bas'} !`
              : 'Quelle est la valeur de la carte ?'}
        </p>
      </div>

      {!outcome ? (
        <div className="grid grid-cols-5 gap-2">
          {CARD_RANKS.map((rank) => {
            const ruledOut =
              firstGuess &&
              (firstGuess.verdict === 'higher'
                ? dealerValue(rank) <= dealerValue(firstGuess.rank)
                : dealerValue(rank) >= dealerValue(firstGuess.rank))
            return (
              <button
                key={rank}
                type="button"
                disabled={Boolean(ruledOut)}
                onClick={() => guess(rank)}
                aria-label={rankName(rank)}
                className="min-h-12 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] font-display text-lg font-bold transition hover:border-[var(--accent)] disabled:opacity-25"
              >
                {rank}
              </button>
            )
          })}
        </div>
      ) : (
        <div
          className={`rounded-3xl p-5 text-center text-white shadow-xl ${cardEnter} ${
            outcome.kind === 'dealer' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          <p className="font-semibold">
            {outcome.kind === 'dealer' ? players[dealer] : players[guesser]} prend {sips(level, outcome.amount)}.
          </p>
          {outcome.passes && (
            <p className="mt-2 text-sm text-white/90">
              Trois ratés d’affilée : {players[dealer]} passe le paquet à {players[(dealer + 1) % players.length]}.
            </p>
          )}
        </div>
      )}

      {outcome && (
        <button type="button" className={`${btnPrimary} w-full`} onClick={next}>
          Carte suivante
        </button>
      )}

      <section aria-label="Cartes déjà sorties" className="glass-card rounded-3xl p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Déjà sorties · {deck.length - seen.length} cartes restantes · ratés d’affilée : {misses}
        </p>
        <div className="grid grid-cols-7 gap-1 text-center text-xs sm:grid-cols-13">
          {CARD_RANKS.map((rank) => (
            <span
              key={rank}
              className={`rounded-lg py-1 ${counts[rank] >= 4 ? 'bg-[var(--bg-primary)] text-[var(--text-muted)] line-through' : 'bg-[var(--bg-elevated)]'}`}
            >
              {rank} <span className="text-[var(--text-muted)]">×{counts[rank]}</span>
            </span>
          ))}
        </div>
      </section>

      <button type="button" className={btnGhost} onClick={() => setPlaying(false)}>
        Modifier les joueurs
      </button>
    </div>
  )
}
