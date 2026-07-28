/**
 * Patrimoine des joueurs pour l'UI (rails autour du plateau).
 *
 * Module pur et sans dépendance three.js : il est lu par un calque DOM posé sur le
 * canvas, donc il ne doit rien tirer de la scène 3D dans le bundle.
 *
 * Le moteur reste la source de vérité : niveaux d'établissement (`state.buildings`)
 * et hypothèques (`state.mortgaged`) sont optionnels — tout se lit avec des valeurs
 * par défaut (niveau 0, non hypothéquée), comme dans `engine/buildings.ts`.
 */
import { GROUP_COLORS, GROUP_LABEL } from './groupColors'

/** Groupes « virtuels » des cases sans couleur : gares et services. */
const KIND_GROUP = {
  station: { id: 'gares', label: 'Gares', color: '#94a3b8' },
  utility: { id: 'services', label: 'Services', color: '#a78bfa' },
}

function groupOf(space) {
  if (space.kind === 'property') {
    return { id: space.group, label: GROUP_LABEL[space.group] ?? space.group, color: GROUP_COLORS[space.group] ?? '#8b5cf6' }
  }
  return KIND_GROUP[space.kind] ?? null
}

/** Loyer courant affiché sur une case (hors dés pour les services). */
function rentOf(space, { level, mortgaged, monopoly, stationsOwned }) {
  if (mortgaged) return 0
  if (space.kind === 'station') {
    const i = Math.min(Math.max(stationsOwned - 1, 0), space.rents.length - 1)
    return space.rents[i] ?? 0
  }
  if (space.kind === 'utility') return null // dépend du lancer : ×4 le total des dés
  if (space.kind !== 'property') return 0
  if (level > 0) return space.rents[Math.min(level, space.rents.length - 1)] ?? 0
  const base = space.rents[0] ?? 0
  return monopoly ? base * 2 : base
}

/**
 * Patrimoine d'un joueur, ordonné comme le plateau et regroupé par couleur.
 *
 * @returns {{
 *   playerId: string, name: string, color: string, seat: number,
 *   count: number, rentTotal: number, mortgagedCount: number,
 *   spaceIds: string[],
 *   groups: Array<{ id: string, label: string, color: string, complete: boolean, items: object[] }>,
 * }}
 */
export function estateOf(state, board, player, seat, color) {
  const owned = new Set(player.ownedSpaceIds ?? [])
  const monopolyGroups = new Set()
  const byGroup = new Map()

  // Groupes complets : tous les membres du groupe appartiennent au joueur.
  const members = new Map()
  for (const s of board.spaces) {
    if (s.kind === 'property' && s.group) {
      const list = members.get(s.group) ?? []
      list.push(s.id)
      members.set(s.group, list)
    }
  }
  for (const [groupId, ids] of members) {
    if (ids.every((id) => state.ownership?.[id] === player.id)) monopolyGroups.add(groupId)
  }

  let stationsOwned = 0
  for (const s of board.spaces) if (s.kind === 'station' && owned.has(s.id)) stationsOwned += 1

  const spaceIds = []
  let rentTotal = 0
  let mortgagedCount = 0

  board.spaces.forEach((space, index) => {
    if (!owned.has(space.id)) return
    const g = groupOf(space)
    if (!g) return
    const level = state.buildings?.[space.id] ?? 0
    const mortgaged = state.mortgaged?.[space.id] === true
    const monopoly = space.kind === 'property' && monopolyGroups.has(space.group)
    const rent = rentOf(space, { level, mortgaged, monopoly, stationsOwned })
    spaceIds.push(space.id)
    if (mortgaged) mortgagedCount += 1
    if (rent) rentTotal += rent
    const entry = byGroup.get(g.id) ?? { id: g.id, label: g.label, color: g.color, complete: monopoly, items: [] }
    entry.complete = entry.complete || monopoly
    entry.items.push({
      spaceId: space.id,
      index,
      name: space.name,
      kind: space.kind,
      groupColor: g.color,
      level,
      maxLevel: 'rents' in space ? Math.max(0, space.rents.length - 1) : 0,
      mortgaged,
      monopoly,
      rent,
      price: 'price' in space ? space.price : 0,
    })
    byGroup.set(g.id, entry)
  })

  return {
    playerId: player.id,
    name: player.name,
    color,
    seat,
    count: spaceIds.length,
    rentTotal,
    mortgagedCount,
    spaceIds,
    groups: [...byGroup.values()],
  }
}

/** Patrimoine de tous les joueurs encore en lice, dans l'ordre des sièges. */
export function estates(state, board, colors) {
  return state.players
    .map((p, i) => estateOf(state, board, p, i, colors[i % colors.length]))
    .filter((e) => !state.players[e.seat].eliminated)
}

/** Étiquette compacte du niveau d'établissement d'une case. */
export function levelBadge(item) {
  if (item.mortgaged) return '🏦'
  if (item.level <= 0) return ''
  return item.level >= item.maxLevel ? '🏨' : `🏠${item.level}`
}
