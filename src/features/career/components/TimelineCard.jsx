import { clubAccent } from './careerUiMaps'

/**
 * Carte synthétique d'une saison dans la timeline (Phase 14, §8). Purement
 * présentationnelle : consomme un modèle de carte déjà préparé par le moteur.
 * Compacte — jamais un tableau dense.
 */
export default function TimelineCard({ card }) {
  if (!card) return null
  return (
    <li className="cg-tlcard" style={{ '--tl-accent': clubAccent(card.clubId ?? card.clubName) }}>
      <div className="cg-tlcard__head">
        <span className="cg-tlcard__season">S{card.seasonIndex}</span>
        <span className="cg-tlcard__age">{card.age} ans</span>
        <span className="cg-tlcard__club">{card.clubName}</span>
        {card.level != null && (
          <span className="cg-tlcard__level" aria-label="Niveau">
            Niv {card.level}
          </span>
        )}
      </div>
      <div className="cg-tlcard__row">
        {card.rank != null && (
          <span className="cg-tlcard__chip">
            {card.rank}ᵉ{card.division === 2 ? ' (D2)' : ''}
          </span>
        )}
        {card.trophies.map((t) => (
          <span key={t} className="cg-tlcard__chip cg-tlcard__chip--trophy">
            🏆 {t}
          </span>
        ))}
        {card.awards > 0 && (
          <span className="cg-tlcard__chip cg-tlcard__chip--award">
            🎖️ {card.awards} distinction{card.awards > 1 ? 's' : ''}
          </span>
        )}
        {card.records > 0 && (
          <span className="cg-tlcard__chip cg-tlcard__chip--record">
            📕 {card.records} record{card.records > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {card.keyEvent && <p className="cg-tlcard__key">{card.keyEvent}</p>}
    </li>
  )
}
