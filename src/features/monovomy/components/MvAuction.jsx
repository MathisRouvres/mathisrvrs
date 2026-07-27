import { MonovomyButton } from '../MonovomyShell'
import { playerColor } from './board3d/playerColors'

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Panneau d'enchère (Phase 11B-3). Tout joueur non éliminé mise ou passe.
 * `controllableIds` = joueurs que CE terminal peut piloter (online : moi seul ;
 * local hot-seat : tous les enchérisseurs, chacun tape son bouton).
 */
export default function MvAuction({ auction, players, now = 0, controllableIds = [], onBid, onPass }) {
  if (!auction) return null

  const min = auction.currentBid > 0 ? auction.currentBid + auction.minIncrement : auction.minIncrement
  const left = auction.endsAt > 0 ? auction.endsAt - now : -1
  const highName = auction.highBidderId
    ? players.find((p) => p.id === auction.highBidderId)?.name ?? '—'
    : null

  const idxById = Object.fromEntries(players.map((p, i) => [p.id, i]))

  return (
    <div className="mv-auction" role="dialog" aria-label="Enchère">
      <div className="mv-auction__card">
        <header className="mv-auction__head">
          <span className="mv-auction__eyebrow">🔨 Enchère</span>
          {left >= 0 && <span className={`mv-auction__timer ${left <= 5000 ? 'is-alert' : ''}`}>⏱ {fmt(left)}</span>}
        </header>

        <h3 className="mv-auction__name">{auction.name}</h3>
        <p className="mv-auction__bid">
          {auction.currentBid > 0 ? (
            <>Mise : <b>{auction.currentBid}€</b> · {highName}</>
          ) : (
            <>Aucune mise · départ {auction.minIncrement}€</>
          )}
        </p>

        <ul className="mv-auction__list">
          {players.map((p) => {
            const inRace = auction.activeBidders.includes(p.id)
            const isHigh = auction.highBidderId === p.id
            const canControl = inRace && controllableIds.includes(p.id)
            const steps = [min, min + 50, min + 100].filter((v, i) => i === 0 || v <= p.cash)
            return (
              <li key={p.id} className={`mv-auction__row ${inRace ? '' : 'is-out'} ${isHigh ? 'is-high' : ''}`}>
                <span className="mv-auction__who">
                  <i className="mv-money__dot" style={{ background: playerColor(idxById[p.id]) }} />
                  {p.name} <small>{p.cash}€</small>
                </span>
                {!inRace ? (
                  <span className="mv-auction__status">passé</span>
                ) : canControl ? (
                  <span className="mv-auction__acts">
                    {steps.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="mv-auction__bidbtn"
                        disabled={v > p.cash}
                        onClick={() => onBid?.(p.id, v)}
                      >
                        {v}€
                      </button>
                    ))}
                    <button type="button" className="mv-auction__passbtn" onClick={() => onPass?.(p.id)}>
                      Passer
                    </button>
                  </span>
                ) : (
                  <span className="mv-auction__status">{isHigh ? 'en tête' : 'en lice'}</span>
                )}
              </li>
            )
          })}
        </ul>

        {controllableIds.length === 0 && (
          <p className="mv-auction__wait">En attente des enchérisseurs…</p>
        )}
        <div className="mv-auction__foot">
          <MonovomyButton variant="ghost" onClick={() => controllableIds.forEach((id) => onPass?.(id))}>
            Tout passer
          </MonovomyButton>
        </div>
      </div>
    </div>
  )
}
