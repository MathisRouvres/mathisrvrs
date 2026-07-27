/*
 * Service Worker MonoVomy — isolé sous le scope `/monovomy`.
 *
 * Ne contrôle QUE les pages MonoVomy : le portfolio (`/`) n'est jamais transformé
 * en PWA. Aucune donnée réseau n'est simulée : les requêtes cross-origin (Supabase
 * Realtime, polices) passent directement, sans interception ni cache.
 *
 * Stratégies :
 *  - navigations : network-first → coquille applicative en cache → page offline ;
 *  - assets même origine (hashés donc immuables) : stale-while-revalidate ;
 *  - mise à jour contrôlée : le nouveau SW attend en `waiting` et n'active que sur
 *    message `SKIP_WAITING` (l'app décide QUAND, hors tour de jeu).
 */

const CACHE_VERSION = 'v1'
const SHELL_CACHE = `mv-shell-${CACHE_VERSION}`
const ASSET_CACHE = `mv-assets-${CACHE_VERSION}`
const SHELL_URL = '/monovomy'
const OFFLINE_URL = '/monovomy-offline.html'

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/monovomy.webmanifest',
  '/monovomy-icons/icon.svg',
  '/monovomy-icons/icon-192.png',
  '/monovomy-icons/icon-512.png',
  '/monovomy-icons/apple-touch-icon-180.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      await cache.addAll(PRECACHE_URLS)
      // Coquille applicative : capturée pendant que le réseau est encore là.
      try {
        const res = await fetch(SHELL_URL, { credentials: 'same-origin' })
        if (res && res.ok) await cache.put(SHELL_URL, res.clone())
      } catch {
        /* hors ligne au premier chargement : la coquille sera capturée plus tard */
      }
      // Ne pas activer d'office : on laisse l'app piloter la bascule (SKIP_WAITING).
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith('mv-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

function isNavigationRequest(request) {
  return request.mode === 'navigate'
}

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false
  return /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|gif|ico|json|webmanifest)$/i.test(url.pathname)
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const res = await fetch(request)
    if (res && res.ok) cache.put(SHELL_URL, res.clone())
    return res
  } catch {
    const cachedShell = (await cache.match(request)) || (await cache.match(SHELL_URL))
    if (cachedShell) return cachedShell
    const offline = await cache.match(OFFLINE_URL)
    return offline || Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => null)
  return cached || (await network) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Cross-origin (Supabase Realtime/WebSocket, polices Google) : jamais intercepté.
  if (url.origin !== self.location.origin) return

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isCacheableAsset(url)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data) return
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (data.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: CACHE_VERSION })
  }
})
