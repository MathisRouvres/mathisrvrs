import { useEffect } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import { MONOVOMY_ENABLED } from '../../config/features'

/**
 * Catalogue des jeux publiés. `enabled` suit le flag build-time de chaque jeu :
 * un jeu désactivé n'apparaît pas (sa route redirigerait vers le portfolio).
 * HEXLAND est un export statique servi depuis `public/catan/`, sans flag.
 */
const GAMES = [
  {
    id: 'hexland',
    title: 'HEXLAND',
    href: '/catan/',
    icon: '/catan/icon_192.png',
    description:
      'Jeu de plateau 3D à tuiles hexagonales : récoltez, construisez, commercez. Un joueur contre trois IA, entièrement hors-ligne.',
    tags: ['Solo', 'Stratégie', 'Hors-ligne'],
    enabled: true,
  },
  {
    id: 'monovomy',
    title: 'MonoVomy',
    href: '/monovomy',
    icon: '/monovomy-icons/icon-192.png',
    description:
      'Le Monopoly à boire. Jeu de soirée multijoueur, en local ou en ligne, chacun depuis son téléphone.',
    tags: ['Multijoueur', 'Soirée', 'En ligne'],
    enabled: MONOVOMY_ENABLED,
  },
  {
    id: 'soiree',
    title: 'Jeux de soirée',
    href: '/games/soiree',
    emoji: '🎉',
    description:
      'Loup-Garou, Undercover, Mot interdit, Devine-tête, Mimes, Petit Bac, Jeu du Roi, Je n’ai jamais, Action ou Vérité et bien d’autres. Un seul téléphone pour tout le groupe.',
    tags: ['Groupe', 'Soirée', '18 jeux'],
    enabled: true,
  },
]

export default function GamesHub() {
  const games = GAMES.filter((g) => g.enabled)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Jeux | Mathis Rouvres'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <ThemeProvider>
      <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <header className="border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/60 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">Jeux</h1>
              <p className="text-xs text-[var(--text-secondary)]">Tous mes jeux, jouables dans le navigateur</p>
            </div>
            <a
              href="/"
              className="shrink-0 whitespace-nowrap rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              ← Portfolio
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8">
          {games.length === 0 ? (
            <p role="status" className="text-center text-sm text-[var(--text-secondary)]">
              Aucun jeu disponible pour le moment.
            </p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {games.map((game) => (
                <li key={game.id}>
                  <a
                    href={game.href}
                    className="group glass-card flex h-full flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    <div className="flex items-center gap-4">
                      {game.icon ? (
                        <img
                          src={game.icon}
                          alt=""
                          width="56"
                          height="56"
                          loading="lazy"
                          className="h-14 w-14 shrink-0 rounded-xl"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-700 text-3xl"
                        >
                          {game.emoji}
                        </span>
                      )}
                      <h2 className="font-display text-xl font-bold transition-colors group-hover:text-[var(--accent)]">
                        {game.title}
                      </h2>
                    </div>
                    <p className="mt-4 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {game.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {game.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="mt-5 border-t border-[var(--border-color)] pt-4 text-sm font-semibold text-[var(--accent)]">
                      Jouer →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </ThemeProvider>
  )
}
