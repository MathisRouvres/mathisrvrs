import { proSkills } from '../data/site'
import { useThemeContext } from '../hooks/useThemeContext'
import AnimatedSection from './AnimatedSection'
import { useInView } from '../hooks/useInView'

export default function ProMode() {
  const [ref, inView] = useInView()
  const { isDark } = useThemeContext()

  return (
    <AnimatedSection
      id="pro"
      inView={inView}
      className={`section-padding transition-opacity duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
        isDark ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div ref={ref} className="container-site">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Moi en mode pro
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Développeur web, product builder &amp; UX/UI
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Je conçois et développe des produits web complets — du frontend React aux backends
            Laravel, en passant par l&apos;UX, la sécurité et l&apos;automatisation IA.
          </p>
        </div>

        <ul className="mt-12 flex flex-wrap justify-center gap-3">
          {proSkills.map((skill, i) => (
            <li
              key={skill}
              className={`animate-badge-float rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition-all duration-300 hover:border-[var(--accent)] hover:shadow-md hover:-translate-y-0.5`}
              style={{
                animationDelay: `${(i % 5) * 0.4}s`,
                transitionDelay: inView ? `${i * 40}ms` : '0ms',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(12px)',
              }}
            >
              {skill}
            </li>
          ))}
        </ul>
      </div>
    </AnimatedSection>
  )
}
