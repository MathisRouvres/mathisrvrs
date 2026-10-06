import { useEffect } from 'react'

export function wakeLockSupported() {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/**
 * Empêche la mise en veille de l'écran tant que `active` est vrai. Le verrou est
 * relâché par le navigateur à chaque passage en arrière-plan : on le ré-acquiert
 * quand l'onglet redevient visible. Sans API (vieux navigateur), no-op silencieux.
 *
 * @param {boolean} active
 */
export function useScreenWakeLock(active) {
  useEffect(() => {
    if (!active || !wakeLockSupported()) return undefined
    let sentinel = null
    let released = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (released) {
          lock.release?.().catch(() => {})
          return
        }
        sentinel = lock
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
  }, [active])
}
