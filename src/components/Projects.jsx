import { projects } from '../data/projects'
import { useInView } from '../hooks/useInView'
import AnimatedSection from './AnimatedSection'
import ProjectCard from './ProjectCard'

export default function Projects() {
  const [ref, inView] = useInView()

  return (
    <AnimatedSection id="projets" inView={inView} className="section-padding bg-[var(--bg-secondary)]">
      <div ref={ref} className="container-site">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Portfolio
          </span>
          <h2 id="projets-heading" className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Mes projets
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            SaaS, side projects, plugins gaming et automatisations — une sélection de ce que je
            construis.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}
