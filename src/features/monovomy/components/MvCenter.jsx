import MvCardReveal from './MvCardReveal'

const INTENSITY = {
  warmup: { label: 'Warm-up', emoji: '🌱', color: '#22c1c3' },
  party: { label: 'Party', emoji: '🎉', color: '#f5b21a' },
  chaos: { label: 'Chaos', emoji: '🔥', color: '#f97316' },
  finale: { label: 'Finale', emoji: '🏁', color: '#ec1e79' },
}

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Scène centrale dynamique (Phase 5) : le centre du plateau change selon la phase.
 * Défaut : logo réduit + tour + ambiance + temps. Pendant carte/achat : la carte
 * (reveal) se joue AU CENTRE. Pendant une enchère : résumé + compte à rebours. Les
 * événements forts (monopole, faillite, prison, chaos…) surgissent au centre.
 */
export default function MvCenter({
  state,
  result,
  active,
  now = 0,
  rolling = false,
  isDecision = false,
  canAct = true,
  softActive = false,
  softAlt = null,
  event = null,
}) {
  const showReveal = Boolean(result) && !rolling && state.phase !== 'awaiting_auction'
  const auction = state.phase === 'awaiting_auction' ? state.auction : null
  const it = INTENSITY[state.partyIntensity] ?? INTENSITY.warmup
  const gameLeft = state.endsAt > 0 ? state.endsAt - now : -1
  const hasPanel = showReveal || Boolean(auction)

  const bidderName = auction?.highBidderId
    ? state.players.find((p) => p.id === auction.highBidderId)?.name ?? '—'
    : null
  const aucLeft = auction && auction.endsAt > 0 ? auction.endsAt - now : -1

  return (
    <div className={`mv-center__inner ${hasPanel ? 'has-panel' : ''}`}>
      {hasPanel && <span className="mv-center__scrim" aria-hidden="true" />}

      {event && (
        <div key={event.id} className={`mv-centerevent tone-${event.tone || 'gold'}`} role="status">
          <span className="mv-centerevent__ic" aria-hidden="true">{event.icon}</span>
          <b>{event.text}</b>
        </div>
      )}

      {showReveal ? (
        <MvCardReveal
          result={result}
          active={active}
          isDecision={isDecision}
          canAct={canAct}
          softActive={softActive}
          softAlt={softAlt}
          showActions={false}
        />
      ) : auction ? (
        <div className="mv-centerauc">
          <span className="mv-centerauc__eyebrow">🔨 Enchère</span>
          <b className="mv-centerauc__name">{auction.name}</b>
          <span className="mv-centerauc__bid">
            {auction.currentBid > 0 ? <>{auction.currentBid}€ · {bidderName}</> : 'Aucune mise'}
          </span>
          {aucLeft >= 0 && <span className={`mv-centerauc__timer ${aucLeft <= 5000 ? 'is-alert' : ''}`}>⏱ {fmt(aucLeft)}</span>}
        </div>
      ) : (
        <div className="mv-centerdefault">
          <span className="mv-centerdefault__tour">Tour {state.turn}</span>
          <span className="mv-centerdefault__amb" style={{ '--c': it.color }}>{it.emoji} {it.label}</span>
          {gameLeft >= 0 && (
            <span className={`mv-centerdefault__timer ${gameLeft <= 60000 ? 'is-low' : ''}`}>🕒 {fmt(gameLeft)}</span>
          )}
        </div>
      )}
    </div>
  )
}
