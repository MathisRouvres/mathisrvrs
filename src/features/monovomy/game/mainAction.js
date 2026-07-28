/**
 * Action principale attendue, dérivée de l'état de jeu — pure et testable.
 *
 * Sert deux buts UX (Phase 11) :
 *  - libellé toujours visible dans le HUD (« un nouveau joueur comprend l'action
 *    attendue sans lire les règles ») ;
 *  - pilotage d'un bouton principal unique qui change selon l'état, au lieu de
 *    rangées permanentes de boutons.
 *
 * @param {{ phase: string, canAct: boolean, activeName?: string|null, finished?: boolean }} args
 * @returns {{ key: string, label: string, icon: string, waiting: boolean }}
 */
export function selectMainAction({ phase, canAct, activeName, finished }) {
  if (finished) return { key: 'finished', label: 'Partie terminée', icon: '🏁', waiting: false }
  if (!canAct) {
    return { key: 'wait', label: `En attente de ${activeName || '…'}`, icon: '⏳', waiting: true }
  }
  switch (phase) {
    case 'awaiting_roll':
      return { key: 'roll', label: 'Lance le dé', icon: '🎲', waiting: false }
    case 'awaiting_jail':
      return { key: 'jail', label: 'Sors de la cuve', icon: '🔒', waiting: false }
    case 'awaiting_purchase':
      return { key: 'buy', label: 'Acheter ou passer', icon: '🏠', waiting: false }
    case 'awaiting_card':
      return { key: 'card', label: 'Résous la carte', icon: '🃏', waiting: false }
    case 'awaiting_market':
      return { key: 'market', label: 'Marché Noir', icon: '🕶️', waiting: false }
    case 'awaiting_trade':
      return { key: 'trade', label: 'Réponds à l’offre', icon: '🤝', waiting: false }
    default:
      return { key: 'next', label: 'Termine ton tour', icon: '➡️', waiting: false }
  }
}
