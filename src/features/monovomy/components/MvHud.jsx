import { soireeBoard } from '../content'
import { playerColor } from './board3d/playerColors'

const INTENSITY = {
  warmup: { label: 'Warm-up', color: '#22c1c3', emoji: '🌱' },
  party: { label: 'Party', color: '#f5b21a', emoji: '🎉' },
  chaos: { label: 'Chaos', color: '#f97316', emoji: '🔥' },
  finale: { label: 'Finale', color: '#ec1e79', emoji: '🏁' },
}

const NET = {
  connected: { dot: '#34d17e', label: null },
  syncing: { dot: '#f5b21a', label: 'Sync…' },
  reconnecting: { dot: '#f5b21a', label: 'Reconnexion…' },
  found: { dot: '#34d17e', label: 'Retrouvé' },
  offline: { dot: '#ef4d63', label: 'Hors ligne' },
  idle: { dot: '#9a8cb8', label: null },
}

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Barre du joueur actif (Phase 6), compacte : avatar · pseudo · argent · position ·
 * timer · action attendue · état réseau discret. Remplace l'étiquette flottante.
 */
export default function MvHud({
  state,
  active,
  mainAction,
  gameLeft = -1,
  turnLeft = -1,
  myId = null,
  mode = 'local',
  netStatus = 'idle',
  role = null,
}) {
  const it = INTENSITY[state.partyIntensity] ?? INTENSITY.warmup
  const activeIdx = state.currentPlayerIndex
  const spaceName = active ? soireeBoard.spaces[active.position]?.name ?? '—' : '—'
  const me = myId ? state.players.find((p) => p.id === myId) : null
  const turnUrgent = turnLeft >= 0 && turnLeft <= 5000
  const net = NET[netStatus] ?? NET.idle
  const netLabel = mode === 'local' ? 'Local' : role === 'host' ? 'Hôte' : net.label

  return (
    <div className="mv-hud2">
      <div className="mv-hud2__row">
        <span className="mv-hud2__who">
          <i className="mv-hud2__dot" style={{ background: playerColor(activeIdx) }} />
          <b>{active ? active.name : '—'}</b>
        </span>
        <span className="mv-hud2__cash">{active ? active.cash : 0}€</span>
        <span className="mv-hud2__pos" title={spaceName}>📍 {spaceName}</span>
        <span className="mv-hud2__timers">
          {gameLeft >= 0 && <span className={`mv-hud2__timer ${gameLeft <= 60000 ? 'is-low' : ''}`}>🕒 {fmt(gameLeft)}</span>}
          {turnLeft >= 0 && <span className={`mv-hud2__timer is-turn ${turnUrgent ? 'is-alert' : ''}`}>⏱ {fmt(turnLeft)}</span>}
        </span>
      </div>

      <div className="mv-hud2__row mv-hud2__row--sub">
        <span className={`mv-hud2__action ${mainAction?.waiting ? 'is-wait' : ''}`}>
          {mainAction?.icon} {mainAction?.label}
        </span>
        {me && me.id !== active?.id && <span className="mv-hud2__me">toi · {me.cash}€</span>}
        <span className="mv-hud2__intensity" style={{ '--c': it.color }}>{it.emoji} {it.label}</span>
        <span className={`mv-hud2__net ${netStatus === 'reconnecting' || netStatus === 'syncing' ? 'is-busy' : ''}`} title={netLabel || 'Connecté'}>
          <i style={{ background: net.dot }} />
          {netLabel && <small>{netLabel}</small>}
        </span>
      </div>
    </div>
  )
}
