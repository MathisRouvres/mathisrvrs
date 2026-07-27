import { useEffect, useState } from 'react'
import './styles/monovomy-theme.css'
import MvModal from './components/MvModal'
import MvRules from './components/MvRules'
import MvLegal from './components/MvLegal'
import MvInstallBanner from './components/MvInstallBanner'
import MvUpdateToast from './components/MvUpdateToast'
import { sound } from './game/sound'
import { haptics } from './game/haptics'
import { applyMonovomyPwaChrome } from './pwa/pwaChrome'
import { useServiceWorker } from './pwa/useServiceWorker'
import { useWakeLockConsent } from './pwa/useWakeLock'
import { GameActivityProvider } from './pwa/gameActivity'
import { usePlaying } from './pwa/useGameActivity'

function ShellInner({ children, title }) {
  useEffect(() => {
    const previousTitle = document.title
    const previousStyle = document.documentElement.getAttribute('style')
    document.title = `${title} | MonoVomy`
    document.documentElement.style.colorScheme = 'dark'
    const restoreChrome = applyMonovomyPwaChrome()
    return () => {
      document.title = previousTitle
      if (previousStyle != null) {
        document.documentElement.setAttribute('style', previousStyle)
      } else {
        document.documentElement.style.removeProperty('color-scheme')
      }
      restoreChrome()
    }
  }, [title])

  const [modal, setModal] = useState(null)
  const [muted, setMuted] = useState(() => sound.isMuted())
  const [haptic, setHaptic] = useState(() => haptics.isEnabled())
  const { updateAvailable, applyUpdate } = useServiceWorker()
  const wakeLock = useWakeLockConsent()
  const playing = usePlaying()

  const toggleMute = () => {
    const next = !muted
    sound.setMuted(next)
    setMuted(next)
  }

  const toggleHaptic = () => {
    const next = !haptic
    haptics.setEnabled(next)
    setHaptic(next)
    if (next) haptics.vibrate('roll')
  }

  return (
    <div className="mv-root">
      <a href="#mv-main" className="mv-skip">
        Aller au contenu principal
      </a>

      <header className="mv-topbar">
        <div className="mv-topbar__inner">
          <a href="/" className="mv-brand" aria-label="Retour au portfolio">
            <span className="mv-brand__mark">
              <span className="mv-mono">Mono</span>
              <span className="mv-vomy">Vomy</span>
            </span>
            <span className="mv-brand__tag">Le Monopoly à boire</span>
          </a>
          <div className="mv-topbar__actions">
            <button type="button" className="mv-iconbtn" onClick={() => setModal('rules')}>
              Comment jouer
            </button>
            <button type="button" className="mv-iconbtn" onClick={() => setModal('legal')}>
              Mentions
            </button>
            {wakeLock.supported && (
              <button
                type="button"
                className="mv-iconbtn"
                onClick={wakeLock.toggle}
                aria-pressed={wakeLock.consent}
                aria-label="Garder l’écran allumé pendant la partie"
                title="Garder l’écran allumé pendant la partie"
              >
                {wakeLock.consent ? '🔆' : '🌙'}
              </button>
            )}
            <button type="button" className="mv-iconbtn" onClick={toggleMute} aria-label="Activer/couper le son">
              {muted ? '🔇' : '🔊'}
            </button>
            {haptics.isSupported() && (
              <button
                type="button"
                className="mv-iconbtn"
                onClick={toggleHaptic}
                aria-pressed={haptic}
                aria-label="Activer/couper les vibrations"
                title="Vibrations"
              >
                {haptic ? '📳' : '🔕'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="mv-main" className="mv-shell">
        {children}
      </main>

      <footer className="mv-modfooter">
        🍹 L’abus d’alcool est dangereux pour la santé. À consommer avec modération. +18
      </footer>

      <MvInstallBanner />
      <MvUpdateToast available={updateAvailable} playing={playing} onApply={applyUpdate} />

      {modal === 'rules' && (
        <MvModal title="Comment jouer" onClose={() => setModal(null)}>
          <MvRules />
        </MvModal>
      )}
      {modal === 'legal' && (
        <MvModal title="Mentions légales & confidentialité" onClose={() => setModal(null)}>
          <MvLegal />
        </MvModal>
      )}
    </div>
  )
}

export default function MonovomyShell({ children, title }) {
  return (
    <GameActivityProvider>
      <ShellInner title={title}>{children}</ShellInner>
    </GameActivityProvider>
  )
}

export function MonovomyButton({ children, variant = 'primary', type = 'button', className = '', ...props }) {
  const variantClass =
    variant === 'secondary'
      ? 'mv-btn--secondary'
      : variant === 'ghost'
        ? 'mv-btn--ghost'
        : 'mv-btn--primary'

  return (
    <button type={type} className={`mv-btn ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
