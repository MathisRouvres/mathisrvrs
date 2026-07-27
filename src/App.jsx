import { useEffect } from 'react'
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
import { CareerApp, DilemmaDevLab } from './features/career'
import { MonovomyApp } from './features/monovomy'
import { parseMonovomyRoute } from './features/monovomy/pwa/deepLink'
import { SpinApp } from './features/spin'

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

  if (path === '/spin') {
    return (
      <SpinRouteGate>
        <SpinApp />
      </SpinRouteGate>
    )
  }

  if (path === '/carriere/dev/events') {
    return (
      <CareerRouteGate>
        <DilemmaDevLab />
      </CareerRouteGate>
    )
  }

  if (path === '/carriere') {
    return (
      <CareerRouteGate>
        <CareerApp />
      </CareerRouteGate>
    )
  }

  const monovomyRoute = parseMonovomyRoute(path)
  if (monovomyRoute) {
    return (
      <MonovomyRouteGate>
        <MonovomyApp initialRoute={monovomyRoute} />
      </MonovomyRouteGate>
    )
  }

  return <PortfolioHome />
}
