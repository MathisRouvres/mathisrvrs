/**
 * Calculs du dashboard /poker à partir d'un snapshot pokstats (voir public/poker-club.php).
 *
 * Deux sources par joueur, toutes deux limitées aux jours ≥ `snapshot.since` :
 *  - `days` : activité complète jour par jour (tournois, entrées, buy-ins, profit) ;
 *  - `tournaments` : détail des 100 derniers tournois au plus (compte pokstats gratuit),
 *    `tournamentsComplete` dit s'ils couvrent toute la période.
 * Sans filtre de buy-in, les totaux viennent de `days` (exacts) ; avec un filtre de buy-in,
 * ils viennent de `tournaments` (possiblement partiels, signalé par `partial`).
 *
 * Le rake n'est connu que sur la carrière : rake de la période ≈ buy-ins de la période ×
 * (rake carrière ÷ buy-ins carrière), propre à chaque joueur.
 */

/** [jour Europe/Paris YYYY-MM-DD, tournois, entrées, buy-ins €, profit €] */
export type DayRow = [string, number, number, number, number]
/** [début ISO UTC, buy-in €, inscrits, nom, gain €, profit €, place] */
export type TournamentRow = [string, number, number, string, number, number, number]

export interface Career {
  stake: number
  rake: number
  profit: number
  count: number
  entries: number
  itm: number
  abi: number
  score: number
  firstGame: string | null
  lastGame: string | null
}

export interface PlayerSnapshot {
  nickname: string
  found: boolean
  pokstatsName?: string
  updatedAt?: string
  career?: Career
  days?: DayRow[]
  tournaments?: TournamentRow[]
  tournamentsComplete?: boolean
  error?: string
  candidates?: string[]
}

export interface ClubSnapshot {
  source: string
  room: string
  gameType: string
  since: string
  generatedAt: string
  players: PlayerSnapshot[]
}

export interface Filters {
  from: string
  to: string
  buyInMin: number | null
  buyInMax: number | null
}

export interface PlayerSummary {
  nickname: string
  found: boolean
  tournaments: number
  entries: number
  stake: number
  profit: number
  rake: number
  rakeRate: number
  roi: number | null
  abi: number | null
  activeDays: number
  lastDay: string | null
  /** Totaux tirés d'un détail de tournois incomplet (filtre de buy-in actif). */
  partial: boolean
}

export interface ClubTotals {
  players: number
  activePlayers: number
  tournaments: number
  entries: number
  stake: number
  profit: number
  rake: number
  roi: number | null
  abi: number | null
  partial: boolean
}

const TIMEZONE = 'Europe/Paris'
const parisDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Jour Europe/Paris (YYYY-MM-DD) d'un instant ISO. */
export function dayOf(iso: string): string {
  return parisDay.format(new Date(iso))
}

