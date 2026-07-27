import { useMemo } from 'react'

/**
 * Profil appareil (Phase mobile) : détecte téléphone + faible perf pour dégrader
 * le rendu 3D (reflets, bloom, ombres, dpr) et adapter la caméra. Évalué une fois.
 */
export function useDeviceProfile() {
  return useMemo(() => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return { isMobile: false, lowPerf: false }
    }
    const ua = navigator.userAgent || ''
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    const narrow = window.matchMedia?.('(max-width: 820px)').matches
    const isMobile = Boolean(narrow || (coarse && /Mobi|Android|iPhone|iPad|iPod/i.test(ua)))
    const mem = navigator.deviceMemory ?? 8
    const cores = navigator.hardwareConcurrency ?? 8
    const lowPerf = isMobile || mem <= 4 || cores <= 4
    return { isMobile, lowPerf }
  }, [])
}
