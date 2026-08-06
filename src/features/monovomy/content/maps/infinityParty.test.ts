import { describe, it, expect } from 'vitest'
import type { GameConfig, GameState, PlayerSetup } from '../../engine/types'
import { actionCards } from '../cards'
import {
  createGame,
  startClock,
  takeTurn,
  decideBuy,
  ackCard,
  endTurn,
  jailIndex,
  boardForState,
  resolveMovement,
} from '../../engine'
import { cloneState } from '../../engine/clone'
import { infinityPartyMap, INFINITY_PARTY_TILES } from './infinityParty'
import { classicSquareMap } from './classicSquare'
import {
  advance,
  boardSize,
  goToJailIndexOf,
  jailIndexOf,
  startIndex,
  tileIdAt,
  tileIndex,
  tilesOfKind,
} from './navigation'
import { getTileVisualPosition } from './visual'

const POOL = actionCards.map((card) => card.id)
const UPPER = 'inf_pont_haut'
const LOWER = 'inf_pont_bas'

const cfg = (seed: string): GameConfig => ({
  difficulty: 'inter',
  durationMinutes: 60,
  bankruptcy: 'none',
  themeId: 'soiree',
  mapId: 'infinity_party',
  seed,
})
const setups = (n: number): PlayerSetup[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `J${i + 1}`,
    avatar: `${i + 1}`,
    drinkMode: 'alcohol' as const,
  }))
const roll = (total: number) => ({
  d1: Math.ceil(total / 2),
  d2: Math.floor(total / 2),
  total,
  isDouble: false,
})

const kindCount = (kind: string) =>
  infinityPartyMap.spaces.filter((space) => space.kind === kind).length

describe('Infinity Party — composition du plateau', () => {
  it('compte 56 cases uniques', () => {
    expect(infinityPartyMap.path).toHaveLength(56)
    expect(new Set(infinityPartyMap.path).size).toBe(56)
    expect(INFINITY_PARTY_TILES).toHaveLength(56)
  })

  it('respecte la répartition prévue', () => {
    expect(kindCount('property')).toBe(36)
    expect(kindCount('station')).toBe(4)
    expect(kindCount('utility')).toBe(2)
    expect(kindCount('action')).toBe(6)
    expect(kindCount('tax')).toBe(3)
    expect(kindCount('start')).toBe(1)
    expect(kindCount('jail')).toBe(1)
    expect(kindCount('gojail')).toBe(1)
    expect(kindCount('parking')).toBe(1)
    expect(kindCount('market')).toBe(1)
  })

  it('organise 36 propriétés en 11 groupes complets', () => {
    const sizes = new Map<string, number>()
    for (const space of infinityPartyMap.spaces) {
      if (space.kind === 'property') sizes.set(space.group, (sizes.get(space.group) ?? 0) + 1)
    }
    expect(sizes.size).toBe(11)
    expect([...sizes.values()].reduce((a, b) => a + b, 0)).toBe(36)
    for (const [group, size] of sizes) {
      expect(size, `groupe ${group}`).toBeGreaterThanOrEqual(2)
      expect(size, `groupe ${group}`).toBeLessThanOrEqual(4)
    }
    // Groupes premium : plus petits et plus chers que les groupes d'entrée.
    expect(sizes.get('terrasse')).toBe(4)
    expect(sizes.get('penthouse')).toBe(2)
  })

  it('n’utilise aucun identifiant du plateau classique', () => {
    const classic = new Set(classicSquareMap.path)
    for (const tileId of infinityPartyMap.path) expect(classic.has(tileId)).toBe(false)
  })

  it('place les cases spéciales aux index attendus', () => {
    expect(startIndex(infinityPartyMap)).toBe(0)
    expect(tileIdAt(infinityPartyMap, 0)).toBe('inf_depart')
    expect(jailIndexOf(infinityPartyMap)).toBe(21)
    expect(goToJailIndexOf(infinityPartyMap)).toBe(44)
    expect(tilesOfKind(infinityPartyMap, 'market')).toEqual([LOWER])
  })

  it('déclare une économie adaptée à un parcours plus long', () => {
    expect(infinityPartyMap.economy.startingCash).toBe(1800)
    expect(infinityPartyMap.economy.salaryOnPassStart).toBe(280)
    // Le salaire par case reste comparable au plateau classique (200 / 40).
    const perTile = infinityPartyMap.economy.salaryOnPassStart / infinityPartyMap.path.length
    const classicPerTile = classicSquareMap.economy.salaryOnPassStart / classicSquareMap.path.length
    expect(perTile).toBeCloseTo(classicPerTile, 5)
  })

  it('recommande 4 à 8 joueurs', () => {
    expect(infinityPartyMap.minPlayers).toBe(4)
    expect(infinityPartyMap.maxPlayers).toBe(8)
  })
})

