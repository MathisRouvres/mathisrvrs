import { useCallback, useEffect, useRef, useState } from 'react'
import { SW_URL, MONOVOMY_SCOPE } from './pwaEnv'

/**
 * Enregistre le service worker MonoVomy (scope `/monovomy`) et pilote les mises à
 * jour SANS jamais recharger en plein tour : le nouveau SW reste en `waiting`, on
 * expose `updateAvailable`. C'est l'app (bouton / fin de partie) qui déclenche
 * `applyUpdate`. Le portfolio n'est jamais enregistré (garde d'appel côté shell).
 */
export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const regRef = useRef(null)
  const waitingRef = useRef(null)
  const refreshingRef = useRef(false)
  const wantReloadRef = useRef(false)

  const trackWaiting = useCallback((worker) => {
    if (!worker) return
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      waitingRef.current = worker
      setUpdateAvailable(true)
      return
    }
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        waitingRef.current = worker
        setUpdateAvailable(true)
      }
    })
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined
    let cancelled = false

    navigator.serviceWorker
      .register(SW_URL, { scope: MONOVOMY_SCOPE })
      .then((reg) => {
        if (cancelled) return
        regRef.current = reg
        if (reg.waiting && navigator.serviceWorker.controller) {
          waitingRef.current = reg.waiting
          setUpdateAvailable(true)
        }
        reg.addEventListener('updatefound', () => trackWaiting(reg.installing))
        // Vérifie une mise à jour au démarrage (le SW est servi no-cache).
        reg.update?.().catch(() => {})
      })
      .catch(() => {
        /* enregistrement impossible : l'app fonctionne sans PWA */
      })

    // Recharge une seule fois — et UNIQUEMENT après une mise à jour appliquée par
    // l'utilisateur (pas sur le premier `clients.claim()` d'installation).
    const onControllerChange = () => {
      if (!wantReloadRef.current || refreshingRef.current) return
      refreshingRef.current = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [trackWaiting])

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  /** Applique la mise à jour en attente (déclenche skipWaiting → reload via controllerchange). */
  const applyUpdate = useCallback(() => {
    wantReloadRef.current = true
    const waiting = waitingRef.current || regRef.current?.waiting
    if (!waiting) {
      window.location.reload()
      return
    }
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }, [])

  return { updateAvailable, online, applyUpdate }
}
