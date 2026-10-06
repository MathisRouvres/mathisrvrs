import { useEffect, useRef, useState } from 'react'
import { pickSome } from '../engine'
import { btnGhost, btnPrimary, cardEnter } from './buttons'
import { buzz } from './useCountdown'

const SEGMENTS = 8
const SPIN_MS = 4000
const SLICE = 360 / SEGMENTS
const COLORS = ['#e11d48', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const SIZE = 300
const R = SIZE / 2

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Point du cercle à `angle` degrés, mesuré depuis le haut dans le sens horaire. */
function point(angle, radius = R) {
  const rad = ((angle - 90) * Math.PI) / 180
  return [R + radius * Math.cos(rad), R + radius * Math.sin(rad)]
}

function slicePath(i) {
  const [x1, y1] = point(i * SLICE)
  const [x2, y2] = point((i + 1) * SLICE)
  return `M ${R} ${R} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`
}

/** Roue des gages : 8 cases tirées du paquet du niveau, un gage à chaque tour de roue. */
export default function Wheel({ game, level }) {
  const pool = game.cards[level]
  const [segments, setSegments] = useState(() => pickSome(pool, SEGMENTS))
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [reduced, setReduced] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function spin() {
    const target = Math.floor(Math.random() * SEGMENTS)
    const center = target * SLICE + SLICE / 2
    const current = ((rotation % 360) + 360) % 360
    const turns = 5 + Math.floor(Math.random() * 3)
    // Pour amener le centre de la case cible sous le pointeur (en haut).
    const delta = ((360 - center - current + 720) % 360) + 360 * turns
    const noMotion = prefersReducedMotion()
    setReduced(noMotion)
    setRotation((r) => r + delta)
    setSpinning(true)
    setResult(null)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(
      () => {
        setSpinning(false)
        setResult(target)
        buzz(120)
      },
      noMotion ? 50 : SPIN_MS,
    )
  }

  function renew() {
    setSegments(pickSome(pool, SEGMENTS))
    setResult(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto w-full max-w-sm">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 -translate-y-1 border-x-[14px] border-t-[24px] border-x-transparent border-t-[var(--text-primary)] drop-shadow"
        />
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Roue de ${SEGMENTS} gages : ${segments.map((s) => s.label).join(', ')}`}
          className="w-full drop-shadow-xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: reduced ? 'none' : `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.7, 0.08, 1)`,
          }}
        >
          {segments.map((s, i) => {
            const center = i * SLICE + SLICE / 2
            return (
              <g key={`${s.text}-${i}`}>
                <path d={slicePath(i)} fill={COLORS[i % COLORS.length]} stroke="#ffffff" strokeWidth="2" />
                <g transform={`rotate(${center} ${R} ${R})`}>
                  <text
                    x={R}
                    y={22}
                    transform={`rotate(90 ${R} 22)`}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    dominantBaseline="middle"
                  >
                    {s.label}
                  </text>
                </g>
              </g>
            )
          })}
          <circle cx={R} cy={R} r={20} fill="#ffffff" />
          <circle cx={R} cy={R} r={12} fill="#0f172a" />
        </svg>
      </div>

      <div aria-live="polite">
        {result !== null && !spinning ? (
          <div className={`rounded-3xl bg-gradient-to-br ${game.gradient} p-6 text-white shadow-xl ${cardEnter}`}>
            <p className="text-sm font-semibold uppercase tracking-wider text-white/75">{segments[result].label}</p>
            <p className="mt-2 font-display text-xl font-bold leading-snug">{segments[result].text}</p>
          </div>
        ) : (
          <p className="text-center font-display text-xl font-bold">
            {spinning ? 'La roue tourne…' : 'À qui le tour ? Lance la roue !'}
          </p>
        )}
      </div>

      <button type="button" className={`${btnPrimary} min-h-16 w-full text-lg`} disabled={spinning} onClick={spin}>
        {result === null ? 'Lancer la roue' : 'Relancer la roue'}
      </button>
      <button type="button" className={btnGhost} disabled={spinning} onClick={renew}>
        Nouvelles cases
      </button>
    </div>
  )
}
