import { site } from '../data/site'
import { useThemeContext } from '../hooks/useThemeContext'
import Button from './Button'
import GamerScene from './GamerScene'
import ThemeToggle from './ThemeToggle'

export default function Hero() {
  const { isDark, isTransitioning, useViewTransition } = useThemeContext()

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[var(--bg-primary)] pt-20 pb-8 sm:pb-10 lg:pt-24 lg:pb-12"
    >
      {/* Crossfade gradients — fluide au changement de thème */}
      <div
        className="hero-gradient-layer pointer-events-none absolute inset-0 opacity-100 dark:opacity-0"
        style={{ background: 'var(--hero-gradient-light)' }}
        aria-hidden="true"
      />
      <div
        className="hero-gradient-layer pointer-events-none absolute inset-0 opacity-0 dark:opacity-100"
        style={{ background: 'var(--hero-gradient-dark)' }}
        aria-hidden="true"
      />

      {/* Fallback overlay léger si pas de View Transition API */}
      {isTransitioning && !useViewTransition && (
        <div className="theme-transition-overlay pointer-events-none fixed inset-0 z-40" aria-hidden="true" />
      )}

      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] transition-opacity duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)] dark:opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(var(--text-primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
        aria-hidden="true"
      />

      <div className="container-site relative px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="animate-fade-in-up order-2 lg:order-1">
            <p className="theme-mode-label mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              {isDark ? 'Mode personnel' : 'Mode professionnel'}
            </p>

            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              {site.name.split(' ')[0]}
              <br />
              <span className="text-gradient-pro transition-[background-image] duration-[720ms]">
                {site.name.split(' ').slice(1).join(' ')}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--text-secondary)]">
              {site.tagline}
            </p>

            <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">{site.heroSubtitle}</p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href="#projects" variant="primary">
                Voir mes projets
                <span aria-hidden="true">→</span>
              </Button>
              <Button href="#contact" variant="secondary">
                Me contacter
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-4 lg:hidden">
              <span className="text-sm text-[var(--text-muted)]">Changer d&apos;ambiance</span>
              <ThemeToggle />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <GamerScene />
          </div>
        </div>
      </div>
    </section>
  )
}
