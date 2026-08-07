import type { BoardSpace } from '../schema'
import { PLAYER_MAX, PLAYER_MIN, SALARY_PER_LAP, STARTING_CASH } from '../../engine/constants'
import type {
  BoardMapDefinition,
  BoardSegmentId,
  BoardTileVisualPosition,
} from './types'

/**
 * Plateau « Classique » (ex-thème Soirée) — 40 cases, univers 100% boisson.
 * Structure Monopoly : 22 propriétés (8 groupes), 4 gares, 2 services,
 * 5 cases action, 1 Marché Noir (case 17), 2 taxes, 4 coins.
 * sipTier : 1 = 1 gorgée, 2 = 2 gorgées, 3 = cul sec (voir GDD §5).
 *
 * Contenu strictement identique à l'ancien `soireeBoard` : identifiants, ordre,
 * noms, prix, loyers, groupes et effets sont figés (compatibilité des parties
 * en cours et des snapshots existants).
 */
export const CLASSIC_SQUARE_TILES: readonly BoardSpace[] = [
  { kind: 'start', id: 'depart', name: 'Départ' },
  { kind: 'property', id: 'rue_soif', name: 'Rue de la Soif', group: 'brun', price: 60, rents: [2, 10, 30, 90, 160, 250], sipTier: 1 },
  { kind: 'action', id: 'action_1', name: 'Carte Action' },
  { kind: 'property', id: 'impasse_dernier_verre', name: 'Impasse du Dernier Verre', group: 'brun', price: 60, rents: [4, 20, 60, 180, 320, 450], sipTier: 1 },
  { kind: 'tax', id: 'taxe_bar', name: 'Note du Bar', amount: 100, sips: 1 },
  { kind: 'station', id: 'gare_taxi_nuit', name: 'Taxi de Nuit', price: 200, rents: [25, 50, 100, 200], sipTier: 1 },
  { kind: 'property', id: 'rue_apero', name: 'Rue de l’Apéro', group: 'cyan', price: 100, rents: [6, 30, 90, 270, 400, 550], sipTier: 1 },
  { kind: 'action', id: 'action_2', name: 'Chance à Boire' },
  { kind: 'property', id: 'place_bulles', name: 'Place des Bulles', group: 'cyan', price: 100, rents: [6, 30, 90, 270, 400, 550], sipTier: 1 },
  { kind: 'property', id: 'allee_spritz', name: 'Allée du Spritz', group: 'cyan', price: 120, rents: [8, 40, 100, 300, 450, 600], sipTier: 1 },
  { kind: 'jail', id: 'prison_visite', name: 'En Cuve (visite)' },
  { kind: 'property', id: 'bd_cocktails', name: 'Boulevard des Cocktails', group: 'rose', price: 140, rents: [10, 50, 150, 450, 625, 750], sipTier: 1 },
  { kind: 'utility', id: 'service_punch', name: 'Fontaine à Punch', price: 150, sipTier: 1 },
  { kind: 'property', id: 'rue_tequila', name: 'Rue de la Tequila', group: 'rose', price: 140, rents: [10, 50, 150, 450, 625, 750], sipTier: 1 },
  { kind: 'property', id: 'passage_mojito', name: 'Passage du Mojito', group: 'rose', price: 160, rents: [12, 60, 180, 500, 700, 900], sipTier: 1 },
  { kind: 'station', id: 'gare_dernier_metro', name: 'Dernier Métro', price: 200, rents: [25, 50, 100, 200], sipTier: 1 },
  { kind: 'property', id: 'av_rhum', name: 'Avenue du Rhum', group: 'orange', price: 180, rents: [14, 70, 200, 550, 750, 950], sipTier: 2 },
  { kind: 'market', id: 'marche_noir', name: 'Marché Noir' },
  { kind: 'property', id: 'rue_vodka', name: 'Rue de la Vodka', group: 'orange', price: 180, rents: [14, 70, 200, 550, 750, 950], sipTier: 2 },
  { kind: 'property', id: 'place_gin', name: 'Place du Gin', group: 'orange', price: 200, rents: [16, 80, 220, 600, 800, 1000], sipTier: 2 },
  { kind: 'parking', id: 'bar_ouvert', name: 'Bar Ouvert' },
  { kind: 'property', id: 'bd_biere', name: 'Boulevard de la Bière', group: 'rouge', price: 220, rents: [18, 90, 250, 700, 875, 1050], sipTier: 2 },
  { kind: 'action', id: 'action_4', name: 'Chance à Boire' },
  { kind: 'property', id: 'rue_pintes', name: 'Rue des Pintes', group: 'rouge', price: 220, rents: [18, 90, 250, 700, 875, 1050], sipTier: 2 },
  { kind: 'property', id: 'av_mousse', name: 'Avenue de la Mousse', group: 'rouge', price: 240, rents: [20, 100, 300, 750, 925, 1100], sipTier: 2 },
  { kind: 'station', id: 'gare_vtc', name: 'VTC du Retour', price: 200, rents: [25, 50, 100, 200], sipTier: 1 },
  { kind: 'property', id: 'rue_whisky', name: 'Rue du Whisky', group: 'jaune', price: 260, rents: [22, 110, 330, 800, 975, 1150], sipTier: 2 },
  { kind: 'property', id: 'av_bourbon', name: 'Avenue du Bourbon', group: 'jaune', price: 260, rents: [22, 110, 330, 800, 975, 1150], sipTier: 2 },
  { kind: 'utility', id: 'service_shots', name: 'Distributeur de Shots', price: 150, sipTier: 1 },
  { kind: 'property', id: 'place_digestif', name: 'Place du Digestif', group: 'jaune', price: 280, rents: [24, 120, 360, 850, 1025, 1200], sipTier: 2 },
  { kind: 'gojail', id: 'go_prison', name: 'Au Poste !' },
  { kind: 'property', id: 'bd_after', name: 'Boulevard de l’After', group: 'vert', price: 300, rents: [26, 130, 390, 900, 1100, 1275], sipTier: 3 },
  { kind: 'property', id: 'rue_nuit_blanche', name: 'Rue de la Nuit Blanche', group: 'vert', price: 300, rents: [26, 130, 390, 900, 1100, 1275], sipTier: 3 },
  { kind: 'action', id: 'action_5', name: 'Carte Action' },
  { kind: 'property', id: 'av_tournee', name: 'Avenue de la Tournée', group: 'vert', price: 320, rents: [28, 150, 450, 1000, 1200, 1400], sipTier: 3 },
  { kind: 'station', id: 'gare_covoit', name: 'Covoit’ de l’Aube', price: 200, rents: [25, 50, 100, 200], sipTier: 1 },
  { kind: 'action', id: 'action_6', name: 'Chance à Boire' },
  { kind: 'property', id: 'av_champagne', name: 'Avenue du Champagne', group: 'bleu', price: 350, rents: [35, 175, 500, 1100, 1300, 1500], sipTier: 3 },
  { kind: 'tax', id: 'taxe_tournee', name: 'Tournée Générale', amount: 200, sips: 2 },
  { kind: 'property', id: 'place_grand_cru', name: 'Place du Grand Cru', group: 'bleu', price: 400, rents: [50, 200, 600, 1400, 1700, 2000], sipTier: 3 },
]

