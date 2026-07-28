import MvCardReveal from './MvCardReveal'
import { centerPanelKind } from '../game/centerPanel'

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Contenu TEXTE de la scène centrale (Phase 5) : le centre du plateau change selon la phase.
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
  const kind = centerPanelKind(state, result, rolling)
  const showReveal = kind === 'card'
  const auction = kind === 'auction' ? state.auction : null

  const bidderName = auction?.highBidderId
    ? state.players.find((p) => p.id === auction.highBidderId)?.name ?? '—'
    : null
  const aucLeft = auction && auction.endsAt > 0 ? auction.endsAt - now : -1

  // Au repos, plus rien en HTML : tour, ambiance et temps sont dans la 3D.
  if (!showReveal && !auction && !event) return null

  return (
    <div className="mv-center__inner">
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
      ) : null}
    </div>
  )
}
