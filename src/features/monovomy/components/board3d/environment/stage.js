/**
 * Ancres de la scène — partagées par le plateau, les titres de propriété et TOUS
 * les environnements. Un environnement peut changer ce qu'il pose autour ; il ne
 * change jamais ces cotes, sinon le plateau flotte ou s'enfonce.
 *
 * Repères (unités monde, 1 case = 1) :
 *
 *   y = 0            surface des cases
 *   y = TABLE_TOP    dessus de table — le socle du plateau est posé dessus
 *   y = FLOOR_Y      sol de la pièce
 *
 *   r <  6,75        plateau + socle
 *   r ≈  8 à 11,3    rail des titres de propriété (desktop, tourne avec la caméra)
 *   r =  SEAT_R      plaques joueurs, sur le bord de table
 *   r =  TABLE_R     bord de table
 *   r =  SEAT_FURNITURE_R  sièges / banquettes / caisses, au sol
 */

/** Dessus de table : le socle du plateau (bas à −0,75) y est posé. */
export const TABLE_TOP = -0.8
/** Rayon du plateau de table. */
export const TABLE_R = 13.6
/** Rayon max, au bas du chanfrein du bord. */
export const TABLE_EDGE = 14
/** Dessous du corps de table — le piètement part de là. */
export const TABLE_BOTTOM = TABLE_TOP - 0.62

/** Sol de la pièce. Assez bas pour que le piètement se lise, assez haut pour
 *  rester dans le champ avec `maxPolarAngle = 1,25`. */
export const FLOOR_Y = -4.2

/** Demi-emprise du plateau, socle compris : rien de décoratif en deçà. */
export const BOARD_HALF = 6.75

/** Rayon des plaques joueurs, posées sur le bord de table (desktop). */
export const SEAT_R = 12.55
/** Rayon compact (téléphone) : le rail des titres est masqué, la place est libre. */
export const SEAT_R_COMPACT = 7.45
/** Rayon du mobilier des places (banquette, canapé, caisse), au sol. */
export const SEAT_FURNITURE_R = 16.4

/** Rayon de l'anneau de décor posé sur la table (verres, seau, snacks). */
export const PROP_R = 11.9

/** Angle d'une place, en partant du bord le plus proche de la caméra (+z). */
export function seatAngle(index, count) {
  const n = Math.max(1, count)
  return ((index % n) / n) * Math.PI * 2
}
