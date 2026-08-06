import { describe, it, expect } from 'vitest'
import type { BoardSpace, BoardTheme } from '../content/schema'
import type { DiceRoll, GameConfig, GameState, PlayerSetup } from './types'
import { classicSquareMap } from '../content/maps/classicSquare'
import { boardSize } from '../content/maps/navigation'
import { actionCards } from '../content/cards'
import { createGame } from './setup'
import { cloneState } from './clone'
import { resolveMovement, takeTurn, endTurn, ackCard, decideBuy, jailIndex } from './turn'

const POOL = actionCards.map((card) => card.id)

const cfg = (seed: string): GameConfig => ({
  difficulty: 'inter',
  durationMinutes: 60,
  bankruptcy: 'none',
  themeId: 'soiree',
  seed,
})

const setups = (n: number): PlayerSetup[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `J${i + 1}`,
    avatar: `${i + 1}`,
    drinkMode: 'alcohol' as const,
  }))

const roll = (total: number): DiceRoll => ({
  d1: Math.ceil(total / 2),
  d2: Math.floor(total / 2),
  total,
  isDouble: false,
})

/** Plateau synthétique de 56 cases : le moteur ne doit rien supposer de sa taille. */
function makeBoard56(): BoardTheme {
  const spaces: BoardSpace[] = []
  for (let i = 0; i < 56; i += 1) {
    if (i === 0) spaces.push({ kind: 'start', id: 'start', name: 'Départ' })
    else if (i === 14) spaces.push({ kind: 'jail', id: 'jail', name: 'Cuve' })
    else if (i === 42) spaces.push({ kind: 'gojail', id: 'gojail', name: 'Au poste' })
    else if (i % 11 === 0) spaces.push({ kind: 'action', id: `act_${i}`, name: 'Action' })
    else if (i % 17 === 0) spaces.push({ kind: 'parking', id: `pause_${i}`, name: 'Pause' })
    else {
      spaces.push({
        kind: 'property',
        id: `t_${i}`,
        name: `Case ${i}`,
        group: `g${i % 10}`,
        price: 100,
        rents: [10, 20],
        sipTier: 1,
      })
    }
  }
  const tiles: Record<string, BoardSpace> = {}
  for (const space of spaces) tiles[space.id] = space
  return {
    id: 'synthetic_56',
    name: 'Synthétique 56',
    description: 'Plateau de test à 56 cases',
    spaces,
    path: spaces.map((s) => s.id),
    tiles,
    startTileId: 'start',
    jailTileId: 'jail',
    goToJailTileId: 'gojail',
    economy: { startingCash: 1800, salaryOnPassStart: 150 },
  } as BoardTheme
}

const BOARD_56 = makeBoard56()

