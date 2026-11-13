import { Fragment, useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import ThemeToggle from '../../components/ThemeToggle'
import { PokerError, fetchSnapshot } from './api'
import {
  buyInDistribution,
  clubTotals,
  dayOf,
  filteredTournaments,
  hasBuyInFilter,
  playerWeeks,
  sortSummaries,
  summarizePlayer,
  todayInParis,
  tournamentStake,
  weeklyVolume,
  weeksBetween,
} from './club'

const KEY_STORAGE = 'mr-poker-key'

function readKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

function storeKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key)
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    // stockage indisponible : le mot de passe sera redemandé
  }
}

/** Page privée : titre dédié et jamais indexée. */
function usePrivatePage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Club poker | Mathis Rouvres'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => {
      document.title = previousTitle
      robots.remove()
    }
  }, [])
}

// ── Formats ──────────────────────────────────────────────────────────────────

const euro0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const euro2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const integer = new Intl.NumberFormat('fr-FR')
const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' })
const tournamentTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })

/** Totaux en euros ronds (colonnes alignées) ; centimes pour ABI et montants d'un tournoi. */
const money = (value, precise = false) => (value === null ? '—' : (precise ? euro2 : euro0).format(value))
const signedMoney = (value) => (value > 0 ? `+${money(value)}` : money(value))
const percent = (ratio) => (ratio === null ? '—' : `${ratio > 0 ? '+' : ''}${(ratio * 100).toFixed(1).replace('.', ',')} %`)
const shortDay = (day) => (day ? dayFormat.format(new Date(`${day}T00:00:00Z`)) : '—')
const tone = (value) =>
  value > 0 ? 'text-emerald-600 dark:text-emerald-400' : value < 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-secondary)]'

// ── Briques UI ───────────────────────────────────────────────────────────────

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
const card =
  'min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-[var(--card-shadow)]'
const input = `rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm ${focusRing}`

function Card({ title, hint, children, className = '' }) {
  return (
    <section className={`${card} ${className}`}>
      <header className="mb-4">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

function Kpi({ label, value, sub, valueClass = '' }) {
  return (
    <div className={card}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold tabular-nums sm:text-3xl ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs tabular-nums text-[var(--text-secondary)]">{sub}</p>}
    </div>
  )
}

function UnlockForm({ onUnlock, error }) {
  const [value, setValue] = useState('')
  const [remember, setRemember] = useState(true)
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Club poker</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Page privée. Entre le mot de passe du club.</p>
      <form
        className={`${card} mt-6 space-y-4`}
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) onUnlock(value.trim(), remember)
        }}
      >
        <div>
          <label htmlFor="poker-key" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="poker-key"
            type="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'poker-key-error' : undefined}
            className={`${input} mt-1.5 w-full py-2.5 text-base`}
          />
          {error && (
            <p id="poker-key-error" role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Se souvenir sur cet appareil
        </label>
        <button
          type="submit"
          disabled={!value.trim()}
          className={`w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#070b14] ${focusRing}`}
        >
          Ouvrir
        </button>
      </form>
    </main>
  )
}

function Message({ title, children, actions }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
      <div className={card} role="alert">
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <div className="mt-2 text-sm text-[var(--text-secondary)]">{children}</div>
        <div className="mt-5 flex gap-3">{actions}</div>
      </div>
    </main>
  )
}

// ── Graphiques ───────────────────────────────────────────────────────────────

