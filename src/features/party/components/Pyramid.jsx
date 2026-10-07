import { useState } from 'react'
import {
  MAX_PYRAMID_PLAYERS,
  MIN_PYRAMID_PLAYERS,
  PYRAMID_HAND,
  PYRAMID_ROWS,
  PYRAMID_SIZE,
  dealPyramid,
  holdsRank,
  pyramidRow,
} from '../engine'
import { isIntIn, isPlayingCard } from '../session'
import { oneOf, useSessionState, when } from '../useSessionState'
import { useRoomPlayer } from '../room/hooks'
import PlayersEditor from './PlayersEditor'
import RoomReveal from './RoomReveal'
import PlayingCardFace from './PlayingCardFace'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { sips } from './penalty'

const RANK_LABEL = { A: 'un As', J: 'un Valet', Q: 'une Dame', K: 'un Roi' }
const rankName = (rank) => RANK_LABEL[rank] ?? `un ${rank}`

/** Indices des cartes de la pyramide, rangées du sommet (1 carte) à la base (5 cartes). */
const ROWS_TOP_DOWN = Array.from({ length: PYRAMID_ROWS }, (_, r) => {
  const row = PYRAMID_ROWS - r
  const start = Array.from({ length: row - 1 }, (_, i) => PYRAMID_ROWS - i).reduce((a, b) => a + b, 0)
  return Array.from({ length: PYRAMID_ROWS - row + 1 }, (_, i) => start + i)
})

const isCards = (v, length) => Array.isArray(v) && v.length === length && v.every(isPlayingCard)
const isDeal = (v) =>
  Array.isArray(v?.hands) &&
  v.hands.length >= MIN_PYRAMID_PLAYERS &&
  v.hands.length <= MAX_PYRAMID_PLAYERS &&
  v.hands.every((hand) => isCards(hand, PYRAMID_HAND)) &&
  isCards(v.pyramid, PYRAMID_SIZE)

/**
 * La Pyramide : chacun mémorise 4 cartes en secret, puis la pyramide se
 * retourne de la base au sommet. Qui a la carte retournée distribue autant
 * que l'étage — en bluffant s'il le veut. L'appli tranche les accusations.
 */
