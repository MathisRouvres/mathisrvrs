import type { BoardSpace } from '../schema'
import type {
  BoardMapDefinition,
  BoardSegmentId,
  BoardTileVisualPosition,
} from './types'

/**
 * Plateau « Infinity Party » — 56 cases en forme de 8 horizontal.
 *
 * Le 8 est **visuel** : le chemin reste un cycle unique, sans bifurcation. Il
 * traverse deux fois le centre, sur deux cases logiquement distinctes :
 *   - `inf_pont_haut` (index 14) — passage supérieur ;
 *   - `inf_pont_bas`  (index 42) — passage inférieur.
 *
 * Découpage narratif :
 *   - boucle gauche, première moitié (0-13)  : l'apéro et le début de soirée ;
 *   - boucle droite (15-41)                  : le pic de la nuit ;
 *   - boucle gauche, seconde moitié (43-55)  : l'after, le plus cher du plateau.
 */

/** Barème de loyers commun : loyer = base × palier (arrondi aux 5 €). */
const RENT_STEPS = [1, 5, 15, 45, 80, 120] as const

function rentsFor(base: number): number[] {
  return RENT_STEPS.map((step, level) =>
    level === 0 ? base : Math.round((base * step) / 5) * 5,
  )
}

type Tier = 1 | 2 | 3

function property(
  id: string,
  name: string,
  group: string,
  price: number,
  base: number,
  sipTier: Tier,
): BoardSpace {
  return { kind: 'property', id, name, group, price, rents: rentsFor(base), sipTier }
}

function station(id: string, name: string): BoardSpace {
  return { kind: 'station', id, name, price: 200, rents: [25, 50, 100, 200], sipTier: 1 }
}

function utility(id: string, name: string): BoardSpace {
  return { kind: 'utility', id, name, price: 150, sipTier: 1 }
}

/**
 * Les 56 cases, dans l'ordre du chemin. Répartition :
 * 36 propriétés (11 groupes) · 4 transports · 2 services · 6 cartes ·
 * 3 taxes · 1 départ · 1 prison · 1 au poste · 1 pause · 1 marché noir.
 */
