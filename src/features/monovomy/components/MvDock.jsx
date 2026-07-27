import { useState } from 'react'
import { ruleStepsLeft, propertyManagement } from '../engine'
import { soireeBoard } from '../content'
import { playerColor } from './board3d/playerColors'
import { sound } from '../game/sound'
import { haptics } from '../game/haptics'
import { useWakeLockConsent } from '../pwa/useWakeLock'
import MvChat from './MvChat'

const GROUP_COLOR = {
  brun: '#c07a3a', cyan: '#22c1c3', rose: '#ec4899', orange: '#f97316',
  rouge: '#ef4d63', jaune: '#f5b21a', vert: '#34d17e', bleu: '#3b82f6',
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="mv-sheet" onClick={onClose}>
      <div className="mv-sheet__card" onClick={(e) => e.stopPropagation()}>
        <div className="mv-sheet__head">
          <span>{title}</span>
          <button type="button" className="mv-sheet__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="mv-sheet__body">{children}</div>
      </div>
    </div>
  )
}

function PlayersSheet({ state }) {
  return (
    <ul className="mv-plist">
      {state.players.map((p, i) => (
        <li key={p.id} className={`mv-plist__row ${i === state.currentPlayerIndex ? 'is-active' : ''} ${p.eliminated ? 'is-out' : ''}`}>
          <span className="mv-plist__av" style={{ background: playerColor(i) }}>{p.avatar}</span>
          <span className="mv-plist__name">{p.name}{p.inJail ? ' 🔒' : ''}{i === state.currentPlayerIndex ? ' 🎲' : ''}</span>
          <span className="mv-plist__props">{p.ownedSpaceIds.length} 🏠</span>
          <span className="mv-plist__cash">{p.cash}€</span>
        </li>
      ))}
    </ul>
  )
}

