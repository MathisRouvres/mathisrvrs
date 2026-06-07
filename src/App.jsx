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

export default function App() {
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
