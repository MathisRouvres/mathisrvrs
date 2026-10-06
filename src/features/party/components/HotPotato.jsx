import { useEffect, useRef } from 'react'
import { advanceDeck, createDeck, currentCard, randomFuse } from '../engine'
import { isDeck } from '../session'
import { oneOf, useSessionState, when } from '../useSessionState'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { buzz, chime, useCountdown } from './useCountdown'

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

/**
 * Patate chaude : chacun cite un mot de la catégorie puis passe le téléphone.
 * La mèche a une durée secrète ; le tic-tac s'accélère, et celui qui tient le
 * téléphone à l'explosion prend la pénalité. Le son suit le bouton Son commun.
 */
export default function HotPotato({ game, level }) {
  const categories = game.cards[level]
  const [fuse, setFuse] = useSessionState('fuse', 'normal', oneOf(FUSE_OPTIONS.map((o) => o.value)))
  // Une mèche ne survit pas à un rechargement : on revient aux réglages.
  const [phase, setPhase] = useSessionState('phase', 'setup', oneOf(['setup', 'boom'], { play: 'setup' }))
  const [deck, setDeck] = useSessionState('deck', () => createDeck(categories.length), when((v) => isDeck(v, categories.length)))
  const endRef = useRef(0)
  const lengthRef = useRef(1)

  const timer = useCountdown(() => {
    chime('boom')
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
      chime(ratio < 0.25 ? 'urgent' : 'tick')
      buzz(15)
      id = setTimeout(tick, Math.max(140, 1000 * ratio))
    }
    tick()
    return () => clearTimeout(id)
  }, [phase])

  const category = categories[currentCard(deck) ?? 0]

  function light() {
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
        <section className="glass-card flex flex-col gap-3 rounded-3xl p-5">
          <p className="text-sm font-semibold">Mèche</p>
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
          <p className="text-xs text-[var(--text-muted)]">La durée exacte reste secrète. Le tic-tac suit le réglage Son.</p>
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
