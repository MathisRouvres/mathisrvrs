import { useCallback, useEffect, useState } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import { PARTY_BASE_PATH, findGame } from './games'
import { usePartySettings } from './usePartySettings'
import PartyHub from './PartyHub'
import LevelPicker from './components/LevelPicker'
import PartyLink from './components/PartyLink'
import CardGame from './components/CardGame'
import TruthOrDare from './components/TruthOrDare'
import Impostor from './components/Impostor'
import TimedGame from './components/TimedGame'
import PetitBac from './components/PetitBac'
import Werewolf from './components/Werewolf'
import MixGame from './components/MixGame'
import KingsGame from './components/KingsGame'
import FiveSeconds from './components/FiveSeconds'
import YesNo from './components/YesNo'
import Quiz from './components/Quiz'
import Bottle from './components/Bottle'
import Bus from './components/Bus'

function cleanPath(pathname) {
  return pathname.replace(/\/+$/, '') || '/'
}

function slugOf(path) {
  return path.startsWith(`${PARTY_BASE_PATH}/`) ? path.slice(PARTY_BASE_PATH.length + 1) : undefined
}

function GameBody({ game, settings }) {
  const key = `${game.slug}-${settings.level}`
  const shared = { game, level: settings.level, players: settings.players, onPlayersChange: settings.setPlayers }

  switch (game.kind) {
    case 'truth-or-dare':
      return <TruthOrDare key={key} {...shared} />
    case 'impostor':
    case 'undercover':
      return <Impostor key={key} {...shared} />
    case 'mix':
      return <MixGame key={key} {...shared} />
    case 'werewolf':
      return <Werewolf key={game.slug} {...shared} />
    case 'timed':
      return <TimedGame key={key} game={game} level={settings.level} />
    case 'petit-bac':
      return <PetitBac key={key} game={game} level={settings.level} />
    case 'kings':
      return <KingsGame key={key} game={game} level={settings.level} />
    case 'five-seconds':
      return <FiveSeconds key={key} game={game} level={settings.level} />
    case 'yes-no':
      return <YesNo key={key} game={game} level={settings.level} />
    case 'quiz':
      return <Quiz key={key} game={game} level={settings.level} />
    case 'bottle':
      return <Bottle key={key} {...shared} />
    case 'bus':
      return <Bus key={key} {...shared} />
    default:
      return <CardGame key={key} game={game} level={settings.level} />
  }
}

/**
 * Jeux de soirée : `/games/soiree` (accueil) et `/games/soiree/<jeu>`.
 * Navigation interne par `history.pushState` pour garder un ressenti d'appli.
 */
export default function PartyApp({ initialPath }) {
  const [path, setPath] = useState(() => cleanPath(initialPath))
  const settings = usePartySettings()
  const game = findGame(slugOf(path))

  const navigate = useCallback((to) => {
    window.history.pushState(null, '', to)
    setPath(cleanPath(to))
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const onPop = () => setPath(cleanPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Jeu inconnu : l'accueil s'affiche, on aligne seulement l'URL.
  useEffect(() => {
    if (!game && path !== PARTY_BASE_PATH) {
      window.history.replaceState(null, '', PARTY_BASE_PATH)
    }
  }, [game, path])

  useEffect(() => {
    const previousTitle = document.title
    document.title = game ? `${game.title} | Jeux de soirée` : 'Jeux de soirée | Mathis Rouvres'
    return () => {
      document.title = previousTitle
    }
  }, [game])

  const backClass =
    'shrink-0 whitespace-nowrap rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]'

  return (
    <ThemeProvider>
      <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <header className="sticky top-0 z-10 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/85 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold tracking-tight">
                {game ? (
                  <>
                    <span aria-hidden="true">{game.emoji} </span>
                    {game.title}
                  </>
                ) : (
                  'Jeux de soirée'
                )}
              </h1>
              {!game && <p className="text-xs text-[var(--text-secondary)]">Un téléphone, tout le groupe</p>}
            </div>
            {game ? (
              <PartyLink href={PARTY_BASE_PATH} navigate={navigate} className={backClass}>
                ← Soirée
              </PartyLink>
            ) : (
              <a href="/games" className={backClass}>
                ← Jeux
              </a>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-xl px-4 pb-10 pt-6">
          {game ? (
            <div className="flex flex-col gap-5">
              {!game.noLevels && (
                <LevelPicker
                  level={settings.level}
                  adult={settings.adult}
                  onChange={settings.setLevel}
                  onConfirmAdult={settings.confirmAdult}
                />
              )}
              <details className="glass-card group rounded-2xl px-4 py-3">
                <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between">
                    Règles
                    <span
                      aria-hidden="true"
                      className="inline-block text-[var(--text-muted)] transition group-open:rotate-180"
                    >
                      ▾
                    </span>
                  </span>
                </summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                  {game.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ol>
              </details>
              <GameBody game={game} settings={settings} />
            </div>
          ) : (
            <PartyHub settings={settings} navigate={navigate} />
          )}
        </main>
      </div>
    </ThemeProvider>
  )
}
