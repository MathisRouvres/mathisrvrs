import { classifyPath, type PageInfo } from './classify'

/**
 * Collecte anonyme de l'usage du site, lue par le dashboard `/stats`.
 *
 * - Un id visiteur aléatoire (localStorage) et un id de session (30 min
 *   d'inactivité) ; ni IP, ni cookie, ni query string.
 * - `page_view` à chaque page, `page_time` = temps passé page visible.
 * - Événements groupés et envoyés à la table Supabase `site_events` (insertion
 *   seule, voir docs/analytics/supabase-schema.sql), sans charger supabase-js.
 */

export type TrackedEvent = 'game_start' | 'room_create' | 'room_join'
type EventName = 'page_view' | 'page_time' | TrackedEvent
export type Device = 'mobile' | 'tablet' | 'desktop'

export interface EventRow {
  event: EventName
  visitor_id: string
  session_id: string
  path: string
  section: string
  game: string | null
  duration_ms: number | null
  referrer: string | null
  device: Device
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

export interface TrackerDeps {
  send(rows: EventRow[], keepalive: boolean): void
  now(): number
  isVisible(): boolean
  storage: KeyValueStore | null
  device: Device
  /** Site d'où vient le visiteur (hors ce site), joint à la première page vue. */
  referrer: string | null
  randomId(): string
  schedule(fn: () => void, ms: number): void
}

const VISITOR_KEY = 'mr-analytics-visitor'
const SESSION_KEY = 'mr-analytics-session'
const OPT_OUT_KEY = 'mr-analytics-optout'
const SESSION_IDLE_MS = 30 * 60_000
const MIN_TIME_MS = 1_000
const MAX_TIME_MS = 4 * 3_600_000
const FLUSH_DELAY_MS = 4_000
const MAX_BATCH = 50

function read(storage: KeyValueStore | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function write(storage: KeyValueStore | null, key: string, value: string) {
  try {
    storage?.setItem(key, value)
  } catch {
    // stockage indisponible (navigation privée) : ids valables pour cette page seulement
  }
}

export function createTracker(deps: TrackerDeps) {
  const queue: EventRow[] = []
  let flushPending = false
  let page: PageInfo | null = null
  let visibleSince: number | null = null
  let accumulated = 0
  let referrer = deps.referrer

  let visitorId = read(deps.storage, VISITOR_KEY) ?? ''
  if (visitorId.length < 8 || visitorId.length > 64) {
    visitorId = deps.randomId()
    write(deps.storage, VISITOR_KEY, visitorId)
  }

  let session: { id: string; last: number } | null = null
  try {
    session = JSON.parse(read(deps.storage, SESSION_KEY) ?? 'null')
  } catch {
    session = null
  }

  const sessionExpired = () =>
    !session || typeof session.id !== 'string' || !(deps.now() - session.last <= SESSION_IDLE_MS)

  function touchSession(): string {
    const current = session && !sessionExpired() ? session : { id: deps.randomId(), last: 0 }
    current.last = deps.now()
    session = current
    write(deps.storage, SESSION_KEY, JSON.stringify(current))
    return current.id
  }

  function flush(keepalive = false) {
    flushPending = false
    while (queue.length) deps.send(queue.splice(0, MAX_BATCH), keepalive)
  }

  function push(event: EventName, info: PageInfo, extra: Partial<EventRow> = {}) {
    if (read(deps.storage, OPT_OUT_KEY) === '1') return
    queue.push({
      event,
      visitor_id: visitorId,
      session_id: touchSession(),
      path: info.path,
      section: info.section,
      game: info.game,
      duration_ms: null,
      referrer: null,
      device: deps.device,
      ...extra,
    })
    if (!flushPending) {
      flushPending = true
      deps.schedule(() => {
        if (flushPending) flush()
      }, FLUSH_DELAY_MS)
    }
  }

  function pageView() {
    if (!page) return
    push('page_view', page, { referrer })
    referrer = null
  }

  /** Clôt le temps passé sur la page courante (envoyé s'il dépasse 1 s). */
  function closeTime() {
    if (page && visibleSince !== null) accumulated += deps.now() - visibleSince
    visibleSince = page && deps.isVisible() ? deps.now() : null
    if (page && accumulated >= MIN_TIME_MS) {
      push('page_time', page, { duration_ms: Math.round(Math.min(accumulated, MAX_TIME_MS)) })
    }
    accumulated = 0
  }

  return {
    /** Nouvelle adresse : compte la page si elle change vraiment. */
    navigate(pathname: string) {
      const next = classifyPath(pathname)
      if ((next?.path ?? null) === (page?.path ?? null)) return
      closeTime()
      page = next
      visibleSince = page && deps.isVisible() ? deps.now() : null
      pageView()
    },

    /** Onglet masqué ou page quittée : on envoie tout de suite. */
    hide() {
      closeTime()
      visibleSince = null
      flush(true)
    },

    /** Retour sur l'onglet ; après 30 min d'absence, c'est une nouvelle session. */
    show() {
      if (page && sessionExpired()) pageView()
      visibleSince = page ? deps.now() : null
    },

    /** Action dans un jeu (lancement, partie à plusieurs créée ou rejointe). */
    track(event: TrackedEvent, game: string) {
      const info = page ?? classifyPath('/')
      if (info) push(event, { ...info, game })
    },

    flush,
  }
}

type Tracker = ReturnType<typeof createTracker>
let active: Tracker | null = null

/** Événement de jeu ; sans effet tant que la collecte n'est pas active (tests, dev). */
export function track(event: TrackedEvent, game: string) {
  active?.track(event, game)
}

export function isAnalyticsOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === '1'
  } catch {
    return false
  }
}

