import { MonovomyButton } from '../MonovomyShell'
import MvPortal from './MvPortal'
import { getMarketCardById } from '../content'
import { sipsPriceFor, MARKET_MAX_CARDS, DIFFICULTY_MULTIPLIER } from '../engine'

/**
 * Marché Noir — panneau d'achat (phase `awaiting_market`).
 *
 * Trois cartes en vente, payables en **argent** ou en **gorgées** : le joueur
 * fauché reste dans la course, c'est tout l'intérêt de la case. L'inventaire est
 * plafonné à `MARKET_MAX_CARDS` — plein, on ne peut que passer.
 */
export default function MvMarket({ offers = [], player, difficulty = 'facile', onBuy }) {
  const mult = DIFFICULTY_MULTIPLIER[difficulty] ?? 1
  const owned = player?.marketCards?.length ?? 0
  const full = owned >= MARKET_MAX_CARDS
  const soft = player?.drinkMode === 'soft'

  return (
    <MvPortal>
      <div className="mv-market" role="dialog" aria-label="Marché Noir">
        <div className="mv-market__card">
          <header className="mv-market__head">
            <span className="mv-market__eyebrow">🕶️ Marché Noir</span>
            <span className="mv-market__slots">
              {owned}/{MARKET_MAX_CARDS} carte{owned > 1 ? 's' : ''}
            </span>
          </header>

          {full ? (
            <p className="mv-market__warn">Poches pleines — revends ou joue une carte avant d’acheter.</p>
          ) : (
            <p className="mv-market__hint">Paie en argent, ou au foie. Une seule carte par visite.</p>
          )}

          <ul className="mv-market__list">
            {offers.map((id) => {
              const card = getMarketCardById(id)
              if (!card) return null
              const sips = sipsPriceFor(card) * mult
              const tooPoor = (player?.cash ?? 0) < card.priceCash
              return (
                <li key={id} className="mv-market__row">
                  <span className="mv-market__icon" aria-hidden="true">{card.emoji}</span>
                  <span className="mv-market__info">
                    <b className="mv-market__name">{card.name}</b>
                    <small className="mv-market__desc">{soft ? card.softVariant : card.description}</small>
                  </span>
                  <span className="mv-market__acts">
                    <MonovomyButton
                      variant="secondary"
                      disabled={full || tooPoor}
                      onClick={() => onBuy?.(id, 'cash')}
                    >
                      {card.priceCash}€
                    </MonovomyButton>
                    <MonovomyButton variant="ghost" disabled={full} onClick={() => onBuy?.(id, 'sips')}>
                      {sips} {soft ? 'gage(s)' : 'gorgée(s)'}
                    </MonovomyButton>
                  </span>
                </li>
              )
            })}
          </ul>

          <MonovomyButton className="mv-market__leave" onClick={() => onBuy?.(null, 'cash')}>
            Repartir les mains vides
          </MonovomyButton>
        </div>
      </div>
    </MvPortal>
  )
}
