import { useEffect, useRef, useState } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import ThemeToggle from '../../components/ThemeToggle'
import { isAnalyticsOptedOut, setAnalyticsOptOut } from '../../lib/analytics/tracker'
import { StatsError, fetchStats } from './api'
import { BarList, DailyChart, Heatmap } from './charts'
import {
  delta,
  deviceLabel,
  eventLabel,
  formatDuration,
  formatNumber,
  formatWhen,
  gameLabel,
  sectionLabel,
} from './format'

const KEY_STORAGE = 'mr-stats-key'
const PERIODS = [
  { days: 7, label: '7 j' },
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
]

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
    // stockage indisponible : la clé sera redemandée
  }
}

/** Page privée : titre dédié et jamais indexée. */
function usePrivatePage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Statistiques | Mathis Rouvres'
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

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
const card =
  'min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-[var(--card-shadow)]'

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

function Kpi({ label, value, sub, change }) {
  return (
    <div className={card}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs tabular-nums text-[var(--text-secondary)]">
        {change && (
          <span className="mr-1.5 font-semibold text-[var(--text-primary)]">
            <span aria-hidden="true">{change.trend === 'up' ? '▲ ' : change.trend === 'down' ? '▼ ' : ''}</span>
            {change.text}
          </span>
        )}
        {sub}
      </p>
    </div>
  )
}

function UnlockForm({ onUnlock, error }) {
  const [value, setValue] = useState('')
  const [remember, setRemember] = useState(true)
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Statistiques</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Page privée. Entre la clé définie dans Supabase.</p>
      <form
        className={`${card} mt-6 space-y-4`}
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) onUnlock(value.trim(), remember)
        }}
      >
        <div>
          <label htmlFor="stats-key" className="text-sm font-medium">
            Clé d’accès
          </label>
          <input
            id="stats-key"
            type="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'stats-key-error' : undefined}
            className={`mt-1.5 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2.5 text-base ${focusRing}`}
          />
          {error && (
            <p id="stats-key-error" role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
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

function SetupHelp({ error, onRetry, onLock }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
      <div className={card} role="alert">
        <h1 className="font-display text-xl font-bold">Statistiques indisponibles</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{error.message}</p>
        {error.kind === 'not-installed' && (
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-[var(--text-secondary)]">
            <li>
              Ouvrir l’éditeur SQL Supabase et exécuter <code>docs/analytics/supabase-schema.sql</code>.
            </li>
            <li>Définir la clé avec la requête commentée en bas de la section « Clé du dashboard ».</li>
            <li>Revenir ici et réessayer.</li>
          </ol>
        )}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onRetry}
            className={`rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white dark:text-[#070b14] ${focusRing}`}
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={onLock}
            className={`rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm ${focusRing}`}
          >
            Changer de clé
          </button>
        </div>
      </div>
    </main>
  )
}