/** Côté de la grille 11×11 (4 côtés de 9 cases + 4 coins). */
const GRID = 11

/**
 * Cellule (ligne, colonne) d'un index sur l'anneau — sens Monopoly classique,
 * Départ en bas à droite. La géométrie carrée vit ici, dans la map : un test de
 * parité verrouille les coordonnées historiques (grille 11×11).
 */
function cellFor(index: number): { row: number; col: number } {
  const i = ((index % 40) + 40) % 40
  if (i === 0) return { row: 11, col: 11 }
  if (i === 10) return { row: 11, col: 1 }
  if (i === 20) return { row: 1, col: 1 }
  if (i === 30) return { row: 1, col: 11 }
  if (i < 10) return { row: 11, col: 11 - i }
  if (i < 20) return { row: 21 - i, col: 1 }
  if (i < 30) return { row: 1, col: i - 19 }
  return { row: i - 29, col: 11 }
}

/** Côté de l'anneau : chaque coin ouvre le côté qui le suit. */
function segmentFor(index: number): BoardSegmentId {
  if (index < 10) return 'bottom'
  if (index < 20) return 'left'
  if (index < 30) return 'top'
  return 'right'
}

/** Rotation (degrés) orientant le texte vers le centre du plateau. */
const ROTATION_BY_SEGMENT: Record<string, number> = { bottom: 0, left: 90, top: 180, right: 270 }

