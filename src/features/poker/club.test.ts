import { describe, expect, it } from 'vitest'
import {
  buyInDistribution,
  clubTotals,
  dayOf,
  filteredTournaments,
  rakeRate,
  sortSummaries,
  summarizePlayer,
  weekStart,
  weeklyVolume,
  type Filters,
  type PlayerSnapshot,
} from './club'

const career = { stake: 1000, rake: 100, profit: 0, count: 100, entries: 100, itm: 15, abi: 10, score: 50, firstGame: null, lastGame: null }

const alice: PlayerSnapshot = {
  nickname: 'Alice',
  found: true,
  career,
  days: [
    ['2026-08-31', 2, 2, 20, -20],
    ['2026-09-02', 3, 4, 30, 50],
    ['2026-09-09', 1, 1, 100, -100],
  ],
  tournaments: [
    // 2 entrées sur le 5 € (re-entry) : gain 60, profit 50 → 10 € engagés.
    ['2026-09-02T18:00:00.000Z', 5, 120, 'Petit', 60, 50, 3],
    ['2026-09-02T19:00:00.000Z', 10, 80, 'Moyen', 0, -10, 40],
    ['2026-09-02T20:00:00.000Z', 10, 80, 'Moyen bis', 0, -10, 41],
    ['2026-09-09T19:30:00.000Z', 100, 300, 'Gros', 0, -100, 200],
  ],
  tournamentsComplete: true,
}

const bob: PlayerSnapshot = {
  nickname: 'bob',
  found: true,
  career: { ...career, rake: 50 },
  days: [['2026-09-03', 2, 2, 4, -4]],
  tournaments: [['2026-09-03T17:00:00.000Z', 2, 50, 'Micro', 0, -2, 30]],
  tournamentsComplete: false,
}

const ghost: PlayerSnapshot = { nickname: 'Ghost', found: false, error: 'not-found' }

const season: Filters = { from: '2026-09-01', to: '2026-11-13', buyInMin: null, buyInMax: null }

describe('dashboard poker du club', () => {
  it('cumule l’activité de la période depuis les jours et estime le rake au ratio carrière', () => {
    const s = summarizePlayer(alice, season)
    expect(s).toMatchObject({ tournaments: 4, entries: 5, stake: 130, profit: -50, rake: 13, activeDays: 2, lastDay: '2026-09-09', partial: false })
    expect(s.roi).toBeCloseTo(-50 / 130)
    expect(s.abi).toBeCloseTo(26)
  })

  it('exclut les jours hors période', () => {
    const s = summarizePlayer(alice, { ...season, to: '2026-09-05' })
    expect(s).toMatchObject({ tournaments: 3, stake: 30, profit: 50 })
  })

  it('bascule sur le détail des tournois quand un filtre de buy-in est actif', () => {
    const s = summarizePlayer(alice, { ...season, buyInMax: 10 })
    expect(s).toMatchObject({ tournaments: 3, entries: 4, stake: 30, profit: 30, partial: false })
    expect(summarizePlayer(bob, { ...season, buyInMin: 1 }).partial).toBe(true)
  })

  it('totalise le club sans compter les inactifs ni les introuvables', () => {
    const totals = clubTotals([alice, bob, ghost].map((p) => summarizePlayer(p, season)))
    expect(totals).toMatchObject({ players: 2, activePlayers: 2, entries: 7, stake: 134, profit: -54, rake: 13.2, partial: false })
  })

  it('date les tournois au jour de Paris', () => {
    expect(dayOf('2026-09-01T22:30:00.000Z')).toBe('2026-09-02')
    expect(filteredTournaments(alice, { ...season, from: '2026-09-09' })).toHaveLength(1)
  })

  it('regroupe le volume par semaine (lundi)', () => {
    expect(weekStart('2026-09-06')).toBe('2026-08-31')
    expect(weekStart('2026-09-07')).toBe('2026-09-07')
    const weeks = weeklyVolume([alice, bob], season)
    expect(weeks.map((w) => w.week)).toEqual(['2026-08-31', '2026-09-07'])
    expect(weeks[0]).toMatchObject({ entries: 6, stake: 34, profit: 46, rake: 3.2 })
  })

  it('répartit les tournois par tranche de buy-in', () => {
    const buckets = buyInDistribution([alice, bob], season)
    const byLabel = Object.fromEntries(buckets.map((b) => [b.label, b.tournaments]))
    expect(byLabel).toMatchObject({ '≤ 2 €': 1, '2–5 €': 1, '5–10 €': 2, '> 50 €': 1 })
  })

  it('trie avec les valeurs absentes en dernier', () => {
    const rows = [alice, bob, ghost].map((p) => summarizePlayer(p, season))
    expect(sortSummaries(rows, 'roi', 'desc').map((r) => r.nickname)).toEqual(['Alice', 'bob', 'Ghost'])
    expect(sortSummaries(rows, 'roi', 'asc').map((r) => r.nickname)).toEqual(['bob', 'Alice', 'Ghost'])
    expect(sortSummaries(rows, 'nickname', 'asc').map((r) => r.nickname)).toEqual(['Alice', 'bob', 'Ghost'])
  })

  it('ne divise pas par zéro sans historique', () => {
    expect(rakeRate(undefined)).toBe(0)
    expect(rakeRate({ ...career, stake: 0 })).toBe(0)
  })
})
