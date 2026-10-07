import type { Doc } from './doc'

/** Messages échangés entre téléphones d'une même partie. */
export type RoomMessage =
  /** Écritures récentes, à fusionner. */
  | { t: 'ops'; from: string; e: Doc }
  /** Un téléphone arrive ou revient : il demande l'état complet. */
  | { t: 'hello'; from: string; all?: boolean }
  /** Réponse à `hello` : l'état complet. */
  | { t: 'state'; from: string; to: string; e: Doc }

export type RoomStatus = 'connecting' | 'online' | 'offline'

export interface RoomTransportHandlers {
  message(msg: unknown): void
  /** Identifiants des téléphones connectés en ce moment. */
  presence(ids: string[]): void
  status(status: RoomStatus): void
}

export interface RoomTransport {
  send(msg: RoomMessage): void
  close(): void
}

export type TransportFactory = (code: string, clientId: string, handlers: RoomTransportHandlers) => RoomTransport

/**
 * Réseau simulé en mémoire (tests). Livraison asynchrone, comme un vrai réseau ;
 * `setOnline(false)` coupe un téléphone pour simuler une perte de connexion.
 */
export function createLoopbackHub() {
  const rooms = new Map<string, Map<string, RoomTransportHandlers>>()
  const offline = new Set<string>()

  const peers = (code: string) => rooms.get(code) ?? new Map<string, RoomTransportHandlers>()
  const onlineIds = (code: string) => [...peers(code).keys()].filter((id) => !offline.has(id))
  const announce = (code: string) => {
    const ids = onlineIds(code)
    for (const [id, h] of peers(code)) if (!offline.has(id)) queueMicrotask(() => h.presence(ids))
  }

  const factory: TransportFactory = (code, clientId, handlers) => {
    if (!rooms.has(code)) rooms.set(code, new Map())
    peers(code).set(clientId, handlers)
    queueMicrotask(() => {
      handlers.status('online')
      announce(code)
    })
    return {
      send(msg) {
        if (offline.has(clientId)) return
        const copy = JSON.parse(JSON.stringify(msg)) as unknown
        for (const [id, h] of peers(code)) {
          if (id !== clientId && !offline.has(id)) queueMicrotask(() => h.message(copy))
        }
      },
      close() {
        peers(code).delete(clientId)
        announce(code)
      },
    }
  }

  function setOnline(code: string, clientId: string, online: boolean) {
    const h = peers(code).get(clientId)
    if (!h) return
    if (online) offline.delete(clientId)
    else offline.add(clientId)
    queueMicrotask(() => h.status(online ? 'online' : 'offline'))
    announce(code)
  }

  return { factory, setOnline }
}

/**
 * Onglets d'un même navigateur (développement) : `BroadcastChannel`, présence
 * par battements. Permet d'essayer la partie à plusieurs sans serveur.
 */
export function broadcastChannelTransport(): TransportFactory {
  return (code, clientId, handlers) => {
    const channel = new BroadcastChannel(`party:${code}`)
    const seen = new Map<string, number>([[clientId, Date.now()]])
    const publishPresence = () => {
      const now = Date.now()
      for (const [id, at] of seen) if (id !== clientId && now - at > 5000) seen.delete(id)
      handlers.presence([...seen.keys()])
    }
    const beat = () => channel.postMessage({ beat: clientId })
    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { beat?: string; bye?: string; msg?: unknown }
      if (typeof data?.beat === 'string') {
        const fresh = !seen.has(data.beat)
        seen.set(data.beat, Date.now())
        if (fresh) {
          beat()
          publishPresence()
        }
      } else if (typeof data?.bye === 'string') {
        seen.delete(data.bye)
        publishPresence()
      } else if (data?.msg) handlers.message(data.msg)
    }
    const timer = setInterval(() => {
      seen.set(clientId, Date.now())
      beat()
      publishPresence()
    }, 2000)
    queueMicrotask(() => {
      handlers.status('online')
      beat()
      publishPresence()
    })
    return {
      send(msg) {
        channel.postMessage({ msg })
      },
      close() {
        clearInterval(timer)
        channel.postMessage({ bye: clientId })
        channel.close()
      },
    }
  }
}

export interface SupabaseConfig {
  url: string
  anonKey: string
}

type SupabaseClient = Awaited<ReturnType<typeof loadClient>>
const clients = new Map<string, Promise<SupabaseClient>>()

async function loadClient(config: SupabaseConfig) {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  })
}

/** Un seul client Supabase par page, partagé par les parties successives. */
function getClient(config: SupabaseConfig) {
  const key = config.url
  let client = clients.get(key)
  if (!client) {
    client = loadClient(config)
    clients.set(key, client)
    client.catch(() => clients.delete(key))
  }
  return client
}

/**
 * Supabase Realtime : un canal `party:<code>` en broadcast, et la présence pour
 * savoir qui est connecté. Aucune table : l'état vit sur les téléphones.
 * Le SDK se charge à la première partie, pas avant.
 */
export function supabaseTransport(config: SupabaseConfig): TransportFactory {
  return (code, clientId, handlers) => {
    let closed = false
    let online = false
    let channel: ReturnType<SupabaseClient['channel']> | null = null
    let client: SupabaseClient | null = null
    const pending: RoomMessage[] = []

    const push = (msg: RoomMessage) => {
      void channel?.send({ type: 'broadcast', event: 'm', payload: msg })
    }

    handlers.status('connecting')
    getClient(config)
      .then((c) => {
        if (closed) return
        client = c
        channel = c.channel(`party:${code}`, {
          config: { broadcast: { self: false }, presence: { key: clientId } },
        })
        channel.on('broadcast', { event: 'm' }, ({ payload }) => handlers.message(payload))
        channel.on('presence', { event: 'sync' }, () => {
          if (channel) handlers.presence(Object.keys(channel.presenceState()))
        })
        // Rappelé à chaque (re)connexion : le SDK rejoint seul le canal après une coupure.
        channel.subscribe((status) => {
          if (closed) return
          if (status === 'SUBSCRIBED') {
            online = true
            void channel?.track({ at: Date.now() })
            handlers.status('online')
            pending.splice(0).forEach(push)
          } else {
            online = false
            handlers.status(status === 'TIMED_OUT' ? 'connecting' : 'offline')
          }
        })
      })
      .catch(() => {
        if (!closed) handlers.status('offline')
      })

    return {
      send(msg) {
        if (online) push(msg)
        else if (pending.length < 50) pending.push(msg)
      },
      close() {
        closed = true
        online = false
        if (channel && client) {
          void channel.untrack()
          void client.removeChannel(channel)
        }
      },
    }
  }
}
