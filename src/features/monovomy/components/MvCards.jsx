import { useState } from 'react'
import { MonovomyButton } from '../MonovomyShell'
import MvModal from './MvModal'
import { getMarketCardById } from '../content'

/**
 * Main de cartes du Marché Noir — consultation et usage.
 *
 * Une carte se joue **à tout moment**, y compris hors de son tour (canal
 * parallèle côté moteur). Les cartes qui visent quelqu'un demandent d'abord une
 * cible : le choix se fait ici, jamais dans le moteur.
 */
export default function MvCards({ player, players = [], onUse, onClose }) {
  const [pending, setPending] = useState(null)
  const cards = player?.marketCards ?? []
  const soft = player?.drinkMode === 'soft'

  const play = (cardId, targetId = null) => {
    onUse?.(player.id, cardId, targetId)
    setPending(null)
    onClose?.()
  }

  const targets = players.filter((p) => p.id !== player?.id && !p.eliminated)

  return (
    <MvModal title="🃏 Tes cartes" onClose={onClose}>
      {cards.length === 0 && (
        <p className="mv-cards__empty">Aucune carte. Passe par le Marché Noir (case 17).</p>
      )}

      {pending ? (
        <div className="mv-cards__target">
          <p>Sur qui ?</p>
          <div className="mv-cards__targets">
            {targets.map((p) => (
              <MonovomyButton key={p.id} variant="secondary" onClick={() => play(pending, p.id)}>
                {p.avatar} {p.name}
              </MonovomyButton>
            ))}
          </div>
          <MonovomyButton variant="ghost" onClick={() => setPending(null)}>Annuler</MonovomyButton>
        </div>
      ) : (
        <ul className="mv-cards__list">
          {cards.map((id, i) => {
            const card = getMarketCardById(id)
            if (!card) return null
            return (
              <li key={`${id}-${i}`} className="mv-cards__row">
                <span className="mv-cards__icon" aria-hidden="true">{card.emoji}</span>
                <span className="mv-cards__info">
                  <b>{card.name}</b>
                  <small>{soft ? card.softVariant : card.description}</small>
                </span>
                <MonovomyButton
                  variant="secondary"
                  onClick={() => (card.target === 'player' ? setPending(id) : play(id))}
                >
                  Jouer
                </MonovomyButton>
              </li>
            )
          })}
        </ul>
      )}
    </MvModal>
  )
}