/** Exclut (ou réintègre) ce navigateur des statistiques. */
export function setAnalyticsOptOut(optOut: boolean) {
  try {
    if (optOut) localStorage.setItem(OPT_OUT_KEY, '1')
    else localStorage.removeItem(OPT_OUT_KEY)
  } catch {
    // stockage indisponible : rien à retenir
  }
}

function detectDevice(): Device {
  if (!window.matchMedia?.('(pointer: coarse)').matches) return 'desktop'
  return Math.min(window.screen.width, window.screen.height) < 600 ? 'mobile' : 'tablet'
}

function externalReferrer(): string | null {
  try {
    if (!document.referrer) return null
    const host = new URL(document.referrer).hostname.replace(/^www\./, '')
    return host && host !== window.location.hostname.replace(/^www\./, '') ? host.slice(0, 120) : null
  } catch {
    return null
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

const COLUMNS = 'event,visitor_id,session_id,path,section,game,duration_ms,referrer,device'

/**
 * Démarre la collecte. Inactive en développement (sauf VITE_ANALYTICS_DEV=true),
 * sous navigateur piloté (tests e2e), avec Do Not Track / GPC, ou si ce
 * navigateur a été exclu depuis le dashboard.
 */
export function initAnalytics() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? ''
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (active || !url || !key) return
  if (import.meta.env.DEV && import.meta.env.VITE_ANALYTICS_DEV !== 'true') return
  if (nav.webdriver || nav.doNotTrack === '1' || nav.globalPrivacyControl) return

  const endpoint = `${url}/rest/v1/site_events?columns=${COLUMNS}`
  const tracker = createTracker({
    send(rows, keepalive) {
      fetch(endpoint, {
        method: 'POST',
        keepalive,
        headers: { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(rows),
      }).catch(() => {
        // statistiques perdues : jamais bloquant pour le visiteur
      })
    },
    now: () => Date.now(),
    isVisible: () => document.visibilityState === 'visible',
    storage: (() => {
      try {
        return window.localStorage
      } catch {
        return null
      }
    })(),
    device: detectDevice(),
    referrer: externalReferrer(),
    randomId,
    schedule: (fn, ms) => {
      window.setTimeout(fn, ms)
    },
  })
  active = tracker

  // Les sections naviguent par history.pushState : on suit chaque changement d'adresse.
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = window.history[method]
    window.history[method] = function patched(this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args)
      tracker.navigate(window.location.pathname)
      return result
    }
  }
  window.addEventListener('popstate', () => tracker.navigate(window.location.pathname))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') tracker.hide()
    else tracker.show()
  })
  window.addEventListener('pagehide', () => tracker.hide())

  tracker.navigate(window.location.pathname)
}
