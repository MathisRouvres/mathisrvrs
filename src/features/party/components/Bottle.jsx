import { useEffect, useRef, useState } from 'react'
import { isIntIn } from '../session'
import { useSessionState, when } from '../useSessionState'
import { truths } from '../content/truths'
import { dares } from '../content/dares'
import PlayersEditor from './PlayersEditor'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { buzz } from './useCountdown'

const SPIN_MS = 3200
const MIN_PLAYERS = 2

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const pick = (items) => items[Math.floor(Math.random() * items.length)]

/** Jeu de la bouteille : elle tourne, désigne un joueur, qui choisit Action ou Vérité. */
export default function Bottle({ game, level, players, onPlayersChange }) {
  const [playing, setPlaying] = useSessionState('playing', false)
  const [rotation, setRotation] = useSessionState('rotation', 0, when(Number.isFinite))
  const [spinning, setSpinning] = useState(false)
  const [selected, setSelected] = useSessionState(
    'selected',
    null,
    when((v) => isIntIn(v, 0, Math.max(0, players.length - 1))),
  )
  const [prompt, setPrompt] = useSessionState(
    'prompt',
    null,
    when((v) => typeof v?.kind === 'string' && typeof v.text === 'string'),
  )
  const [reduced, setReduced] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const ready = players.length >= MIN_PLAYERS

  function spin() {
    const n = players.length
    const target = Math.floor(Math.random() * n)
    const current = ((rotation % 360) + 360) % 360
    const turns = 4 + Math.floor(Math.random() * 3)
    const delta = ((target * (360 / n) - current + 360) % 360) + 360 * turns
    const noMotion = prefersReducedMotion()
    setReduced(noMotion)
    setRotation((r) => r + delta)
    setSpinning(true)
    setSelected(null)
    setPrompt(null)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(
      () => {
        setSpinning(false)
        setSelected(target)
        buzz(80)
      },
      noMotion ? 50 : SPIN_MS,
    )
  }

  if (!playing || !ready) {
    return (
      <div className="flex flex-col gap-4">
        <PlayersEditor players={players} onChange={onPlayersChange} min={MIN_PLAYERS} />
        <button type="button" className={`${btnPrimary} w-full`} disabled={!ready} onClick={() => setPlaying(true)}>
          Poser la bouteille
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto aspect-square w-full max-w-sm">
        <div className={`absolute inset-[14%] rounded-full bg-gradient-to-br ${game.gradient} opacity-90 shadow-xl`} />
        {players.map((name, i) => {
          const angle = (i * 2 * Math.PI) / players.length
          return (
            <span
              key={`${name}-${i}`}
              className={`absolute max-w-[30%] -translate-x-1/2 -translate-y-1/2 truncate rounded-full px-3 py-1 text-sm font-semibold transition ${
                selected === i
                  ? 'z-10 scale-110 bg-[var(--accent)] text-white dark:text-[#070b14]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow'
              }`}
              style={{ left: `${50 + 44 * Math.sin(angle)}%`, top: `${50 - 44 * Math.cos(angle)}%` }}
            >
              {name}
            </span>
          )
        })}
        <svg
          viewBox="0 0 40 120"
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[52%] drop-shadow-lg"
          style={{
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transition: reduced ? 'none' : `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.65, 0.1, 1)`,
          }}
        >
          <rect x="15" y="2" width="10" height="8" rx="2" fill="#f59e0b" />
          <rect x="14" y="10" width="12" height="32" rx="3" fill="#166534" />
          <path d="M14 40 Q6 52 6 64 L6 112 Q6 118 12 118 L28 118 Q34 118 34 112 L34 64 Q34 52 26 40 Z" fill="#15803d" />
          <rect x="9" y="70" width="22" height="26" rx="3" fill="#fef3c7" />
        </svg>
      </div>

      <p aria-live="polite" className="text-center font-display text-2xl font-bold">
        {spinning ? 'La bouteille tourne…' : selected !== null ? `${players[selected]} !` : 'Fais tourner la bouteille'}
      </p>

      {selected !== null && !spinning && !prompt && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={btnPrimary} onClick={() => setPrompt({ kind: 'Action', text: pick(dares[level]) })}>
            Action
          </button>
          <button type="button" className={btnPrimary} onClick={() => setPrompt({ kind: 'Vérité', text: pick(truths[level]) })}>
            Vérité
          </button>
        </div>
      )}

      {prompt && (
        <div className={`rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl ${cardEnter}`}>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/75">
            {prompt.kind} pour {players[selected]}
          </p>
          <p className="mt-2 font-display text-xl font-bold leading-snug">{prompt.text}</p>
        </div>
      )}

      <button type="button" className={`${btnPrimary} w-full`} disabled={spinning} onClick={spin}>
        {selected === null ? 'Faire tourner' : 'Relancer la bouteille'}
      </button>
      <button type="button" className={btnGhost} disabled={spinning} onClick={() => setPlaying(false)}>
        Modifier les joueurs
      </button>
    </div>
  )
}
