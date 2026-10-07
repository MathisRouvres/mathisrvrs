import { useMemo, useState } from 'react'
import { GUESS_WHO_CODE_LENGTH, GUESS_WHO_SIZE, dealGuessWho, isGuessWhoCode, normalizeCode, randomCode } from '../engine'
import { isBoolArray, isIntIn } from '../session'
import { LEVEL_META } from '../usePartySettings'
import { oneOf, useSessionState, when } from '../useSessionState'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { sips } from './penalty'

const SEATS = ['p1', 'p2', 'solo']
const PLAYER = ['Joueur 1', 'Joueur 2']
const allUp = () => Array(GUESS_WHO_SIZE).fill(false)

/**
 * Qui est-ce ? à deux. Le plateau et les suspects secrets se déduisent du code,
 * du niveau et de la manche : deux téléphones avec le même code jouent la même
 * partie sans connexion. Mode « un seul téléphone » : un écran de passage
 * cache le plateau entre les deux joueurs.
 */
export default function GuessWho({ game, level }) {
  const pool = game.cards[level]
  const [code, setCode] = useSessionState('code', '', when((v) => v === '' || isGuessWhoCode(v)))
  const [seat, setSeat] = useSessionState('seat', '', oneOf(['', ...SEATS]))
  const [round, setRound] = useSessionState('round', 0, when((v) => isIntIn(v, 0, 9999)))
  const [viewer, setViewer] = useSessionState('viewer', 0, oneOf([0, 1]))
  const [down0, setDown0] = useSessionState('down0', allUp, when((v) => isBoolArray(v, GUESS_WHO_SIZE)))
  const [down1, setDown1] = useSessionState('down1', allUp, when((v) => isBoolArray(v, GUESS_WHO_SIZE)))
  const [verdict, setVerdict] = useSessionState(
    'verdict',
    null,
    when((v) => v === null || (Array.isArray(v) && v.length === 2 && isIntIn(v[0], 0, 1) && isIntIn(v[1], 0, GUESS_WHO_SIZE - 1))),
  )

  const [draft, setDraft] = useState(() => code || randomCode())
  const [showSecret, setShowSecret] = useState(false)
  const [accusing, setAccusing] = useState(false)
  const [pending, setPending] = useState(null)
  // Un seul téléphone : après un rechargement, rien n'est montré avant qu'on confirme qui tient le téléphone.
  const [covered, setCovered] = useState(true)

  const deal = useMemo(
    () => (code ? dealGuessWho(`${code}-${level}-${round}`, pool.length) : null),
    [code, level, round, pool.length],
  )

  if (!deal || !seat) {
    const ready = draft.length === GUESS_WHO_CODE_LENGTH
    const start = (s) => {
      setCode(draft)
      setSeat(s)
      setViewer(0)
      setCovered(true)
    }
    return (
      <div className="flex flex-col gap-4">
        <div className="glass-card rounded-3xl p-5">
          <label htmlFor="guess-who-code" className="text-sm font-semibold text-[var(--text-secondary)]">
            Code de partie
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="guess-who-code"
              value={draft}
              onChange={(e) => setDraft(normalizeCode(e.target.value))}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={GUESS_WHO_CODE_LENGTH}
              aria-describedby="guess-who-code-hint"
              className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 text-center font-display text-2xl font-bold uppercase tracking-[0.4em] outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            />
            <button type="button" className={`${btnGhost} shrink-0`} onClick={() => setDraft(randomCode())}>
              Nouveau
            </button>
          </div>
          <p id="guess-who-code-hint" className="mt-2 text-sm text-[var(--text-secondary)]">
            Deux téléphones : saisissez le même code et le même niveau ({LEVEL_META[level].label}), puis chacun choisit
            son camp.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {PLAYER.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`${btnPrimary} min-h-16 text-lg`}
              disabled={!ready}
              onClick={() => start(SEATS[i])}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className={btnGhost} disabled={!ready} onClick={() => start('solo')}>
          Un seul téléphone, on se le passe
        </button>
      </div>
    )
  }

  const solo = seat === 'solo'
  const me = solo ? viewer : seat === 'p1' ? 0 : 1
  const opponent = 1 - me
  const board = deal.board.map((i) => pool[i])
  const mine = board[deal.secrets[me]]
  const down = me === 0 ? down0 : down1
  const setDown = me === 0 ? setDown0 : setDown1
  const remaining = down.filter((d) => !d).length

  function resetTransient() {
    setShowSecret(false)
    setAccusing(false)
    setPending(null)
  }

  function tap(pos) {
    if (accusing) {
      setPending(pos)
      return
    }
    setDown((d) => d.map((v, i) => (i === pos ? !v : v)))
  }

  function confirmAccusation() {
    setVerdict([me, pending])
    resetTransient()
  }

  function passPhone() {
    resetTransient()
    setViewer(opponent)
    setCovered(true)
  }

  function rematch() {
    resetTransient()
    setVerdict(null)
    setDown0(allUp())
    setDown1(allUp())
    setRound((r) => r + 1)
    setViewer(0)
    setCovered(true)
  }

  function quit() {
    resetTransient()
    setVerdict(null)
    setDown0(allUp())
    setDown1(allUp())
    setRound(0)
    setSeat('')
    setCode('')
    setDraft(randomCode())
  }

  const header = (
    <p className="text-center text-sm text-[var(--text-secondary)]">
      Code <span className="font-mono font-bold tracking-widest text-[var(--text-primary)]">{code}</span> ·{' '}
      {LEVEL_META[level].label}
      {round > 0 && ` · manche ${round + 1}`}
      {!solo && ` · ${PLAYER[me]}`}
    </p>
  )

  if (verdict) {
    const [by, pos] = verdict
    const accused = board[pos]
    const target = board[deal.secrets[1 - by]]
    const correct = pos === deal.secrets[1 - by]
    const loser = correct ? 1 - by : by
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div
          aria-live="polite"
          className={`rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl ${cardEnter}`}
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-white/75">
            {correct ? '🎯 Bien vu' : '💥 Raté'} — {PLAYER[by]} accusait {accused.name}
          </p>
          <p className="mt-3 text-5xl" aria-hidden="true">
            {target.emoji}
          </p>
          <p className="mt-2 font-display text-2xl font-bold leading-snug">C’était {target.name}.</p>
          <p className="mt-2 text-white/85">{target.record}</p>
          <p className="mt-5 rounded-2xl bg-black/25 p-4 text-lg font-bold">
            {PLAYER[1 - loser]} gagne. {PLAYER[loser]} prend {sips(level, 3)}.
          </p>
        </div>
        <button type="button" className={`${btnPrimary} min-h-14 w-full text-lg`} onClick={rematch}>
          Revanche
        </button>
        <button type="button" className={btnGhost} onClick={quit}>
          Changer de code
        </button>
      </div>
    )
  }

  if (solo && covered) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div
          className={`flex min-h-64 flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-center text-white shadow-xl`}
        >
          <p className="text-5xl" aria-hidden="true">
            📱
          </p>
          <p className="font-display text-2xl font-bold">Au tour de {PLAYER[me]}</p>
          <p className="text-white/80">Passe le téléphone sans regarder le plateau.</p>
        </div>
        <button type="button" className={`${btnPrimary} min-h-14 w-full text-lg`} onClick={() => setCovered(false)}>
          C’est moi, {PLAYER[me]}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {header}

      <div className="glass-card flex items-center gap-3 rounded-3xl p-4">
        <span className="text-4xl" aria-hidden="true">
          {showSecret ? mine.emoji : '❓'}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Suspect secret de {PLAYER[me]}
          </p>
          {showSecret ? (
            <>
              <p className="font-display text-lg font-bold leading-tight">{mine.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{mine.record}</p>
            </>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">Caché. Regarde-le à l’abri des regards.</p>
          )}
        </div>
        <button
          type="button"
          aria-pressed={showSecret}
          className={`${btnGhost} min-h-10 shrink-0 px-3 text-sm`}
          onClick={() => setShowSecret((s) => !s)}
        >
          {showSecret ? 'Cacher' : 'Voir'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold" aria-live="polite">
          {remaining} suspect{remaining > 1 ? 's' : ''} encore debout
        </p>
        <button
          type="button"
          aria-pressed={accusing}
          className={`${accusing ? btnPrimary : btnGhost} min-h-10 px-4 text-sm`}
          onClick={() => {
            setAccusing((a) => !a)
            setPending(null)
          }}
        >
          {accusing ? 'Annuler' : '🫵 Accuser'}
        </button>
      </div>

      {accusing && (
        <p
          role="status"
          className="rounded-2xl border border-[var(--accent)] bg-[var(--bg-elevated)] p-3 text-center text-sm"
        >
          {pending === null ? (
            'Touche le suspect que tu accuses.'
          ) : (
            <>
              Tu accuses <strong>{board[pending].name}</strong> ? Erreur = défaite.
            </>
          )}
        </p>
      )}
      {accusing && pending !== null && (
        <button type="button" className={`${btnPrimary} min-h-14 w-full text-lg`} onClick={confirmAccusation}>
          J’accuse {board[pending].name}
        </button>
      )}

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Plateau des suspects">
        {board.map((s, pos) => {
          const isDown = down[pos]
          const selected = accusing && pending === pos
          return (
            <li key={s.name}>
              <button
                type="button"
                aria-pressed={accusing ? selected : isDown}
                aria-label={accusing ? `Accuser ${s.name}` : `${s.name}${isDown ? ', rabattu' : ''}`}
                disabled={accusing && isDown}
                onClick={() => tap(pos)}
                className={`relative flex h-full min-h-28 w-full flex-col items-center justify-start gap-1 rounded-2xl border bg-[var(--bg-elevated)] p-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed motion-safe:duration-200 ${
                  selected
                    ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]'
                    : 'border-[var(--border-color)] hover:border-[var(--accent)]'
                } ${isDown ? 'motion-safe:scale-95' : ''}`}
              >
                <span
                  className={`flex h-full w-full flex-col items-center gap-1 transition ${isDown ? 'opacity-25 grayscale' : ''}`}
                >
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {s.emoji}
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold leading-tight">{s.name}</span>
                  <span className="mt-auto flex gap-1 text-xs" aria-hidden="true">
                    <span>{s.flag}</span>
                    {s.convicted && <span>⚖️</span>}
                    {s.dead && <span>⚰️</span>}
                  </span>
                </span>
                {isDown && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center text-5xl font-black text-red-500/80"
                  >
                    ✕
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-center text-xs text-[var(--text-muted)]">⚖️ condamné · ⚰️ mort · drapeau : pays</p>

      {solo && (
        <button type="button" className={`${btnPrimary} min-h-14 w-full`} onClick={passPhone}>
          Fin du tour, passer à {PLAYER[opponent]}
        </button>
      )}

      <details className="glass-card rounded-2xl px-4 py-3">
        <summary className="cursor-pointer font-semibold">📖 Casiers des 24 suspects</summary>
        <ul className="mt-2 space-y-2 text-sm">
          {board.map((s) => (
            <li key={s.name}>
              <span aria-hidden="true">{s.emoji} </span>
              <strong>{s.name}</strong> <span className="text-[var(--text-secondary)]">— {s.record}</span>
            </li>
          ))}
        </ul>
      </details>

      <button type="button" className={btnGhost} onClick={quit}>
        Quitter la partie
      </button>
    </div>
  )
}
