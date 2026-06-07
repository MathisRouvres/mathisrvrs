import { useState } from 'react'

export default function ProjectCard({ project, index, inView }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = project.highlights?.length > 0

  return (
    <article
      className={`group glass-card flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-xl ${
        project.featured ? 'ring-1 ring-[var(--accent)]/20' : ''
      }`}
      style={{
        transitionDelay: inView ? `${index * 45}ms` : '0ms',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
          {project.title}
        </h3>
        {project.featured && (
          <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
            Featured
          </span>
        )}
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
        {project.description}
      </p>

      {expanded && hasDetails && (
        <ul className="mt-4 space-y-2 border-l-2 border-[var(--accent)]/30 pl-4">
          {project.highlights.map((item) => (
            <li key={item} className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] pt-4">
        <span className="text-xs font-medium text-[var(--text-muted)]">{project.status}</span>
        <div className="flex flex-wrap items-center gap-3">
          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="text-sm font-semibold text-[var(--accent)] transition-colors hover:brightness-110"
            >
              {expanded ? 'Réduire' : 'En savoir plus'}
            </button>
          )}
          {project.link && project.link !== '#' && (
            <a
              href={project.link}
              className="flex items-center gap-1 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:gap-2 hover:text-[var(--accent)]"
            >
              {project.linkLabel ?? 'Explorer'}
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