describe('Infinity Party — croisement central', () => {
  it('expose deux cases distinctes au croisement', () => {
    expect(tileIndex(infinityPartyMap, UPPER)).toBe(14)
    expect(tileIndex(infinityPartyMap, LOWER)).toBe(42)
    expect(UPPER).not.toBe(LOWER)
  })

  it('les place sur deux calques et deux zones tactiles différentes', () => {
    const upper = getTileVisualPosition(infinityPartyMap, UPPER)!
    const lower = getTileVisualPosition(infinityPartyMap, LOWER)!
    expect(upper.layer).toBe(2)
    expect(lower.layer).toBe(0)
    expect(upper.segment).toBe('upper_bridge')
    expect(lower.segment).toBe('lower_bridge')
    expect(upper.x).toBeCloseTo(lower.x, 3)
    expect(Math.abs(upper.y - lower.y)).toBeGreaterThan(6)
    expect(upper.y).toBeLessThan(lower.y) // le passage supérieur est au-dessus
  })

  it('croise visuellement sans jamais bifurquer logiquement', () => {
    // Depuis la case avant le pont supérieur on continue sur la boucle droite…
    expect(advance(infinityPartyMap, 13, 1).tileId).toBe(UPPER)
    expect(advance(infinityPartyMap, 14, 1).tileId).toBe(infinityPartyMap.path[15])
    // …et depuis le pont inférieur on repart sur la boucle gauche : aucun saut.
    expect(advance(infinityPartyMap, 41, 1).tileId).toBe(LOWER)
    expect(advance(infinityPartyMap, 42, 1).tileId).toBe(infinityPartyMap.path[43])
    // Les deux passages ne sont jamais adjacents dans le chemin.
    expect(Math.abs(tileIndex(infinityPartyMap, UPPER) - tileIndex(infinityPartyMap, LOWER))).toBe(28)
  })

  it('répartit les cases en deux boucles équilibrées', () => {
    const counts = new Map<string, number>()
    for (const position of infinityPartyMap.visual.positions) {
      counts.set(position.segment ?? '?', (counts.get(position.segment ?? '?') ?? 0) + 1)
    }
    expect(counts.get('left_loop')).toBe(27)
    expect(counts.get('right_loop')).toBe(27)
    expect(counts.get('upper_bridge')).toBe(1)
    expect(counts.get('lower_bridge')).toBe(1)
  })
})

describe('Infinity Party — géométrie en 8', () => {
  const positions = infinityPartyMap.visual.positions

  it('tient dans le repère normalisé, deux fois plus large que haut', () => {
    expect(infinityPartyMap.visual.kind).toBe('free_path')
    expect(infinityPartyMap.visual.aspectRatio).toBe(2)
    for (const position of positions) {
      expect(position.x).toBeGreaterThanOrEqual(0)
      expect(position.x).toBeLessThanOrEqual(100)
      expect(position.y).toBeGreaterThanOrEqual(0)
      expect(position.y).toBeLessThanOrEqual(50)
    }
  })

  it('dessine deux lobes de part et d’autre du centre', () => {
    const left = positions.filter((p) => p.x < 45).length
    const right = positions.filter((p) => p.x > 55).length
    expect(left).toBeGreaterThan(20)
    expect(right).toBeGreaterThan(20)
    expect(Math.abs(left - right)).toBeLessThanOrEqual(2)
  })

  it('espace régulièrement les cases le long des courbes', () => {
    let min = Infinity
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        min = Math.min(min, Math.hypot(positions[i]!.x - positions[j]!.x, positions[i]!.y - positions[j]!.y))
      }
    }
    expect(min).toBeGreaterThan(3)
  })

  it('oriente les cases selon la trajectoire (pas toutes alignées)', () => {
    const rotations = new Set(positions.map((p) => Math.round(p.rotation)))
    expect(rotations.size).toBeGreaterThan(20)
  })
})

