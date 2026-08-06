import { describe, it, expect } from 'vitest'
import type { BoardSpace } from '../schema'
import { cellCenter } from '../../components/board/boardLayout'
import { classicSquareMap, CLASSIC_SQUARE_TILES } from './classicSquare'
import { soireeBoard } from '../board.soiree'
import {
  boardMapDefinitionSchema,
  DEFAULT_BOARD_MAP_ID,
  isBoardMapId,
  type NavigableBoard,
} from './types'
import {
  advance,
  boardPath,
  boardSize,
  findNextTileOfKind,
  goToJailIndexOf,
  jailIndexOf,
  logicalDistance,
  normalizeIndex,
  salaryOnPassStart,
  startIndex,
  startingCashOf,
  tileAt,
  tileById,
  tileIdAt,
  tileIndex,
  tilesBetween,
  tilesOfKind,
} from './navigation'
import {
  defaultBoardMap,
  getBoardMap,
  hasBoardMap,
  listBoardMaps,
  mapSupportsPlayerCount,
  resolveBoardMapId,
} from './registry'
import { getTileVisualPosition } from './visual'

/**
 * Map synthétique de 56 cases : vérifie que la navigation ne dépend ni du
 * nombre de cases, ni de la forme du plateau. Aucune géométrie n'y est déclarée.
 */
function makeSyntheticMap(size: number): NavigableBoard {
  const spaces: BoardSpace[] = []
  for (let i = 0; i < size; i += 1) {
    if (i === 0) spaces.push({ kind: 'start', id: 'start', name: 'Départ' })
    else if (i === 14) spaces.push({ kind: 'jail', id: 'jail', name: 'Cuve' })
    else if (i === 42) spaces.push({ kind: 'gojail', id: 'gojail', name: 'Au poste' })
    else if (i % 9 === 0) spaces.push({ kind: 'action', id: `act_${i}`, name: 'Action' })
    else {
      spaces.push({
        kind: 'property',
        id: `t_${i}`,
        name: `Case ${i}`,
        group: `g${i % 8}`,
        price: 100,
        rents: [10, 20],
        sipTier: 1,
      })
    }
  }
  const tiles: Record<string, BoardSpace> = {}
  for (const space of spaces) tiles[space.id] = space
  return {
    path: spaces.map((s) => s.id),
    tiles,
    spaces,
    startTileId: 'start',
    jailTileId: 'jail',
    goToJailTileId: 'gojail',
    economy: { startingCash: 1800, salaryOnPassStart: 150 },
  }
}

const SIZE_56 = 56
const synthetic = makeSyntheticMap(SIZE_56)

describe('map classic_square — migration sans régression', () => {
  it('valide le schéma de définition de map', () => {
    expect(() => boardMapDefinitionSchema.parse(classicSquareMap)).not.toThrow()
  })

  it('conserve exactement 40 cases dans le même ordre', () => {
    expect(classicSquareMap.path).toHaveLength(40)
    expect(classicSquareMap.spaces).toHaveLength(40)
    expect(classicSquareMap.spaces.map((s) => s.id)).toEqual([...classicSquareMap.path])
    expect(CLASSIC_SQUARE_TILES.map((s) => s.id)).toEqual([...classicSquareMap.path])
  })

  it('reste accessible via l’alias historique soireeBoard', () => {
    expect(soireeBoard).toBe(classicSquareMap)
    expect(soireeBoard.spaces[0]?.id).toBe('depart')
    expect(soireeBoard.spaces[39]?.id).toBe('place_grand_cru')
  })

  it('n’a aucune case dupliquée et référence toutes ses cases', () => {
    const ids = [...classicSquareMap.path]
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(classicSquareMap.tiles[id]).toBeDefined()
    expect(Object.keys(classicSquareMap.tiles).sort()).toEqual([...ids].sort())
  })

  it('déclare des cases spéciales cohérentes avec l’ancien plateau', () => {
    expect(startIndex(classicSquareMap)).toBe(0)
    expect(jailIndexOf(classicSquareMap)).toBe(10)
    expect(goToJailIndexOf(classicSquareMap)).toBe(30)
    expect(tilesOfKind(classicSquareMap, 'market')).toEqual(['marche_noir'])
    expect(tilesOfKind(classicSquareMap, 'station')).toHaveLength(4)
    expect(tilesOfKind(classicSquareMap, 'utility')).toHaveLength(2)
  })

  it('conserve l’économie historique', () => {
    expect(startingCashOf(classicSquareMap)).toBe(1500)
    expect(salaryOnPassStart(classicSquareMap)).toBe(200)
  })

  it('accepte 3 à 8 joueurs', () => {
    expect(mapSupportsPlayerCount(classicSquareMap, 3)).toBe(true)
    expect(mapSupportsPlayerCount(classicSquareMap, 8)).toBe(true)
    expect(mapSupportsPlayerCount(classicSquareMap, 2)).toBe(false)
    expect(mapSupportsPlayerCount(classicSquareMap, 9)).toBe(false)
  })
})

