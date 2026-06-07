import { proSkills } from '../data/site'
import { useThemeContext } from '../hooks/useThemeContext'
import AnimatedSection from './AnimatedSection'
import { useInView } from '../hooks/useInView'
import '../styles/pro-skills.css'

export default function ProMode() {
  const [ref, inView] = useInView()
  const { isDark } = useThemeContext()

  return (
    <AnimatedSection
      id="pro"
      inView={inView}
      className={`section-padding transition-opacity duration-[var(--theme-duration)] ease-[cubic-bezier(0.65,0,0.35,1)] ${
        isDark ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div ref={ref} className="container-site">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Moi en mode pro
          </span>
          <h2 id="pro-heading" className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Développeur web, product builder &amp; UX/UI
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Je conçois et développe des produits web complets — du frontend React aux backends
            Laravel, en passant par l&apos;UX, la sécurité et l&apos;automatisation IA.
          </p>
        </div>

        <ul className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-3 sm:gap-3.5">
          {proSkills.map((skill, i) => (
            <li key={skill}>
              <span
                tabIndex={0}
                className={`pro-skill-chip inline-flex items-center gap-2.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] shadow-sm outline-none ${
                  inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
                style={{ transitionDelay: inView ? `${60 + i * 28}ms` : '0ms' }}
              >
                <span
                  className="pro-skill-chip__dot h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--border-color)]"
                  aria-hidden="true"
                />
                <span className="relative z-10">{skill}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AnimatedSection>
  )
}
