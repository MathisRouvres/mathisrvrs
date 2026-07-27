/**
 * Lecture du plateau pour l'UI (Phase 11) — pur, sans dépendance moteur.
 *
 * Le moteur ne modélise ni bâtiments ni hypothèque : « niveau d'établissement » et
 * « propriété hypothéquée » ne sont donc pas dérivables. En revanche les GROUPES
 * complets (monopoles) le sont, à partir des couleurs de groupe et de `ownership`.
 */

/** groupId → [spaceId…] pour toutes les propriétés du plateau. */
export function propertyGroups(board) {
  const groups = {}
  for (const s of board.spaces) {
    if (s.kind === 'property' && s.group) {
      ;(groups[s.group] ||= []).push(s.id)
    }
  }
  return groups
}

/**
 * Détecte les groupes entièrement détenus par un même joueur.
 * @returns {{
 *   groups: Record<string,string[]>,
 *   monopolySpaces: Record<string,string>,   // spaceId → ownerId
 *   monopolyGroupsByOwner: Record<string,string[]>, // ownerId → [groupId]
 * }}
 */
export function completeGroups(state, board) {
  const groups = propertyGroups(board)
  const ownership = state.ownership || {}
  const monopolySpaces = {}
  const monopolyGroupsByOwner = {}
  for (const [groupId, ids] of Object.entries(groups)) {
    const first = ownership[ids[0]]
    if (first && ids.every((id) => ownership[id] === first)) {
      for (const id of ids) monopolySpaces[id] = first
      ;(monopolyGroupsByOwner[first] ||= []).push(groupId)
    }
  }
  return { groups, monopolySpaces, monopolyGroupsByOwner }
}

/** Table spaceId → couleur du propriétaire (pour teinter les cases). */
export function ownerColorBySpace(state, colors) {
  const colorByPlayer = {}
  state.players.forEach((p, i) => {
    colorByPlayer[p.id] = colors[i % colors.length]
  })
  const map = {}
  for (const [spaceId, ownerId] of Object.entries(state.ownership || {})) {
    if (ownerId && colorByPlayer[ownerId]) map[spaceId] = colorByPlayer[ownerId]
  }
  return map
}
