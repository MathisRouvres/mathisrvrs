import { describe, it, expect } from 'vitest'
import { actionCards } from '../../content/cards'
import { getBoardMap, listBoardMaps } from '../../content/maps/registry'
import { isBoardMapId, type BoardMapId } from '../../content/maps/types'
import { boardSize } from '../../content/maps/navigation'
import { simulateGame } from './massSim'
import type { SimOptions, SimResult } from './massSim'
import type { BankruptcyRule, DifficultyId } from '../constants'

const POOL = actionCards.map((c) => c.id)
const REPORT = process.env.MASS_SIM_REPORT === '1'
const GAMES = REPORT ? 2000 : 400
const DIFFICULTIES: DifficultyId[] = ['facile', 'inter', 'difficile', 'hardcore']
const RULES: BankruptcyRule[] = ['none', 'classic', 'last_hunt']

/**
 * Maps à simuler : `MV_SIM_MAP=infinity_party`, ou `-- --map=infinity_party`.
 * Sans filtre, toutes les maps du registre sont simulées et comparées.
 */
function targetMaps(): BoardMapId[] {
  const fromArgv = process.argv.find((arg) => arg.startsWith('--map='))?.slice('--map='.length)
  const raw = process.env.MV_SIM_MAP ?? fromArgv
  if (raw && isBoardMapId(raw)) return [raw]
  if (raw) throw new Error(`unknown_map: ${raw}`)
  return listBoardMaps().map((map) => map.id)
}

const MAPS = targetMaps()

/**
 * Le nombre de joueurs balayé dépend de la map : Infinity Party se joue à 4+.
 * Les autres paramètres restent identiques d'une map à l'autre pour que la
 * comparaison ait un sens.
 */
function opts(i: number, mapId: BoardMapId): SimOptions {
  const map = getBoardMap(mapId)
  const span = map.maxPlayers - map.minPlayers + 1
  return {
    seed: `sim-${i}`,
    playerCount: map.minPlayers + (i % span),
    difficulty: DIFFICULTIES[i % DIFFICULTIES.length] as DifficultyId,
    bankruptcy: RULES[i % RULES.length] as BankruptcyRule,
    maxTurns: 120,
    buyReserve: 150,
  }
}

interface MapStats {
  mapId: BoardMapId
  tiles: number
  turns: number
  sips: number
  laps: number
  purchaseRate: number
  rentEvents: number
  rentAvg: number
  unsold: number
  monopolies: number
  avgCash: number
  bankruptcies: number
  seat0Rate: number
  finishedClassic: number
  classicGames: number
}

function runMap(mapId: BoardMapId): MapStats {
  const board = getBoardMap(mapId)
  const totals = {
    turns: 0, sips: 0, laps: 0, purchases: 0, buyOffers: 0,
    rentEvents: 0, rentTotal: 0, unsold: 0, monopolies: 0, cash: 0, bankruptcies: 0,
  }
  let finishedClassic = 0
  let classicGames = 0
  const seatFirst = { wins: 0, games: 0 }

  for (let i = 0; i < GAMES; i += 1) {
    const o = opts(i, mapId)
    const r: SimResult = simulateGame(o, board, POOL)

    expect(Number.isFinite(r.totalSips)).toBe(true)
    expect(r.winnerSeat).toBeGreaterThanOrEqual(0)
    expect(r.winnerSeat).toBeLessThan(o.playerCount)
    expect(r.turns).toBeLessThanOrEqual(o.maxTurns + 1)

    totals.turns += r.turns
    totals.sips += r.totalSips
    totals.laps += r.laps
    totals.purchases += r.purchases
    totals.buyOffers += r.buyOffers
    totals.rentEvents += r.rentEvents
    totals.rentTotal += r.rentTotal
    totals.unsold += r.unsold
    totals.monopolies += r.monopolies
    totals.cash += r.avgCash
    totals.bankruptcies += r.bankruptcies
    if (o.bankruptcy === 'classic') {
      classicGames += 1
      if (r.finished) finishedClassic += 1
    }
    if (o.playerCount === board.minPlayers + 1) {
      seatFirst.games += 1
      if (r.winnerOrderPos === 0) seatFirst.wins += 1
    }
  }

  return {
    mapId,
    tiles: boardSize(board),
    turns: totals.turns / GAMES,
    sips: totals.sips / GAMES,
    laps: totals.laps / GAMES,
    purchaseRate: totals.buyOffers > 0 ? totals.purchases / totals.buyOffers : 0,
    rentEvents: totals.rentEvents / GAMES,
    rentAvg: totals.rentEvents > 0 ? totals.rentTotal / totals.rentEvents : 0,
    unsold: totals.unsold / GAMES,
    monopolies: totals.monopolies / GAMES,
    avgCash: totals.cash / GAMES,
    bankruptcies: totals.bankruptcies / GAMES,
    seat0Rate: seatFirst.games > 0 ? seatFirst.wins / seatFirst.games : 0,
    finishedClassic,
    classicGames,
  }
}

