/**
 * Rangement des titres de propriété sur le rail (pur, testable, sans three).
 *
 * Le rail vit au bord de table le plus proche de la caméra : la profondeur y est
 * comptée, on ne peut pas empiler des rangs vers le joueur sans sortir du cadre.
 * Les titres sont donc étalés en UN seul rang, en éventail : chaque carton chevauche
 * le précédent, sa tranche gauche (bandeau de groupe) restant toujours visible.
 */

export const CARD_W = 0.66
export const CARD_H = 0.9
export const STEP_MAX = 0.32   // écart entre deux cartons quand la place ne manque pas
export const STEP_MIN = 0.14   // chevauchement maximal admis (la tranche reste lisible)
export const GROUP_EXTRA = 0.4 // respiration entre deux groupes de couleur, en pas
export const LIFT_STEP = 0.003 // décalage vertical par carton : évite le z-fighting

/**
 * Place les titres d'un joueur dans la largeur qui lui est allouée.
 *
 * @param {Array<{items: object[]}>} groups groupes de couleur, dans l'ordre du plateau
 * @param {number} slotWidth largeur disponible pour ce joueur (unités monde)
 * @returns {object[]} titres enrichis de `x` (centré sur 0) et `y` (empilement)
 */
export function layoutFan(groups, slotWidth) {
  const cards = []
  groups.forEach((g) => {
    g.items.forEach((item, k) => cards.push({ item, groupStart: k === 0 && cards.length > 0 }))
  })
  if (cards.length === 0) return []

  // Somme des pas nécessaires (en unités de pas), respirations de groupe comprises.
  const units = cards.reduce((n, c, i) => n + (i === 0 ? 0 : 1 + (c.groupStart ? GROUP_EXTRA : 0)), 0)
  const room = Math.max(0, slotWidth - CARD_W)
  const step = units === 0
    ? 0
    : Math.min(STEP_MAX, Math.max(STEP_MIN, room / units))

  const width = CARD_W + units * step
  let x = -width / 2 + CARD_W / 2
  return cards.map((c, i) => {
    if (i > 0) x += step * (1 + (c.groupStart ? GROUP_EXTRA : 0))
    return { ...c.item, x, y: i * LIFT_STEP }
  })
}

/** Largeur d'un rang de titres, une fois l'éventail posé. */
export function fanWidth(placed) {
  if (placed.length === 0) return 0
  return placed[placed.length - 1].x - placed[0].x + CARD_W
}