export const INFINITY_PARTY_TILES: readonly BoardSpace[] = [
  // ── Boucle gauche · l'apéro (0-13) ──────────────────────────────────────
  { kind: 'start', id: 'inf_depart', name: 'Départ' },
  property('inf_terrasse_soleil', 'Terrasse du Soleil', 'terrasse', 60, 2, 1),
  { kind: 'action', id: 'inf_action_1', name: 'Carte Apéro' },
  property('inf_bar_quartier', 'Bar de Quartier', 'terrasse', 60, 2, 1),
  station('inf_trottinette', 'Trottinette de l’Apéro'),
  property('inf_comptoir_coin', 'Comptoir du Coin', 'terrasse', 80, 3, 1),
  property('inf_guinguette', 'Guinguette du Canal', 'terrasse', 80, 3, 1),
  { kind: 'tax', id: 'inf_taxe_apero', name: 'Note d’Apéro', amount: 100, sips: 1 },
  property('inf_rue_spritz', 'Rue du Spritz', 'spritz', 100, 4, 1),
  { kind: 'action', id: 'inf_action_2', name: 'Chance de Soirée' },
  property('inf_terrasse_aperol', 'Terrasse Aperol', 'spritz', 100, 4, 1),
  property('inf_bulles_roses', 'Place des Bulles Roses', 'spritz', 120, 5, 1),
  utility('inf_machine_glacons', 'Machine à Glaçons'),
  property('inf_bar_vin', 'Bar à Vin Nature', 'spritz', 120, 5, 1),

  // ── Croisement · passage supérieur (14) ─────────────────────────────────
  { kind: 'parking', id: 'inf_pont_haut', name: 'Le Pont des Perdus' },

  // ── Boucle droite · le pic de la nuit (15-41) ───────────────────────────
  property('inf_cave_pong', 'Cave Beer Pong', 'beerpong', 140, 6, 1),
  property('inf_sous_sol_ping', 'Sous-sol du Ping', 'beerpong', 140, 6, 1),
  { kind: 'action', id: 'inf_action_3', name: 'Carte Apéro' },
  property('inf_salle_flip', 'Salle de Flip', 'beerpong', 160, 7, 2),
  station('inf_taxi_nuit', 'Taxi de 1h du Mat’'),
  property('inf_garage_pong', 'Garage Beer Pong', 'beerpong', 160, 7, 2),
  { kind: 'jail', id: 'inf_prison_visite', name: 'En Cuve (visite)' },
  property('inf_kebab_nuit', 'Kebab de la Nuit', 'snack', 180, 9, 2),
  property('inf_food_truck', 'Food Truck Frites', 'snack', 180, 9, 2),
  { kind: 'tax', id: 'inf_taxe_addition', name: 'Addition Surprise', amount: 150, sips: 1 },
  property('inf_bar_tacos', 'Bar à Tacos', 'snack', 200, 10, 2),
  property('inf_speakeasy', 'Speakeasy', 'cocktail', 220, 12, 2),
  { kind: 'action', id: 'inf_action_4', name: 'Chance de Soirée' },
  property('inf_bar_cocktails', 'Bar à Cocktails', 'cocktail', 220, 12, 2),
  property('inf_mixologie', 'Comptoir Mixologie', 'cocktail', 240, 13, 2),
  station('inf_metro_fantome', 'Métro Fantôme'),
  property('inf_dancefloor_neon', 'Dancefloor Néon', 'dancefloor', 260, 16, 2),
  property('inf_piste_miroir', 'Piste Miroir', 'dancefloor', 260, 16, 2),
  utility('inf_fumigene', 'Fumigène du DJ'),
  property('inf_sono_warehouse', 'Sono Warehouse', 'dancefloor', 280, 18, 2),
  property('inf_cage_danser', 'Cage à Danser', 'dancefloor', 280, 18, 2),
  { kind: 'action', id: 'inf_action_5', name: 'Carte Apéro' },
  property('inf_rooftop_sunset', 'Rooftop Sunset', 'rooftop', 300, 22, 2),
  property('inf_terrasse_panorama', 'Terrasse Panorama', 'rooftop', 300, 22, 2),
  station('inf_vtc_quatre', 'VTC de 4h'),
  property('inf_rooftop_piscine', 'Rooftop Piscine', 'rooftop', 320, 24, 3),
  property('inf_sky_bar', 'Sky Bar', 'rooftop', 320, 24, 3),

  // ── Croisement · passage inférieur (42) ─────────────────────────────────
  { kind: 'market', id: 'inf_pont_bas', name: 'Sous le Pont — Marché Noir' },

  // ── Boucle gauche · l'after (43-55) ─────────────────────────────────────
  property('inf_club_prive', 'Club Privé', 'club', 340, 28, 3),
  { kind: 'gojail', id: 'inf_go_prison', name: 'Au Poste !' },
  property('inf_cave_techno', 'Cave Techno', 'club', 340, 28, 3),
  property('inf_club_underground', 'Club Underground', 'club', 360, 30, 3),
  { kind: 'action', id: 'inf_action_6', name: 'Chance de Soirée' },
  property('inf_carre_vip', 'Carré VIP', 'vip', 380, 34, 3),
  property('inf_loge_champagne', 'Loge Champagne', 'vip', 400, 36, 3),
  { kind: 'tax', id: 'inf_taxe_vip', name: 'Note du Carré VIP', amount: 200, sips: 2 },
  property('inf_table_bouteilles', 'Table Bouteilles', 'vip', 420, 38, 3),
  property('inf_loft_after', 'Loft de l’After', 'after', 450, 45, 3),
  property('inf_appart_lever_jour', 'Appart du Lever du Jour', 'after', 500, 50, 3),
  property('inf_penthouse_infinity', 'Penthouse Infinity', 'penthouse', 550, 60, 3),
  property('inf_suite_dernier_verre', 'Suite du Dernier Verre', 'penthouse', 600, 70, 3),
]