describe('géométrie visuelle du plateau carré', () => {
  it('déclare une position par case, sans doublon', () => {
    const positions = classicSquareMap.visual.positions
    expect(positions).toHaveLength(classicSquareMap.path.length)
    expect(new Set(positions.map((p) => p.tileId)).size).toBe(positions.length)
    for (const tileId of classicSquareMap.path) {
      expect(getTileVisualPosition(classicSquareMap, tileId)).toBeDefined()
    }
  })

  it('reproduit exactement la grille 11×11 du rendu actuel', () => {
    classicSquareMap.path.forEach((tileId, index) => {
      const position = getTileVisualPosition(classicSquareMap, tileId)
      const expected = cellCenter(index)
      expect(position?.x).toBeCloseTo(expected.x, 10)
      expect(position?.y).toBeCloseTo(expected.y, 10)
    })
  })

  it('oriente les cases selon leur côté', () => {
    const rotationOf = (tileId: string) => getTileVisualPosition(classicSquareMap, tileId)?.rotation
    expect(rotationOf('depart')).toBe(0)
    expect(rotationOf('prison_visite')).toBe(90)
    expect(rotationOf('bar_ouvert')).toBe(180)
    expect(rotationOf('go_prison')).toBe(270)
  })

  it('n’utilise que des coordonnées finies dans le repère normalisé', () => {
    for (const position of classicSquareMap.visual.positions) {
      expect(Number.isFinite(position.x)).toBe(true)
      expect(Number.isFinite(position.y)).toBe(true)
      expect(position.x).toBeGreaterThanOrEqual(0)
      expect(position.x).toBeLessThanOrEqual(100)
      expect(position.y).toBeGreaterThanOrEqual(0)
      expect(position.y).toBeLessThanOrEqual(100)
    }
  })
})

