import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProMode from './components/ProMode'
import Projects from './components/Projects'
import SkillsGrid from './components/SkillsGrid'
import PersonalMode from './components/PersonalMode'
import Timeline from './components/Timeline'
import Contact from './components/Contact'
import Footer from './components/Footer'
import { ThemeProvider } from './context/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)]">
        <Navbar />
        <main>
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