// ── Géométrie : lemniscate de Gerono, échantillonnée à pas d'arc constant ───

/** Index des deux cases du croisement central (quarts du parcours). */
const UPPER_BRIDGE_INDEX = 14
const LOWER_BRIDGE_INDEX = 42

/** Repère normalisé : 100 de large, 50 de haut (le 8 est deux fois plus large que haut). */
const ASPECT_RATIO = 2
const BOX_HEIGHT = 100 / ASPECT_RATIO
const CX = 50
const CY = BOX_HEIGHT / 2
const AX = 45
const AY = 21
/** Décalage vertical des deux cases du croisement (lisibilité du pont). */
const BRIDGE_OFFSET = 4

/**
 * Point de la lemniscate. `t = π` place le Départ sur la pointe gauche, puis le
 * parcours monte vers le croisement (t = 3π/2), fait toute la boucle droite,
 * repasse au centre (t = 5π/2) et redescend sur la boucle gauche.
 */
function pointAt(t: number): { x: number; y: number } {
  return { x: CX + AX * Math.cos(t), y: CY - AY * Math.sin(2 * t) }
}

const T0 = Math.PI
const TAU = Math.PI * 2
/** Finesse de l'intégration de la longueur d'arc (déterministe). */
const SAMPLES = 4096

/** Paramètres `t` répartis à distance d'arc égale le long de la courbe. */
function equidistantParams(count: number): number[] {
  const cumulative: number[] = [0]
  let previous = pointAt(T0)
  let total = 0
  for (let i = 1; i <= SAMPLES; i += 1) {
    const point = pointAt(T0 + (TAU * i) / SAMPLES)
    total += Math.hypot(point.x - previous.x, point.y - previous.y)
    cumulative.push(total)
    previous = point
  }

  const params: number[] = []
  let cursor = 0
  for (let k = 0; k < count; k += 1) {
    const target = (total * k) / count
    while (cursor < SAMPLES && cumulative[cursor + 1]! < target) cursor += 1
    const before = cumulative[cursor]!
    const after = cumulative[cursor + 1] ?? total
    const ratio = after === before ? 0 : (target - before) / (after - before)
    params.push(T0 + (TAU * (cursor + ratio)) / SAMPLES)
  }
  return params
}

/** Segment visuel d'une case : deux boucles + les deux passages du croisement. */
function segmentFor(index: number): BoardSegmentId {
  if (index === UPPER_BRIDGE_INDEX) return 'upper_bridge'
  if (index === LOWER_BRIDGE_INDEX) return 'lower_bridge'
  return index > UPPER_BRIDGE_INDEX && index < LOWER_BRIDGE_INDEX ? 'right_loop' : 'left_loop'
}

/** Le pont supérieur passe au-dessus, l'inférieur en dessous, les boucles entre les deux. */
function layerFor(segment: BoardSegmentId): number {
  if (segment === 'upper_bridge') return 2
  if (segment === 'lower_bridge') return 0
  return 1
}

/** Angle (degrés, 0 = vers le haut de l'écran, sens horaire) d'un vecteur écran. */
function screenAngle(x: number, y: number): number {
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
}

