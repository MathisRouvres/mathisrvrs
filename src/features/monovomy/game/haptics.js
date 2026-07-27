/**
 * Retour haptique (navigator.vibrate) — désactivable, persistant.
 * No-op silencieux si l'API n'existe pas (desktop, iOS Safari). Miroir de `sound`.
 */
let enabled = true
try { enabled = localStorage.getItem('mv_haptics') !== '0' } catch { /* ignore */ }

function supported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

// Motifs courts (ms). Volontairement discrets — un jeu de soirée, pas une alarme.
const PATTERNS = {
  roll: 12,
  buy: [14, 40, 22],
  pay: 26,
  timer: [30, 60, 30],
  event: [18, 40, 60],
  win: [24, 50, 24, 50, 40],
}

export const haptics = {
  isSupported: supported,
  isEnabled: () => enabled,
  setEnabled(value) {
    enabled = Boolean(value)
    try { localStorage.setItem('mv_haptics', enabled ? '1' : '0') } catch { /* ignore */ }
  },
  /** Déclenche un motif nommé. Retourne false si non joué. */
  vibrate(name) {
    if (!enabled || !supported()) return false
    const pattern = PATTERNS[name]
    if (pattern == null) return false
    try { return navigator.vibrate(pattern) } catch { return false }
  },
}
