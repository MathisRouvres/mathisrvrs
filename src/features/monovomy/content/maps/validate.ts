import { boardMapDefinitionSchema, type BoardMapDefinition } from './types'
import { advance, boardSize, goToJailIndexOf, jailIndexOf, startIndex } from './navigation'
import { listBoardMaps } from './registry'

/**
 * Validateur de maps — cœur de `npm run mv:validate-content`.
 *
 * Vérifie qu'une définition est jouable : chemin cyclique cohérent, cases
 * référencées, groupes homogènes, géométrie complète. Renvoie la liste des
 * problèmes (vide = map valide) plutôt que de lever, pour produire un rapport.
 */
export interface MapValidationReport {
  mapId: string
  name: string
  tileCount: number
  errors: string[]
  stats: Record<string, number>
}

export function validateBoardMap(map: BoardMapDefinition): MapValidationReport {
  const errors: string[] = []
  const push = (message: string) => errors.push(message)

  const parsed = boardMapDefinitionSchema.safeParse(map)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      push(`schéma: ${issue.path.join('.')} — ${issue.message}`)
    }
  }

  // ── Chemin ────────────────────────────────────────────────────────────────
  if (map.path.length === 0) push('chemin vide')
  const seen = new Set<string>()
  for (const tileId of map.path) {
    if (seen.has(tileId)) push(`case dupliquée dans le chemin : ${tileId}`)
    seen.add(tileId)
    if (!map.tiles[tileId]) push(`case référencée mais absente de tiles : ${tileId}`)
  }
  for (const tileId of Object.keys(map.tiles)) {
    if (!seen.has(tileId)) push(`case définie mais absente du chemin : ${tileId}`)
  }
  if (map.spaces.length !== map.path.length) push('spaces désynchronisé du chemin')
  map.spaces.forEach((space, index) => {
    if (space.id !== map.path[index]) push(`spaces[${index}] ne suit pas l'ordre du chemin`)
  })

  // ── Cycle complet ─────────────────────────────────────────────────────────
  const size = boardSize(map)
  if (size >= 2) {
    const loop = advance(map, 0, size)
    if (loop.index !== 0 || loop.laps !== 1) push('le chemin ne boucle pas sur lui-même')
    const backwards = advance(map, 0, -1)
    if (backwards.index !== size - 1) push('le chemin n’est pas parcourable en arrière')
  }

  // ── Cases spéciales ───────────────────────────────────────────────────────
  if (startIndex(map) < 0) push('aucune case Départ')
  if (map.startTileId && !map.tiles[map.startTileId]) push(`startTileId inconnu : ${map.startTileId}`)
  if (map.jailTileId && !map.tiles[map.jailTileId]) push(`jailTileId inconnu : ${map.jailTileId}`)
  if (map.goToJailTileId && !map.tiles[map.goToJailTileId]) {
    push(`goToJailTileId inconnu : ${map.goToJailTileId}`)
  }
  if (jailIndexOf(map) < 0) push('aucune case Prison')
  if (goToJailIndexOf(map) < 0) push('aucune case « Au poste »')

  // ── Groupes de propriétés ─────────────────────────────────────────────────
  const groups = new Map<string, { count: number; rentLengths: Set<number> }>()
  for (const space of map.spaces) {
    if (space.kind === 'property') {
      if (space.price <= 0) push(`prix invalide : ${space.id}`)
      if (space.rents.length < 2) push(`barème de loyers trop court : ${space.id}`)
      const entry = groups.get(space.group) ?? { count: 0, rentLengths: new Set<number>() }
      entry.count += 1
      entry.rentLengths.add(space.rents.length)
      groups.set(space.group, entry)
    }
    if ((space.kind === 'station' || space.kind === 'utility') && space.price <= 0) {
      push(`prix invalide : ${space.id}`)
    }
  }
  for (const [groupId, entry] of groups) {
    if (entry.count < 2) push(`groupe incomplet (monopole impossible) : ${groupId}`)
    if (entry.rentLengths.size > 1) push(`paliers de loyers hétérogènes dans le groupe : ${groupId}`)
    const declared = map.groups[groupId]
    if (!declared) push(`groupe utilisé mais non déclaré : ${groupId}`)
    else if (declared.id !== groupId) push(`groupe mal indexé : ${groupId}`)
  }
  for (const groupId of Object.keys(map.groups)) {
    if (!groups.has(groupId)) push(`groupe déclaré mais inutilisé : ${groupId}`)
  }

  // ── Géométrie visuelle ────────────────────────────────────────────────────
  const positions = new Map(map.visual.positions.map((position) => [position.tileId, position]))
  if (positions.size !== map.visual.positions.length) push('positions visuelles dupliquées')
  for (const tileId of map.path) {
    const position = positions.get(tileId)
    if (!position) {
      push(`position visuelle manquante : ${tileId}`)
      continue
    }
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      push(`coordonnée invalide : ${tileId}`)
    }
    if (!Number.isFinite(position.rotation)) push(`rotation invalide : ${tileId}`)
  }
  for (const position of map.visual.positions) {
    if (!map.tiles[position.tileId]) push(`position visuelle orpheline : ${position.tileId}`)
  }

  // ── Joueurs ───────────────────────────────────────────────────────────────
  if (map.minPlayers < 2) push('minPlayers doit valoir au moins 2')
  if (map.maxPlayers < map.minPlayers) push('maxPlayers inférieur à minPlayers')

  // ── Économie ──────────────────────────────────────────────────────────────
  if (map.economy.startingCash <= 0) push('capital de départ invalide')
  if (map.economy.salaryOnPassStart < 0) push('salaire de tour invalide')

  const stats: Record<string, number> = {}
  for (const space of map.spaces) stats[space.kind] = (stats[space.kind] ?? 0) + 1
  stats.groups = groups.size

  return { mapId: map.id, name: map.name, tileCount: size, errors, stats }
}

/** Rapport pour toutes les maps du registre, dans l'ordre d'enregistrement. */
export function validateAllBoardMaps(): MapValidationReport[] {
  const reports = listBoardMaps().map(validateBoardMap)
  const ids = new Set<string>()
  for (const report of reports) {
    if (ids.has(report.mapId)) report.errors.push(`identifiant de map dupliqué : ${report.mapId}`)
    ids.add(report.mapId)
  }
  return reports
}

/** Rendu texte du rapport (une section par map). */
export function formatValidationReport(reports: MapValidationReport[]): string {
  return reports
    .map((report) => {
      const head = `── ${report.mapId} · ${report.name} — ${report.tileCount} cases`
      const stats = Object.entries(report.stats)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · ')
      const body = report.errors.length === 0
        ? '   ✅ aucune erreur'
        : report.errors.map((error) => `   ❌ ${error}`).join('\n')
      return `${head}\n   ${stats}\n${body}`
    })
    .join('\n')
}
