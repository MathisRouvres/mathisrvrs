import { soireeBoard } from '../content'
import { playerColor } from './board3d/playerColors'
import { useCountUp, useDelta } from '../game/useCountUp'
import { useReducedMotion } from '../game/useReducedMotion'

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
 * Barre du joueur actif (Phase 6). Hiérarchie assumée : avatar, pseudo et surtout
 * l'ARGENT en très grand — c'est l'information la plus lue de l'écran après le
 * plateau. Tout le reste (case, minuteurs, ambiance, réseau, action attendue) passe
 * en second niveau, plus petit et plus sourd.
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
  const reducedMotion = useReducedMotion()
  const it = INTENSITY[state.partyIntensity] ?? INTENSITY.warmup
  const activeIdx = state.currentPlayerIndex
  const spaceName = active ? soireeBoard.spaces[active.position]?.name ?? '—' : '—'
  const me = myId ? state.players.find((p) => p.id === myId) : null
  const turnUrgent = turnLeft >= 0 && turnLeft <= 5000
  const net = NET[netStatus] ?? NET.idle
  const netLabel = mode === 'local' ? 'Local' : role === 'host' ? 'Hôte' : net.label

  // Argent : compteur qui roule + variation flottante. Se remet à zéro tout seul.
  const cash = active ? active.cash : 0
  const shownCash = useCountUp(cash, reducedMotion)
  const delta = useDelta(cash)

  return (
    <div className="mv-hud2 mv-surface-1">
      <div className="mv-hud2__main">
        <span className="mv-hud2__who">
          <i className="mv-hud2__dot" style={{ background: playerColor(activeIdx) }} />
          <b>{active ? active.name : '—'}</b>
        </span>
        <span className={`mv-hud2__cash ${delta ? (delta.value > 0 ? 'is-up' : 'is-down') : ''}`}>
          {shownCash}
          <i>€</i>
          {delta && !reducedMotion && (
            <em key={delta.id} className={delta.value > 0 ? 'mv-hud2__delta is-up' : 'mv-hud2__delta is-down'}>
              {delta.value > 0 ? '+' : ''}{delta.value}€
            </em>
          )}
        </span>
      </div>

      <div className="mv-hud2__sub">
        <span className={`mv-hud2__action ${mainAction?.waiting ? 'is-wait' : ''}`}>
          {mainAction?.icon} {mainAction?.label}
        </span>
        <span className="mv-hud2__pos" title={spaceName}>📍 {spaceName}</span>
        {me && me.id !== active?.id && <span className="mv-hud2__me">toi · {me.cash}€</span>}
        <span className="mv-hud2__spacer" />
        {gameLeft >= 0 && <span className={`mv-hud2__timer ${gameLeft <= 60000 ? 'is-low' : ''}`}>🕒 {fmt(gameLeft)}</span>}
        {turnLeft >= 0 && <span className={`mv-hud2__timer is-turn ${turnUrgent ? 'is-alert' : ''}`}>⏱ {fmt(turnLeft)}</span>}
        <span className="mv-hud2__intensity" style={{ '--c': it.color }}>{it.emoji} {it.label}</span>
        <span className={`mv-hud2__net ${netStatus === 'reconnecting' || netStatus === 'syncing' ? 'is-busy' : ''}`} title={netLabel || 'Connecté'}>
          <i style={{ background: net.dot }} />
          {netLabel && <small>{netLabel}</small>}
        </span>
      </div>
    </div>
  )
}
