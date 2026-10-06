import { lazy, useEffect } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProMode from './components/ProMode'
import Projects from './components/Projects'
import SkillsGrid from './components/SkillsGrid'
import PersonalMode from './components/PersonalMode'
import Timeline from './components/Timeline'
import Contact from './components/Contact'
import Footer from './components/Footer'
import SeoJsonLd from './components/SeoJsonLd'
import { ThemeProvider } from './context/ThemeProvider'
import { CAREER_GAME_ENABLED, MONOVOMY_ENABLED, SPIN_ENABLED } from './config/features'
import { parseMonovomyRoute } from './features/monovomy/pwa/deepLink'
import { PARTY_BASE_PATH } from './features/party/paths'
import LazyRoute from './components/LazyRoute'

// Sections chargées à la demande : le portfolio ne télécharge ni les jeux, ni
// leurs milliers de cartes, ni la 3D tant qu'on n'ouvre pas la page concernée.
const named = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })))
const CareerApp = named(() => import('./features/career'), 'CareerApp')
const DilemmaDevLab = named(() => import('./features/career'), 'DilemmaDevLab')
const MonovomyApp = named(() => import('./features/monovomy'), 'MonovomyApp')
const SpinApp = named(() => import('./features/spin'), 'SpinApp')
const GamesHub = named(() => import('./features/games'), 'GamesHub')
const PartyApp = named(() => import('./features/party'), 'PartyApp')

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/'
  const cleaned = pathname.replace(/\/+$/, '') || '/'
  try {
    const decoded = decodeURIComponent(cleaned)
    if (decoded === '/carrière') return '/carriere'
    if (decoded.startsWith('/carrière/')) {
      return decoded.replace(/^\/carrière/, '/carriere')
    }
  } catch {
    // ignore malformed URI
  }
  return cleaned
}

function PortfolioHome() {
  return (
    <ThemeProvider>
      <SeoJsonLd />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[var(--bg-elevated)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--accent)] focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent)]"
      >
        Aller au contenu principal
      </a>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-[var(--theme-duration)] ease-[cubic-bezier(0.65,0,0.35,1)]">
        <Navbar />
        <main id="main-content">
          <Hero />
          <ProMode />
          <Projects />
          <SkillsGrid />
          <PersonalMode />
          <Timeline />
          <Contact />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}

function CareerRouteGate({ children }) {
  useEffect(() => {
    if (!CAREER_GAME_ENABLED) {
      window.location.replace('/')
    }
  }, [])

  if (!CAREER_GAME_ENABLED) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-primary)] px-4 text-[var(--text-secondary)]">
        <p role="status">Redirection vers le portfolio…</p>
      </div>
    )
  }

  return children
}

function MonovomyRouteGate({ children }) {
  useEffect(() => {
    if (!MONOVOMY_ENABLED) {
      window.location.replace('/')
    }
  }, [])

  if (!MONOVOMY_ENABLED) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-primary)] px-4 text-[var(--text-secondary)]">
        <p role="status">Redirection vers le portfolio…</p>
      </div>
    )
  }

  return children
}

function SpinRouteGate({ children }) {
  useEffect(() => {
    if (!SPIN_ENABLED) {
      window.location.replace('/')
    }
  }, [])

  if (!SPIN_ENABLED) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-primary)] px-4 text-[var(--text-secondary)]">
        <p role="status">Redirection vers le portfolio…</p>
      </div>
    )
  }

  return children
}

export default function App() {
  const path = normalizePathname(window.location.pathname)

  if (path === '/games') {
    return (
      <LazyRoute>
        <GamesHub />
      </LazyRoute>
    )
  }

  if (path === PARTY_BASE_PATH || path.startsWith(`${PARTY_BASE_PATH}/`)) {
    return (
      <LazyRoute>
        <PartyApp initialPath={path} />
      </LazyRoute>
    )
  }

  if (path === '/spin') {
    return (
      <SpinRouteGate>
        <LazyRoute>
          <SpinApp />
        </LazyRoute>
      </SpinRouteGate>
    )
  }

  if (path === '/carriere/dev/events') {
    return (
      <CareerRouteGate>
        <LazyRoute>
          <DilemmaDevLab />
        </LazyRoute>
      </CareerRouteGate>
    )
  }

  if (path === '/carriere') {
    return (
      <CareerRouteGate>
        <LazyRoute>
          <CareerApp />
        </LazyRoute>
      </CareerRouteGate>
    )
  }

  const monovomyRoute = parseMonovomyRoute(path)
  if (monovomyRoute) {
    return (
      <MonovomyRouteGate>
        <LazyRoute>
          <MonovomyApp initialRoute={monovomyRoute} />
        </LazyRoute>
      </MonovomyRouteGate>
    )
  }

  return <PortfolioHome />
}
