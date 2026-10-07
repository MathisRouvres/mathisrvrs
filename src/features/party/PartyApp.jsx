import { useCallback, useEffect, useState } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock'
import { PARTY_BASE_PATH, findGame } from './games'
import { usePartySettings } from './usePartySettings'
import PartyHub from './PartyHub'
import GameLevelControl from './components/GameLevelControl'
import SessionScope from './components/SessionScope'
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
import HotPotato from './components/HotPotato'
import Dealer from './components/Dealer'
import Pyramid from './components/Pyramid'
import Wheel from './components/Wheel'
import GuessWho from './components/GuessWho'

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
    case 'hot-potato':
      return <HotPotato key={key} game={game} level={settings.level} />
    case 'wheel':
      return <Wheel key={key} game={game} level={settings.level} />
    case 'guess-who':
      return <GuessWho key={key} game={game} level={settings.level} />
    case 'dealer':
      return <Dealer key={key} {...shared} />
    case 'pyramid':
      return <Pyramid key={key} {...shared} />
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
  // Écran allumé pendant toute la partie (chrono, meneur du Loup-Garou…).
  useScreenWakeLock(Boolean(game))

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
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-pressed={settings.sound}
                  aria-label="Son des chronos"
                  title={settings.sound ? 'Son activé' : 'Son coupé'}
                  onClick={settings.toggleSound}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-color)] text-base transition hover:border-[var(--accent)]"
                >
                  <span aria-hidden="true">{settings.sound ? '🔊' : '🔇'}</span>
                </button>
                <PartyLink href={PARTY_BASE_PATH} navigate={navigate} className={backClass}>
                  ← Soirée
                </PartyLink>
              </div>
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
                <GameLevelControl
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
              {/* Sauvegarde de la partie, liée au niveau : en changer repart de zéro. */}
              <SessionScope slug={game.slug} level={game.noLevels ? 'all' : settings.level}>
                <GameBody game={game} settings={settings} />
              </SessionScope>
            </div>
          ) : (
            <PartyHub settings={settings} navigate={navigate} />
          )}
        </main>
      </div>
    </ThemeProvider>
  )
}
