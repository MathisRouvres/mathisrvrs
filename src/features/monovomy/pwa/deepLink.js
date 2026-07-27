import { MONOVOMY_SCOPE } from './pwaEnv'

/** Caractères autorisés dans un code de room (voir net : CODE_CHARS, majuscules). */
const CODE_RE = /[^A-Z0-9]/g

/** Normalise un code : majuscules, alphanumérique, tronqué à 8. */
export function sanitizeCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(CODE_RE, '')
    .slice(0, 8)
}

/**
 * Analyse une route MonoVomy.
 *  - `/monovomy/join/ABCD12` → { type: 'join', code: 'ABCD12' }
 *  - `/monovomy`             → { type: 'home' }
 * Retourne null hors scope MonoVomy.
 */
export function parseMonovomyRoute(pathname) {
  if (pathname !== MONOVOMY_SCOPE && !pathname.startsWith(`${MONOVOMY_SCOPE}/`)) return null

  const joinPrefix = `${MONOVOMY_SCOPE}/join/`
  if (pathname.startsWith(joinPrefix)) {
    const rawCode = decodeURIComponent(pathname.slice(joinPrefix.length).split('/')[0] || '')
    const code = sanitizeCode(rawCode)
    return { type: 'join', code }
  }
  return { type: 'home' }
}

/** URL d'invitation partageable vers une room. */
export function buildInviteUrl(code, origin) {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}${MONOVOMY_SCOPE}/join/${sanitizeCode(code)}`
}
