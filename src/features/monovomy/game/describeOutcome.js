import { getCardById } from '../content'
import { sipsForCard, DIFFICULTY_MULTIPLIER } from '../engine'

/**
 * Dérive côté client les gorgées et la carte à afficher pour un résultat de tour.
 * Chaque appareil calcule l’affichage à partir de l’état synchronisé.
 */
export function describeOutcome(outcome, difficulty) {
  const mult = DIFFICULTY_MULTIPLIER[difficulty] ?? 1
  let sips = 0
  let card = null
  if (outcome.kind === 'draw_card') {
    const found = getCardById(outcome.cardId)
    if (found) {
      card = found
      sips = sipsForCard(found.baseSips, difficulty)
    }
  } else if (outcome.kind === 'pay_rent' || outcome.kind === 'tax') {
    sips = outcome.sips * mult
  }
  return { sips, card }
}
