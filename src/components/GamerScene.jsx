import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useThemeContext } from '../hooks/useThemeContext'
import '../styles/gamer-scene.css'

const CX = 240
const VB = '0 0 480 348'

function getLayout(isDark) {
  if (isDark) {
    const mon = { x: 48, y: 28, w: 384, h: 218, curved: true }
    return {
      mon,
      deskY: 278,
      kb: { x: 118, y: 258, w: 176, h: 15 },
      mouse: { x: 312, y: 259 },
    }
  }
  const mon = { x: 68, y: 32, w: 344, h: 208, curved: false }
  return {
    mon,
    deskY: 280,
    kb: { x: 148, y: 260, w: 128, h: 14 },
    mouse: { x: 298, y: 260 },
  }
}

const TERMINAL_LINES = [
  ['❯ ssh prod-node', '  auth verified', '  tunnel open'],
  ['❯ deploy --watch', '  building assets…', '  live ✓'],
  ['❯ stream logs', '  144 fps stable', '  sync ok'],
]

const CODE_SNIPPETS = [
  ['export const App = () => {', '  return <Shell />', '}'],
  ['async function load() {', '  await fetchData()', '}'],
]

function LayerSvg({ className, children, withDefs = false }) {
  return (
    <svg className={`scene-layer ${className}`} viewBox={VB} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      {withDefs && <SceneDefs />}
      {children}
    </svg>
  )
}

function SceneDefs() {
  return (
    <defs>
      <linearGradient id="gs-desk-pro" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>
      <linearGradient id="gs-desk-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0a0f18" />
      </linearGradient>
      <linearGradient id="gs-bezel-pro" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#a1a1aa" />
      </linearGradient>
      <linearGradient id="gs-bezel-dark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1a2233" />
        <stop offset="100%" stopColor="#080c14" />
      </linearGradient>
      <linearGradient id="gs-rgb" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#4ade80" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="gs-screen-shine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
        <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="gs-halo" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="gs-halo-dark" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
      </linearGradient>
      <filter id="gs-shadow">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.18" />
      </filter>
      <filter id="gs-neon">
        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#22d3ee" floodOpacity="0.35" />
      </filter>
      <pattern id="gs-scan" width="4" height="4" patternUnits="userSpaceOnUse">
        <line x1="0" y1="2" x2="4" y2="2" stroke="#22d3ee" strokeWidth="0.5" opacity="0.3" />
      </pattern>
      <clipPath id="gs-screen-clip">
        <rect id="gs-screen-clip-rect" x="0" y="0" width="480" height="348" />
      </clipPath>
    </defs>
  )
}

function ProScreen({ ix, iy, iw, ih, animate, codeIndex }) {
  const lines = CODE_SNIPPETS[codeIndex]
  const chartBase = iy + ih - 52
  return (
    <g>
      {/* Title bar */}
      <rect x={ix} y={iy} width={iw} height={16} fill="#1e293b" />
      <circle cx={ix + 10} cy={iy + 8} r={2.5} fill="#f87171" />
      <circle cx={ix + 20} cy={iy + 8} r={2.5} fill="#fbbf24" />
      <circle cx={ix + 30} cy={iy + 8} r={2.5} fill="#4ade80" />
      <text x={ix + iw / 2 - 28} y={iy + 11} fill="#64748b" fontSize="7" fontFamily="system-ui">app/dashboard.tsx</text>

      {/* Sidebar */}
      <rect x={ix} y={iy + 16} width={44} height={ih - 16} fill="#f1f5f9" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={ix + 10} y={iy + 26 + i * 16} width={26} height={6} rx={2} fill={i === 0 ? '#c7d2fe' : '#e2e8f0'} className={animate && i === 0 ? 'scene-code-line-1' : undefined} />
      ))}

      {/* Code editor */}
      <rect x={ix + 48} y={iy + 16} width={iw - 48} height={ih * 0.48} fill="#0f172a" />
      {lines.map((line, i) => (
        <text key={`${codeIndex}-${line}`} x={ix + 54} y={iy + 32 + i * 13} fill={i === 0 ? '#93c5fd' : '#64748b'} fontSize="8.5" fontFamily="'JetBrains Mono', monospace" className={animate ? `scene-code-line-${i + 1}` : undefined}>
          {line}
        </text>
      ))}
      <rect x={ix + iw - 24} y={iy + 44} width={2} height={11} fill="#818cf8" className={animate ? 'animate-blink-cursor' : undefined} />

      {/* Dashboard cards */}
      <rect x={ix + 48} y={iy + 16 + ih * 0.48} width={iw - 48} height={ih * 0.52 - 16} fill="#fafafa" />
      <text x={ix + 54} y={iy + 16 + ih * 0.48 + 14} fill="#94a3b8" fontSize="7" fontFamily="system-ui">Analytics</text>

      {[0, 1, 2].map((i) => (
        <g key={i} className={animate ? `scene-card-anim-${i + 1}` : undefined}>
          <rect x={ix + 54 + i * 72} y={chartBase - 38} width={62} height={44} rx={4} fill="#fff" stroke="#e2e8f0" strokeWidth="0.6" />
          <rect x={ix + 60 + i * 72} y={chartBase - 8} width={12} height={20} rx={1.5} fill="#6366f1" opacity="0.5" className={animate ? 'scene-bar-anim' : undefined} style={{ animationDelay: `${i * 0.3}s` }} />
          <rect x={ix + 76 + i * 72} y={chartBase - 16} width={12} height={28} rx={1.5} fill="#3b5bdb" opacity="0.45" className={animate ? 'scene-bar-anim' : undefined} style={{ animationDelay: `${i * 0.3 + 0.15}s` }} />
          <rect x={ix + 92 + i * 72} y={chartBase - 12} width={12} height={24} rx={1.5} fill="#818cf8" opacity="0.4" className={animate ? 'scene-bar-anim' : undefined} style={{ animationDelay: `${i * 0.3 + 0.3}s` }} />
        </g>
      ))}

      {/* Metric line */}
      <rect x={ix + 54} y={chartBase + 14} width={iw - 66} height={4} rx={2} fill="#e2e8f0" />
      <rect x={ix + 54} y={chartBase + 14} width={animate ? iw * 0.55 : iw * 0.4} height={4} rx={2} fill="#6366f1" opacity="0.35" className={animate ? 'scene-code-line-3' : undefined} />

      <rect x={ix} y={iy} width={iw} height={ih * 0.4} fill="url(#gs-screen-shine)" />
    </g>
  )
}

