import { useState } from 'react'
import { MIN_WEREWOLF_PLAYERS, dealWerewolfRoles, werewolfCount, werewolfWinner } from '../engine'
import { isBoolArray, isIntIn } from '../session'
import { oneOf, useSessionState, when } from '../useSessionState'
import { NIGHT_STEPS, WEREWOLF_ROLES, WEREWOLF_SPECIALS } from '../content/werewolf'
import { useRoomPlayer } from '../room/hooks'
import PlayersEditor from './PlayersEditor'
import RoomReveal from './RoomReveal'
import { btnGhost, btnPrimary, cardEnter } from './buttons'

const DEFAULT_SPECIALS = ['seer', 'witch', 'hunter']

/**
 * Loup-Garou sur un téléphone : distribution secrète des rôles, puis le meneur
 * (qui ne joue pas) garde le téléphone et suit le script de la nuit.
 *
 * Partie à plusieurs téléphones : chacun voit son rôle sur son écran (les
 * loups voient leurs complices) ; le meneur est le téléphone qui ne joue pas.
 */
export default function Werewolf({ game, players, onPlayersChange }) {
  const [phase, setPhase] = useSessionState('phase', 'setup', oneOf(['setup', 'reveal', 'handover', 'narrate']))
  const [specials, setSpecials] = useSessionState(
    'specials',
    DEFAULT_SPECIALS,
    when((v) => Array.isArray(v) && v.every((id) => WEREWOLF_SPECIALS.includes(id))),
  )
  // Rôles et vivants ne sont repris que s'ils correspondent encore aux joueurs.
  const [roles, setRoles] = useSessionState(
    'roles',
    [],
    when((v) => Array.isArray(v) && v.length === players.length && v.every((r) => Object.hasOwn(WEREWOLF_ROLES, r))),
  )
  const [alive, setAlive] = useSessionState('alive', [], when((v) => isBoolArray(v, players.length)))
  const [revealIndex, setRevealIndex] = useSessionState(
    'revealIndex',
    0,
    when((v) => isIntIn(v, 0, Math.max(0, players.length - 1))),
  )
  // Jamais sauvegardé : après un rechargement, le rôle affiché est recaché.
  const [shown, setShown] = useState(false)
  const [night, setNight] = useSessionState('night', 1, when((v) => isIntIn(v, 1, 999)))
  const [step, setStep] = useSessionState('step', 0, when((v) => isIntIn(v, 0, 99)))
  // Une distribution = ses propres « j'ai vu mon rôle ».
  const [dealId, setDealId] = useSessionState('dealId', 'd')
  const { inRoom, myName, watchers } = useRoomPlayer()

  const ready = players.length >= MIN_WEREWOLF_PLAYERS
  const wolves = werewolfCount(Math.max(players.length, MIN_WEREWOLF_PLAYERS))
  const usableSpecials = specials.slice(0, Math.max(0, players.length - wolves - 1))
  const villagers = Math.max(0, players.length - wolves - usableSpecials.length)

  function toggleSpecial(id) {
    setSpecials((s) => (s.includes(id) ? s.filter((x) => x !== id) : WEREWOLF_SPECIALS.filter((x) => x === id || s.includes(x))))
  }

  function deal() {
    setRoles(dealWerewolfRoles(players.length, specials))
    setDealId(Math.random().toString(36).slice(2, 8))
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
          {inRoom
            ? 'Le meneur ne joue pas : sur son téléphone, « Inviter » puis décocher « Je joue ». Il suit le script, les autres voient leur rôle.'
            : 'Le meneur ne joue pas : n’ajoute que les joueurs. Il récupère le téléphone après la distribution des rôles.'}
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

  function roleFace(index) {
    const meta = WEREWOLF_ROLES[roles[index]]
    const pack =
      meta.team === 'wolves' && inRoom
        ? players.filter((_, i) => i !== index && WEREWOLF_ROLES[roles[i]].team === 'wolves')
        : []
    return (
      <>
        <p className="text-6xl" aria-hidden="true">
          {meta.emoji}
        </p>
        <p className={`mt-3 font-display text-3xl font-bold ${meta.team === 'wolves' ? 'text-rose-500' : 'text-emerald-500'}`}>
          {meta.label}
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">{meta.description}</p>
        {pack.length > 0 && (
          <p className="mt-3 text-sm">
            Tes complices : <strong>{pack.join(', ')}</strong>
          </p>
        )}
      </>
    )
  }

  if ((phase === 'reveal' || phase === 'handover') && inRoom) {
    return (
      <RoomReveal
        key={dealId}
        field={`seen-${dealId}`}
        players={players}
        gradient={game.gradient}
        renderRole={roleFace}
        startLabel="Tout le monde a son rôle, la nuit tombe"
        onStart={() => setPhase('narrate')}
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
  // Partie partagée : seul le meneur (téléphone qui ne joue pas) voit les rôles.
  // Sans meneur connecté, tout le monde garde les commandes, rôles masqués.
  const myIndex = myName ? players.indexOf(myName) : -1
  const narrator = !inRoom || myIndex < 0
  const controls = narrator || watchers === 0

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

      {!narrator && (
        <details className="glass-card rounded-3xl px-4 py-3">
          <summary className="cursor-pointer font-semibold">Mon rôle (à l’abri des regards)</summary>
          <div className="mt-3 flex flex-col items-center pb-2 text-center">{roleFace(myIndex)}</div>
        </details>
      )}

      {controls && (
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
      )}

      <section className="glass-card rounded-3xl p-4" aria-labelledby="ww-players-title">
        <h2 id="ww-players-title" className="mb-1 font-display text-lg font-bold">
          Joueurs
        </h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {controls ? 'Écran du meneur : touche un joueur pour le marquer mort.' : 'Le meneur marque les morts.'}
        </p>
        <ul className="flex flex-col gap-2">
          {players.map((name, i) => {
            const meta = WEREWOLF_ROLES[roles[i]]
            return (
              <li key={`${name}-${i}`}>
                <button
                  type="button"
                  aria-pressed={!alive[i]}
                  disabled={!controls}
                  onClick={() => setAlive((a) => a.map((v, j) => (j === i ? !v : v)))}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    alive[i]
                      ? 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                      : 'border-transparent bg-[var(--bg-elevated)] opacity-50'
                  }`}
                >
                  <span className={`font-semibold ${alive[i] ? '' : 'line-through'}`}>{name}</span>
                  {narrator ? (
                    <span className="text-sm text-[var(--text-secondary)]">
                      <span aria-hidden="true">{meta.emoji} </span>
                      {meta.label}
                      {!alive[i] && ' · mort'}
                    </span>
                  ) : (
                    !alive[i] && <span className="text-sm text-[var(--text-secondary)]">mort</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {controls && (
        <button type="button" className={btnGhost} onClick={() => setPhase('setup')}>
          Nouvelle partie
        </button>
      )}
    </div>
  )
}
