import { timeline, timelineTypeLabels } from '../data/timeline'
import { useThemeContext } from '../hooks/useThemeContext'
import { useInView } from '../hooks/useInView'
import AnimatedSection from './AnimatedSection'
import '../styles/timeline.css'

function TimelineCard({ item, isDark, index, inView }) {
  const isHighlight = item.highlight
  const typeLabel = timelineTypeLabels[item.type] ?? item.type

  return (
    <li
      className="timeline-item relative pb-10 last:pb-0 sm:pb-12"
      style={{ transitionDelay: inView ? `${index * 90 + 120}ms` : '0ms' }}
    >
      {/* Dot on track */}
      <span
        className={`timeline-dot absolute left-0 top-6 z-10 flex h-[var(--timeline-dot)] w-[var(--timeline-dot)] -translate-x-1/2 items-center justify-center rounded-full border-2 ${
          isHighlight
            ? isDark
              ? 'border-neon-cyan bg-neon-cyan/25 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
              : 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_12px_rgba(59,91,219,0.25)]'
            : isDark
              ? 'border-neon-purple/60 bg-neon-purple/20'
              : 'border-[var(--accent)]/60 bg-[var(--accent-soft)]'
        }`}
        style={{
          '--timeline-dot-glow': isDark ? 'rgba(34,211,238,0.15)' : 'rgba(59,91,219,0.12)',
        }}
        aria-hidden="true"
      >
        <span className="sr-only">{item.period}</span>
      </span>

      <article
        className={`timeline-card ml-6 rounded-2xl border p-5 sm:ml-8 sm:p-6 ${
          isHighlight
            ? `timeline-card--highlight ${
                isDark
                  ? 'border-neon-cyan/35 bg-[var(--bg-elevated)] shadow-[0_8px_32px_rgba(34,211,238,0.08)] dark:hover:glow-neon'
                  : 'border-[var(--accent)]/35 bg-white shadow-[0_8px_32px_rgba(59,91,219,0.1)]'
              }`
            : 'glass-card border-[var(--border-color)] hover:shadow-lg'
        }`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-lg"
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <div>
              <p
                className={`font-mono text-xs font-bold uppercase tracking-widest ${
                  isDark ? 'text-neon-cyan' : 'text-[var(--accent)]'
                }`}
              >
                {item.period}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  item.type === 'work'
                    ? isDark
                      ? 'bg-neon-cyan/15 text-neon-cyan'
                      : 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : item.type === 'project'
                      ? isDark
                        ? 'bg-neon-pink/15 text-neon-pink'
                        : 'bg-violet-100 text-violet-700'
                      : isDark
                        ? 'bg-neon-purple/15 text-neon-purple'
                        : 'bg-slate-100 text-slate-600'
                }`}
              >
                {typeLabel}
              </span>
            </div>
          </div>

          {isHighlight && item.highlightLabel && (
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                isDark
                  ? 'border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan'
                  : 'border border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--accent)]'
              }`}
            >
              {item.highlightLabel}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-display text-lg font-bold leading-snug text-[var(--text-primary)] sm:text-xl">
          {item.title}
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {item.description}
        </p>

        {item.responsibilities && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {item.responsibilities.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-secondary)]"
              >
                <span
                  className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                    isDark ? 'bg-neon-cyan' : 'bg-[var(--accent)]'
                  }`}
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </ul>
        )}

        {item.mood && (
          <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {item.mood}
          </p>
        )}

        {item.tags?.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Compétences et technologies">
            {item.tags.map((tag) => (
              <li key={tag}>
                <span
                  className={`timeline-tag inline-block rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                    isDark
                      ? 'border border-neon-purple/20 bg-neon-purple/10 text-neon-cyan'
                      : 'border border-[var(--accent)]/15 bg-[var(--accent-soft)] text-[var(--accent)]'
                  }`}
                >
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </li>
  )
}

export default function Timeline() {
  const [ref, inView] = useInView({ threshold: 0.08 })
  const { isDark } = useThemeContext()

  return (
    <AnimatedSection id="timeline" inView={inView} className="section-padding bg-[var(--bg-secondary)]">
      <div ref={ref} className={`container-site ${inView ? 'timeline--visible' : ''}`}>
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Parcours
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Mon évolution
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Du premier code aux outils que je construis aujourd&apos;hui chez MYAgency — projets,
            compétences et vision produit.
          </p>
        </div>

        <div className="timeline-track relative mx-auto mt-12 max-w-3xl sm:mt-14">
          {/* Vertical line */}
          <div
            className={`timeline-line absolute bottom-0 left-0 top-0 w-px ${
              isDark
                ? 'bg-gradient-to-b from-neon-cyan/60 via-neon-purple/35 to-neon-cyan/20'
                : 'bg-gradient-to-b from-[var(--accent)]/50 via-indigo-300/40 to-[var(--accent)]/15'
            }`}
            aria-hidden="true"
          />

          <ol className="relative list-none pl-0">
            {timeline.map((item, i) => (
              <TimelineCard key={item.id} item={item} isDark={isDark} index={i} inView={inView} />
            ))}
          </ol>
        </div>
      </div>
    </AnimatedSection>
  )
}
