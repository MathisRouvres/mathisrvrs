import { useState } from 'react'
import { ruleStepsLeft, propertyManagement } from '../engine'
import { soireeBoard } from '../content'
import { playerColor } from './board3d/playerColors'
import { sound } from '../game/sound'
import { haptics } from '../game/haptics'
import { useWakeLockConsent } from '../pwa/useWakeLock'
import { useFreeCam } from '../game/freeCam'
import { APP_BUILD } from '../pwa/buildInfo'
import MvChat from './MvChat'
import MvRules from './MvRules'
import MvLegal from './MvLegal'
import MvPortal from './MvPortal'

const GROUP_COLOR = {
  brun: '#c07a3a', cyan: '#22c1c3', rose: '#ec4899', orange: '#f97316',
  rouge: '#ef4d63', jaune: '#f5b21a', vert: '#34d17e', bleu: '#3b82f6',
}

// Icônes en trait : un seul jeu cohérent, à la place du mélange d'emojis.
const ICON_PATHS = {
  goods: 'M3 10.5 12 4l9 6.5M6 9.5V20h12V9.5M10 20v-5h4v5',
  players: 'M8 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 8 11Zm8.4-.4a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM2.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5M15 14.6c2.8.2 4.5 2.1 4.5 4.9',
  rules: 'M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 4h6M9 12h6M9 16h4',
  chat: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 4v-4h-.5A1.5 1.5 0 0 1 4 14.5Z',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8-3.2a8 8 0 0 0-.14-1.5l2-1.5-2-3.4-2.3.9a8 8 0 0 0-2.6-1.5L14.6 2h-4l-.36 2.5a8 8 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a8 8 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a8 8 0 0 0 2.6 1.5l.36 2.5h4l.36-2.5a8 8 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.5c.09-.49.14-1 .14-1.5Z',
}

