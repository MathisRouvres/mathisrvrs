import { useInstallPrompt } from '../pwa/useInstallPrompt'

/**
 * Invitation d'installation non intrusive. Masquée automatiquement :
 *  - pendant les premières secondes (jamais « dès la 1re seconde ») ;
 *  - si l'app est déjà installée ;
 *  - si le navigateur ne le permet pas (ni beforeinstallprompt ni iOS) ;
 *  - si l'utilisateur l'a refusée récemment (cooldown 7 jours).
 */
export default function MvInstallBanner() {
  const { mode, shouldShow, promptInstall, dismiss } = useInstallPrompt()

  if (!shouldShow) return null

  return (
    <div className="mv-install" role="region" aria-label="Installer MonoVomy">
      <div className="mv-install__icon" aria-hidden="true">
        <img src="/monovomy-icons/icon.svg" alt="" width="40" height="40" />
      </div>
      <div className="mv-install__body">
        <p className="mv-install__title">Installer MonoVomy</p>
        <p className="mv-install__desc">
          {mode === 'ios'
            ? 'Appuie sur Partager puis « Sur l’écran d’accueil » pour jouer en plein écran.'
            : 'Jouer en plein écran et rejoindre plus vite tes parties.'}
        </p>
      </div>
      <div className="mv-install__actions">
        {mode === 'native' && (
          <button type="button" className="mv-install__cta" onClick={promptInstall}>
            Installer
          </button>
        )}
        <button type="button" className="mv-install__close" onClick={dismiss} aria-label="Ne plus proposer">
          ✕
        </button>
      </div>
    </div>
  )
}