function GoodsSheet({ state, ownerId, canManage, managePlayerId, onManage }) {
  const owned = ownerId ? state.players.find((p) => p.id === ownerId)?.ownedSpaceIds ?? [] : []
  if (!owned.length) return <p className="mv-sheet__empty">Aucune propriété pour l’instant. Achète des cases !</p>
  return (
    <ul className="mv-goods">
      {owned.map((sid) => {
        const space = soireeBoard.spaces.find((s) => s.id === sid)
        if (!space) return null
        const m = propertyManagement(state, soireeBoard, canManage ? managePlayerId : null, sid)
        const emit = (type) => () => onManage?.({ type, spaceId: sid })
        return (
          <li key={sid} className="mv-goods__row">
            <span className="mv-goods__dot" style={{ background: GROUP_COLOR[space.group] ?? '#8b5cf6' }} />
            <div className="mv-goods__info">
              <b>{space.name}</b>
              <small>
                {m.mortgaged ? '🏦 Hypothéquée' : m.level > 0 ? (m.level >= m.maxLevel ? '🏨 Hôtel' : `🏠 ${m.level}`) : m.isMonopoly ? 'Monopole' : 'Terrain nu'}
              </small>
            </div>
            <div className="mv-goods__acts">
              {m.canBuild && <button type="button" onClick={emit('build')}>🏗 {m.buildCost}€</button>}
              {m.canSell && <button type="button" onClick={emit('sellBuilding')}>Revendre</button>}
              {m.canMortgage && <button type="button" onClick={emit('mortgage')}>🏦</button>}
              {m.canUnmortgage && <button type="button" onClick={emit('unmortgage')}>Lever</button>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function RulesSheet({ state }) {
  if (!state.activeRules.length) return <p className="mv-sheet__empty">Aucune règle temporaire active.</p>
  return (
    <ul className="mv-ruleslist">
      {state.activeRules.map((r) => {
        const left = ruleStepsLeft(r, state.turnStep)
        return (
          <li key={`${r.id}-${r.activatedStep}`} className="mv-ruleslist__row">
            <span className="mv-ruleslist__ic">📜</span>
            <div>
              <b>{r.name}</b>
              <small>{r.description}</small>
            </div>
            {left >= 0 && <span className="mv-ruleslist__left">{left} tour(s)</span>}
          </li>
        )
      })}
    </ul>
  )
}

function SettingsSheet({ onSoft, myMode }) {
  const [muted, setMuted] = useState(() => sound.isMuted())
  const [haptic, setHaptic] = useState(() => haptics.isEnabled())
  const wake = useWakeLockConsent()
  return (
    <div className="mv-settings">
      <button type="button" className="mv-settings__row" onClick={() => { const n = !muted; sound.setMuted(n); setMuted(n) }}>
        <span>{muted ? '🔇' : '🔊'} Son</span><b>{muted ? 'Coupé' : 'Actif'}</b>
      </button>
      {haptics.isSupported() && (
        <button type="button" className="mv-settings__row" onClick={() => { const n = !haptic; haptics.setEnabled(n); setHaptic(n); if (n) haptics.vibrate('roll') }}>
          <span>📳 Vibrations</span><b>{haptic ? 'Actives' : 'Coupées'}</b>
        </button>
      )}
      {wake.supported && (
        <button type="button" className="mv-settings__row" onClick={wake.toggle}>
          <span>🔆 Écran allumé</span><b>{wake.consent ? 'Oui' : 'Non'}</b>
        </button>
      )}
      {onSoft && (
        <button type="button" className="mv-settings__row" onClick={() => onSoft(myMode === 'soft' ? 'alcohol' : 'soft')}>
          <span>🥤 Mode soft</span><b>{myMode === 'soft' ? 'Actif' : 'Non'}</b>
        </button>
      )}
    </div>
  )
}

/** Dock inférieur compact (Phase 6) : patrimoine · joueurs · règles · chat · réglages. */
export default function MvDock({
  state,
  myId = null,
  active = null,
  mode = 'local',
  chat = [],
  onSendChat,
  onManage,
  canManage = false,
  managePlayerId = null,
  onSoft,
  myMode,
}) {
  const [sheet, setSheet] = useState(null)
  const rulesCount = state.activeRules.length
  const goodsOwner = myId ?? active?.id ?? null
  const showChat = mode === 'online' && typeof onSendChat === 'function'

  const items = [
    { key: 'goods', icon: '🏠', label: 'Biens' },
    { key: 'players', icon: '👥', label: 'Joueurs' },
    { key: 'rules', icon: '📜', label: 'Règles', badge: rulesCount || null },
    ...(showChat ? [{ key: 'chat', icon: '💬', label: 'Chat' }] : []),
    { key: 'settings', icon: '⚙️', label: 'Réglages' },
  ]

  return (
    <>
      <nav className="mv-dock" aria-label="Navigation">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`mv-dock__btn ${sheet === it.key ? 'is-on' : ''}`}
            onClick={() => setSheet((s) => (s === it.key ? null : it.key))}
          >
            <span className="mv-dock__ic">{it.icon}</span>
            <span className="mv-dock__lbl">{it.label}</span>
            {it.badge ? <span className="mv-dock__badge">{it.badge}</span> : null}
          </button>
        ))}
      </nav>

      {sheet === 'players' && <Sheet title="👥 Joueurs" onClose={() => setSheet(null)}><PlayersSheet state={state} /></Sheet>}
      {sheet === 'goods' && (
        <Sheet title="🏠 Mes biens" onClose={() => setSheet(null)}>
          <GoodsSheet state={state} ownerId={goodsOwner} canManage={canManage} managePlayerId={managePlayerId} onManage={onManage} />
        </Sheet>
      )}
      {sheet === 'rules' && <Sheet title="📜 Règles temporaires" onClose={() => setSheet(null)}><RulesSheet state={state} /></Sheet>}
      {sheet === 'chat' && showChat && (
        <Sheet title="💬 Chat" onClose={() => setSheet(null)}><MvChat messages={chat} onSend={onSendChat} /></Sheet>
      )}
      {sheet === 'settings' && <Sheet title="⚙️ Réglages" onClose={() => setSheet(null)}><SettingsSheet onSoft={onSoft} myMode={myMode} /></Sheet>}
    </>
  )
}
