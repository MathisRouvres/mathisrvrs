import type { GamePhase } from '../engine/types'
import type { Intent } from './protocol'

/**
 * Action par défaut d’un joueur inactif quand son timer de tour expire.
 * Aucune décision « coûteuse » n’est prise à sa place : on tente juste
 * d’avancer la partie sans le bloquer (voir Phase 5, gestion du temps de tour).
 *
 *  - awaiting_roll  → lancer automatiquement
 *  - awaiting_jail  → tenter un double (n’engage pas de cash tant que non forcé)
 *  - awaiting_purchase → refuser l’achat
 *  - awaiting_card  → accuser réception
 *  - awaiting_market → quitter le marché sans acheter
 *  - turn_cleanup   → terminer le tour
 */
export function defaultIntentForPhase(phase: GamePhase): Intent | null {
  switch (phase) {
    case 'awaiting_roll':
      return { type: 'roll' }
    case 'awaiting_jail':
      return { type: 'jail', action: 'double' }
    case 'awaiting_purchase':
      return { type: 'buy', yes: false }
    case 'awaiting_card':
      return { type: 'ackCard' }
    case 'awaiting_market':
      return { type: 'marketBuy', cardId: null, pay: 'cash' }
    case 'awaiting_trade':
    case 'turn_cleanup':
      return { type: 'endTurn' }
    default:
      return null
  }
}