function WeeklyChart({ weeks }) {
  if (weeks.length === 0) return <p className="text-sm text-[var(--text-secondary)]">Aucun tournoi sur la période.</p>
  const max = Math.max(...weeks.map((w) => w.stake), 1)
  const width = 640
  const height = 180
  const gap = 6
  const bar = (width - gap * (weeks.length - 1)) / weeks.length
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height + 22}`} className="h-auto w-full" role="img" aria-label="Buy-ins du club par semaine">
        {weeks.map((w, i) => {
          const h = Math.max(2, (w.stake / max) * height)
          const x = i * (bar + gap)
          return (
            <g key={w.week}>
              <title>{`Semaine du ${shortDay(w.week)} : ${money(w.stake)} de buy-ins, ${integer.format(w.entries)} entrées, profit ${signedMoney(w.profit)}, rake ≈ ${money(w.rake)}`}</title>
              <rect x={x} y={height - h} width={bar} height={h} rx="4" className="fill-[var(--accent)] opacity-80" />
              {weeks.length <= 16 && (
                <text x={x + bar / 2} y={height + 16} textAnchor="middle" className="fill-[var(--text-muted)] text-[11px]">
                  {shortDay(w.week)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="sr-only">
        {weeks.map((w) => `Semaine du ${shortDay(w.week)} : ${money(w.stake)}`).join(' ; ')}
      </figcaption>
    </figure>
  )
}

function BuyInBars({ buckets }) {
  const used = buckets.filter((b) => b.tournaments > 0)
  if (used.length === 0) return <p className="text-sm text-[var(--text-secondary)]">Aucun tournoi détaillé sur la période.</p>
  const max = Math.max(...used.map((b) => b.tournaments))
  return (
    <ul className="space-y-2.5">
      {used.map((b) => (
        <li key={b.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">{b.label}</span>
            <span className="tabular-nums text-[var(--text-secondary)]">
              {integer.format(b.tournaments)} tournois · <span className={tone(b.profit)}>{signedMoney(b.profit)}</span>
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-[var(--bg-primary)]">
            <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${(b.tournaments / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── Tableau des joueurs ──────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'nickname', label: 'Joueur', align: 'left' },
  { key: 'entries', label: 'Entrées' },
  { key: 'stake', label: 'Buy-ins' },
  { key: 'abi', label: 'ABI' },
  { key: 'rake', label: 'Rake ≈' },
  { key: 'profit', label: 'Profit' },
  { key: 'roi', label: 'ROI' },
  { key: 'lastDay', label: 'Dernier jeu' },
]

const weekFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekLabel = (week) => weekFormat.format(new Date(`${week}T00:00:00Z`))

/** Semaines jouées par un joueur, de la plus récente à la plus ancienne. */
function PlayerWeeksTable({ weeks }) {
  if (weeks.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
      <table className="w-full min-w-[560px] text-right text-xs tabular-nums">
        <caption className="sr-only">Semaine par semaine</caption>
        <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Semaine du</th>
            <th scope="col" className="px-3 py-2 font-medium">Jours</th>
            <th scope="col" className="px-3 py-2 font-medium">Entrées</th>
            <th scope="col" className="px-3 py-2 font-medium">Buy-ins</th>
            <th scope="col" className="px-3 py-2 font-medium">ABI</th>
            <th scope="col" className="px-3 py-2 font-medium">Rake ≈</th>
            <th scope="col" className="px-3 py-2 font-medium">Profit</th>
            <th scope="col" className="px-3 py-2 font-medium">ROI</th>
          </tr>
        </thead>
        <tbody>
          {[...weeks].reverse().map((w) => (
            <tr key={w.week} className="border-t border-[var(--border-color)]">
              <th scope="row" className="px-3 py-1.5 text-left font-medium">{weekLabel(w.week)}</th>
              <td className="px-3 py-1.5">{w.activeDays}</td>
              <td className="px-3 py-1.5">{integer.format(w.entries)}</td>
              <td className="px-3 py-1.5">{money(w.stake)}</td>
              <td className="px-3 py-1.5">{money(w.abi, true)}</td>
              <td className="px-3 py-1.5">{money(w.rake)}</td>
              <td className={`px-3 py-1.5 font-semibold ${tone(w.profit)}`}>{signedMoney(w.profit)}</td>
              <td className={`px-3 py-1.5 ${tone(w.profit)}`}>{percent(w.roi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlayerDetail({ player, summary, filters }) {
  const tournaments = filteredTournaments(player, filters)
  const weeks = playerWeeks(player, filters)
  const career = player.career
  return (
    // Collé à gauche et limité à la largeur visible : lisible sans faire défiler le grand tableau.
    <div className="sticky left-0 w-[min(100%,calc(100vw-2rem))] space-y-4 bg-[var(--bg-primary)] px-4 py-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-[var(--text-muted)]">Jours joués</dt>
          <dd className="tabular-nums">{summary.activeDays}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)]">Taux de rake (carrière)</dt>
          <dd className="tabular-nums">{(summary.rakeRate * 100).toFixed(1).replace('.', ',')} %</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)]">Carrière</dt>
          <dd className="tabular-nums">
            {integer.format(career.entries)} entrées · <span className={tone(career.profit)}>{signedMoney(career.profit)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)]">ITM carrière · score</dt>
          <dd className="tabular-nums">
            {String(career.itm).replace('.', ',')} % · {career.score}
          </dd>
        </div>
      </dl>
      <PlayerWeeksTable weeks={weeks} />
      <h3 className="pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Tournois</h3>
      {!player.tournamentsComplete && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Détail des tournois incomplet sur la période : pokstats (compte gratuit) ne donne que les 100 derniers à chaque collecte, et ce joueur en a joué davantage entre deux collectes.
        </p>
      )}
      {tournaments.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Aucun tournoi détaillé sur ces filtres.</p>
      ) : (
        <div className="max-h-80 overflow-auto rounded-xl border border-[var(--border-color)]">
          <table className="w-full min-w-[560px] text-left text-xs">
            <caption className="sr-only">Tournois de {player.nickname}</caption>
            <thead className="sticky top-0 bg-[var(--bg-elevated)] text-[var(--text-muted)]">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Date</th>
                <th scope="col" className="px-3 py-2 font-medium">Tournoi</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Buy-in</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Place</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Gain</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={`${t[0]}-${t[3]}-${t[6]}`} className="border-t border-[var(--border-color)]">
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{tournamentTime.format(new Date(t[0]))}</td>
                  <td className="px-3 py-1.5">{t[3]}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {t[1] > 0 ? money(t[1], true) : 'Freeroll'}
                    {t[1] > 0 && tournamentStake(t) > t[1] + 0.001 && <span className="text-[var(--text-muted)]"> ×{Math.round(tournamentStake(t) / t[1])}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                    {t[6]} / {integer.format(t[2])}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{t[4] > 0 ? money(t[4], true) : '—'}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${tone(t[5])}`}>{signedMoney(t[5])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PlayersTable({ rows, players, filters }) {
  const [sort, setSort] = useState({ key: 'stake', direction: 'desc' })
  const [open, setOpen] = useState(null)
  const sorted = sortSummaries(rows, sort.key, sort.direction)
  const byNickname = new Map(players.map((p) => [p.nickname, p]))

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: key === 'nickname' ? 'asc' : 'desc' }))

  if (rows.length === 0) return <p className="text-sm text-[var(--text-secondary)]">Aucun joueur ne correspond aux filtres.</p>

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">Joueurs du club, triés par {COLUMNS.find((c) => c.key === sort.key).label}</caption>
        <thead>
          <tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-muted)]">
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={sort.key === c.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={`px-2 py-2 font-medium first:sticky first:left-0 first:z-10 first:bg-[var(--bg-elevated)] first:pl-5 last:pr-5 ${c.align === 'left' ? 'text-left' : 'text-right'}`}
              >
                <button
                  type="button"
                  onClick={() => toggleSort(c.key)}
                  className={`rounded px-1 hover:text-[var(--text-primary)] ${focusRing} ${sort.key === c.key ? 'text-[var(--text-primary)]' : ''}`}
                >
                  {c.label}
                  <span aria-hidden="true">{sort.key === c.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const expanded = open === r.nickname
            const detailId = `poker-detail-${r.nickname.replace(/[^a-zA-Z0-9]/g, '_')}`
            const idle = r.entries === 0
            return (
              <Fragment key={r.nickname}>
                <tr className={`border-b border-[var(--border-color)] tabular-nums ${idle ? 'text-[var(--text-muted)]' : ''}`}>
                  <th scope="row" className="sticky left-0 z-10 bg-[var(--bg-elevated)] py-2 pl-5 pr-2 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : r.nickname)}
                      aria-expanded={expanded}
                      aria-controls={expanded ? detailId : undefined}
                      className={`rounded text-left hover:text-[var(--accent)] ${focusRing}`}
                    >
                      <span aria-hidden="true" className="mr-1.5 inline-block w-3 text-[var(--text-muted)]">
                        {expanded ? '▾' : '▸'}
                      </span>
                      {r.nickname}
                      {r.partial && (
                        <span className="ml-1 text-amber-600" title="Détail des tournois incomplet sur la période">
                          *
                        </span>
                      )}
                    </button>
                  </th>
                  <td className="px-2 py-2 text-right">{integer.format(r.entries)}</td>
                  <td className="px-2 py-2 text-right">{money(r.stake)}</td>
                  <td className="px-2 py-2 text-right">{money(r.abi, true)}</td>
                  <td className="px-2 py-2 text-right">{money(r.rake)}</td>
                  <td className={`px-2 py-2 text-right font-semibold ${idle ? '' : tone(r.profit)}`}>{idle ? '—' : signedMoney(r.profit)}</td>
                  <td className={`px-2 py-2 text-right ${idle ? '' : tone(r.profit)}`}>{percent(r.roi)}</td>
                  <td className="py-2 pl-2 pr-5 text-right">{shortDay(r.lastDay)}</td>
                </tr>
                {expanded && (
                  <tr id={detailId}>
                    <td colSpan={COLUMNS.length} className="p-0">
                      <PlayerDetail player={byNickname.get(r.nickname)} summary={r} filters={filters} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Semaine par semaine ──────────────────────────────────────────────────────

const METRICS = [
  { key: 'stake', label: 'Buy-ins', format: (v) => money(v), signed: false },
  { key: 'profit', label: 'Profit', format: (v) => signedMoney(v), signed: true },
  { key: 'entries', label: 'Entrées', format: (v) => integer.format(v), signed: false },
  { key: 'rake', label: 'Rake ≈', format: (v) => money(v), signed: false },
  { key: 'roi', label: 'ROI', format: (v) => percent(v), signed: true },
]

/** Valeur d'une métrique pour un ensemble de semaines (ROI recalculé, pas additionné). */
function metricOf(key, weeks) {
  if (weeks.length === 0) return null
  if (key === 'roi') {
    const stake = weeks.reduce((s, w) => s + w.stake, 0)
    return stake > 0 ? weeks.reduce((s, w) => s + w.profit, 0) / stake : null
  }
  return weeks.reduce((s, w) => s + w[key], 0)
}

function WeeklyMatrix({ rows, players, filters }) {
  const [metricKey, setMetricKey] = useState('stake')
  const metric = METRICS.find((m) => m.key === metricKey)
  const weeks = useMemo(() => weeksBetween(filters.from, filters.to), [filters.from, filters.to])
  const byPlayer = useMemo(() => {
    const visible = new Set(rows.map((r) => r.nickname))
    return players
      .filter((p) => visible.has(p.nickname))
      .map((p) => {
        const played = playerWeeks(p, filters)
        return { nickname: p.nickname, cells: new Map(played.map((w) => [w.week, w])), total: metricOf(metricKey, played) }
      })
      .sort((a, b) => (b.total ?? -Infinity) - (a.total ?? -Infinity) || a.nickname.localeCompare(b.nickname, 'fr'))
  }, [rows, players, filters, metricKey])

  if (byPlayer.length === 0) return <p className="text-sm text-[var(--text-secondary)]">Aucun joueur ne correspond aux filtres.</p>

  const column = (week) => byPlayer.map((p) => p.cells.get(week)).filter(Boolean)
  const max = metric.signed
    ? 0
    : Math.max(1, ...byPlayer.flatMap((p) => [...p.cells.values()].map((w) => w[metricKey])))
  const cellClass = (value) =>
    value === null ? 'text-[var(--text-muted)]' : metric.signed ? tone(value) : ''
  const heat = (value) =>
    !metric.signed && value ? { backgroundColor: `color-mix(in srgb, var(--accent) ${Math.round((value / max) * 35)}%, transparent)` } : undefined

  return (
    <div>
      <div role="radiogroup" aria-label="Valeur affichée" className="mb-4 flex flex-wrap gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={metricKey === m.key}
            onClick={() => setMetricKey(m.key)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${focusRing} ${
              metricKey === m.key
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="-mx-5 max-h-[32rem] overflow-auto">
        <table className="w-max min-w-full text-right text-xs tabular-nums">
          <caption className="sr-only">{metric.label} par joueur et par semaine</caption>
          <thead className="sticky top-0 z-20 bg-[var(--bg-elevated)] text-[var(--text-muted)]">
            <tr className="border-b border-[var(--border-color)]">
              <th scope="col" className="sticky left-0 z-10 bg-[var(--bg-elevated)] py-2 pl-5 pr-3 text-left font-medium">
                Joueur
              </th>
              {weeks.map((w) => (
                <th key={w} scope="col" className="whitespace-nowrap px-2 py-2 font-medium" title={`Semaine du lundi ${weekLabel(w)}`}>
                  {weekLabel(w)}
                </th>
              ))}
              <th scope="col" className="py-2 pl-3 pr-5 font-semibold text-[var(--text-primary)]">Total</th>
            </tr>
          </thead>
          <tbody>
            {byPlayer.map((p) => (
              <tr key={p.nickname} className="border-b border-[var(--border-color)]">
                <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-[var(--bg-elevated)] py-1.5 pl-5 pr-3 text-left font-medium">
                  {p.nickname}
                </th>
                {weeks.map((w) => {
                  const cell = p.cells.get(w)
                  const value = cell ? metricOf(metricKey, [cell]) : null
                  return (
                    <td
                      key={w}
                      className={`whitespace-nowrap px-2 py-1.5 ${cellClass(value)}`}
                      style={heat(value)}
                      title={cell ? `${p.nickname}, semaine du ${weekLabel(w)} : ${cell.entries} entrées, ${money(cell.stake)}, ${signedMoney(cell.profit)}` : undefined}
                    >
                      {value === null ? '·' : metric.format(value)}
                    </td>
                  )
                })}
                <td className={`whitespace-nowrap py-1.5 pl-3 pr-5 font-semibold ${cellClass(p.total)}`}>
                  {p.total === null ? '—' : metric.format(p.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-[var(--bg-elevated)]">
            <tr className="border-t-2 border-[var(--border-color)] font-semibold">
              <th scope="row" className="sticky left-0 z-10 bg-[var(--bg-elevated)] py-2 pl-5 pr-3 text-left">
                Total
              </th>
              {weeks.map((w) => {
                const value = metricOf(metricKey, column(w))
                return (
                  <td key={w} className={`whitespace-nowrap px-2 py-2 ${cellClass(value)}`}>
                    {value === null ? '·' : metric.format(value)}
                  </td>
                )
              })}
              {(() => {
                const value = metricOf(metricKey, byPlayer.flatMap((p) => [...p.cells.values()]))
                return (
                  <td className={`whitespace-nowrap py-2 pl-3 pr-5 ${cellClass(value)}`}>
                    {value === null ? '—' : metric.format(value)}
                  </td>
                )
              })()}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Filtres ──────────────────────────────────────────────────────────────────

function shiftDay(day, days) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Montant saisi en euros ; vide, invalide ou (pour un minimum) 0 = pas de filtre. */
function parseEuro(value, isMin = false) {
  if (value.trim() === '') return null
  const n = Number(value.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0 || (isMin && n === 0)) return null
  return n
}

function FiltersBar({ since, today, form, setForm }) {
  const presets = [
    { label: 'Depuis le 1er sept.', from: since },
    { label: '30 j', from: shiftDay(today, -29) < since ? since : shiftDay(today, -29) },
    { label: '7 j', from: shiftDay(today, -6) },
  ]
  return (
    <section className={`${card} space-y-4`} aria-label="Filtres">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="poker-from" className="text-xs font-medium text-[var(--text-secondary)]">Du</label>
          <input
            id="poker-from"
            type="date"
            min={since}
            max={form.to}
            value={form.from}
            onChange={(e) => e.target.value && setForm((f) => ({ ...f, from: e.target.value }))}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="poker-to" className="text-xs font-medium text-[var(--text-secondary)]">Au</label>
          <input
            id="poker-to"
            type="date"
            min={form.from}
            max={today}
            value={form.to}
            onChange={(e) => e.target.value && setForm((f) => ({ ...f, to: e.target.value }))}
            className={input}
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Périodes rapides">
          {presets.map((p) => {
            const active = form.from === p.from && form.to === today
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => setForm((f) => ({ ...f, from: p.from, to: today }))}
                className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${focusRing} ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span id="poker-buyin" className="text-xs font-medium text-[var(--text-secondary)]">Buy-in (€)</span>
          <div className="flex items-center gap-1.5" role="group" aria-labelledby="poker-buyin">
            <input
              aria-label="Buy-in minimum"
              inputMode="decimal"
              placeholder="min"
              value={form.buyInMin}
              onChange={(e) => setForm((f) => ({ ...f, buyInMin: e.target.value }))}
              className={`${input} w-20`}
            />
            <span aria-hidden="true" className="text-[var(--text-muted)]">–</span>
            <input
              aria-label="Buy-in maximum"
              inputMode="decimal"
              placeholder="max"
              value={form.buyInMax}
              onChange={(e) => setForm((f) => ({ ...f, buyInMax: e.target.value }))}
              className={`${input} w-20`}
            />
          </div>
        </div>
        <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <label htmlFor="poker-search" className="text-xs font-medium text-[var(--text-secondary)]">Pseudo</label>
          <input
            id="poker-search"
            type="search"
            placeholder="Rechercher…"
            value={form.search}
            onChange={(e) => setForm((f) => ({ ...f, search: e.target.value }))}
            className={input}
          />
        </div>
        <label className="flex items-center gap-2 py-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={form.hideIdle} onChange={(e) => setForm((f) => ({ ...f, hideIdle: e.target.checked }))} />
          Masquer les inactifs
        </label>
      </div>
    </section>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ snapshot, onLock, onRefresh, loading }) {
  const today = todayInParis()
  const [form, setForm] = useState({ from: snapshot.since, to: today, buyInMin: '', buyInMax: '', search: '', hideIdle: true })

  const filters = useMemo(
    () => ({ from: form.from, to: form.to, buyInMin: parseEuro(form.buyInMin, true), buyInMax: parseEuro(form.buyInMax) }),
    [form.from, form.to, form.buyInMin, form.buyInMax],
  )
  const found = useMemo(() => snapshot.players.filter((p) => p.found), [snapshot])
  const missing = useMemo(() => snapshot.players.filter((p) => !p.found), [snapshot])
  const summaries = useMemo(() => found.map((p) => summarizePlayer(p, filters)), [found, filters])
  const totals = clubTotals(summaries)
  const weeks = useMemo(() => weeklyVolume(found, filters), [found, filters])
  const buckets = useMemo(() => buyInDistribution(found, filters), [found, filters])
  const needle = form.search.trim().toLowerCase()
  const rows = summaries.filter((s) => (!form.hideIdle || s.entries > 0) && (!needle || s.nickname.toLowerCase().includes(needle)))
  const buyInActive = hasBuyInFilter(filters)
  const incomplete = found.filter((p) => !p.tournamentsComplete).length

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Club poker LRP</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Winamax · tournois programmés · données pokstats du {dateTimeFormat.format(new Date(snapshot.generatedAt))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={`rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm transition hover:border-[var(--accent)] disabled:opacity-50 ${focusRing}`}
          >
            {loading ? 'Chargement…' : 'Recharger'}
          </button>
          <button
            type="button"
            onClick={onLock}
            className={`rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm transition hover:border-[var(--accent)] ${focusRing}`}
          >
            Verrouiller
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
        <FiltersBar since={snapshot.since} today={today} form={form} setForm={setForm} />

        {buyInActive && (
          <p role="status" className={`${card} border-amber-500/40 text-sm text-[var(--text-secondary)]`}>
            Filtre de buy-in actif : chiffres calculés sur le détail des tournois.
            {totals.partial && ' Le détail des joueurs marqués * est incomplet sur la période : leurs totaux sont partiels.'}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Joueurs actifs" value={`${totals.activePlayers} / ${totals.players}`} sub="ont joué sur la période" />
          <Kpi label="Entrées" value={integer.format(totals.entries)} sub={`${integer.format(totals.tournaments)} tournois`} />
          <Kpi label="Buy-ins" value={money(totals.stake)} sub={`ABI ${money(totals.abi, true)}`} />
          <Kpi label="Rake estimé" value={money(totals.rake)} sub="ratio carrière de chaque joueur" />
          <Kpi label="Profit du club" value={signedMoney(totals.profit)} valueClass={tone(totals.profit)} sub="gains − buy-ins" />
          <Kpi label="ROI du club" value={percent(totals.roi)} valueClass={tone(totals.profit)} sub="profit ÷ buy-ins" />
        </div>

        <Card
          title="Joueurs"
          hint={`${rows.length} affiché${rows.length > 1 ? 's' : ''} · clique un pseudo pour ses semaines et ses tournois · rake ≈ buy-ins × taux de rake carrière`}
        >
          <PlayersTable rows={rows} players={found} filters={filters} />
        </Card>

        <Card
          title="Semaine par semaine"
          hint="Chaque joueur, semaine du lundi au dimanche · mêmes filtres que le tableau · survol d’une case pour le détail"
        >
          <WeeklyMatrix rows={rows} players={found} filters={filters} />
        </Card>

        <div className="grid gap-5 lg:grid-cols-5">
          <Card
            title="Buy-ins par semaine"
            hint={buyInActive ? 'Filtre de buy-in appliqué (détail des tournois)' : 'Toutes mises confondues, survol pour le détail'}
            className="lg:col-span-3"
          >
            <WeeklyChart weeks={weeks} />
          </Card>
          <Card
            title="Tranches de buy-in"
            hint={incomplete ? `Détail incomplet pour ${incomplete} joueur${incomplete > 1 ? 's' : ''}` : 'Tous les tournois de la période'}
            className="lg:col-span-2"
          >
            <BuyInBars buckets={buckets} />
          </Card>
        </div>

        {missing.length > 0 && (
          <Card title="Pseudos introuvables sur pokstats" hint="Vérifie l’orthographe exacte du pseudo Winamax">
            <ul className="flex flex-wrap gap-2 text-sm">
              {missing.map((p) => (
                <li key={p.nickname} className="rounded-lg border border-[var(--border-color)] px-2.5 py-1">
                  {p.nickname}
                  {p.candidates?.length > 0 && (
                    <span className="text-[var(--text-muted)]"> · proches : {p.candidates.join(', ')}</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <p className="text-xs text-[var(--text-muted)]">
          Source : pokstats.com, tournois programmés Winamax depuis le {shortDay(snapshot.since)} (jours à l’heure de Paris),
          relevé le {shortDay(dayOf(snapshot.generatedAt))}. Le rake n’est publié que sur la carrière : il est estimé pour la
          période. Le profit inclut les gains et bounties.
        </p>
      </div>
    </div>
  )
}

/**
 * `/poker` : dashboard privé des joueurs du club. Le snapshot vient de poker-club.php, qui
 * vérifie le mot de passe à chaque appel ; les calculs (période, buy-in, rake) se font ici.
 */
export default function PokerApp() {
  usePrivatePage()
  const [key, setKey] = useState(readKey)
  const [tick, setTick] = useState(0)
  const [result, setResult] = useState(null)
  const request = `${key}|${tick}`

  useEffect(() => {
    if (!key) return undefined
    const controller = new AbortController()
    fetchSnapshot(key, controller.signal).then(
      (data) => setResult({ request, data, error: null }),
      (error) => {
        if (controller.signal.aborted) return
        const failure = error instanceof PokerError ? error : new PokerError('network', String(error))
        if (failure.kind === 'invalid-key' || failure.kind === 'too-many') {
          storeKey('')
          setKey('')
        }
        setResult({ request, data: null, error: failure })
      },
    )
    return () => controller.abort()
  }, [key, request])

  const loading = Boolean(key) && result?.request !== request
  const data = result?.data ?? null
  const error = result?.error ?? null

  const unlock = (value, remember) => {
    storeKey(remember ? value : '')
    setResult(null)
    setKey(value)
  }
  const lock = () => {
    storeKey('')
    setKey('')
    setResult(null)
  }
  const retryButton = (
    <button
      type="button"
      onClick={() => setTick((t) => t + 1)}
      className={`rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white dark:text-[#070b14] ${focusRing}`}
    >
      Réessayer
    </button>
  )
  const lockButton = (
    <button type="button" onClick={lock} className={`rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm ${focusRing}`}>
      Changer de mot de passe
    </button>
  )

  let content
  if (!key) {
    content = <UnlockForm onUnlock={unlock} error={error?.kind === 'invalid-key' || error?.kind === 'too-many' ? error.message : null} />
  } else if (!data && loading) {
    content = (
      <p role="status" className="flex min-h-dvh items-center justify-center text-sm text-[var(--text-secondary)]">
        Chargement des stats du club…
      </p>
    )
  } else if (error && !loading) {
    content = (
      <Message title="Stats indisponibles" actions={<>{retryButton}{lockButton}</>}>
        <p>{error.message}</p>
      </Message>
    )
  } else if (data && !data.snapshot) {
    content = (
      <Message title="Pas encore de données" actions={<>{retryButton}{lockButton}</>}>
        <p>Aucun snapshot importé. Lance scripts/poker-collect.js depuis un onglet pokstats connecté.</p>
      </Message>
    )
  } else if (data) {
    content = (
      <Dashboard
        snapshot={data.snapshot}
        onLock={lock}
        onRefresh={() => setTick((t) => t + 1)}
        loading={loading}
      />
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">{content}</div>
    </ThemeProvider>
  )
}