function CyberScreen({ ix, iy, iw, ih, animate, termIndex }) {
  const lines = TERMINAL_LINES[termIndex]
  return (
    <g>
      <rect x={ix} y={iy} width={iw} height={16} fill="#0a0f18" stroke="#22d3ee" strokeWidth="0.3" strokeOpacity="0.2" />
      <text x={ix + 10} y={iy + 11} fill="#64748b" fontSize="7" fontFamily="monospace">term — zsh</text>
      <circle cx={ix + iw - 14} cy={iy + 8} r={3} fill="#22d3ee" opacity="0.5" className={animate ? 'scene-screen-glow' : undefined} />

      {animate && (
        <>
          <rect x={ix} y={iy + 16} width={iw} height={ih - 16} fill="url(#gs-scan)" opacity="0.04" className="scene-scanline" />
          <rect x={ix} y={iy + 16} width={iw} height={ih - 16} fill="#22d3ee" opacity="0.03" className="scene-scan-sweep" />
        </>
      )}

      {lines.map((line, i) => (
        <text key={`${termIndex}-${line}`} x={ix + 12} y={iy + 34 + i * 16} fill={i === 0 ? '#67e8f9' : i === 1 ? '#86efac' : '#94a3b8'} fontSize="9" fontFamily="'JetBrains Mono', monospace" opacity="0.92" className={animate ? `scene-code-line-${i + 1}` : undefined}>
          {line}
        </text>
      ))}

      {/* Activity grid */}
      <g opacity="0.45">
        {[0, 1, 2, 3, 4, 5].map((c) => (
          <rect key={c} x={ix + 12 + (c % 3) * 36} y={iy + ih - 52 + Math.floor(c / 3) * 22} width={28} height={14} rx={2} fill={['#22d3ee', '#4ade80', '#a855f7'][c % 3]} className={animate ? `scene-code-line-${(c % 3) + 1}` : undefined} />
        ))}
      </g>

      <rect x={ix + iw - 22} y={iy + ih - 22} width={6} height={10} fill="#67e8f9" opacity="0.9" className={animate ? 'animate-blink-cursor' : undefined} />
      {animate && (
        <g>
          <circle cx={ix + iw - 38} cy={iy + ih - 16} r={2} fill="#67e8f9" className="scene-typing-dot-1" />
          <circle cx={ix + iw - 32} cy={iy + ih - 16} r={2} fill="#67e8f9" className="scene-typing-dot-2" />
          <circle cx={ix + iw - 26} cy={iy + ih - 16} r={2} fill="#67e8f9" className="scene-typing-dot-3" />
        </g>
      )}
    </g>
  )
}

