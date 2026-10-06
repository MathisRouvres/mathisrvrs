import { PARTY_BASE_PATH, PARTY_GAMES } from './games'
import LevelPicker from './components/LevelPicker'
import PartyLink from './components/PartyLink'

/** Accueil des jeux de soirée : niveau commun et liste des jeux. */
export default function PartyHub({ settings, navigate }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="party-level-title">
        <h2 id="party-level-title" className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Niveau
        </h2>
        <LevelPicker
          level={settings.level}
          adult={settings.adult}
          onChange={settings.setLevel}
          onConfirmAdult={settings.confirmAdult}
        />
      </section>

      <section aria-labelledby="party-games-title">
        <h2 id="party-games-title" className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {PARTY_GAMES.length} jeux · du plus joué au moins joué
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {PARTY_GAMES.map((game, index) => (
            <li key={game.slug}>
              <PartyLink
                href={`${PARTY_BASE_PATH}/${game.slug}`}
                navigate={navigate}
                className="group glass-card flex h-full items-center gap-4 rounded-3xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-xl"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${game.gradient} text-3xl shadow-md`}
                >
                  {game.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-bold leading-tight transition-colors group-hover:text-[var(--accent)]">
                    {game.title}
                  </span>
                  <span className="mt-1 block text-sm text-[var(--text-secondary)]">{game.tagline}</span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--accent)]">n° {index + 1}</span> · {game.minPlayers}+ joueurs
                  </span>
                </span>
              </PartyLink>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Classement estimé d’après la popularité de ces jeux en soirée.
        </p>
      </section>

      <p className="text-center text-xs text-[var(--text-muted)]">
        Un seul téléphone pour tout le groupe. Chacun peut passer son tour.
        <br />
        L’abus d’alcool est dangereux pour la santé, à consommer avec modération.
      </p>
    </div>
  )
}
