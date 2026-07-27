import { useEffect, useState, useCallback } from 'react'
import { WAKELOCK_CONSENT_KEY } from './pwaEnv'

const CONSENT_EVENT = 'mv-wakelock-change'

export function wakeLockSupported() {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

export function readWakeLockConsent() {
  try {
    return localStorage.getItem(WAKELOCK_CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

/** Bascule le consentement (empêcher la veille) et notifie les hooks actifs. */
export function setWakeLockConsent(on) {
  try {
    localStorage.setItem(WAKELOCK_CONSENT_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: on }))
  }
}

/** Hook de consentement réactif (pour le bouton de la barre). */
export function useWakeLockConsent() {
  const [consent, setConsent] = useState(readWakeLockConsent)
  useEffect(() => {
    const onChange = (e) => setConsent(Boolean(e.detail))
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])
  const toggle = useCallback(() => setWakeLockConsent(!readWakeLockConsent()), [])
  return { consent, supported: wakeLockSupported(), toggle }
}

/**
 * Maintient l'écran allumé pendant une partie — UNIQUEMENT si l'utilisateur a
 * donné son consentement (bouton de la barre). Ré-acquiert le verrou quand l'onglet
 * redevient visible (le verrou est relâché à chaque passage en arrière-plan).
 * Aucun fallback intrusif : si l'API n'existe pas, no-op silencieux.
 *
 * @param {boolean} active la partie est-elle en cours (écran de jeu monté) ?
 */
export function useWakeLock(active) {
  const [consent, setConsent] = useState(readWakeLockConsent)

  useEffect(() => {
    const onChange = (e) => setConsent(Boolean(e.detail))
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  useEffect(() => {
    if (!active || !consent || !wakeLockSupported()) return undefined
    let sentinel = null
    let released = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        sentinel.addEventListener?.('release', () => {
          sentinel = null
        })
      } catch {
        /* refus système / batterie faible : on abandonne sans bruit */
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinel && !released) acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (sentinel) {
        sentinel.release?.().catch(() => {})
        sentinel = null
      }
    }
  }, [active, consent])
}