function LayerMonitor({ isDark, layout, animate, codeIndex, termIndex }) {
  const { mon } = layout
  const monBottom = mon.y + mon.h
  const ix = mon.x + 10
  const iy = mon.y + 10
  const iw = mon.w - 20
  const ih = mon.h - 20
  const standBot = layout.deskY - 10

  return (
    <LayerSvg className="scene-z-mon">
      <ellipse cx={CX} cy={layout.deskY - 4} rx={mon.w / 2 + 20} ry={10} fill="#000" opacity={isDark ? 0.35 : 0.1} />
      <g filter={isDark ? 'url(#gs-neon)' : 'url(#gs-shadow)'} className="transition-all duration-[400ms]">
        <rect x={CX - 12} y={monBottom} width={24} height={standBot - monBottom} rx={3} fill={isDark ? '#1e293b' : '#a1a1aa'} />
        <rect x={CX - 36} y={layout.deskY - 14} width={72} height={7} rx={3} fill={isDark ? '#334155' : '#71717a'} />

        {mon.curved ? (
          <path
            d={`M ${mon.x + 6} ${mon.y + 4} Q ${CX} ${mon.y - 4} ${mon.x + mon.w - 6} ${mon.y + 4}
                L ${mon.x + mon.w - 2} ${monBottom - 2} Q ${CX} ${monBottom + 2} ${mon.x + 2} ${monBottom - 2} Z`}
            fill="url(#gs-bezel-dark)" stroke="#334155" strokeWidth="0.8"
          />
        ) : (
          <>
            <rect x={mon.x} y={mon.y} width={mon.w} height={mon.h} rx={8} fill="url(#gs-bezel-pro)" stroke="#d4d4d8" strokeWidth="0.8" />
            <rect x={mon.x + 3} y={mon.y + 3} width={mon.w - 6} height={5} rx={2} fill="#fff" opacity="0.55" />
          </>
        )}

        <rect x={ix} y={iy} width={iw} height={ih} rx={mon.curved ? 6 : 4} fill="#030712" />
        {isDark ? (
          <CyberScreen ix={ix} iy={iy} iw={iw} ih={ih} animate={animate} termIndex={termIndex} />
        ) : (
          <ProScreen ix={ix} iy={iy} iw={iw} ih={ih} animate={animate} codeIndex={codeIndex} />
        )}

        {isDark && <rect x={mon.x + 6} y={monBottom - 2} width={mon.w - 12} height={2.5} rx={1} fill="url(#gs-rgb)" opacity="0.85" />}
      </g>
    </LayerSvg>
  )
}

function LayerDesk({ isDark, layout }) {
  const y = layout.deskY
  return (
    <LayerSvg className="scene-z-desk" withDefs>
      <path d={`M 40 ${y + 6} L 440 ${y + 6} L 434 ${y + 18} L 46 ${y + 18} Z`} fill={isDark ? '#060a10' : '#64748b'} opacity="0.5" />
      <path d={`M 36 ${y} L 444 ${y} L 440 ${y + 14} L 40 ${y + 14} Z`} fill={isDark ? 'url(#gs-desk-dark)' : 'url(#gs-desk-pro)'} />
      <rect x={56} y={y + 14} width={14} height={36} rx={2} fill={isDark ? '#141c28' : '#94a3b8'} />
      <rect x={410} y={y + 14} width={14} height={36} rx={2} fill={isDark ? '#141c28' : '#94a3b8'} />
    </LayerSvg>
  )
}