describe('navigation générique — indépendante de la taille et de la forme', () => {
  it('mesure la taille du plateau depuis le chemin', () => {
    expect(boardSize(classicSquareMap)).toBe(40)
    expect(boardSize(synthetic)).toBe(SIZE_56)
    expect(boardPath(synthetic)).toHaveLength(SIZE_56)
  })

  it('normalise tout index, négatif ou hors bornes', () => {
    expect(normalizeIndex(synthetic, 0)).toBe(0)
    expect(normalizeIndex(synthetic, SIZE_56)).toBe(0)
    expect(normalizeIndex(synthetic, SIZE_56 + 3)).toBe(3)
    expect(normalizeIndex(synthetic, -1)).toBe(SIZE_56 - 1)
  })

  it('avance sur 40 cases et repasse par le départ', () => {
    const step = advance(classicSquareMap, 38, 5)
    expect(step.index).toBe(3)
    expect(step.tileId).toBe('impasse_dernier_verre')
    expect(step.laps).toBe(1)
    expect(step.passedStart).toBe(true)
  })

  it('avance sur 56 cases et repasse par le départ', () => {
    const step = advance(synthetic, SIZE_56 - 2, 5)
    expect(step.index).toBe(3)
    expect(step.laps).toBe(1)
    expect(step.passedStart).toBe(true)
    const inside = advance(synthetic, 10, 7)
    expect(inside.index).toBe(17)
    expect(inside.passedStart).toBe(false)
  })

  it('compte plusieurs passages par le départ', () => {
    const step = advance(synthetic, 0, SIZE_56 * 2 + 4)
    expect(step.laps).toBe(2)
    expect(step.index).toBe(4)
  })

  it('recule sans jamais déclencher de salaire', () => {
    const step = advance(synthetic, 2, -5)
    expect(step.index).toBe(SIZE_56 - 3)
    expect(step.laps).toBe(0)
    expect(step.passedStart).toBe(false)
  })

  it('calcule une distance logique toujours orientée vers l’avant', () => {
    expect(logicalDistance(classicSquareMap, 'depart', 'prison_visite')).toBe(10)
    expect(logicalDistance(classicSquareMap, 'prison_visite', 'depart')).toBe(30)
    expect(logicalDistance(classicSquareMap, 'depart', 'inconnue')).toBe(-1)
  })

  it('liste les cases traversées, départ exclu et arrivée incluse', () => {
    expect(tilesBetween(classicSquareMap, 0, 3)).toEqual([
      'rue_soif',
      'action_1',
      'impasse_dernier_verre',
    ])
    expect(tilesBetween(classicSquareMap, 1, -2)).toEqual(['depart', 'place_grand_cru'])
    expect(tilesBetween(synthetic, SIZE_56 - 1, 2)).toEqual(['start', boardPath(synthetic)[1]])
  })

  it('trouve la prochaine case d’un genre donné sur les deux tailles', () => {
    const nextAction = findNextTileOfKind(classicSquareMap, 0, 'action')
    expect(nextAction).toEqual({ index: 2, tileId: 'action_1', steps: 2 })
    const nextJail = findNextTileOfKind(synthetic, 20, 'jail')
    expect(nextJail?.tileId).toBe('jail')
    expect(nextJail?.steps).toBe(SIZE_56 - 20 + 14)
    expect(findNextTileOfKind(classicSquareMap, 0, 'gojail')?.index).toBe(30)
  })

  it('résout une case par identifiant comme par index', () => {
    expect(tileIdAt(classicSquareMap, 10)).toBe('prison_visite')
    expect(tileAt(classicSquareMap, 10)?.kind).toBe('jail')
    expect(tileById(classicSquareMap, 'marche_noir')?.kind).toBe('market')
    expect(tileIndex(classicSquareMap, 'marche_noir')).toBe(17)
    expect(tileIndex(classicSquareMap, 'inconnue')).toBe(-1)
  })

  it('fonctionne encore sur un plateau sans chemin explicite (ancien BoardTheme)', () => {
    const legacy = { id: 'legacy', name: 'L', description: 'd', spaces: [...CLASSIC_SQUARE_TILES] }
    expect(boardSize(legacy)).toBe(40)
    expect(jailIndexOf(legacy)).toBe(10)
    expect(advance(legacy, 39, 2).index).toBe(1)
    expect(startingCashOf(legacy)).toBe(1500)
  })
})

describe('registre des maps', () => {
  it('expose les deux plateaux', () => {
    expect(listBoardMaps().map((m) => m.id)).toEqual(['classic_square', 'infinity_party'])
    expect(getBoardMap('classic_square')).toBe(classicSquareMap)
    expect(defaultBoardMap().id).toBe(DEFAULT_BOARD_MAP_ID)
  })

  it('refuse une map inconnue au lieu de basculer silencieusement', () => {
    expect(hasBoardMap('atlantide')).toBe(false)
    // @ts-expect-error identifiant hors registre
    expect(() => getBoardMap('atlantide')).toThrow(/unknown_map/)
    expect(resolveBoardMapId('nawak')).toBeNull()
  })

  it('retombe sur le plateau classique quand aucun mapId n’est enregistré', () => {
    expect(resolveBoardMapId(undefined)).toBe('classic_square')
    expect(resolveBoardMapId(null)).toBe('classic_square')
    expect(resolveBoardMapId('')).toBe('classic_square')
  })

  it('reconnaît les identifiants de map déclarés', () => {
    expect(isBoardMapId('classic_square')).toBe(true)
    expect(isBoardMapId('infinity_party')).toBe(true)
    expect(isBoardMapId('carre')).toBe(false)
  })
})
