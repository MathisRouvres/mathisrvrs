export default function ProjectCard({ project, index, inView }) {
  return (
    <article
      className={`group glass-card flex flex-col rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-xl ${
        project.featured ? 'ring-1 ring-[var(--accent)]/20' : ''
      }`}
      style={{
        transitionDelay: inView ? `${index * 80}ms` : '0ms',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
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

      <div className="mt-4 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-[var(--bg-primary)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] border border-[var(--border-color)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border-color)] pt-4">
        <span className="text-xs font-medium text-[var(--text-muted)]">{project.status}</span>
        <a
          href={project.link}
          className="text-sm font-semibold text-[var(--accent)] transition-all group-hover:gap-2 flex items-center gap-1"
        >
          En savoir plus
          <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  )
}