function LayerPeriph({ isDark, layout, animate }) {
  const { kb, mouse } = layout
  return (
    <LayerSvg className="scene-z-periph">
      {/* Clavier */}
      <rect x={kb.x - 1} y={kb.y + kb.h} width={kb.w + 2} height={2} rx={1} fill="#000" opacity="0.12" />
      <rect x={kb.x} y={kb.y} width={kb.w} height={kb.h} rx={4} fill={isDark ? '#0a0f18' : '#fafafa'} stroke={isDark ? '#22d3ee' : '#cbd5e1'} strokeWidth={0.5} strokeOpacity={isDark ? 0.3 : 1} />
      {Array.from({ length: isDark ? 14 : 11 }).map((_, i) => (
        <rect key={i} x={kb.x + 4 + i * (isDark ? 11.5 : 10.5)} y={kb.y + 4} width={isDark ? 9 : 7.5} height={3} rx={1} fill={isDark ? (i % 4 === 0 ? '#22d3ee' : '#141c28') : '#e2e8f0'} opacity={0.9} className={isDark && animate && i % 5 === 0 ? 'scene-key-glow' : undefined} style={i % 5 === 0 ? { animationDelay: `${i * 0.1}s` } : undefined} />
      ))}

      {/* Souris + tapis */}
      <rect x={mouse.x - 20} y={mouse.y + 1} width={44} height={16} rx={4} fill={isDark ? '#0a0f18' : '#e2e8f0'} opacity={0.75} className="scene-detail" />
      <ellipse cx={mouse.x} cy={mouse.y + 7} rx={10} ry={13} fill={isDark ? '#141c28' : '#71717a'} stroke={isDark ? '#a855f7' : '#52525b'} strokeWidth={0.4} strokeOpacity={0.4} />

      {/* Lampe — light only */}
      {!isDark && (
        <g className="scene-detail">
          <line x1={420} y1={layout.deskY - 68} x2={420} y2={layout.deskY - 6} stroke="#94a3b8" strokeWidth={1.8} />
          <path d={`M 404 ${layout.deskY - 68} Q 420 ${layout.deskY - 86} 436 ${layout.deskY - 68} L 430 ${layout.deskY - 52} Q 420 ${layout.deskY - 58} 410 ${layout.deskY - 52} Z`} fill="#fbbf24" opacity={0.88} />
        </g>
      )}

      {isDark && animate && (
        <ellipse cx={kb.x + kb.w / 2} cy={kb.y + kb.h + 8} rx={kb.w / 2 + 6} ry={5} fill="#22d3ee" opacity={0.06} className="scene-halo-pulse scene-detail" />
      )}
    </LayerSvg>
  )
}

function LayerFx({ isDark, layout, animate }) {
  const { mon } = layout
  if (!animate) return null
  return (
    <LayerSvg className="scene-z-fx">
      <ellipse cx={CX} cy={mon.y + mon.h / 2} rx={mon.w / 2 + 16} ry={mon.h / 2 + 10} fill="none" stroke="url(#gs-rgb)" strokeWidth={isDark ? 0.8 : 0.4} opacity={isDark ? 0.18 : 0.07} className="scene-halo-pulse" />
      <rect x={mon.x - 12} y={mon.y - 10} width={mon.w + 24} height={mon.h + 20} rx={14} fill={isDark ? 'url(#gs-halo-dark)' : 'url(#gs-halo)'} className="scene-halo-pulse" />
    </LayerSvg>
  )
}

function SceneLayers({ isDark, layout, animate }) {
  const [codeIndex, setCodeIndex] = useState(0)
  const [termIndex, setTermIndex] = useState(0)

  useEffect(() => {
    if (!animate) return undefined
    const ms = isDark ? 3200 : 4500
    const id = window.setInterval(() => {
      if (isDark) setTermIndex((i) => (i + 1) % TERMINAL_LINES.length)
      else setCodeIndex((i) => (i + 1) % CODE_SNIPPETS.length)
    }, ms)
    return () => window.clearInterval(id)
  }, [animate, isDark])

  return (
    <>
      <LayerDesk isDark={isDark} layout={layout} />
      <LayerMonitor isDark={isDark} layout={layout} animate={animate} codeIndex={codeIndex} termIndex={termIndex} />
      <LayerPeriph isDark={isDark} layout={layout} animate={animate} />
      <LayerFx isDark={isDark} layout={layout} animate={animate} />
    </>
  )
}

export default function GamerScene({ className = '' }) {
  const { isDark } = useThemeContext()
  const reducedMotion = useReducedMotion()
  const animate = !reducedMotion
  const layout = useMemo(() => getLayout(isDark), [isDark])

  return (
    <div className={`relative mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-[620px] ${className}`} aria-hidden="true" role="presentation">
      <div
        className={`scene-layer scene-z-bg rounded-3xl transition-opacity duration-[400ms] ${isDark ? 'opacity-100' : 'opacity-25'}`}
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 38%, rgba(34,211,238,0.14), transparent 65%)'
            : 'radial-gradient(ellipse at 50% 42%, rgba(99,102,241,0.07), transparent 62%)',
        }}
      />

      <div
        className={`scene-setup-wrap transition-opacity duration-[var(--theme-duration)] ease-[cubic-bezier(0.65,0,0.35,1)] ${animate ? 'animate-float-soft' : ''}`}
      >
        <div className="scene-setup relative w-full">
          <SceneLayers isDark={isDark} layout={layout} animate={animate} />
        </div>
      </div>

      <p className="mt-1 text-center text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)] sm:text-xs">
        {isDark ? 'Terminal live — mode nuit' : 'Dashboard live — mode jour'}
      </p>
    </div>
  )
}
