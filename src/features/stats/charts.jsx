import { useState } from 'react'
import { WEEKDAYS, buildHeatmap, formatDay, formatNumber } from './format'

/** Une seule teinte (l'accent du site) : intensité = volume. */
const shade = (ratio) => `color-mix(in oklab, var(--accent) ${Math.round(18 + ratio * 82)}%, var(--bg-elevated))`

function Readout({ children }) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm tabular-nums text-[var(--text-secondary)]">
      {children}
    </p>
  )
}

/** Pages vues par jour ; survol ou appui sur une barre pour le détail. */
export function DailyChart({ daily }) {
  const [active, setActive] = useState(null)
  const max = Math.max(1, ...daily.map((d) => d.pageViews))
  const total = daily.reduce((sum, d) => sum + d.pageViews, 0)
  const focus = active === null ? null : daily[active]
  const middle = daily[Math.floor((daily.length - 1) / 2)]

  return (
    <figure>
      <Readout>
        {focus ? (
          <>
            <span className="font-semibold text-[var(--text-primary)]">{formatDay(focus.day)}</span> —{' '}
            {formatNumber(focus.pageViews)} pages vues · {formatNumber(focus.visitors)} visiteurs
          </>
        ) : (
          <>
            {formatNumber(total)} pages vues · pic à {formatNumber(max)} par jour
          </>
        )}
      </Readout>

      <div className="relative mt-3 h-44" aria-hidden="true">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-[var(--border-color)]">
          <span className="absolute -top-2.5 right-0 bg-[var(--bg-elevated)] pl-1 text-[11px] tabular-nums text-[var(--text-muted)]">
            {formatNumber(max)}
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-[var(--border-color)]" />
        <div
          className={`absolute inset-0 flex items-end ${daily.length > 45 ? 'gap-px' : 'gap-[2px]'}`}
          onMouseLeave={() => setActive(null)}
        >
          {daily.map((d, i) => (
            <div
              key={d.day}
              className="flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
            >
              <div
                className="w-full rounded-t-[4px] transition-[background-color] duration-150"
                style={{
                  height: `${(d.pageViews / max) * 100}%`,
                  minHeight: d.pageViews ? 2 : 0,
                  background: active === null || active === i ? 'var(--accent)' : shade(0.25),
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {daily.length > 0 && (
        <div className="mt-2 flex justify-between text-[11px] text-[var(--text-muted)]" aria-hidden="true">
          <span>{formatDay(daily[0].day, true)}</span>
          {daily.length > 2 && <span>{formatDay(middle.day, true)}</span>}
          <span>{formatDay(daily[daily.length - 1].day, true)}</span>
        </div>
      )}

      <div className="sr-only">
        <table>
          <caption>Pages vues et visiteurs par jour</caption>
          <thead>
            <tr>
              <th scope="col">Jour</th>
              <th scope="col">Pages vues</th>
              <th scope="col">Visiteurs</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.day}>
                <th scope="row">{formatDay(d.day)}</th>
                <td>{d.pageViews}</td>
                <td>{d.visitors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

const HOUR_TICKS = [0, 6, 12, 18]

function findPeak(grid) {
  let peak = null
  grid.forEach((row, d) =>
    row.forEach((n, h) => {
      if (n > 0 && (!peak || n > peak.n)) peak = { d, h, n }
    }),
  )
  return peak
}

/** Pages vues par jour de la semaine et par heure (heure de Paris). */
export function Heatmap({ cells }) {
  const [active, setActive] = useState(null)
  const { grid, max, byHour } = buildHeatmap(cells)
  const maxHour = Math.max(1, ...byHour)
  const peak = findPeak(grid)
  const focus = active ?? peak
  const columns = { gridTemplateColumns: '2.25rem repeat(24, minmax(0, 1fr))' }

  return (
    <figure>
      <Readout>
        {focus ? (
          <>
            {active ? '' : 'Créneau le plus actif : '}
            <span className="font-semibold text-[var(--text-primary)]">
              {WEEKDAYS[focus.d]} {focus.h} h – {focus.h + 1} h
            </span>{' '}
            — {formatNumber(grid[focus.d][focus.h])} pages vues
          </>
        ) : (
          'Pas encore de visite sur la période.'
        )}
      </Readout>

      <div className="mt-3 select-none" aria-hidden="true" onMouseLeave={() => setActive(null)}>
        <div className="grid items-end gap-[2px]" style={columns}>
          <span className="text-[10px] text-[var(--text-muted)]">/ h</span>
          {byHour.map((n, h) => (
            <div key={h} className="flex h-8 items-end">
              <div
                className="w-full rounded-t-[3px]"
                style={{ height: `${(n / maxHour) * 100}%`, minHeight: n ? 2 : 0, background: shade(0.55) }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 grid gap-[2px]" style={columns}>
          {grid.map((row, d) => (
            <div key={WEEKDAYS[d]} className="contents">
              <span className="self-center text-[11px] text-[var(--text-muted)]">{WEEKDAYS[d]}</span>
              {row.map((n, h) => (
                <div
                  key={h}
                  className={`aspect-square rounded-[3px] ${active?.d === d && active?.h === h ? 'outline outline-2 outline-[var(--text-primary)]' : ''}`}
                  style={{ background: n ? shade(n / Math.max(1, max)) : 'var(--bg-primary)' }}
                  onMouseEnter={() => setActive({ d, h })}
                  onClick={() => setActive({ d, h })}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-1 grid gap-[2px] text-[10px] text-[var(--text-muted)]" style={columns}>
          <span />
          {byHour.map((_, h) => (
            <span key={h} className="whitespace-nowrap">
              {HOUR_TICKS.includes(h) ? `${h} h` : ''}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-[var(--text-muted)]">
          Moins
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <span key={r} className="h-3 w-3 rounded-[3px]" style={{ background: shade(r) }} />
          ))}
          Plus
        </div>
      </div>

      <div className="sr-only">
        <table>
          <caption>Pages vues par jour de la semaine et par heure</caption>
          <thead>
            <tr>
              <th scope="col">Jour</th>
              {byHour.map((_, h) => (
                <th key={h} scope="col">
                  {h} h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, d) => (
              <tr key={WEEKDAYS[d]}>
                <th scope="row">{WEEKDAYS[d]}</th>
                {row.map((n, h) => (
                  <td key={h}>{n}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

/**
 * Classement en barres horizontales.
 * items : { key, label, sub?, value, display, detail? }
 */
export function BarList({ items, empty = 'Rien sur la période.' }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-[var(--text-muted)]">{empty}</p>
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-medium text-[var(--text-primary)]">{item.label}</span>
              {item.sub && <span className="ml-2 text-xs text-[var(--text-muted)]">{item.sub}</span>}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-[var(--text-primary)]">{item.display}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-[var(--bg-primary)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
          {item.detail && <p className="mt-1 text-xs tabular-nums text-[var(--text-muted)]">{item.detail}</p>}
        </li>
      ))}
    </ul>
  )
}
