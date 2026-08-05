import { polar } from './geoKit'
import { seatAngle } from './stage'
import { PLAYER_COLORS } from '../playerColors'

/**
 * Places autour du plateau — 3 à 8 joueurs, jamais plus, jamais de chaise vide.
 *
 * Les places sont réparties sur le cercle complet en partant du bord le plus
 * proche de la caméra au repos (+z) : à 3 joueurs on obtient trois places à 120°,
 * pas trois places tassées d'un côté et un vide béant de l'autre. La composition
 * se rééquilibre donc toute seule quel que soit l'effectif.
 *
 * Un joueur éliminé garde SA place : sa plaque s'éteint. Le siège ne disparaît
 * pas en cours de partie — la table changerait de forme à chaque faillite.
 *
 * Rien ici ne lit le moteur : on ne fait que projeter `state.players` (ordre
 * inclus) sur des coordonnées. L'ordre des joueurs est celui du moteur, donc la
 * place d'un joueur ne bouge jamais d'une frame à l'autre.
 */

/** Nombre de places affichables. Au-delà de 8, les plaques se chevaucheraient. */
export const MAX_SEATS = 8

/**
 * @param {{players: Array<object>, currentPlayerIndex: number}} state
 * @param {{radius: number, compact: boolean, compactRadius: number, presence?: Record<string, boolean>|null}} opts
 */
export function seatLayout(state, { radius, compactRadius, compact = false, presence = null }) {
  const players = state.players.slice(0, MAX_SEATS)
  const count = players.length
  const r = compact ? compactRadius : radius
  return players.map((p, i) => {
    const angle = seatAngle(i, count)
    const [x, z] = polar(angle, r)
    const connected = presence && Object.prototype.hasOwnProperty.call(presence, p.id)
      ? Boolean(presence[p.id])
      : null
    return {
      index: i,
      playerId: p.id,
      name: p.name,
      avatar: p.avatar ?? null,
      cash: p.cash,
      inJail: Boolean(p.inJail),
      eliminated: Boolean(p.eliminated),
      active: i === state.currentPlayerIndex && !p.eliminated,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      connected,
      angle,
      x,
      z,
      radius: r,
    }
  })
}

/**
 * Clé de stabilité du mobilier : il n'est reconstruit que si le NOMBRE de places
 * ou le rayon change. Un tour joué, un loyer payé, une faillite n'y touchent pas.
 */
export function seatShapeKey(seats) {
  return seats.length ? `${seats.length}:${seats[0].radius}` : '0:0'
}
