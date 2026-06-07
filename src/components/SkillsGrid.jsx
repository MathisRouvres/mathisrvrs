import { skillCategories } from '../data/skills'
import { useInView } from '../hooks/useInView'
import AnimatedSection from './AnimatedSection'

function SkillBar({ name, level, delay, visible }) {
  return (
    <div
      className="transition-all duration-500"
      style={{
        transitionDelay: visible ? `${delay}ms` : '0ms',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-12px)',
      }}
    >
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-medium text-[var(--text-primary)]">{name}</span>
        <span className="text-[var(--text-muted)]">{level}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-indigo-400 transition-all duration-1000 ease-out dark:from-neon-cyan dark:to-neon-purple"
          style={{ width: visible ? `${level}%` : '0%' }}
        />
      </div>
    </div>
  )
}

export default function SkillsGrid() {
  const [ref, inView] = useInView()

  return (
    <AnimatedSection id="skills" inView={inView} className="section-padding">
      <div ref={ref} className="container-site">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Expertise
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Compétences
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Frontend, backend, UX/UI, IA et sécurité — un profil full-stack orienté produit.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {skillCategories.map((cat, catIndex) => (
            <div
              key={cat.id}
              className="glass-card rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg"
              style={{
                transitionDelay: inView ? `${catIndex * 100}ms` : '0ms',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(16px)',
              }}
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-lg">
                  {cat.icon}
                </span>
                <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">
                  {cat.label}
                </h3>
              </div>
              <div className="space-y-4">
                {cat.skills.map((skill, i) => (
                  <SkillBar
                    key={skill.name}
                    name={skill.name}
                    level={skill.level}
                    delay={catIndex * 100 + i * 60}
                    visible={inView}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}
