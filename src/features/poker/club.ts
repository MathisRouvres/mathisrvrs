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

/**
 * Activité du joueur jour par jour sur la période, triée par jour. Sans filtre de buy-in :
 * `days` tel quel (complet). Avec : tournois du détail regroupés par jour de Paris.
 */
export function activity(player: PlayerSnapshot, filters: Filters): DayRow[] {
  if (!hasBuyInFilter(filters)) {
    return (player.days ?? []).filter(([day, count]) => count > 0 && inRange(day, filters))
  }
  const byDay = new Map<string, DayRow>()
  for (const t of filteredTournaments(player, filters)) {
    const day = dayOf(t[0])
    const row = byDay.get(day) ?? [day, 0, 0, 0, 0]
    const spent = tournamentStake(t)
    row[1] += 1
    row[2] += t[1] > 0 ? Math.max(1, Math.round(spent / t[1])) : 1
    row[3] += spent
    row[4] += t[5]
    byDay.set(day, row)
  }
  return [...byDay.values()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function summarizePlayer(player: PlayerSnapshot, filters: Filters): PlayerSummary {
  const rate = rakeRate(player.career)
  const rows = activity(player, filters)
  const total = (i: 1 | 2 | 3 | 4) => rows.reduce((sum, row) => sum + row[i], 0)
  const tournaments = total(1)
  const entries = total(2)
  const stake = total(3)
  const profit = total(4)
  const partial = hasBuyInFilter(filters) && player.found && player.tournamentsComplete === false
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
    activeDays: rows.length,
    lastDay: rows.at(-1)?.[0] ?? null,
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

/** Lundis des semaines qui touchent la période, du plus ancien au plus récent. */
export function weeksBetween(from: string, to: string): string[] {
  const weeks: string[] = []
  for (let week = weekStart(from); week <= to; ) {
    weeks.push(week)
    const next = new Date(`${week}T12:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 7)
    week = next.toISOString().slice(0, 10)
  }
  return weeks
}

export interface WeekVolume {
  week: string
  tournaments: number
  entries: number
  stake: number
  profit: number
  rake: number
  activeDays: number
  roi: number | null
  abi: number | null
}

type WeekTotals = Pick<WeekVolume, 'week' | 'tournaments' | 'entries' | 'stake' | 'profit' | 'rake' | 'activeDays'>

function addWeek(weeks: Map<string, WeekTotals>, row: DayRow, rate: number) {
  const week = weekStart(row[0])
  const total = weeks.get(week) ?? { week, tournaments: 0, entries: 0, stake: 0, profit: 0, rake: 0, activeDays: 0 }
  total.tournaments += row[1]
  total.entries += row[2]
  total.stake += row[3]
  total.profit += row[4]
  total.rake += row[3] * rate
  total.activeDays += 1
  weeks.set(week, total)
}

function finishWeeks(weeks: Map<string, WeekTotals>): WeekVolume[] {
  return [...weeks.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => ({
      ...w,
      stake: round2(w.stake),
      profit: round2(w.profit),
      rake: round2(w.rake),
      roi: w.stake > 0 ? w.profit / w.stake : null,
      abi: w.entries > 0 ? w.stake / w.entries : null,
    }))
}

/** Semaines jouées par un joueur (seulement celles avec au moins un tournoi). */
export function playerWeeks(player: PlayerSnapshot, filters: Filters): WeekVolume[] {
  const weeks = new Map<string, WeekTotals>()
  const rate = rakeRate(player.career)
  for (const row of activity(player, filters)) addWeek(weeks, row, rate)
  return finishWeeks(weeks)
}

/**
 * Volume du club par semaine. `activeDays` y compte des jours-joueurs (2 joueurs le même
 * jour = 2).
 */
export function weeklyVolume(players: PlayerSnapshot[], filters: Filters): WeekVolume[] {
  const weeks = new Map<string, WeekTotals>()
  for (const player of players) {
    const rate = rakeRate(player.career)
    for (const row of activity(player, filters)) addWeek(weeks, row, rate)
  }
  return finishWeeks(weeks)
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