function buildVisualPositions(tiles: readonly BoardSpace[]): BoardTileVisualPosition[] {
  const params = equidistantParams(tiles.length)
  return tiles.map((tile, index) => {
    const t = params[index]!
    const point = pointAt(t)
    // Tangente locale (différences centrées) → normale orientée vers le cœur de la boucle.
    const step = TAU / SAMPLES
    const ahead = pointAt(t + step)
    const behind = pointAt(t - step)
    const dx = ahead.x - behind.x
    const dy = ahead.y - behind.y
    const lobeCx = point.x >= CX ? CX + AX / 2 : CX - AX / 2
    const toward = { x: lobeCx - point.x, y: CY - point.y }
    const right = { x: -dy, y: dx }
    const normal = right.x * toward.x + right.y * toward.y >= 0 ? right : { x: dy, y: -dx }

    const segment = segmentFor(index)
    // Les deux cases du croisement occupent le même point de la courbe : on les
    // écarte verticalement (l'une au-dessus du pont, l'autre en dessous) pour
    // qu'elles restent deux zones tactiles distinctes.
    const shiftY =
      segment === 'upper_bridge' ? -BRIDGE_OFFSET : segment === 'lower_bridge' ? BRIDGE_OFFSET : 0

    return {
      tileId: tile.id,
      x: Number(point.x.toFixed(3)),
      y: Number((point.y + shiftY).toFixed(3)),
      rotation: Number(screenAngle(normal.x, normal.y).toFixed(2)),
      layer: layerFor(segment),
      segment,
    }
  })
}

/**
 * Groupes de propriétés — 11 familles, de l'apéro au penthouse. Teintes
 * volontairement écartées sur la roue chromatique pour rester lisibles en
 * bandeau de case comme en pastille de titre de propriété.
 */
const INFINITY_GROUPS = {
  terrasse: { id: 'terrasse', label: 'Terrasse', color: '#f59e0b' },
  spritz: { id: 'spritz', label: 'Spritz', color: '#ff6b6b' },
  beerpong: { id: 'beerpong', label: 'Beer Pong', color: '#84cc16' },
  snack: { id: 'snack', label: 'Snack', color: '#a16207' },
  cocktail: { id: 'cocktail', label: 'Cocktail', color: '#14b8a6' },
  dancefloor: { id: 'dancefloor', label: 'Dancefloor', color: '#ec4899' },
  rooftop: { id: 'rooftop', label: 'Rooftop', color: '#38bdf8' },
  club: { id: 'club', label: 'Club', color: '#8b5cf6' },
  vip: { id: 'vip', label: 'VIP', color: '#d4af37' },
  after: { id: 'after', label: 'After', color: '#b91c1c' },
  penthouse: { id: 'penthouse', label: 'Penthouse', color: '#cbd5e1' },
} as const

const tilesById: Record<string, BoardSpace> = {}
for (const tile of INFINITY_PARTY_TILES) tilesById[tile.id] = tile

const SHORT_DESCRIPTION =
  'Un grand 8 nocturne : l’apéro sur la boucle gauche, le club sur la droite, un pont au milieu.'

/**
 * Économie propre au plateau : parcours 40 % plus long que le carré, donc
 * salaire de tour relevé pour garder la même circulation d'argent par case
 * (200/40 → 280/56), et capital de départ légèrement supérieur (plus de
 * propriétés d'entrée de gamme à disputer).
 */
export const infinityPartyMap: BoardMapDefinition = {
  id: 'infinity_party',
  version: '1.0.0',
  name: 'Infinity Party',
  description: SHORT_DESCRIPTION,
  shortDescription: SHORT_DESCRIPTION,
  longDescription:
    'Parcours en forme de 8 sur 56 cases : 36 propriétés en 11 groupes, 4 transports de nuit, ' +
    '2 services et un croisement central à deux niveaux. Plus de propriétés, plus de stratégie, ' +
    'et une montée d’ambiance de l’apéro jusqu’à l’after.',
  minPlayers: 4,
  maxPlayers: 8,
  estimatedMinutes: 75,

  startTileId: 'inf_depart',
  jailTileId: 'inf_prison_visite',
  goToJailTileId: 'inf_go_prison',

  path: INFINITY_PARTY_TILES.map((tile) => tile.id),
  tiles: tilesById,
  groups: INFINITY_GROUPS,
  spaces: [...INFINITY_PARTY_TILES],

  economy: {
    startingCash: 1800,
    salaryOnPassStart: 280,
  },

  visual: {
    kind: 'free_path',
    aspectRatio: ASPECT_RATIO,
    tileOrientation: 'path',
    positions: buildVisualPositions(INFINITY_PARTY_TILES),
  },
}