function DockIcon({ name }) {
  return (
    <svg className="mv-dock__ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICON_PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Sheet({ title, onClose, children }) {
  return (
    <MvPortal>
      <div className="mv-sheet" onClick={onClose}>
        <div className="mv-sheet__card mv-surface-3" onClick={(e) => e.stopPropagation()}>
          <div className="mv-sheet__head">
            <span>{title}</span>
            <button type="button" className="mv-sheet__close" onClick={onClose} aria-label="Fermer">✕</button>
          </div>
          <div className="mv-sheet__body">{children}</div>
        </div>
      </div>
    </MvPortal>
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

/**
 * Patrimoine. Sur téléphone le rail 3D des titres est masqué (illisible à cette
 * taille) : cette feuille est la SEULE vue des propriétés, elle doit donc donner
 * accès à celles de tout le monde, pas seulement aux siennes.
 */
function GoodsSheet({ state, ownerId, canManage, managePlayerId, onManage }) {
  const [shown, setShown] = useState(ownerId)
  const current = state.players.find((p) => p.id === shown) ?? state.players.find((p) => p.id === ownerId) ?? state.players[0]
  const owned = current?.ownedSpaceIds ?? []

  const picker = (
    <div className="mv-goods__who">
      {state.players.map((p, i) => (
        <button
          key={p.id}
          type="button"
          className={`mv-goods__whobtn ${p.id === current?.id ? 'is-on' : ''} ${p.eliminated ? 'is-out' : ''}`}
          style={{ '--pc': playerColor(i) }}
          onClick={() => setShown(p.id)}
        >
          <span className="mv-goods__whoav">{p.avatar}</span>
          <span className="mv-goods__wholbl">{p.name}</span>
          <span className="mv-goods__whon">{p.ownedSpaceIds.length}</span>
        </button>
      ))}
    </div>
  )

  if (!owned.length) {
    return (
      <>
        {picker}
        <p className="mv-sheet__empty">
          {current?.id === ownerId ? 'Aucune propriété pour l’instant. Achète des cases !' : `${current?.name ?? 'Ce joueur'} ne possède rien.`}
        </p>
      </>
    )
  }

  return (
    <>
    {picker}
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
    </>
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

function SettingsSheet({ onSoft, myMode, onOpenDoc, onFinish }) {
  const [muted, setMuted] = useState(() => sound.isMuted())
  const [haptic, setHaptic] = useState(() => haptics.isEnabled())
  const wake = useWakeLockConsent()
  const cam = useFreeCam()
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
      <button type="button" className="mv-settings__row" onClick={cam.toggle} aria-pressed={cam.free}>
        <span>🎥 Caméra libre</span><b>{cam.free ? 'Active' : 'Non'}</b>
      </button>
      {onSoft && (
        <button type="button" className="mv-settings__row" onClick={() => onSoft(myMode === 'soft' ? 'alcohol' : 'soft')}>
          <span>🥤 Mode soft</span><b>{myMode === 'soft' ? 'Actif' : 'Non'}</b>
        </button>
      )}
      {/* En partie, la barre de marque disparaît sur mobile : ces deux écrans
          restent joignables ici. */}
      <button type="button" className="mv-settings__row" onClick={() => onOpenDoc('howto')}>
        <span>📖 Comment jouer</span><b>›</b>
      </button>
      <button type="button" className="mv-settings__row" onClick={() => onOpenDoc('legal')}>
        <span>⚖️ Mentions légales</span><b>›</b>
      </button>
      {onFinish && (
        <button type="button" className="mv-settings__row is-danger" onClick={onFinish}>
          <span>🏁 Terminer la partie</span><b>›</b>
        </button>
      )}
      {/* Repère de build : permet de vérifier depuis le téléphone qu'on regarde
          bien la dernière version et non une page ressortie du cache. */}
      <p className="mv-settings__build">Version {APP_BUILD}</p>
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
  onFinish = null,
}) {
  const [sheet, setSheet] = useState(null)
  const rulesCount = state.activeRules.length
  const goodsOwner = myId ?? active?.id ?? null
  const showChat = mode === 'online' && typeof onSendChat === 'function'

  const items = [
    { key: 'goods', label: 'Biens' },
    { key: 'players', label: 'Joueurs' },
    { key: 'rules', label: 'Règles', badge: rulesCount || null },
    ...(showChat ? [{ key: 'chat', label: 'Chat' }] : []),
    { key: 'settings', label: 'Réglages' },
  ]
  // Position de la pilule de sélection : elle glisse sous l'onglet ouvert. Les
  // écrans documentaires s'ouvrent depuis Réglages : la pilule y reste.
  const tab = sheet === 'howto' || sheet === 'legal' ? 'settings' : sheet
  const activeIdx = items.findIndex((it) => it.key === tab)

  return (
    <>
      <nav
        className="mv-dock mv-surface-1"
        aria-label="Navigation"
        style={{ '--dock-n': items.length, '--dock-i': activeIdx < 0 ? 0 : activeIdx }}
      >
        <span className={`mv-dock__pill ${activeIdx < 0 ? '' : 'is-on'}`} aria-hidden="true" />
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`mv-dock__btn ${tab === it.key ? 'is-on' : ''}`}
            onClick={() => setSheet((s) => (s === it.key ? null : it.key))}
          >
            <DockIcon name={it.key} />
            <span className="mv-dock__lbl">{it.label}</span>
            {it.badge ? <span key={it.badge} className="mv-dock__badge">{it.badge}</span> : null}
          </button>
        ))}
      </nav>

      {sheet === 'players' && <Sheet title="👥 Joueurs" onClose={() => setSheet(null)}><PlayersSheet state={state} /></Sheet>}
      {sheet === 'goods' && (
        <Sheet title="🏠 Propriétés" onClose={() => setSheet(null)}>
          <GoodsSheet state={state} ownerId={goodsOwner} canManage={canManage} managePlayerId={managePlayerId} onManage={onManage} />
        </Sheet>
      )}
      {sheet === 'rules' && <Sheet title="📜 Règles temporaires" onClose={() => setSheet(null)}><RulesSheet state={state} /></Sheet>}
      {sheet === 'chat' && showChat && (
        <Sheet title="💬 Chat" onClose={() => setSheet(null)}><MvChat messages={chat} onSend={onSendChat} /></Sheet>
      )}
      {sheet === 'settings' && (
        <Sheet title="⚙️ Réglages" onClose={() => setSheet(null)}>
          <SettingsSheet onSoft={onSoft} myMode={myMode} onOpenDoc={setSheet} onFinish={onFinish} />
        </Sheet>
      )}
      {sheet === 'howto' && <Sheet title="📖 Comment jouer" onClose={() => setSheet('settings')}><MvRules /></Sheet>}
      {sheet === 'legal' && <Sheet title="⚖️ Mentions légales" onClose={() => setSheet('settings')}><MvLegal /></Sheet>}
    </>
  )
}
