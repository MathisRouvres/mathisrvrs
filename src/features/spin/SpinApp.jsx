import { useMemo, useState } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import RangeMatrix from './RangeMatrix'
import NashPanel from './NashPanel'
import { SCENARIOS, stacksOf } from './scenarios'
import rangesData from './data/spin-ranges.json'

const RANGES = rangesData.ranges || {}

/** Tous les scénarios groupés par position héros (Bouton / SB / BB), ordre du manifeste. */
const GROUPS = (() => {
  const out = []
  for (const s of SCENARIOS) {
    let g = out.find((x) => x.group === s.group)
    if (!g) {
      g = { group: s.group, items: [] }
      out.push(g)
    }
    g.items.push(s)
  }
  return out
})()

const NASH = { scenarioId: '__nash__' }

export default function SpinApp() {
  // Sélection par défaut : premier scénario, plus gros stack.
  const first = SCENARIOS[0]
  const [sel, setSel] = useState({ scenarioId: first.id, stack: stacksOf(first)[0] })

  const isNash = sel.scenarioId === NASH.scenarioId
  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === sel.scenarioId) || null,
    [sel.scenarioId],
  )
  const range = scenario ? RANGES[scenario.sheets[sel.stack]] || null : null

  return (
    <ThemeProvider>
      <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <header className="border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/60 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">Ranges Spin &amp; Go</h1>
              <p className="text-xs text-[var(--text-secondary)]">Preflop push/fold · toutes les ranges en un clic</p>
            </div>
            <a
              href="/"
              className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              ← Portfolio
            </a>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,300px)_1fr]">
          {/* Rail : accès 1 clic à toute range */}
          <nav className="space-y-5">
            <button
              onClick={() => setSel({ scenarioId: NASH.scenarioId })}
              className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                isNash
                  ? 'border-transparent bg-[var(--accent)] text-white'
                  : 'border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              ★ Push/Fold Nash
            </button>

            {GROUPS.map((g) => (
              <div key={g.group}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {g.group}
                </p>
                <div className="space-y-2">
                  {g.items.map((s) => {
                    const stacks = stacksOf(s)
                    return (
                      <div key={s.id} className="rounded-lg bg-[var(--bg-elevated)]/50 px-2.5 py-2">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <span className="text-sm font-medium">{s.label}</span>
                          <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                            {s.format === 'HU' ? 'HU' : '3W'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {stacks.map((st) => {
                            const active = !isNash && sel.scenarioId === s.id && sel.stack === st
                            return (
                              <button
                                key={st}
                                onClick={() => setSel({ scenarioId: s.id, stack: st })}
                                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                  active
                                    ? 'bg-[var(--accent)] text-white'
                                    : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                {st}BB
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Vue */}
          <section>
            {isNash ? (
              <>
                <h2 className="mb-4 text-lg font-semibold">Push/Fold Nash</h2>
                <NashPanel />
              </>
            ) : (
              <>
                <div className="mb-3 flex items-baseline gap-2">
                  <h2 className="text-lg font-semibold">{scenario?.label}</h2>
                  <span className="text-sm text-[var(--text-secondary)]">{sel.stack}BB</span>
                </div>
                <div className="mx-auto max-w-xl">
                  <RangeMatrix range={range} />
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </ThemeProvider>
  )
}
