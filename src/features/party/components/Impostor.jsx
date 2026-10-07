import { useState } from 'react'
import { MAX_PLAYERS, advanceDeck, assignImpostors, createDeck, currentCard, maxImpostors, pickStarter } from '../engine'
import { isBoolArray, isDeck, isIntIn } from '../session'
import { oneOf, useSessionState, useSessionVotes, when } from '../useSessionState'
import { useRoomPlayer } from '../room/hooks'
import { winner } from '../room/votes'
import PlayersEditor from './PlayersEditor'
import RoomReveal from './RoomReveal'
import RoomVote from './RoomVote'
import { btnGhost, btnPrimary, cardEnter } from './buttons'

/**
 * Imposteur et Undercover, sur un seul téléphone : chacun découvre son rôle à
 * tour de rôle, puis la discussion et le vote se font à voix haute. En
 * Undercover, l'intrus reçoit un mot proche et ignore qu'il est l'intrus.
 *
 * Partie à plusieurs téléphones : chacun voit son rôle sur son écran et vote
 * sur son téléphone ; l'appli dit si l'intrus a été démasqué.
 */
export default function Impostor({ game, level, players, onPlayersChange }) {
  const words = game.cards[level]
  const lastIndex = Math.max(0, players.length - 1)
  const [phase, setPhase] = useSessionState('phase', 'setup', oneOf(['setup', 'reveal', 'discuss', 'result']))
  const [impostorCount, setImpostorCount] = useSessionState('impostorCount', 1, when((v) => isIntIn(v, 1, MAX_PLAYERS)))
  const [hint, setHint] = useSessionState('hint', true)
  const [wordDeck, setWordDeck] = useSessionState('wordDeck', () => createDeck(words.length), when((v) => isDeck(v, words.length)))
  // La manche n'est reprise que si elle correspond encore aux joueurs actuels.
  const [round, setRound] = useSessionState(
    'round',
    null,
    when(
      (v) =>
        isBoolArray(v?.impostors, players.length) &&
        isIntIn(v.starter, 0, lastIndex) &&
        typeof v.secret?.word === 'string' &&
        (game.kind !== 'undercover' || typeof v.secret.decoy === 'string'),
    ),
  )
  const [revealIndex, setRevealIndex] = useSessionState('revealIndex', 0, when((v) => isIntIn(v, 0, lastIndex)))
  // Jamais sauvegardé : après un rechargement, le rôle affiché est recaché.
  const [shown, setShown] = useState(false)
  const { inRoom, myName, phones } = useRoomPlayer()
  // Les votes d'une manche ne se mélangent pas à ceux de la suivante.
  const roundId = typeof round?.id === 'string' ? round.id : 'r'
  const [votes] = useSessionVotes(`vote-${roundId}`, myName)

  const ready = players.length >= game.minPlayers
  const maxCount = maxImpostors(players.length)
  const count = Math.min(impostorCount, maxCount)
  const undercover = game.kind === 'undercover'
  const label = undercover ? { one: 'l’undercover', many: 'les undercovers', title: 'Undercovers' } : { one: 'l’imposteur', many: 'les imposteurs', title: 'Imposteurs' }

  function startRound() {
    const nextDeck = advanceDeck(wordDeck)
    setWordDeck(nextDeck)
    const impostors = assignImpostors(players.length, count)
    const entry = words[currentCard(nextDeck) ?? 0]
    // Undercover : on tire au hasard lequel des deux mots revient aux civils.
    const secret = undercover
      ? Math.random() < 0.5
        ? { word: entry[0], decoy: entry[1] }
        : { word: entry[1], decoy: entry[0] }
      : entry
    setRound({ secret, impostors, starter: pickStarter(impostors), id: Math.random().toString(36).slice(2, 8) })
    setRevealIndex(0)
    setShown(false)
    setPhase('reveal')
  }

  if (phase === 'setup' || !round || !ready) {
    return (
      <div className="flex flex-col gap-4">
        <PlayersEditor players={players} onChange={onPlayersChange} min={game.minPlayers} />

        <section className="glass-card flex flex-col gap-4 rounded-3xl p-5">
          <div className="flex items-center justify-between gap-4">
            <span id="impostor-count-label" className="font-semibold">{label.title}</span>
            <div role="group" aria-labelledby="impostor-count-label" className="flex items-center gap-3">
              <button
                type="button"
                className={`${btnGhost} w-12 px-0`}
                aria-label="Un de moins"
                disabled={count <= 1}
                onClick={() => setImpostorCount(Math.max(1, count - 1))}
              >
                −
              </button>
              <span aria-live="polite" className="w-6 text-center font-display text-xl font-bold">
                {count}
              </span>
              <button
                type="button"
                className={`${btnGhost} w-12 px-0`}
                aria-label="Un de plus"
                disabled={count >= maxCount}
                onClick={() => setImpostorCount(Math.min(maxCount, count + 1))}
              >
                +
              </button>
            </div>
          </div>
          {!undercover && (
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="font-semibold">Indice pour l’imposteur</span>
                <span className="block text-sm text-[var(--text-secondary)]">Il voit la catégorie du mot.</span>
              </span>
              <input
                type="checkbox"
                checked={hint}
                onChange={(e) => setHint(e.target.checked)}
                className="h-6 w-6 shrink-0 accent-[var(--accent)]"
              />
            </label>
          )}
        </section>

        <button type="button" className={`${btnPrimary} w-full`} disabled={!ready} onClick={startRound}>
          Lancer la partie
        </button>
      </div>
    )
  }

  function roleFace(index) {
    const isImpostor = round.impostors[index]
    if (undercover) {
      return (
        <>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ton mot</p>
          <p className="mt-3 break-words font-display text-4xl font-bold">
            {isImpostor ? round.secret.decoy : round.secret.word}
          </p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Attention : tu es peut-être l’undercover…</p>
        </>
      )
    }
    if (isImpostor) {
      return (
        <>
          <p className="text-5xl" aria-hidden="true">🕵️</p>
          <p className="mt-3 font-display text-3xl font-bold text-rose-500">Tu es l’imposteur</p>
          {hint ? (
            <p className="mt-3 text-[var(--text-secondary)]">
              Indice : <strong className="text-[var(--text-primary)]">{round.secret.category}</strong>
            </p>
          ) : (
            <p className="mt-3 text-[var(--text-secondary)]">Écoute bien les autres et bluffe.</p>
          )}
        </>
      )
    }
    return (
      <>
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Le mot secret</p>
        <p className="mt-3 break-words font-display text-4xl font-bold">{round.secret.word}</p>
      </>
    )
  }

  if (phase === 'reveal' && inRoom) {
    return (
      <RoomReveal
        key={roundId}
        field={`seen-${roundId}`}
        players={players}
        gradient={game.gradient}
        renderRole={roleFace}
        what={undercover ? 'ton mot' : 'ton rôle'}
        startLabel="Tout le monde a vu, on commence"
        onStart={() => setPhase('discuss')}
      />
    )
  }

  if (phase === 'reveal') {
    const name = players[revealIndex]
    const last = revealIndex >= players.length - 1

    return (
      <div className="flex flex-col gap-4">
        <div
          key={`${revealIndex}-${shown}`}
          aria-live="polite"
          className={`flex min-h-72 flex-col items-center justify-center rounded-3xl p-6 text-center shadow-xl ${cardEnter} ${
            shown ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : `bg-gradient-to-br ${game.gradient} text-white`
          }`}
        >
          {!shown ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Passe le téléphone à</p>
              <p className="mt-2 break-words font-display text-4xl font-bold">{name}</p>
              <p className="mt-4 text-sm text-white/80">Les autres, on ne regarde pas !</p>
            </>
          ) : (
            roleFace(revealIndex)
          )}
        </div>

        {!shown ? (
          <button type="button" className={`${btnPrimary} w-full`} onClick={() => setShown(true)}>
            Je suis {name}, voir mon rôle
          </button>
        ) : (
          <button
            type="button"
            className={`${btnPrimary} w-full`}
            onClick={() => {
              setShown(false)
              if (last) setPhase('discuss')
              else setRevealIndex((i) => i + 1)
            }}
          >
            {last ? 'J’ai vu, on commence' : 'J’ai vu, je cache'}
          </button>
        )}
        <p className="text-center text-xs text-[var(--text-muted)]">
          Joueur {revealIndex + 1} sur {players.length}
        </p>
      </div>
    )
  }

  const impostorNames = players.filter((_, i) => round.impostors[i])
  const voteTitle = impostorNames.length > 1 ? `Vote pour un des ${label.many}` : `Qui est ${label.one} ?`
  const voteOptions = players.map((p) => ({ value: p, label: p }))

  if (phase === 'discuss') {
    return (
      <div className="flex flex-col gap-4">
        <div
          className={`flex min-h-72 flex-col justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl ${cardEnter}`}
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Tout le monde a vu son rôle</p>
          <p className="mt-2 font-display text-3xl font-bold">{players[round.starter]} commence</p>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-white/90">
            <li>Chacun dit un mot lié à son mot, à tour de rôle.</li>
            <li>Faites un ou deux tours, puis débattez.</li>
            <li>{inRoom ? 'Votez chacun sur votre téléphone.' : 'Votez tous ensemble en pointant du doigt.'}</li>
          </ol>
        </div>
        {inRoom && <RoomVote key={roundId} field={`vote-${roundId}`} title={voteTitle} options={voteOptions} players={players} />}
        <button type="button" className={`${btnPrimary} w-full`} onClick={() => setPhase('result')}>
          Révéler {impostorNames.length > 1 ? label.many : label.one}
        </button>
      </div>
    )
  }

  const accused = inRoom ? winner(votes, players.filter((p) => phones.has(p)), players) : null

  return (
    <div className="flex flex-col gap-4">
      {inRoom && (
        <p
          role="status"
          className={`rounded-3xl p-4 text-center font-display text-xl font-bold text-white shadow-xl ${
            accused && impostorNames.includes(accused) ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {accused === null
            ? `Pas de majorité : ${impostorNames.length > 1 ? label.many : label.one} s’en sort !`
            : impostorNames.includes(accused)
              ? `🎯 ${accused} démasqué·e !`
              : `💥 ${accused} était innocent·e`}
        </p>
      )}
      <div className={`glass-card flex min-h-64 flex-col items-center justify-center rounded-3xl p-6 text-center ${cardEnter}`}>
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {impostorNames.length > 1 ? `${label.many} étaient` : `${label.one} était`}
        </p>
        <p className="mt-2 break-words font-display text-3xl font-bold text-rose-500">{impostorNames.join(', ')}</p>
        <p className="mt-5 text-sm text-[var(--text-secondary)]">{undercover ? 'Mot des civils' : 'Le mot secret'}</p>
        <p className="font-display text-2xl font-bold">{round.secret.word}</p>
        {undercover && (
          <>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Mot de l’undercover</p>
            <p className="font-display text-2xl font-bold">{round.secret.decoy}</p>
          </>
        )}
      </div>
      {inRoom && (
        <RoomVote key={roundId} field={`vote-${roundId}`} title="Les votes" options={voteOptions} players={players} revealed showVoters locked />
      )}
      <button type="button" className={`${btnPrimary} w-full`} onClick={startRound}>
        Nouvelle manche
      </button>
      <button type="button" className={btnGhost} onClick={() => setPhase('setup')}>
        Modifier les joueurs
      </button>
    </div>
  )
}
