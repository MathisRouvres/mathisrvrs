import { describeChoiceOutcomes } from '../../game-engine'
import DilemmaCard from './components/DilemmaCard'
import ChoiceCard from './components/ChoiceCard'

/**
 * Écran de dilemme immersif (§7–8), mobile-first.
 * - Carte narrative à gauche, cartes de choix à droite (desktop) / empilées (mobile).
 * - Résolution immédiate : un clic sur un choix enchaîne l'étape suivante,
 *   sans écran de validation ni bouton « Continuer » (les conséquences
 *   s'affichent en toast non bloquant).
 * - Exception : les choix irréversibles (retraite, transfert) demandent un
 *   second appui de confirmation sur la carte elle-même.
 */
export default function DilemmaPanel({
  event,
  echo,
  busy,
  armedChoiceId,
  onChoose,
}) {
  if (!event) return null

  return (
    <section className="cg-dilemma" aria-labelledby="dilemma-heading">
      <div className="cg-playgrid">
        <DilemmaCard event={event} echo={echo} />

        <div className="cg-choices2" role="group" aria-label="Tes options">
          {event.choices.map((choice) => (
            <ChoiceCard
              key={choice.id}
              choice={choice}
              description={describeChoiceOutcomes(choice)}
              isArmed={armedChoiceId === choice.id}
              disabled={busy}
              onChoose={onChoose}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
