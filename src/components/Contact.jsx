import { site } from '../data/site'
import { useInView } from '../hooks/useInView'
import AnimatedSection from './AnimatedSection'
import Button from './Button'

export default function Contact() {
  const [ref, inView] = useInView()

  return (
    <AnimatedSection id="contact" inView={inView} className="section-padding">
      <div ref={ref} className="container-site">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
              Contact
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              Travaillons ensemble
            </h2>
            <p className="mt-4 text-[var(--text-secondary)]">
              Un projet SaaS, une refonte UX/UI ou une collaboration tech ? Écrivez-moi.
            </p>
          </div>

          <div
            className="mt-12 glass-card rounded-2xl p-8 transition-all duration-500 sm:p-10"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                const data = new FormData(e.target)
                const subject = encodeURIComponent(`Contact depuis ${site.domain}`)
                const body = encodeURIComponent(
                  `Nom: ${data.get('name')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`,
                )
                window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Nom
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--accent)] focus:outline-none"
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--accent)] focus:outline-none"
                    placeholder="vous@exemple.com"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className="w-full resize-y rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--accent)] focus:outline-none"
                  placeholder="Parlez-moi de votre projet..."
                />
              </div>
              <Button type="submit" variant="primary" className="w-full sm:w-auto">
                Envoyer par email
              </Button>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-[var(--border-color)] pt-8">
              <Button href={`mailto:${site.email}`} variant="secondary">
                ✉️ {site.email}
              </Button>
              <Button href={site.github} variant="ghost" target="_blank" rel="noopener noreferrer">
                GitHub
              </Button>
              <Button href={site.linkedin} variant="ghost" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}