function buildVisualPositions(tiles: readonly BoardSpace[]): BoardTileVisualPosition[] {
  return tiles.map((tile, index) => {
    const cell = cellFor(index)
    const segment = segmentFor(index)
    return {
      tileId: tile.id,
      x: ((cell.col - 0.5) / GRID) * 100,
      y: ((cell.row - 0.5) / GRID) * 100,
      rotation: ROTATION_BY_SEGMENT[segment] ?? 0,
      layer: 0,
      segment,
    }
  })
}

/** Groupes de propriétés — palette historique du plateau carré. */
const CLASSIC_GROUPS = {
  brun: { id: 'brun', label: 'Brun', color: '#c07a3a' },
  cyan: { id: 'cyan', label: 'Cyan', color: '#22c1c3' },
  rose: { id: 'rose', label: 'Rose', color: '#ec4899' },
  orange: { id: 'orange', label: 'Orange', color: '#f97316' },
  rouge: { id: 'rouge', label: 'Rouge', color: '#ef4444' },
  jaune: { id: 'jaune', label: 'Jaune', color: '#f5b21a' },
  vert: { id: 'vert', label: 'Vert', color: '#22c55e' },
  bleu: { id: 'bleu', label: 'Bleu', color: '#3b82f6' },
} as const

const tilesById: Record<string, BoardSpace> = {}
for (const tile of CLASSIC_SQUARE_TILES) tilesById[tile.id] = tile

const SHORT_DESCRIPTION = 'Le plateau festif par défaut : de la Rue de la Soif à la Place du Grand Cru.'

/** Plateau carré historique, exposé via l'abstraction multi-map. */
export const classicSquareMap: BoardMapDefinition = {
  id: 'classic_square',
  version: '1.0.0',
  name: 'Plateau Classique',
  description: SHORT_DESCRIPTION,
  shortDescription: SHORT_DESCRIPTION,
  longDescription:
    'Parcours traditionnel de 40 cases : 22 propriétés en 8 groupes, 4 transports, 2 services, ' +
    'le Marché Noir et les quatre coins. Partie rapide, règles directes.',
  minPlayers: PLAYER_MIN,
  maxPlayers: PLAYER_MAX,
  estimatedMinutes: 60,

  startTileId: 'depart',
  jailTileId: 'prison_visite',
  goToJailTileId: 'go_prison',

  path: CLASSIC_SQUARE_TILES.map((tile) => tile.id),
  tiles: tilesById,
  groups: CLASSIC_GROUPS,
  spaces: [...CLASSIC_SQUARE_TILES],

  economy: {
    startingCash: STARTING_CASH,
    salaryOnPassStart: SALARY_PER_LAP,
  },

  visual: {
    kind: 'grid_square',
    aspectRatio: 1,
    tileOrientation: 'fixed',
    // Podium au milieu de l'anneau, suivi du pion complet : rendu historique.
    stage: { center: { x: 50, y: 50 }, centerScale: 1, followRatio: 1 },
    positions: buildVisualPositions(CLASSIC_SQUARE_TILES),
  },
}