export default function Pyramid({ level, players, onPlayersChange }) {
  const [phase, setPhase] = useSessionState('phase', 'setup', oneOf(['setup', 'memorize', 'board', 'end']))
  const [deal, setDeal] = useSessionState('deal', null, when(isDeal))
  const [viewer, setViewer] = useSessionState('viewer', 0, when((v) => isIntIn(v, 0, MAX_PYRAMID_PLAYERS - 1)))
  const [revealed, setRevealed] = useSessionState('revealed', -1, when((v) => isIntIn(v, -1, PYRAMID_SIZE - 1)))
  // Volontairement non sauvegardés : après un rechargement, une main secrète ne
  // doit jamais se réafficher toute seule devant les autres.
  const [shown, setShown] = useState(false)
  const [check, setCheck] = useState(null)
  const { inRoom } = useRoomPlayer()

  const count = players.length
  const ready = count >= MIN_PYRAMID_PLAYERS && count <= MAX_PYRAMID_PLAYERS

  function start() {
    setDeal(dealPyramid(count))
    setViewer(0)
    setShown(false)
    setRevealed(-1)
    setCheck(null)
    setPhase('memorize')
  }

  if (phase === 'setup' || !deal || deal.hands.length !== count) {
    return (
      <div className="flex flex-col gap-4">
        <PlayersEditor players={players} onChange={onPlayersChange} min={MIN_PYRAMID_PLAYERS} />
        {count > MAX_PYRAMID_PLAYERS && (
          <p className="text-sm text-rose-500">La pyramide se joue à {MAX_PYRAMID_PLAYERS} joueurs maximum (52 cartes).</p>
        )}
        <button type="button" className={`${btnPrimary} w-full`} disabled={!ready} onClick={start}>
          Distribuer les cartes
        </button>
      </div>
    )
  }

  // Partie à plusieurs téléphones : chacun mémorise sa main sur son écran.
  if (phase === 'memorize' && inRoom) {
    const dealKey = deal.pyramid.map((c) => `${c.rank}${c.suit}`).join('')
    return (
      <RoomReveal
        key={dealKey}
        field={`seen-${dealKey}`}
        players={players}
        gradient="from-amber-500 to-orange-700"
        what="tes cartes"
        renderRole={(index) => (
          <>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Tes cartes</p>
            <div className="flex gap-2">
              {deal.hands[index].map((card) => (
                <PlayingCardFace key={`${card.rank}${card.suit}`} card={card} size="sm" />
              ))}
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Mémorise-les : elles se cachent pour la suite.</p>
          </>
        )}
        startLabel="Mémorisé, on lance la pyramide"
        onStart={() => setPhase('board')}
      />
    )
  }

  if (phase === 'memorize') {
    const last = viewer >= count - 1
    return (
      <div className="flex flex-col gap-4">
        <div
          key={`${viewer}-${shown}`}
          aria-live="polite"
          className={`flex min-h-64 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 p-6 text-center text-white shadow-xl ${cardEnter}`}
        >
          {!shown ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Passe le téléphone à</p>
              <p className="mt-2 break-words font-display text-4xl font-bold">{players[viewer]}</p>
              <p className="mt-3 text-sm text-white/85">Mémorise bien tes 4 cartes : tu ne pourras plus les revoir.</p>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/75">Tes cartes</p>
              <div className="flex gap-2">
                {deal.hands[viewer].map((card) => (
                  <PlayingCardFace key={`${card.rank}${card.suit}`} card={card} size="sm" />
                ))}
              </div>
            </>
          )}
        </div>
        {!shown ? (
          <button type="button" className={`${btnPrimary} w-full`} onClick={() => setShown(true)}>
            Je suis {players[viewer]}, voir mes cartes
          </button>
        ) : (
          <button
            type="button"
            className={`${btnPrimary} w-full`}
            onClick={() => {
              setShown(false)
              if (last) setPhase('board')
              else setViewer((v) => v + 1)
            }}
          >
            {last ? 'Mémorisé, on lance la pyramide' : 'Mémorisé, je cache'}
          </button>
        )}
        <p className="text-center text-xs text-[var(--text-muted)]">
          Joueur {viewer + 1} sur {count}
        </p>
      </div>
    )
  }

  const card = revealed >= 0 ? deal.pyramid[revealed] : null
  const value = revealed >= 0 ? pyramidRow(revealed) : 0
  const finished = revealed >= deal.pyramid.length - 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1.5" aria-label="Pyramide">
        {ROWS_TOP_DOWN.map((indices) => (
          <div key={indices[0]} className="flex gap-1.5">
            {indices.map((i) => (
              <div key={i} className={i === revealed ? 'rounded-xl ring-4 ring-[var(--accent)]' : undefined}>
                <PlayingCardFace card={i <= revealed ? deal.pyramid[i] : null} size="sm" />
              </div>
            ))}
          </div>
        ))}
      </div>

      {card ? (
        <div key={revealed} aria-live="polite" className={`glass-card rounded-3xl p-5 text-center ${cardEnter}`}>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Étage {value}</p>
          <p className="mt-1 font-display text-xl font-bold leading-snug">
            Qui a {rankName(card.rank)} distribue {sips(level, value)}.
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Le bluff est permis. Accusé à tort ? L’accusateur prend le double.
          </p>
        </div>
      ) : (
        <p className="text-center text-[var(--text-secondary)]">
          Chacun a mémorisé sa main. Retournez la pyramide, de la base au sommet.
        </p>
      )}

      {card && (
        <section aria-labelledby="pyramid-check" className="glass-card rounded-3xl p-4">
          <p id="pyramid-check" className="mb-2 text-sm font-semibold">
            Vérifier un bluff : qui prétend avoir {rankName(card.rank)} ?
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map((name, i) => (
              <button
                key={`${name}-${i}`}
                type="button"
                onClick={() => setCheck({ player: i, holds: holdsRank(deal.hands[i], card.rank) })}
                className="min-h-10 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 text-sm font-semibold hover:border-[var(--accent)]"
              >
                {name}
              </button>
            ))}
          </div>
          {check && (
            <p
              aria-live="polite"
              className={`mt-3 rounded-2xl p-3 text-sm font-semibold text-white ${check.holds ? 'bg-emerald-600' : 'bg-rose-600'}`}
            >
              {check.holds
                ? `${players[check.player]} a bien ${rankName(card.rank)} : l’accusateur prend ${sips(level, value * 2)}.`
                : `Bluff ! ${players[check.player]} n’a pas ${rankName(card.rank)} et prend ${sips(level, value * 2)}.`}
            </p>
          )}
        </section>
      )}

      {!finished ? (
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          onClick={() => {
            setRevealed((r) => r + 1)
            setCheck(null)
          }}
        >
          {card ? 'Retourner la carte suivante' : 'Retourner la première carte'}
        </button>
      ) : phase !== 'end' ? (
        <button type="button" className={`${btnPrimary} w-full`} onClick={() => setPhase('end')}>
          Fin : chacun récite ses cartes, puis on les révèle
        </button>
      ) : null}

      {phase === 'end' && (
        <ul className={`glass-card divide-y divide-[var(--border-color)] rounded-3xl px-4 ${cardEnter}`}>
          {players.map((name, i) => (
            <li key={`${name}-${i}`} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 truncate font-semibold">{name}</span>
              <span className="flex shrink-0 gap-1">
                {deal.hands[i].map((c) => (
                  <PlayingCardFace key={`${c.rank}${c.suit}`} card={c} size="sm" />
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(phase === 'end' || finished) && (
        <button type="button" className={btnGhost} onClick={start}>
          Nouvelle pyramide
        </button>
      )}
      <button type="button" className={btnGhost} onClick={() => setPhase('setup')}>
        Modifier les joueurs
      </button>
    </div>
  )
}
