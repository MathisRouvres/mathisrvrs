import { useState } from 'react'
import { PARTY_BASE_PATH, PARTY_GAMES, findGame } from './games'
import { isLevel } from './engine'
import { clearGame, lastSession } from './session'
import { LEVEL_META } from './usePartySettings'
import LevelPicker from './components/LevelPicker'
import PartyLink from './components/PartyLink'
import { btnPrimary } from './components/buttons'

function ago(savedAt) {
  const minutes = Math.max(1, Math.round((Date.now() - savedAt) / 60000))
  return minutes < 60 ? `il y a ${minutes} min` : `il y a ${Math.floor(minutes / 60)} h`
}

/** Dernière partie de la session, à reprendre là où elle s'est arrêtée. */
function ResumeBanner({ settings, navigate }) {
  const [resume, setResume] = useState(() => {
    const session = lastSession()
    const game = session && findGame(session.slug)
    return game ? { ...session, game } : null
  })
  if (!resume) return null

  const { game, level, savedAt } = resume
  const levelMeta = isLevel(level) ? LEVEL_META[level] : null

  return (
    <section aria-label="Partie en cours" className="glass-card flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${game.gradient} text-2xl`}
        >
          {game.emoji}
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Partie en cours
          </span>
          <span className="block truncate font-display text-base font-bold">{game.title}</span>
          <span className="block text-[var(--text-secondary)]">
            {levelMeta ? `${levelMeta.label} · ` : ''}
            {ago(savedAt)}
          </span>
        </p>
        <button
          type="button"
          aria-label={`Abandonner la partie de ${game.title}`}
          onClick={() => {
            clearGame(game.slug)
            setResume(null)
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <PartyLink
        href={`${PARTY_BASE_PATH}/${game.slug}`}
        navigate={(to) => {
          // La partie est sauvegardée pour son niveau : on y revient.
          if (isLevel(level)) settings.setLevel(level)
          navigate(to)
        }}
        className={`${btnPrimary} w-full`}
      >
        Reprendre la partie
      </PartyLink>
    </section>
  )
}

/** Accueil des jeux de soirée : niveau commun et liste des jeux. */
export default function PartyHub({ settings, navigate }) {
  return (
    <div className="flex flex-col gap-8">
      <ResumeBanner settings={settings} navigate={navigate} />

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