export function todayInParis(now = new Date()): string {
  return parisDay.format(now)
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function rakeRate(career: Career | undefined): number {
  if (!career || career.stake <= 0) return 0
  return career.rake / career.stake
}

export function hasBuyInFilter(filters: Filters): boolean {
  return filters.buyInMin !== null || filters.buyInMax !== null
}

function inRange(day: string, filters: Filters): boolean {
  return day >= filters.from && day <= filters.to
}

function buyInMatches(buyIn: number, filters: Filters): boolean {
  if (filters.buyInMin !== null && buyIn < filters.buyInMin) return false
  if (filters.buyInMax !== null && buyIn > filters.buyInMax) return false
  return true
}

/** Tournois du détail compris dans la période et le filtre de buy-in, du plus récent au plus ancien. */
export function filteredTournaments(player: PlayerSnapshot, filters: Filters): TournamentRow[] {
  return (player.tournaments ?? [])
    .filter((t) => inRange(dayOf(t[0]), filters) && buyInMatches(t[1], filters))
    .sort((a, b) => b[0].localeCompare(a[0]))
}

/**
 * Buy-ins engagés sur un tournoi : gain − profit (re-entries comprises quand pokstats les
 * compte dans le profit), à défaut le buy-in affiché.
 */
export function tournamentStake(t: TournamentRow): number {
  const stake = t[4] - t[5]
  return stake > 0 ? stake : t[1]
}

export function summarizePlayer(player: PlayerSnapshot, filters: Filters): PlayerSummary {
  const rate = rakeRate(player.career)
  let tournaments = 0
  let entries = 0
  let stake = 0
  let profit = 0
  const days = new Set<string>()
  let partial = false

  if (hasBuyInFilter(filters)) {
    for (const t of filteredTournaments(player, filters)) {
      tournaments += 1
      const spent = tournamentStake(t)
      entries += t[1] > 0 ? Math.max(1, Math.round(spent / t[1])) : 1
      stake += spent
      profit += t[5]
      days.add(dayOf(t[0]))
    }
    partial = player.found && player.tournamentsComplete === false
  } else {
    for (const [day, count, entered, spent, won] of player.days ?? []) {
      if (!inRange(day, filters)) continue
      tournaments += count
      entries += entered
      stake += spent
      profit += won
      if (count > 0) days.add(day)
    }
  }

  const sortedDays = [...days].sort()
  return {
    nickname: player.nickname,
    found: player.found,
    tournaments,
    entries,
    stake: round2(stake),
    profit: round2(profit),
    rake: round2(stake * rate),
    rakeRate: rate,
    roi: stake > 0 ? profit / stake : null,
    abi: entries > 0 ? stake / entries : null,
    activeDays: days.size,
    lastDay: sortedDays.at(-1) ?? null,
    partial,
  }
}

export function clubTotals(summaries: PlayerSummary[]): ClubTotals {
  const active = summaries.filter((s) => s.entries > 0)
  const sum = (key: 'tournaments' | 'entries' | 'stake' | 'profit' | 'rake') =>
    active.reduce((total, s) => total + s[key], 0)
  const stake = sum('stake')
  const entries = sum('entries')
  return {
    players: summaries.filter((s) => s.found).length,
    activePlayers: active.length,
    tournaments: sum('tournaments'),
    entries,
    stake: round2(stake),
    profit: round2(sum('profit')),
    rake: round2(sum('rake')),
    roi: stake > 0 ? sum('profit') / stake : null,
    abi: entries > 0 ? stake / entries : null,
    partial: active.some((s) => s.partial),
  }
}

/** Lundi (YYYY-MM-DD) de la semaine d'un jour YYYY-MM-DD. */
export function weekStart(day: string): string {
  const date = new Date(`${day}T12:00:00Z`)
  const offset = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  return date.toISOString().slice(0, 10)
}

export interface WeekVolume {
  week: string
  entries: number
  stake: number
  profit: number
  rake: number
}

/** Volume du club par semaine (activité jour par jour, sans filtre de buy-in). */
export function weeklyVolume(players: PlayerSnapshot[], filters: Filters): WeekVolume[] {
  const weeks = new Map<string, WeekVolume>()
  for (const player of players) {
    const rate = rakeRate(player.career)
    for (const [day, , entered, spent, won] of player.days ?? []) {
      if (!inRange(day, filters)) continue
      const week = weekStart(day)
      const row = weeks.get(week) ?? { week, entries: 0, stake: 0, profit: 0, rake: 0 }
      row.entries += entered
      row.stake += spent
      row.profit += won
      row.rake += spent * rate
      weeks.set(week, row)
    }
  }
  return [...weeks.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => ({ ...w, stake: round2(w.stake), profit: round2(w.profit), rake: round2(w.rake) }))
}

export const BUY_IN_BUCKETS = [
  { label: 'Freeroll', max: 0 },
  { label: '≤ 2 €', max: 2 },
  { label: '2–5 €', max: 5 },
  { label: '5–10 €', max: 10 },
  { label: '10–25 €', max: 25 },
  { label: '25–50 €', max: 50 },
  { label: '> 50 €', max: Infinity },
] as const

export interface BuyInBucket {
  label: string
  tournaments: number
  stake: number
  profit: number
}

/** Répartition des tournois du détail par tranche de buy-in. */
export function buyInDistribution(players: PlayerSnapshot[], filters: Filters): BuyInBucket[] {
  const buckets: BuyInBucket[] = BUY_IN_BUCKETS.map((b) => ({ label: b.label, tournaments: 0, stake: 0, profit: 0 }))
  for (const player of players) {
    for (const t of filteredTournaments(player, filters)) {
      const bucket = buckets[BUY_IN_BUCKETS.findIndex((b) => t[1] <= b.max)]
      bucket.tournaments += 1
      bucket.stake += tournamentStake(t)
      bucket.profit += t[5]
    }
  }
  return buckets.map((b) => ({ ...b, stake: round2(b.stake), profit: round2(b.profit) }))
}

export type SortKey = 'nickname' | 'tournaments' | 'entries' | 'stake' | 'abi' | 'rake' | 'profit' | 'roi' | 'lastDay'

export function sortSummaries(rows: PlayerSummary[], key: SortKey, direction: 'asc' | 'desc'): PlayerSummary[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (left === right) return a.nickname.localeCompare(b.nickname, 'fr', { sensitivity: 'base' })
    if (left === null) return 1
    if (right === null) return -1
    if (typeof left === 'string' && typeof right === 'string') {
      return sign * left.localeCompare(right, 'fr', { sensitivity: 'base' })
    }
    return sign * ((left as number) - (right as number))
  })
}
