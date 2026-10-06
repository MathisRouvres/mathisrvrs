import { useEffect, useRef, useState } from 'react'
import { advanceDeck, createDeck, currentCard, randomFuse } from '../engine'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { buzz, useCountdown } from './useCountdown'

const FUSE_OPTIONS = [
  { value: 'short', label: 'Courte' },
  { value: 'normal', label: 'Normale' },
  { value: 'long', label: 'Longue' },
]

const PENALTY = {
  soft: 'fait un gage choisi par le groupe',
  spicy: 'boit deux gorgées',
  hot: 'retire un accessoire ou boit deux gorgées',
}

/** Bip court (tic-tac) ou grave (explosion), si le navigateur sait jouer du son. */
function beep(ctx, frequency, duration) {
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = frequency
    osc.type = frequency < 200 ? 'sawtooth' : 'square'
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio indisponible : le jeu reste jouable en silence.
  }
}

/**
 * Patate chaude : chacun cite un mot de la catégorie puis passe le téléphone.
 * La mèche a une durée secrète ; le tic-tac s'accélère, et celui qui tient le
 * téléphone à l'explosion prend la pénalité.
 */
export default function HotPotato({ game, level }) {
  const categories = game.cards[level]
  const [fuse, setFuse] = useState('normal')
  const [sound, setSound] = useState(true)
  const [phase, setPhase] = useState('setup')
  const [deck, setDeck] = useState(() => createDeck(categories.length))
  const audioRef = useRef(null)
  const endRef = useRef(0)
  const lengthRef = useRef(1)

  const timer = useCountdown(() => {
    beep(audioRef.current, 70, 0.6)
    buzz(800)
    setPhase('boom')
  })

  // Tic-tac : de plus en plus rapide à l'approche de l'explosion.
  useEffect(() => {
    if (phase !== 'play') return undefined
    let id
    const tick = () => {
      const left = endRef.current - Date.now()
      if (left <= 0) return
      const ratio = left / lengthRef.current
      beep(audioRef.current, ratio < 0.25 ? 1320 : 880, 0.05)
      buzz(15)
      id = setTimeout(tick, Math.max(140, 1000 * ratio))
    }
    tick()
    return () => clearTimeout(id)
  }, [phase])

  useEffect(() => {
    const audio = audioRef
    return () => audio.current?.close?.()
  }, [])

  const category = categories[currentCard(deck) ?? 0]

  function light() {
    if (sound && !audioRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        audioRef.current = AudioCtx ? new AudioCtx() : null
      } catch {
        audioRef.current = null
      }
    }
    if (!sound && audioRef.current) {
      audioRef.current.close?.()
      audioRef.current = null
    }
    const seconds = randomFuse(fuse)
    lengthRef.current = seconds * 1000
    endRef.current = Date.now() + seconds * 1000
    setDeck((d) => advanceDeck(d))
    setPhase('play')
    timer.start(seconds)
  }

  if (phase === 'setup') {
    return (
      <div className="flex flex-col gap-4">
        <section className="glass-card flex flex-col gap-4 rounded-3xl p-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Mèche</p>
            <div role="radiogroup" aria-label="Longueur de la mèche" className="grid grid-cols-3 gap-2">
              {FUSE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={fuse === o.value}
                  onClick={() => setFuse(o.value)}
                  className={`min-h-11 rounded-2xl border text-sm font-semibold transition ${
                    fuse === o.value
                      ? 'border-transparent bg-[var(--accent)] text-white dark:text-[#070b14]'
                      : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="font-semibold">Tic-tac sonore</span>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="h-6 w-6 shrink-0 accent-[var(--accent)]"
            />
          </label>
        </section>
        <button type="button" className={`${btnPrimary} min-h-16 w-full text-lg`} onClick={light}>
          Allumer la mèche
        </button>
      </div>
    )
  }

  if (phase === 'boom') {
    return (
      <div className="flex flex-col gap-4">
        <div
          role="alert"
          className={`flex min-h-80 flex-col items-center justify-center rounded-3xl bg-rose-600 p-6 text-center text-white shadow-xl ${cardEnter}`}
        >
          <p className="text-7xl" aria-hidden="true">
            💥
          </p>
          <p className="mt-2 font-display text-5xl font-bold">BOUM !</p>
          <p className="mt-3 text-lg text-white/90">Celui qui tient le téléphone {PENALTY[level]}.</p>
        </div>
        <button type="button" className={`${btnPrimary} min-h-16 w-full text-lg`} onClick={light}>
          Rallumer la mèche
        </button>
        <button type="button" className={btnGhost} onClick={() => setPhase('setup')}>
          Réglages
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        key={`${deck.position}-${category}`}
        className={`flex min-h-80 flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-center text-white shadow-xl ${cardEnter}`}
      >
        <p className="text-6xl motion-safe:animate-pulse" aria-hidden="true">
          💣
        </p>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-white/75">{game.prefix}</p>
        <p className="mt-2 font-display text-3xl font-bold leading-snug">{category}</p>
        <p className="mt-4 text-sm text-white/85">Un mot, puis passe le téléphone à ton voisin !</p>
      </div>
      <button type="button" className={btnGhost} onClick={() => setDeck((d) => advanceDeck(d))}>
        Changer de catégorie
      </button>
    </div>
  )
}
