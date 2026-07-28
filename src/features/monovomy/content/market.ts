import type { MarketCard } from './schema'

/**
 * Catalogue du Marché Noir — cartes achetables, payables en argent OU en gorgées.
 *
 * Taux de change de la maison : 1 gorgée = 50 € (voir `SIPS_TO_CASH`). Le prix en
 * gorgées de chaque carte est donc `priceCash / 50`, arrondi.
 *
 * Deux natures d'effet :
 *  - **mécanique** (`shield`, `pickpocket`, `loaded_die`, `free_pass`, `jail_key`) :
 *    le moteur applique lui-même, l'état change ;
 *  - **déclaratif** (`mirror`, `gag`, `proxy`, `round`) : le jeu annonce à la table,
 *    qui applique — comme tout le contenu « gorgées » du projet. Le moteur consomme
 *    la carte et journalise l'annonce, il n'impose jamais de boire.
 *
 * Chaque carte porte une variante soft : un joueur en mode soft n'est jamais exclu.
 */
export const marketCards: MarketCard[] = [
  {
    id: 'mk_bouclier',
    name: 'Bouclier',
    emoji: '🛡️',
    description: 'Annule les gorgées de la prochaine sanction qui te vise (loyer, taxe, cuve ou carte).',
    priceCash: 150,
    effect: 'shield',
    timing: 'anytime',
    target: 'self',
    softVariant: 'Annule le prochain mini-gage qui te vise.',
  },
  {
    id: 'mk_miroir',
    name: 'Miroir',
    emoji: '🪞',
    description: 'Renvoie à son auteur une sanction qui te vise, doublée. Sans effet sur les sanctions collectives.',
    priceCash: 300,
    effect: 'mirror',
    timing: 'reaction',
    target: 'player',
    softVariant: 'Renvoie le mini-gage à son auteur, doublé.',
  },
  {
    id: 'mk_pickpocket',
    name: 'Pickpocket',
    emoji: '🤏',
    description: 'Vole une carte au hasard à un joueur. Annoncé publiquement.',
    priceCash: 300,
    effect: 'pickpocket',
    timing: 'anytime',
    target: 'player',
    softVariant: 'Vol de carte : aucune sanction, pur effet de jeu.',
  },
  {
    id: 'mk_baillon',
    name: 'Bâillon',
    emoji: '🤐',
    description: 'La cible ne parle plus jusqu’à son prochain tour. Chaque mot lui coûte 1 gorgée, 5 au maximum.',
    priceCash: 100,
    effect: 'gag',
    timing: 'anytime',
    target: 'player',
    softVariant: 'Chaque mot prononcé coûte un mini-gage, 5 au maximum.',
  },
  {
    id: 'mk_de_truque',
    name: 'Dé Truqué',
    emoji: '🎲',
    description: 'À jouer avant ton lancer : tu lances deux fois et le plus haut total est retenu.',
    priceCash: 300,
    effect: 'loaded_die',
    timing: 'before_roll',
    target: 'self',
    softVariant: 'Aucun impact alcool : pur avantage de déplacement.',
  },
  {
    id: 'mk_passe_droit',
    name: 'Passe-Droit',
    emoji: '🎫',
    description: 'Annule le loyer que tu viens de payer : l’argent et la gorgée te sont rendus.',
    priceCash: 250,
    effect: 'free_pass',
    timing: 'on_rent',
    target: 'self',
    softVariant: 'Le mini-gage du loyer est annulé, l’argent est rendu.',
  },
  {
    id: 'mk_procuration',
    name: 'Procuration',
    emoji: '✍️',
    description: 'Un joueur boit à ta place, 4 gorgées au maximum. Il ne peut pas refuser.',
    priceCash: 200,
    effect: 'proxy',
    timing: 'reaction',
    target: 'player',
    softVariant: 'Le joueur désigné exécute le mini-gage à ta place.',
  },
  {
    id: 'mk_tournee',
    name: 'Tournée Forcée',
    emoji: '🍻',
    description: 'Toute la table boit une gorgée. Toi compris.',
    priceCash: 200,
    effect: 'round',
    timing: 'anytime',
    target: 'table',
    softVariant: 'Toute la table exécute un mini-gage, toi compris.',
  },
  {
    id: 'mk_cle_cuve',
    name: 'Clé de Cuve',
    emoji: '🗝️',
    description: 'Sortie de cuve immédiate et gratuite, quand tu en auras besoin.',
    priceCash: 150,
    effect: 'jail_key',
    timing: 'anytime',
    target: 'self',
    softVariant: 'Sortie de cuve : aucune sanction dans les deux modes.',
  },
]

export function getMarketCardById(id: string): MarketCard | undefined {
  return marketCards.find((card) => card.id === id)
}

/** Identifiants du catalogue, dans l'ordre de déclaration (source du stock). */
export const marketCardPool: string[] = marketCards.map((card) => card.id)
