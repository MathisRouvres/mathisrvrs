import { accentClasses, passions } from '../data/passions'
import { useThemeContext } from '../hooks/useThemeContext'
import { useInView } from '../hooks/useInView'
import AnimatedSection from './AnimatedSection'

export default function PersonalMode() {
  const [ref, inView] = useInView()
  const { isDark } = useThemeContext()

  return (
    <AnimatedSection
      id="passions"
      inView={inView}
      className={`section-padding relative overflow-hidden transition-opacity duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
        isDark ? 'opacity-100' : 'opacity-70'
      }`}
    >
      {/* Neon lines - dark mode */}
      {isDark && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-0 top-1/4 h-px w-full bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
          <div className="absolute left-0 top-3/4 h-px w-full bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent" />
        </div>
      )}

      <div ref={ref} className="container-site relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Mode personnel
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Passions &amp; univers créatif
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Gaming, basket, poker, IA et esprit builder — mon côté perso quand je quitte le bureau
            SaaS.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {passions.map((passion, i) => (
            <article
              key={passion.id}
              className={`group rounded-2xl border p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg dark:hover:glow-neon ${accentClasses[passion.accent]} ${
                isDark ? '' : 'bg-[var(--bg-elevated)] border-[var(--border-color)]'
              }`}
              style={{
                transitionDelay: inView ? `${i * 80}ms` : '0ms',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
              }}
            >
              <span className="text-3xl" aria-hidden="true">
                {passion.icon}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-[var(--text-primary)]">
                {passion.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {passion.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}
