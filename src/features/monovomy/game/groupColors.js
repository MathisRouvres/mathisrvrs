import { allBoardGroups, groupColor, groupLabel, FALLBACK_GROUP_COLOR } from '../content/maps/groups'

/**
 * Couleur et libellé des groupes de propriétés, **dérivés des définitions de
 * map** (plus aucune palette codée en dur ici). Module sans dépendance 3D :
 * partagé par la texture des cases et par les titres de propriété en HTML.
 *
 * Les identifiants de groupe sont uniques dans tout le registre : ces tables
 * couvrent donc toutes les maps. Pour l'affichage lié à une partie précise,
 * préférer `groupsOf(board)` / `groupOf(board, id)`.
 */
function tableOf(pick) {
  const out = {}
  for (const [id, group] of allBoardGroups()) out[id] = pick(group)
  return out
}

export const GROUP_COLORS = tableOf((group) => group.color)

/** Libellé lisible d'un groupe (affiché sur les titres de propriété). */
export const GROUP_LABEL = tableOf((group) => group.label)

export { groupColor, groupLabel, FALLBACK_GROUP_COLOR }