function Dashboard({ data, days, onDays, onRefresh, onLock, loading, optedOut, onOptOut }) {
  const { totals, previous } = data
  const empty = totals.pageViews === 0 && totals.gameStarts === 0

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Statistiques</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Mis à jour {formatWhen(data.generatedAt)} · heure de Paris
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Période"
            className="flex rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1"
          >
            {PERIODS.map((p) => (
              <button
                key={p.days}
                type="button"
                role="radio"
                aria-checked={days === p.days}
                onClick={() => onDays(p.days)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${focusRing} ${
                  days === p.days
                    ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={`rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm transition hover:border-[var(--accent)] disabled:opacity-50 ${focusRing}`}
          >
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
        {empty && (
          <p className={`${card} text-sm text-[var(--text-secondary)]`} role="status">
            Aucune visite enregistrée sur cette période. Les statistiques apparaissent quelques secondes après chaque
            visite (hors développement et hors navigateurs exclus).
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Pages vues"
            value={formatNumber(totals.pageViews)}
            change={delta(totals.pageViews, previous.pageViews)}
            sub="vs période préc."
          />
          <Kpi
            label="Visiteurs"
            value={formatNumber(totals.visitors)}
            change={delta(totals.visitors, previous.visitors)}
            sub="uniques"
          />
          <Kpi
            label="Sessions"
            value={formatNumber(totals.sessions)}
            change={delta(totals.sessions, previous.sessions)}
            sub={`${formatDuration(totals.avgSessionMs)} en moyenne`}
          />
          <Kpi
            label="Parties lancées"
            value={formatNumber(totals.gameStarts)}
            change={delta(totals.gameStarts, previous.gameStarts)}
            sub={`${formatDuration(totals.timeMs)} passées sur le site`}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          <Card title="Fréquentation" hint="Pages vues par jour" className="lg:col-span-3">
            <DailyChart daily={data.daily} />
          </Card>
          <Card title="À quel moment ?" hint="Pages vues par jour de la semaine et par heure" className="lg:col-span-2">
            <Heatmap cells={data.heatmap} />
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Sections" hint="Ce qui est ouvert, et combien de temps">
            <BarList
              items={data.sections.map((s) => ({
                key: s.section,
                label: sectionLabel(s.section),
                value: s.pageViews,
                display: formatNumber(s.pageViews),
                detail: `${formatNumber(s.visitors)} visiteurs · ${formatDuration(s.timeMs)}`,
              }))}
            />
          </Card>
          <Card title="Jeux" hint="Lancements, joueurs uniques, parties à plusieurs, temps de jeu">
            <BarList
              items={data.games.map((g) => {
                const { title, group } = gameLabel(g.game)
                return {
                  key: g.game,
                  label: title,
                  sub: group,
                  value: Math.max(g.starts, g.rooms),
                  display: formatNumber(g.starts || g.rooms),
                  detail: [
                    g.starts ? `${formatNumber(g.visitors)} joueurs` : null,
                    g.rooms ? `${formatNumber(g.rooms)} parties à plusieurs` : null,
                    g.timeMs ? formatDuration(g.timeMs) : null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                }
              })}
              empty="Aucune partie lancée sur la période."
            />
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card title="Appareils" hint="Visiteurs uniques">
            <BarList
              items={data.devices.map((d) => ({
                key: d.device,
                label: deviceLabel(d.device),
                value: d.visitors,
                display: formatNumber(d.visitors),
              }))}
            />
          </Card>
          <Card title="Provenance" hint="Sites d’où arrivent les visiteurs">
            <BarList
              items={data.referrers.map((r) => ({
                key: r.referrer,
                label: r.referrer,
                value: r.visits,
                display: formatNumber(r.visits),
              }))}
              empty="Accès direct uniquement."
            />
          </Card>
          <Card title="En direct" hint="Derniers événements" className="lg:row-span-2">
            {data.recent.length ? (
              <ol className="max-h-[28rem] space-y-2.5 overflow-y-auto pr-1">
                {data.recent.map((r, i) => (
                  <li key={`${r.at}-${i}`} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {r.game ? gameLabel(r.game).title : sectionLabel(r.section)}
                      </span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">
                        {eventLabel(r.event)}
                        {r.device ? ` · ${deviceLabel(r.device)}` : ''}
                      </span>
                    </span>
                    <time dateTime={r.at} className="shrink-0 text-xs tabular-nums text-[var(--text-secondary)]">
                      {formatWhen(r.at)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">Rien pour l’instant.</p>
            )}
          </Card>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm text-[var(--text-secondary)]">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={optedOut} onChange={(e) => onOptOut(e.target.checked)} />
            Ne pas compter mes visites depuis cet appareil
          </label>
          <button
            type="button"
            onClick={onLock}
            className={`rounded-lg px-2 py-1 underline-offset-4 hover:underline ${focusRing}`}
          >
            Verrouiller
          </button>
        </footer>
      </div>
    </div>
  )
}

/**
 * `/stats` : dashboard privé de l'usage du site. Les chiffres viennent de la
 * fonction Supabase `analytics_stats`, qui vérifie la clé à chaque appel.
 */
export default function StatsApp() {
  usePrivatePage()
  const [key, setKey] = useState(readKey)
  const [days, setDays] = useState(30)
  const [tick, setTick] = useState(0)
  const [result, setResult] = useState(null)
  const [optedOut, setOptedOut] = useState(isAnalyticsOptedOut)
  const unlocking = useRef(false)
  const request = `${key}|${days}|${tick}`

  useEffect(() => {
    if (!key) return undefined
    const controller = new AbortController()
    fetchStats(key, days, controller.signal).then(
      (data) => {
        // Premier accès : les visites du propriétaire ne faussent pas les chiffres.
        if (unlocking.current) {
          unlocking.current = false
          setAnalyticsOptOut(true)
          setOptedOut(true)
        }
        setResult({ request, data, error: null })
      },
      (error) => {
        if (controller.signal.aborted) return
        unlocking.current = false
        const failure = error instanceof StatsError ? error : new StatsError('network', String(error))
        if (failure.kind === 'invalid-key') {
          storeKey('')
          setKey('')
        }
        setResult({ request, data: null, error: failure })
      },
    )
    return () => controller.abort()
  }, [key, days, request])

  const loading = Boolean(key) && result?.request !== request
  const lastData = result?.data ?? null
  const error = result?.error ?? null

  const unlock = (value, remember) => {
    unlocking.current = true
    storeKey(remember ? value : '')
    setResult(null)
    setKey(value)
  }
  const lock = () => {
    storeKey('')
    setKey('')
    setResult(null)
  }

  let content
  if (!key) {
    content = (
      <UnlockForm onUnlock={unlock} error={error?.kind === 'invalid-key' ? 'Clé incorrecte.' : null} />
    )
  } else if (!lastData && loading) {
    content = (
      <p role="status" className="flex min-h-dvh items-center justify-center text-sm text-[var(--text-secondary)]">
        Chargement des statistiques…
      </p>
    )
  } else if (error && !loading) {
    content = <SetupHelp error={error} onRetry={() => setTick((t) => t + 1)} onLock={lock} />
  } else if (lastData) {
    content = (
      <Dashboard
        data={lastData}
        days={days}
        onDays={setDays}
        onRefresh={() => setTick((t) => t + 1)}
        onLock={lock}
        loading={loading}
        optedOut={optedOut}
        onOptOut={(value) => {
          setAnalyticsOptOut(value)
          setOptedOut(value)
        }}
      />
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">{content}</div>
    </ThemeProvider>
  )
}