describe('MonoVomy — simulation de masse par map', () => {
  it('produit des parties valides et déterministes sur chaque map', () => {
    for (const mapId of MAPS) {
      const board = getBoardMap(mapId)
      const a = simulateGame(opts(7, mapId), board, POOL)
      const b = simulateGame(opts(7, mapId), board, POOL)
      expect(a, mapId).toEqual(b)
      expect(a.turns).toBeGreaterThanOrEqual(1)
      expect(a.totalSips).toBeGreaterThanOrEqual(0)
    }
  })

  it('respecte les invariants sur un large échantillon + rapport comparatif', () => {
    const stats = MAPS.map(runMap)

    for (const s of stats) {
      // Équité : le premier à jouer ne doit pas gagner de façon absurde.
      expect(s.seat0Rate, `${s.mapId} · siège 0`).toBeLessThan(0.55)
      // Le preset « classic » doit pouvoir se terminer par élimination.
      if (s.classicGames > 0) expect(s.finishedClassic, `${s.mapId} · classic`).toBeGreaterThan(0)
      // Une partie doit vraiment se jouer : des achats, des loyers, des tours.
      expect(s.turns, `${s.mapId} · tours`).toBeGreaterThan(5)
      expect(s.rentEvents, `${s.mapId} · loyers`).toBeGreaterThan(1)
      expect(s.purchaseRate, `${s.mapId} · achats`).toBeGreaterThan(0.2)
    }

    if (REPORT) {
      const col = (v: string) => v.padStart(16)
      const row = (label: string, pick: (s: MapStats) => string) =>
        `  ${label.padEnd(24)}${stats.map((s) => col(pick(s))).join('')}`
      const lines = [
        `── MonoVomy · équilibrage comparé (${GAMES} parties/map) ──`,
        `  ${''.padEnd(24)}${stats.map((s) => col(s.mapId)).join('')}`,
        row('cases', (s) => String(s.tiles)),
        row('tours moyens', (s) => s.turns.toFixed(1)),
        row('passages Départ', (s) => s.laps.toFixed(1)),
        row('taux d’achat', (s) => `${(s.purchaseRate * 100).toFixed(1)}%`),
        row('loyers / partie', (s) => s.rentEvents.toFixed(1)),
        row('loyer moyen', (s) => `${s.rentAvg.toFixed(0)}€`),
        row('monopoles / partie', (s) => s.monopolies.toFixed(2)),
        row('invendus (fin)', (s) => s.unsold.toFixed(1)),
        row('cash moyen (fin)', (s) => `${s.avgCash.toFixed(0)}€`),
        row('faillites / partie', (s) => s.bankruptcies.toFixed(2)),
        row('gorgées / partie', (s) => s.sips.toFixed(1)),
        row('1er joueur gagne', (s) => `${(s.seat0Rate * 100).toFixed(1)}%`),
      ]
      // eslint-disable-next-line no-console
      console.log(lines.join('\n'))
    }

    // Les parties MonoVomy sont bornées par le TIMER, pas par un nombre de tours :
    // la comparaison porte donc sur le rythme par tour, pas sur la durée brute.
    const classic = stats.find((s) => s.mapId === 'classic_square')
    const infinity = stats.find((s) => s.mapId === 'infinity_party')
    if (classic && infinity) {
      // Rythme de jeu : Infinity Party ne doit pas produire de temps morts.
      const rentPace = (infinity.rentEvents / infinity.turns) / (classic.rentEvents / classic.turns)
      expect(rentPace, 'loyers par tour').toBeGreaterThan(0.85)

      // Circulation d'argent : le salaire suit la longueur du parcours, donc le
      // revenu par tour reste du même ordre malgré 40 % de cases en plus.
      const income = (s: MapStats) =>
        (s.laps / s.turns) * getBoardMap(s.mapId).economy.salaryOnPassStart
      const incomeRatio = income(infinity) / income(classic)
      expect(incomeRatio, 'revenu par tour').toBeGreaterThan(0.85)
      expect(incomeRatio, 'revenu par tour').toBeLessThan(1.3)

      // Le plateau se remplit : presque plus rien d'invendu en fin de partie.
      expect(infinity.unsold, 'invendus').toBeLessThan(2)
    }

  }, 180000)
})