describe('non-régression — plateau classique 40 cases', () => {
  it('démarre avec le capital et la position historiques', () => {
    const state = createGame(cfg('nr-1'), setups(3), POOL)
    for (const player of state.players) {
      expect(player.cash).toBe(1500)
      expect(player.position).toBe(0)
    }
  })

  it('reproduit exactement l’ancien calcul de déplacement (modulo 40 + salaire 200)', () => {
    const base = createGame(cfg('nr-2'), setups(3), POOL)
    for (let start = 0; start < 40; start += 1) {
      for (let total = 2; total <= 12; total += 1) {
        const next = cloneState(base)
        next.players[next.currentPlayerIndex]!.position = start
        const cashBefore = next.players[next.currentPlayerIndex]!.cash
        const out = resolveMovement(next, classicSquareMap, roll(total)).result
        const player = out.state.players[out.state.currentPlayerIndex]!
        const arrival = (start + total) % 40
        // Seule exception historique : « Au poste ! » téléporte en prison.
        const expected = arrival === 30 ? 10 : arrival
        expect(player.position).toBe(expected)
        expect(out.passedStart).toBe(start + total >= 40)
        expect(out.salary).toBe(start + total >= 40 ? 200 : 0)
        // Le cash reflète le salaire (les mouvements d’argent de la case sont hors sujet ici).
        if (out.outcome.kind === 'nothing' || out.outcome.kind === 'parking') {
          expect(player.cash).toBe(cashBefore + out.salary)
        }
      }
    }
  })

  it('localise la prison par identifiant de map, pas par index en dur', () => {
    expect(jailIndex(classicSquareMap)).toBe(10)
  })

  it('reste déterministe à seed égale', () => {
    const play = (): number[] => {
      let state: GameState = createGame(cfg('det'), setups(4), POOL)
      const positions: number[] = []
      for (let i = 0; i < 60 && !state.finished; i += 1) {
        if (state.phase === 'awaiting_roll') state = takeTurn(state, classicSquareMap).state
        else if (state.phase === 'awaiting_purchase') state = decideBuy(state, classicSquareMap, true)
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

describe('moteur agnostique de la forme — plateau synthétique 56 cases', () => {
  it('lit la taille depuis le chemin de la map', () => {
    expect(boardSize(BOARD_56)).toBe(56)
    expect(boardSize(classicSquareMap)).toBe(40)
  })

  it('applique le capital de départ de la map', () => {
    const state = createGame(cfg('m56'), setups(4), POOL, BOARD_56)
    expect(state.players.every((p) => p.cash === 1800)).toBe(true)
  })

  it('boucle sur 56 cases et verse le salaire de la map', () => {
    const base = createGame(cfg('m56-move'), setups(3), POOL, BOARD_56)
    const next = cloneState(base)
    next.players[next.currentPlayerIndex]!.position = 54
    const cashBefore = next.players[next.currentPlayerIndex]!.cash
    const out = resolveMovement(next, BOARD_56, roll(4)).result
    const player = out.state.players[out.state.currentPlayerIndex]!
    expect(player.position).toBe(2)
    expect(out.passedStart).toBe(true)
    expect(out.salary).toBe(150)
    expect(player.cash).toBeGreaterThanOrEqual(cashBefore)
  })

  it('ne verse aucun salaire sans passage par le départ', () => {
    const base = createGame(cfg('m56-nosalary'), setups(3), POOL, BOARD_56)
    const next = cloneState(base)
    next.players[next.currentPlayerIndex]!.position = 20
    const out = resolveMovement(next, BOARD_56, roll(6)).result
    expect(out.passedStart).toBe(false)
    expect(out.salary).toBe(0)
    expect(out.state.players[out.state.currentPlayerIndex]!.position).toBe(26)
  })

  it('envoie en prison sur la case déclarée par la map', () => {
    expect(jailIndex(BOARD_56)).toBe(14)
    const base = createGame(cfg('m56-jail'), setups(3), POOL, BOARD_56)
    const next = cloneState(base)
    next.players[next.currentPlayerIndex]!.position = 40
    const out = resolveMovement(next, BOARD_56, roll(2)).result
    expect(out.outcome.kind).toBe('go_jail')
    const player = out.state.players[out.state.currentPlayerIndex]!
    expect(player.position).toBe(14)
    expect(player.inJail).toBe(true)
  })

  it('joue une partie complète sans jamais sortir du plateau', () => {
    let state: GameState = createGame(cfg('m56-run'), setups(4), POOL, BOARD_56)
    for (let i = 0; i < 400 && !state.finished; i += 1) {
      if (state.phase === 'awaiting_roll') state = takeTurn(state, BOARD_56).state
      else if (state.phase === 'awaiting_purchase') state = decideBuy(state, BOARD_56, true)
      else if (state.phase === 'awaiting_card') state = ackCard(state)
      else if (state.phase === 'turn_cleanup') state = endTurn(state)
      else break
      for (const player of state.players) {
        expect(player.position).toBeGreaterThanOrEqual(0)
        expect(player.position).toBeLessThan(56)
      }
    }
    expect(state.turn).toBeGreaterThan(1)
  })
})
