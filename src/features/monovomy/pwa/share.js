import { buildInviteUrl } from './deepLink'

/**
 * Partage une invitation de partie via l'API Web Share native quand disponible,
 * sinon copie le lien dans le presse-papiers. Retourne le canal utilisé.
 * @returns {Promise<'shared'|'copied'|'unavailable'>}
 */
export async function shareInvite(code) {
  const url = buildInviteUrl(code)
  const payload = {
    title: 'MonoVomy',
    text: `Rejoins ma partie MonoVomy (code ${code}) 🍹`,
    url,
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      // Annulation utilisateur : ne pas retomber sur la copie.
      if (err && err.name === 'AbortError') return 'shared'
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return 'copied'
    } catch {
      /* ignore */
    }
  }

  return 'unavailable'
}
