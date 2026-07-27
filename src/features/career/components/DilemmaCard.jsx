import { categoryMeta } from './careerUiMaps'

/**
 * Carte narrative du dilemme (§7) : catégorie + icône, écho éventuel du passé,
 * titre fort, texte narratif à largeur limitée, phrase d'accroche.
 * Le heading porte l'id référencé par la section (`dilemma-heading`).
 */
export default function DilemmaCard({ event, echo }) {
  const cat = categoryMeta(event.category)
  return (
    <article className="cg-dcard cg-anim-enter">
      <span className="cg-dcard__cat">
        <span className="cg-dcard__icon" aria-hidden="true">
          {cat.icon}
        </span>
        {cat.label}
      </span>

      {echo && (
        <p className="cg-echo" role="note">
          {echo}
        </p>
      )}

      <h2 id="dilemma-heading" className="cg-dcard__title">
        {event.title}
      </h2>
      <p className="cg-dcard__body">{event.body}</p>
      <p className="cg-dcard__quote">« À toi de choisir ton chemin. »</p>
    </article>
  )
}
