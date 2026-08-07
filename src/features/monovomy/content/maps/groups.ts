import type { BoardGroupDefinition, NavigableBoard } from './types'
import { boardPath, tileById } from './navigation'
import { listBoardMaps } from './registry'

/**
 * Groupes de propriétés — lecture depuis la map active.
 *
 * Ni les couleurs ni le nombre de groupes ne sont codés en dur : tout vient de
 * la définition de map. Les identifiants de groupe sont uniques dans tout le
 * registre, ce qui permet aussi une résolution globale pour les composants qui
 * n'ont pas la map sous la main.
 */

/** Couleur de repli d'un groupe inconnu (violet neutre). */
export const FALLBACK_GROUP_COLOR = '#8b5cf6'

/** Groupes d'une map, dans l'ordre d'apparition sur le chemin. */
export function groupsOf(board: NavigableBoard): BoardGroupDefinition[] {
  const out: BoardGroupDefinition[] = []
  const seen = new Set<string>()
  for (const tileId of boardPath(board)) {
    const space = tileById(board, tileId)
    if (!space || space.kind !== 'property' || seen.has(space.group)) continue
    seen.add(space.group)
    out.push(
      board.groups?.[space.group] ?? {
        id: space.group,
        label: space.group,
        color: FALLBACK_GROUP_COLOR,
      },
    )
  }
  return out
}

/** Définition d'un groupe pour une map donnée. */
export function groupOf(board: NavigableBoard, groupId: string): BoardGroupDefinition {
  return (
    board.groups?.[groupId] ?? { id: groupId, label: groupId, color: FALLBACK_GROUP_COLOR }
  )
}

function buildGlobalIndex(): Map<string, BoardGroupDefinition> {
  const index = new Map<string, BoardGroupDefinition>()
  for (const map of listBoardMaps()) {
    for (const group of Object.values(map.groups)) {
      if (!index.has(group.id)) index.set(group.id, group)
    }
  }
  return index
}

let globalIndex: Map<string, BoardGroupDefinition> | null = null

/** Index `groupId → définition` couvrant toutes les maps enregistrées. */
export function allBoardGroups(): Map<string, BoardGroupDefinition> {
  if (!globalIndex) globalIndex = buildGlobalIndex()
  return globalIndex
}

/** Couleur d'un groupe, toutes maps confondues. */
export function groupColor(groupId: string | undefined): string {
  if (!groupId) return FALLBACK_GROUP_COLOR
  return allBoardGroups().get(groupId)?.color ?? FALLBACK_GROUP_COLOR
}

/** Libellé lisible d'un groupe, toutes maps confondues. */
export function groupLabel(groupId: string | undefined): string {
  if (!groupId) return ''
  return allBoardGroups().get(groupId)?.label ?? groupId
}
