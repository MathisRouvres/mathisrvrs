import { MANIFEST_URL } from './pwaEnv'

/**
 * Bascule le « chrome » PWA du document vers MonoVomy le temps que le module est
 * monté, puis restaure exactement l'état portfolio au démontage.
 *
 * Isolation clé : le portfolio garde son manifest (`/manifest.webmanifest`). Le
 * navigateur ne propose l'installation de MonoVomy que pendant que CE manifest est
 * actif — donc uniquement sur les routes `/monovomy`. Rien n'est forcé ailleurs.
 *
 * @returns {() => void} fonction de restauration
 */
export function applyMonovomyPwaChrome() {
  if (typeof document === 'undefined') return () => {}

  const head = document.head
  const restorers = []

  // 1) Manifest → MonoVomy (mémorise l'href portfolio).
  let manifestLink = head.querySelector('link[rel="manifest"]')
  if (manifestLink) {
    const prev = manifestLink.getAttribute('href')
    manifestLink.setAttribute('href', MANIFEST_URL)
    restorers.push(() => manifestLink.setAttribute('href', prev))
  } else {
    manifestLink = document.createElement('link')
    manifestLink.rel = 'manifest'
    manifestLink.href = MANIFEST_URL
    head.appendChild(manifestLink)
    restorers.push(() => manifestLink.remove())
  }

  // 2) viewport-fit=cover pour gérer les encoches (safe areas iOS/Android).
  const viewport = head.querySelector('meta[name="viewport"]')
  if (viewport) {
    const prev = viewport.getAttribute('content')
    if (!/viewport-fit/.test(prev || '')) {
      viewport.setAttribute('content', `${prev}, viewport-fit=cover`)
      restorers.push(() => viewport.setAttribute('content', prev))
    }
  }

  // 3) Métadonnées ajoutées (retirées à la restauration).
  const added = []
  const addMeta = (attrs) => {
    const el = document.createElement('meta')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    head.appendChild(el)
    added.push(el)
  }
  // theme-color sans media → toujours prioritaire pendant MonoVomy (barre sombre).
  addMeta({ name: 'theme-color', content: '#0a0613' })
  addMeta({ name: 'apple-mobile-web-app-capable', content: 'yes' })
  addMeta({ name: 'mobile-web-app-capable', content: 'yes' })
  addMeta({ name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' })
  addMeta({ name: 'apple-mobile-web-app-title', content: 'MonoVomy' })
  addMeta({ name: 'application-name', content: 'MonoVomy' })

  // 4) apple-touch-icon MonoVomy (mémorise l'icône portfolio).
  const appleIcon = head.querySelector('link[rel="apple-touch-icon"]')
  const iconHref = '/monovomy-icons/apple-touch-icon-180.png'
  if (appleIcon) {
    const prev = appleIcon.getAttribute('href')
    appleIcon.setAttribute('href', iconHref)
    restorers.push(() => appleIcon.setAttribute('href', prev))
  } else {
    const link = document.createElement('link')
    link.rel = 'apple-touch-icon'
    link.href = iconHref
    head.appendChild(link)
    added.push(link)
  }

  return () => {
    for (const el of added) el.remove()
    for (const restore of restorers) restore()
  }
}
