import { useCallback, useEffect, useState } from 'react'
import {
  isStandalone,
  isIos,
  installRecentlyDismissed,
  markInstallDismissed,
} from './pwaEnv'

/** Délai minimal avant d'oser proposer l'installation (jamais « dès la 1re seconde »). */
const REVEAL_DELAY_MS = 4000

/**
 * Invitation à l'installation, non intrusive.
 *
 * `mode` :
 *  - 'native' : Android/Chromium a fourni `beforeinstallprompt` → bouton Installer.
 *  - 'ios'    : iOS Safari (pas d'API) → instructions « Partager → Sur l'écran d'accueil ».
 *  - null     : rien à proposer (déjà installé, navigateur incompatible, refus récent).
 *
 * L'événement `beforeinstallprompt` est capturé très tôt dans main.jsx (il peut
 * précéder le montage React) puis relayé via `window.__mvDeferredInstallPrompt` et
 * l'événement custom `mv-beforeinstallprompt`.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(() => (typeof window !== 'undefined' ? window.__mvDeferredInstallPrompt || null : null))
  const [installed, setInstalled] = useState(() => isStandalone())
  const [revealed, setRevealed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onPrompt = (e) => setDeferred(e.detail || window.__mvDeferredInstallPrompt || null)
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
      window.__mvDeferredInstallPrompt = null
    }
    window.addEventListener('mv-beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    const t = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS)
    return () => {
      window.removeEventListener('mv-beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      clearTimeout(t)
    }
  }, [])

  const ios = isIos()
  const recentlyDismissed = installRecentlyDismissed()

  let mode = null
  if (!installed && !dismissed && !recentlyDismissed) {
    if (deferred) mode = 'native'
    else if (ios) mode = 'ios'
  }

  const shouldShow = revealed && mode !== null

  const promptInstall = useCallback(async () => {
    if (!deferred) return 'unavailable'
    deferred.prompt()
    const choice = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }))
    setDeferred(null)
    window.__mvDeferredInstallPrompt = null
    if (choice.outcome !== 'accepted') {
      markInstallDismissed()
      setDismissed(true)
    }
    return choice.outcome
  }, [deferred])

  const dismiss = useCallback(() => {
    markInstallDismissed()
    setDismissed(true)
  }, [])

  return { mode, shouldShow, installed, promptInstall, dismiss }
}