describe('Infinity Party — moteur', () => {
  it('démarre sur la case Départ avec le capital de la map', () => {
    const state = createGame(cfg('inf-start'), setups(4), POOL)
    expect(state.mapId).toBe('infinity_party')
    expect(state.mapVersion).toBe(infinityPartyMap.version)
    expect(boardForState(state)).toBe(infinityPartyMap)
    for (const player of state.players) {
      expect(player.position).toBe(0)
      expect(player.cash).toBe(1800)
    }
  })

  it('boucle sur 56 cases et verse le salaire de la map', () => {
    expect(boardSize(infinityPartyMap)).toBe(56)
    const base = createGame(cfg('inf-lap'), setups(4), POOL)
    const next = cloneState(base)
    next.players[next.currentPlayerIndex]!.position = 53
    const out = resolveMovement(next, infinityPartyMap, roll(5)).result
    expect(out.state.players[out.state.currentPlayerIndex]!.position).toBe(2)
    expect(out.passedStart).toBe(true)
    expect(out.salary).toBe(280)
  })

  it('envoie en prison sur la case de la map', () => {
    expect(jailIndex(infinityPartyMap)).toBe(21)
    const base = createGame(cfg('inf-jail'), setups(4), POOL)
    const next = cloneState(base)
    next.players[next.currentPlayerIndex]!.position = 42
    const out = resolveMovement(next, infinityPartyMap, roll(2)).result
    expect(out.outcome.kind).toBe('go_jail')
    expect(out.state.players[out.state.currentPlayerIndex]!.position).toBe(21)
  })

  it('joue une partie complète sans sortir du plateau', () => {
    let state: GameState = startClock(createGame(cfg('inf-run'), setups(5), POOL), 1000)
    let crossedUpper = false
    let crossedLower = false
    for (let i = 0; i < 600 && !state.finished; i += 1) {
      if (state.phase === 'awaiting_roll') state = takeTurn(state, infinityPartyMap).state
      else if (state.phase === 'awaiting_purchase') state = decideBuy(state, infinityPartyMap, true)
      else if (state.phase === 'awaiting_card') state = ackCard(state)
      else if (state.phase === 'turn_cleanup') state = endTurn(state)
      else break
      for (const player of state.players) {
        expect(player.position).toBeGreaterThanOrEqual(0)
        expect(player.position).toBeLessThan(56)
        if (player.position === 14) crossedUpper = true
        if (player.position === 42) crossedLower = true
      }
    }
    expect(state.turn).toBeGreaterThan(1)
    expect(crossedUpper || crossedLower).toBe(true)
  })

  it('reste déterministe à seed égale', () => {
    const play = (): number[] => {
      let state: GameState = createGame(cfg('inf-det'), setups(4), POOL)
      const positions: number[] = []
      for (let i = 0; i < 80 && !state.finished; i += 1) {
        if (state.phase === 'awaiting_roll') state = takeTurn(state, infinityPartyMap).state
        else if (state.phase === 'awaiting_purchase') state = decideBuy(state, infinityPartyMap, true)
        else if (state.phase === 'awaiting_card') state = ackCard(state)
        else if (state.phase === 'turn_cleanup') state = endTurn(state)
        else break
        positions.push(state.players[state.currentPlayerIndex]!.position)
      }
      return positions
    }
    expect(play()).toEqual(play())
  })
})
