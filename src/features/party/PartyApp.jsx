import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import { useScreenWakeLock } from '../../hooks/useScreenWakeLock'
import { PARTY_BASE_PATH, findGame } from './games'
import { isLevel } from './engine'
import { usePartySettings } from './usePartySettings'
import { LEVEL_KEY, ROUTE_KEY } from './room/doc'
import { RoomContext, defaultRoomTransport, useRoomSession, useRoomSnapshot, useRoomValue } from './room/hooks'
import RoomBar from './room/RoomBar'
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

/** Code reçu par le lien d'invitation (`?room=ABCD`). */
function inviteCode() {
  try {
    return new URLSearchParams(window.location.search).get('room') ?? ''
  } catch {
    return ''
  }
}

/**
 * Réglages communs, partagés dans une partie à plusieurs téléphones : niveau
 * et joueurs viennent alors de la partie. Le +18 reste confirmé sur chaque
 * téléphone qui choisit le niveau Hot.
 */
function useSharedSettings(settings, store, snapshot) {
  const roomLevel = useRoomValue(store, LEVEL_KEY)

  // Nouvelle partie : elle démarre au niveau choisi sur ce téléphone.
  useEffect(() => {
    store?.init(LEVEL_KEY, settings.level)
  }, [store, settings.level])

  return useMemo(() => {
    if (!store || !snapshot) return settings
    return {
      ...settings,
      level: isLevel(roomLevel) ? roomLevel : settings.level,
      players: snapshot.players,
      setPlayers: store.setPlayers,
      setLevel: (level) => {
        if (isLevel(level) && (level !== 'hot' || settings.adult)) store.set(LEVEL_KEY, level)
      },
      confirmAdult: () => {
        settings.confirmAdult()
        store.set(LEVEL_KEY, 'hot')
      },
    }
  }, [settings, store, snapshot, roomLevel])
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
export default function PartyApp({ initialPath, roomTransport = defaultRoomTransport, roomStorage }) {
  const [path, setPath] = useState(() => cleanPath(initialPath))
  const room = useRoomSession(roomTransport, roomStorage)
  const store = room.store
  const snapshot = useRoomSnapshot(store)
  const settings = useSharedSettings(usePartySettings(), store, snapshot)
  const [invite] = useState(inviteCode)

  // Partie à plusieurs : la page affichée est celle de la partie, pour tout le monde.
  const roomRoute = useRoomValue(store, ROUTE_KEY)
  const roomPath =
    store && typeof roomRoute === 'string' && (!roomRoute || findGame(roomRoute))
      ? roomRoute
        ? `${PARTY_BASE_PATH}/${roomRoute}`
        : PARTY_BASE_PATH
      : null
  const current = roomPath ?? path
  const game = findGame(slugOf(current))
  // Écran allumé pendant toute la partie (chrono, meneur du Loup-Garou…).
  useScreenWakeLock(Boolean(game))

  // Partie à plusieurs : changer de jeu (ou revenir à l'accueil) emmène tout le monde.
  const storeRef = useRef(store)
  useEffect(() => {
    storeRef.current = store
  }, [store])
  const shareRoute = useCallback((to) => {
    const slug = slugOf(cleanPath(to))
    storeRef.current?.set(ROUTE_KEY, findGame(slug) ? slug : '')
  }, [])

  const navigate = useCallback(
    (to) => {
      window.history.pushState(null, '', to)
      setPath(cleanPath(to))
      window.scrollTo(0, 0)
      shareRoute(to)
    },
    [shareRoute],
  )

  useEffect(() => {
    const onPop = () => {
      setPath(cleanPath(window.location.pathname))
      shareRoute(window.location.pathname)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [shareRoute])

  // Nouvelle partie : elle démarre sur la page de ce téléphone. Ensuite, un
  // changement venu d'un autre téléphone met l'adresse à jour ici.
  useEffect(() => {
    if (!store) return
    if (roomRoute === undefined) {
      const slug = slugOf(path)
      store.init(ROUTE_KEY, findGame(slug) ? slug : '')
    } else if (roomPath && window.location.pathname !== roomPath) {
      window.history.pushState(null, '', roomPath)
      window.scrollTo(0, 0)
    }
  }, [store, roomRoute, roomPath, path])

  // En quittant la partie, on reste sur la page où elle en était.
  const leaveRoom = useCallback(() => {
    setPath(cleanPath(window.location.pathname))
    room.leave()
  }, [room])

  // Une fois dans la partie, le code n'a plus rien à faire dans l'adresse.
  useEffect(() => {
    if (store && window.location.search.includes('room=')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [store])

  // Jeu inconnu : l'accueil s'affiche, on aligne seulement l'URL.
  useEffect(() => {
    if (!game && current !== PARTY_BASE_PATH) {
      window.history.replaceState(null, '', PARTY_BASE_PATH)
    }
  }, [game, current])

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
      <RoomContext.Provider value={store}>
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
                {!game && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    {store ? 'Chacun son téléphone' : 'Un téléphone, tout le groupe'}
                  </p>
                )}
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
            {store && snapshot && (
              <div className="mb-5">
                <RoomBar store={store} snapshot={snapshot} onLeave={leaveRoom} />
              </div>
            )}
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
              <PartyHub settings={settings} navigate={navigate} room={room} invite={invite} />
            )}
          </main>
        </div>
      </RoomContext.Provider>
    </ThemeProvider>
  )
}
