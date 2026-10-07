import { useState } from 'react'
import { useRoomPlayer } from '../room/hooks'
import { useSessionVotes } from '../useSessionState'
import { btnGhost, btnPrimary, cardEnter } from './buttons'

const POSSESSIVE = { mine: { ton: 'mon', tes: 'mes' }, theirs: { ton: 'leur', tes: 'leurs' } }

/** « ton rôle » → « mon rôle » / « leur rôle », « tes cartes » → « mes / leurs cartes ». */
const reword = (what, who) => what.replace(/^(ton|tes) /, (_, p) => `${POSSESSIVE[who][p]} `)

/**
 * Découverte des rôles dans une partie à plusieurs téléphones : chacun voit le
 * sien sur son écran. Un joueur sans téléphone découvre le sien sur celui d'un
 * autre, avec l'écran de passage habituel. `renderRole(index)` dessine le rôle.
 */
export default function RoomReveal({ field, players, gradient, renderRole, startLabel, onStart, what = 'ton rôle' }) {
  const { myName, phones } = useRoomPlayer()
  const [seen, markSeen] = useSessionVotes(field, myName)
  // Jamais partagés : ce qui est à l'écran ici ne regarde que ce téléphone.
  const [shown, setShown] = useState(false)
  const [guest, setGuest] = useState(null)

  const myIndex = myName ? players.indexOf(myName) : -1
  const guests = players.filter((p) => !phones.has(p))
  const seenCount = players.filter((p) => seen[p] === true).length
  const allSeen = seenCount === players.length

  if (guest) {
    const index = players.indexOf(guest.name)
    return (
      <div className="flex flex-col gap-4">
        <div
          key={`${guest.name}-${guest.shown}`}
          aria-live="polite"
          className={`flex min-h-72 flex-col items-center justify-center rounded-3xl p-6 text-center shadow-xl ${cardEnter} ${
            guest.shown ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : `bg-gradient-to-br ${gradient} text-white`
          }`}
        >
          {guest.shown ? (
            renderRole(index)
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Passe le téléphone à</p>
              <p className="mt-2 break-words font-display text-4xl font-bold">{guest.name}</p>
              <p className="mt-4 text-sm text-white/80">Les autres, on ne regarde pas !</p>
            </>
          )}
        </div>
        {guest.shown ? (
          <button
            type="button"
            className={`${btnPrimary} w-full`}
            onClick={() => {
              markSeen(true, guest.name)
              setGuest(null)
            }}
          >
            J’ai vu, je rends le téléphone
          </button>
        ) : (
          <>
            <button type="button" className={`${btnPrimary} w-full`} onClick={() => setGuest({ ...guest, shown: true })}>
              Je suis {guest.name}, voir {reword(what, 'mine')}
            </button>
            <button type="button" className={btnGhost} onClick={() => setGuest(null)}>
              Annuler
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {myIndex >= 0 ? (
        <>
          <div
            key={String(shown)}
            aria-live="polite"
            className={`flex min-h-72 flex-col items-center justify-center rounded-3xl p-6 text-center shadow-xl ${cardEnter} ${
              shown ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : `bg-gradient-to-br ${gradient} text-white`
            }`}
          >
            {shown ? (
              renderRole(myIndex)
            ) : (
              <>
                <p className="text-5xl" aria-hidden="true">
                  🤫
                </p>
                <p className="mt-3 font-display text-2xl font-bold">
                  {myName}, à toi de voir {what}
                </p>
                <p className="mt-2 text-sm text-white/80">Cache ton écran des autres.</p>
              </>
            )}
          </div>
          <button
            type="button"
            className={`${shown ? btnGhost : btnPrimary} w-full`}
            onClick={() => {
              if (!shown && seen[myName] !== true) markSeen(true)
              setShown((s) => !s)
            }}
          >
            {shown ? 'Cacher' : `Voir ${what}`}
          </button>
        </>
      ) : (
        <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-6 text-center text-white shadow-xl`}>
          <p className="font-display text-2xl font-bold">Tu regardes la partie</p>
          <p className="mt-2 text-sm text-white/85">Les joueurs découvrent leur secret sur leur téléphone.</p>
        </div>
      )}

      {guests.length > 0 && (
        <section className="glass-card rounded-3xl p-4" aria-label="Joueurs sans téléphone">
          <p className="text-sm font-semibold">Sans téléphone</p>
          <ul className="mt-2 flex flex-col gap-2">
            {guests.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className={`${btnGhost} w-full justify-between`}
                  onClick={() => setGuest({ name, shown: false })}
                >
                  <span>Montrer à {name}</span>
                  {seen[name] === true && <span aria-label="déjà vu">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-live="polite" className="text-center">
        <p className="text-sm font-semibold">
          {seenCount}/{players.length} ont vu {reword(what, 'theirs')}
        </p>
        <ul className="mt-2 flex flex-wrap justify-center gap-1.5" aria-label="Qui a vu">
          {players.map((name) => (
            <li
              key={name}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                seen[name] === true
                  ? 'border-emerald-500/50 text-[var(--text-primary)]'
                  : 'border-[var(--border-color)] text-[var(--text-muted)]'
              }`}
            >
              {seen[name] === true ? '✓ ' : ''}
              {name}
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className={`${allSeen ? btnPrimary : btnGhost} w-full`} onClick={onStart}>
        {startLabel}
      </button>
      {!allSeen && (
        <p className="-mt-2 text-center text-xs text-[var(--text-muted)]">On peut lancer sans attendre tout le monde.</p>
      )}
    </div>
  )
}
