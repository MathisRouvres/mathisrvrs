import { useEffect, useState } from 'react'
import MonovomyShell from './MonovomyShell'
import MvHome from './components/MvHome'
import MvAgeGate from './components/MvAgeGate'
import LocalApp from './components/LocalApp'
import OnlineApp from './components/OnlineApp'
import { MONOVOMY_SCOPE } from './pwa/pwaEnv'

function ageConfirmed() {
  try { return localStorage.getItem('mv_age_ok') === '1' } catch { return false }
}

/** Mode initial déduit des raccourcis PWA (`?mode=local|online`). */
function modeFromQuery() {
  try {
    const q = new URLSearchParams(window.location.search).get('mode')
    return q === 'local' || q === 'online' ? q : null
  } catch {
    return null
  }
}

/**
 * @param {{ initialRoute?: { type: 'join'|'home', code?: string } }} props
 */
export default function MonovomyApp({ initialRoute }) {
  const [ageOk, setAgeOk] = useState(ageConfirmed)
  const joinCode = initialRoute?.type === 'join' ? initialRoute.code || '' : ''
  const [pendingJoin, setPendingJoin] = useState(joinCode)
  const [mode, setMode] = useState(() => (joinCode ? 'online' : modeFromQuery()))

  // Nettoie l'URL (deep link / raccourci consommé) → refresh & start_url propres.
  useEffect(() => {
    if (joinCode || window.location.search) {
      try {
        window.history.replaceState(null, '', MONOVOMY_SCOPE)
      } catch { /* ignore */ }
    }
  }, [joinCode])

  // Note : le deep link fixe déjà `mode = 'online'` à l'initialisation, même avant
  // la confirmation d'âge — inutile de le rebasculer via un effet.

  // Retour arrière Android : revenir au menu au lieu de quitter le site.
  useEffect(() => {
    const onPop = () => {
      setMode((current) => (current !== null ? null : current))
      setPendingJoin('')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const confirmAge = () => {
    try { localStorage.setItem('mv_age_ok', '1') } catch { /* ignore */ }
    setAgeOk(true)
  }

  const pickMode = (next) => {
    if (next && mode === null) {
      try { window.history.pushState({ mvMode: next }, '', MONOVOMY_SCOPE) } catch { /* ignore */ }
    }
    setMode(next)
  }

  const exitToHome = () => {
    setPendingJoin('')
    if (mode !== null) {
      // Consomme l'entrée d'historique poussée à l'entrée du mode.
      try { window.history.back() } catch { setMode(null) }
    }
    setMode(null)
  }

  return (
    <MonovomyShell title="MonoVomy">
      {!ageOk && <MvAgeGate onConfirm={confirmAge} />}
      {ageOk && mode === null && <MvHome onPick={pickMode} />}
      {ageOk && mode === 'local' && <LocalApp onExit={exitToHome} />}
      {ageOk && mode === 'online' && (
        <OnlineApp onExit={exitToHome} initialJoinCode={pendingJoin} />
      )}
    </MonovomyShell>
  )
}
