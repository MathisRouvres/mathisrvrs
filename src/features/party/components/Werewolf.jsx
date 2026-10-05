import { useState } from 'react'
import { MIN_WEREWOLF_PLAYERS, dealWerewolfRoles, werewolfCount, werewolfWinner } from '../engine'
import { NIGHT_STEPS, WEREWOLF_ROLES, WEREWOLF_SPECIALS } from '../content/werewolf'
import PlayersEditor from './PlayersEditor'
import { btnGhost, btnPrimary, cardEnter } from './buttons'

const DEFAULT_SPECIALS = ['seer', 'witch', 'hunter']

/**
 * Loup-Garou sur un téléphone : distribution secrète des rôles, puis le meneur
 * (qui ne joue pas) garde le téléphone et suit le script de la nuit.
 */
export default function Werewolf({ game, players, onPlayersChange }) {
  const [phase, setPhase] = useState('setup')
  const [specials, setSpecials] = useState(DEFAULT_SPECIALS)
  const [roles, setRoles] = useState([])
  const [alive, setAlive] = useState([])
  const [revealIndex, setRevealIndex] = useState(0)
  const [shown, setShown] = useState(false)
  const [night, setNight] = useState(1)
  const [step, setStep] = useState(0)

  const ready = players.length >= MIN_WEREWOLF_PLAYERS
  const wolves = werewolfCount(Math.max(players.length, MIN_WEREWOLF_PLAYERS))
  const usableSpecials = specials.slice(0, Math.max(0, players.length - wolves - 1))
  const villagers = Math.max(0, players.length - wolves - usableSpecials.length)

  function toggleSpecial(id) {
    setSpecials((s) => (s.includes(id) ? s.filter((x) => x !== id) : WEREWOLF_SPECIALS.filter((x) => x === id || s.includes(x))))
  }

  function deal() {
    setRoles(dealWerewolfRoles(players.length, specials))
    setAlive(players.map(() => true))
    setRevealIndex(0)
    setShown(false)
    setNight(1)
    setStep(0)
    setPhase('reveal')
  }

  if (phase === 'setup' || !ready || roles.length !== players.length) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 text-sm text-[var(--text-secondary)]">
          Le meneur ne joue pas : n’ajoute que les joueurs. Il récupère le téléphone après la distribution des rôles.
        </p>
        <PlayersEditor players={players} onChange={onPlayersChange} min={MIN_WEREWOLF_PLAYERS} />

        <section className="glass-card rounded-3xl p-5" aria-labelledby="ww-roles-title">
          <h2 id="ww-roles-title" className="font-display text-lg font-bold">
            Rôles spéciaux
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {WEREWOLF_SPECIALS.map((id) => {
              const meta = WEREWOLF_ROLES[id]
              return (
                <li key={id}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3">
                    <span>
                      <span aria-hidden="true">{meta.emoji} </span>
                      <span className="font-semibold">{meta.label}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={specials.includes(id)}
                      onChange={() => toggleSpecial(id)}
                      className="h-6 w-6 shrink-0 accent-[var(--accent)]"
                    />
                  </label>
                </li>
              )
            })}
          </ul>
          {ready && (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Composition : {wolves} loups
              {usableSpecials.map((id) => `, ${WEREWOLF_ROLES[id].label}`).join('')}, {villagers} villageois.
            </p>
          )}
        </section>

        <button type="button" className={`${btnPrimary} w-full`} disabled={!ready} onClick={deal}>
          Distribuer les rôles
        </button>
      </div>
    )
  }

  if (phase === 'reveal') {
    const name = players[revealIndex]
    const meta = WEREWOLF_ROLES[roles[revealIndex]]
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
            <>
              <p className="text-6xl" aria-hidden="true">
                {meta.emoji}
              </p>
              <p
                className={`mt-3 font-display text-3xl font-bold ${meta.team === 'wolves' ? 'text-rose-500' : 'text-emerald-500'}`}
              >
                {meta.label}
              </p>
              <p className="mt-3 text-[var(--text-secondary)]">{meta.description}</p>
            </>
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
              if (last) setPhase('handover')
              else setRevealIndex((i) => i + 1)
            }}
          >
            J’ai vu, je cache
          </button>
        )}
        <p className="text-center text-xs text-[var(--text-muted)]">
          Joueur {revealIndex + 1} sur {players.length}
        </p>
      </div>
    )
  }

  if (phase === 'handover') {
    return (
      <div className="flex flex-col gap-4">
        <div
          className={`flex min-h-64 flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-center text-white shadow-xl`}
        >
          <p className="text-5xl" aria-hidden="true">
            🌙
          </p>
          <p className="mt-3 font-display text-2xl font-bold">Tout le monde a son rôle</p>
          <p className="mt-2 text-white/85">Rends le téléphone au meneur.</p>
        </div>
        <button type="button" className={`${btnPrimary} w-full`} onClick={() => setPhase('narrate')}>
          Je suis le meneur, commencer
        </button>
      </div>
    )
  }

  const steps = NIGHT_STEPS.filter((s) => (!s.role || roles.includes(s.role)) && (!s.firstNightOnly || night === 1))
  const current = steps[Math.min(step, steps.length - 1)]
  const lastStep = step >= steps.length - 1
  const winner = werewolfWinner(roles, alive)

  return (
    <div className="flex flex-col gap-4">
      {winner && (
        <div
          role="status"
          className={`rounded-3xl p-5 text-center text-white shadow-xl ${winner === 'wolves' ? 'bg-rose-600' : 'bg-emerald-600'}`}
        >
          <p className="font-display text-2xl font-bold">
            {winner === 'wolves' ? '🐺 Les Loups-Garous gagnent !' : '🎉 Le village gagne !'}
          </p>
        </div>
      )}

      <div
        key={`${night}-${step}`}
        aria-live="polite"
        className={`flex min-h-56 flex-col justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl ${cardEnter}`}
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-white/75">
          Nuit {night} · étape {Math.min(step, steps.length - 1) + 1}/{steps.length}
        </p>
        <p className="mt-3 font-display text-xl font-bold leading-snug sm:text-2xl">{current?.text}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={btnGhost} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Précédent
        </button>
        {lastStep ? (
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setNight((n) => n + 1)
              setStep(0)
            }}
          >
            Nuit suivante
          </button>
        ) : (
          <button type="button" className={btnPrimary} onClick={() => setStep((s) => s + 1)}>
            Suivant
          </button>
        )}
      </div>

      <section className="glass-card rounded-3xl p-4" aria-labelledby="ww-players-title">
        <h2 id="ww-players-title" className="mb-1 font-display text-lg font-bold">
          Joueurs
        </h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">Écran du meneur : touche un joueur pour le marquer mort.</p>
        <ul className="flex flex-col gap-2">
          {players.map((name, i) => {
            const meta = WEREWOLF_ROLES[roles[i]]
            return (
              <li key={`${name}-${i}`}>
                <button
                  type="button"
                  aria-pressed={!alive[i]}
                  onClick={() => setAlive((a) => a.map((v, j) => (j === i ? !v : v)))}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    alive[i]
                      ? 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                      : 'border-transparent bg-[var(--bg-elevated)] opacity-50'
                  }`}
                >
                  <span className={`font-semibold ${alive[i] ? '' : 'line-through'}`}>{name}</span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    <span aria-hidden="true">{meta.emoji} </span>
                    {meta.label}
                    {!alive[i] && ' · mort'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <button type="button" className={btnGhost} onClick={() => setPhase('setup')}>
        Nouvelle partie
      </button>
    </div>
  )
}
