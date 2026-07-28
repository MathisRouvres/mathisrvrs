import { soireeBoard } from '../../content'

/**
 * Géométrie du plateau : conversion index de case (0..39) → cellule puis position
 * monde. Partagé par la scène et les effets (éviter deux copies qui divergent).
 */
export function cellFor(i) {
  i = ((i % 40) + 40) % 40
  if (i === 0) return [11, 11]
  if (i === 10) return [11, 1]
  if (i === 20) return [1, 1]
  if (i === 30) return [1, 11]
  if (i < 10) return [11, 11 - i]
  if (i < 20) return [21 - i, 1]
  if (i < 30) return [1, i - 19]
  return [i - 29, 11]
}

/** Centre d'une case en coordonnées monde : [x, z] (le plateau est en y ≈ 0). */
export function cellPos(i) {
  const [r, c] = cellFor(i)
  return [c - 6, r - 6]
}

/** spaceId → index de case. */
export const INDEX_BY_ID = new Map(soireeBoard.spaces.map((s, i) => [s.id, i]))

/** Indices de toutes les cases du même groupe de couleur (la case seule sinon). */
export function groupIndicesOf(spaceId) {
  const i = INDEX_BY_ID.get(spaceId)
  if (i == null) return []
  const group = soireeBoard.spaces[i].group
  if (!group) return [i]
  const out = []
  soireeBoard.spaces.forEach((s, k) => { if (s.group === group) out.push(k) })
  return out
}
