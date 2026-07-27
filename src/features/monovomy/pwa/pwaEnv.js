/**
 * Détection d'environnement PWA MonoVomy — pur, sans effet de bord.
 * Toutes les fonctions sont sûres côté SSR / tests (garde `typeof window`).
 */

export const MONOVOMY_SCOPE = '/monovomy'
export const SW_URL = '/monovomy-sw.js'
export const MANIFEST_URL = '/monovomy.webmanifest'
export const INSTALL_DISMISS_KEY = 'mv_install_dismissed_at'
export const LAST_PROFILE_KEY = 'mv_last_profile'
export const WAKELOCK_CONSENT_KEY = 'mv_wakelock'

/** Cooldown avant de reproposer l'installation après un refus (7 jours). */
export const INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/** L'app tourne-t-elle en mode installé (standalone) ? */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  const mm = window.matchMedia
  const standalone =
    (mm && (mm('(display-mode: standalone)').matches || mm('(display-mode: minimal-ui)').matches)) ||
    // iOS Safari : propriété non standard
    window.navigator.standalone === true
  return Boolean(standalone)
}

/** iOS (Safari/WebKit) — pas d'événement beforeinstallprompt : install manuelle. */
export function isIos() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOSDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ se présente comme un Mac : détecte via le tactile.
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1
  return iOSDevice || iPadOS
}

/** Sommes-nous sur une route MonoVomy (le SW/manifest ne doivent vivre qu'ici) ? */
export function isMonovomyPath(pathname) {
  const p = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  return p === MONOVOMY_SCOPE || p.startsWith(`${MONOVOMY_SCOPE}/`)
}

/** L'invitation à installer a-t-elle été refusée récemment ? */
export function installRecentlyDismissed(now = Date.now()) {
  if (typeof localStorage === 'undefined') return false
  try {
    const raw = localStorage.getItem(INSTALL_DISMISS_KEY)
    if (!raw) return false
    const at = Number(raw)
    if (!Number.isFinite(at)) return false
    return now - at < INSTALL_DISMISS_COOLDOWN_MS
  } catch {
    return false
  }
}

export function markInstallDismissed(now = Date.now()) {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(now))
  } catch {
    /* ignore */
  }
}

export function clearInstallDismissed() {
  try {
    localStorage.removeItem(INSTALL_DISMISS_KEY)
  } catch {
    /* ignore */
  }
}

/** Dernier profil utilisé (pseudo + mode) pour préremplir un deep link de join. */
export function readLastProfile() {
  try {
    const raw = localStorage.getItem(LAST_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveLastProfile(profile) {
  try {
    localStorage.setItem(LAST_PROFILE_KEY, JSON.stringify({ name: profile.name || '', drinkMode: profile.drinkMode || 'alcohol' }))
  } catch {
    /* ignore */
  }
}
