/**
 * Partie à plusieurs téléphones, côté logique (sans React) : état partagé,
 * envoi groupé des écritures, resynchronisation à l'arrivée et après une
 * coupure, sauvegarde locale pour survivre à un rechargement de page.
 */
import { MAX_PLAYERS } from '../engine'
import {
  GUESTS_KEY,
  MAX_PAYLOAD_CHARS,
  MEMBER_PREFIX,
  cleanName,
  guestsOf,
  isClientId,
  membersOf,
  mergeDoc,
  playersOf,
  sanitizeEntries,
  type Doc,
  type Entry,
  type Member,
} from './doc'
import type { RoomMessage, RoomStatus, RoomTransport, TransportFactory } from './transport'
import type { StorageLike } from '../session'

export const ROOM_STORAGE_KEY = 'party-room-v1'
/** Sans réponse au bout de ce délai, tout le monde est sollicité. */
const HELLO_RETRY_MS = 1500

export interface SavedRoom {
  code: string
  clientId: string
  name: string
  doc: Doc
}

export interface RoomMember extends Member {
  online: boolean
  displayName: string
}

export interface RoomSnapshot {
  version: number
  status: RoomStatus
  members: RoomMember[]
  players: string[]
  /** Prénom de ce téléphone dans la liste des joueurs (null : spectateur). */
  myName: string | null
}

export interface RoomStore {
  readonly code: string
  readonly clientId: string
  get(key: string): unknown
  /** Valeurs de toutes les clés `prefix…`, indexées par la fin de la clé. */
  getPrefix(prefix: string): Record<string, unknown>
  set(key: string, value: unknown): void
  /** Propose une valeur initiale ; ignorée si la clé existe ou dès qu'une vraie écriture arrive. */
  init(key: string, value: unknown): void
  setPlayers(players: readonly string[]): void
  /** Ce téléphone joue (true) ou regarde seulement (false). */
  setPlaying(playing: boolean): void
  snapshot(): RoomSnapshot
  subscribe(listener: () => void): () => void
  /** Demande l'état complet aux autres (retour au premier plan…). */
  resync(): void
  leave(): void
  close(): void
}

export function readSavedRoom(storage: StorageLike | null): SavedRoom | null {
  if (!storage) return null
  try {
    const raw = JSON.parse(storage.getItem(ROOM_STORAGE_KEY) ?? 'null') as Partial<SavedRoom> | null
    if (!raw || typeof raw.code !== 'string' || !isClientId(raw.clientId) || !cleanName(raw.name)) return null
    return { code: raw.code, clientId: raw.clientId, name: cleanName(raw.name), doc: sanitizeEntries(raw.doc) }
  } catch {
    return null
  }
}

export function clearSavedRoom(storage: StorageLike | null) {
  try {
    storage?.removeItem(ROOM_STORAGE_KEY)
  } catch {
    // Stockage bloqué : rien à effacer.
  }
}

interface Options {
  code: string
  clientId: string
  name: string
  factory: TransportFactory
  storage: StorageLike | null
  doc?: Doc
  now?: () => number
}

export function createRoomStore({ code, clientId, name, factory, storage, doc: savedDoc = {}, now = Date.now }: Options): RoomStore {
  let doc: Doc = savedDoc
  let clock = Object.values(doc).reduce((max, e) => Math.max(max, e.s[0]), 0)
  let status: RoomStatus = 'connecting'
  let online: string[] = []
  let version = 0
  let cached: RoomSnapshot | null = null
  const prefixCache = new Map<string, { version: number; value: Record<string, unknown> }>()
  const listeners = new Set<() => void>()
  let outgoing: Doc = {}
  let flushQueued = false
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let helloTimer: ReturnType<typeof setTimeout> | null = null
  let gotState = false
  let closed = false
  let left = false

  function persist() {
    if (left) return
    try {
      storage?.setItem(ROOM_STORAGE_KEY, JSON.stringify({ code, clientId, name, doc } satisfies SavedRoom))
    } catch {
      // Stockage plein ou bloqué : la partie continue, sans reprise après rechargement.
    }
  }

  function save() {
    if (!storage || saveTimer) return
    saveTimer = setTimeout(() => {
      saveTimer = null
      if (!closed) persist()
    }, 300)
  }

  function notify() {
    version++
    cached = null
    listeners.forEach((l) => l())
  }

  function changed() {
    save()
    notify()
  }

  function send(msg: RoomMessage) {
    if (closed) return
    // Garde-fou : un message trop gros serait refusé par le serveur temps réel.
    if (JSON.stringify(msg).length > MAX_PAYLOAD_CHARS) return
    transport.send(msg)
  }

  function flush() {
    flushQueued = false
    const entries = outgoing
    outgoing = {}
    if (Object.keys(entries).length > 0) send({ t: 'ops', from: clientId, e: entries })
  }

  function write(key: string, entry: Entry) {
    doc = { ...doc, [key]: entry }
    outgoing[key] = entry
    if (!flushQueued) {
      flushQueued = true
      queueMicrotask(flush)
    }
    changed()
  }

  function receive(incoming: Doc) {
    const result = mergeDoc(doc, incoming)
    clock = Math.max(clock, result.clock)
    if (result.changed.length === 0) return
    doc = result.doc
    changed()
  }

  function hello(all = false) {
    send({ t: 'hello', from: clientId, all })
  }

  function onMessage(raw: unknown) {
    if (closed || !raw || typeof raw !== 'object') return
    const msg = raw as Partial<RoomMessage>
    if (!isClientId(msg.from) || msg.from === clientId) return
    if (msg.t === 'ops' || msg.t === 'state') {
      if (msg.t === 'state') gotState = true
      receive(sanitizeEntries(msg.e))
    } else if (msg.t === 'hello') {
      // Un seul téléphone répond (le plus petit identifiant connecté), sauf relance.
      const others = online.filter((id) => id !== msg.from)
      const responder = others.length === 0 || others.every((id) => id >= clientId)
      if (msg.all || responder) send({ t: 'state', from: clientId, to: msg.from, e: doc })
    }
  }

  function onStatus(next: RoomStatus) {
    if (closed) return
    const wasOnline = status === 'online'
    status = next
    notify()
    if (next === 'online' && !wasOnline) {
      // Arrivée ou retour après coupure : on récupère l'état des autres et on
      // leur renvoie le nôtre (écritures faites hors ligne comprises).
      gotState = false
      hello()
      send({ t: 'ops', from: clientId, e: doc })
      if (helloTimer) clearTimeout(helloTimer)
      helloTimer = setTimeout(() => {
        if (!gotState && online.length > 1) hello(true)
      }, HELLO_RETRY_MS)
    }
  }

  function onPresence(ids: string[]) {
    if (closed) return
    online = ids.filter(isClientId)
    notify()
  }

  function setMember(m: Member, spectator: boolean) {
    store.set(`${MEMBER_PREFIX}${m.id}`, { name: m.name, at: m.at, ...(spectator ? { spectator: true } : {}) })
  }

  const transport: RoomTransport = factory(code, clientId, { message: onMessage, presence: onPresence, status: onStatus })

  const store: RoomStore = {
    code,
    clientId,
    get(key) {
      return doc[key]?.v
    },
    getPrefix(prefix) {
      const hit = prefixCache.get(prefix)
      if (hit && hit.version === version) return hit.value
      const value: Record<string, unknown> = {}
      for (const [key, entry] of Object.entries(doc)) {
        if (key.startsWith(prefix) && entry.v !== null && entry.v !== undefined) value[key.slice(prefix.length)] = entry.v
      }
      // Même objet tant que le contenu ne change pas (useSyncExternalStore).
      const same =
        hit &&
        Object.keys(hit.value).length === Object.keys(value).length &&
        Object.entries(value).every(([k, v]) => Object.is(hit.value[k], v))
      const result = same ? hit.value : value
      prefixCache.set(prefix, { version, value: result })
      return result
    },
    set(key, value) {
      if (closed || (doc[key] && Object.is(doc[key].v, value))) return
      clock++
      write(key, { v: value, s: [clock, clientId] })
    },
    init(key, value) {
      if (closed || doc[key]) return
      write(key, { v: value, s: [0, clientId] })
    },
    setPlayers(list) {
      const members = membersOf(doc)
      const { names } = playersOf(members, [], MAX_PLAYERS)
      const wanted = new Set(list.map(cleanName))
      // Un téléphone retiré de la liste reste dans la partie, en spectateur ;
      // remettre son prénom le refait jouer.
      for (const m of members) {
        const spectator = !wanted.has(names[m.id] ?? m.name)
        if (spectator !== m.spectator) setMember(m, spectator)
      }
      const memberNames = new Set(Object.values(names))
      store.set(
        GUESTS_KEY,
        list
          .map(cleanName)
          .filter((n) => n && !memberNames.has(n))
          .slice(0, MAX_PLAYERS),
      )
    },
    snapshot() {
      if (cached) return cached
      const members = membersOf(doc)
      const { players, names } = playersOf(members, guestsOf(doc), MAX_PLAYERS)
      const presence = new Set(online)
      const myName = names[clientId]
      const snap: RoomSnapshot = {
        version,
        status,
        members: members.map((m) => ({ ...m, online: presence.has(m.id) || m.id === clientId, displayName: names[m.id] ?? m.name })),
        players,
        myName: myName && players.includes(myName) ? myName : null,
      }
      cached = snap
      return snap
    },
    setPlaying(playing) {
      const m = membersOf(doc).find((x) => x.id === clientId)
      if (m) setMember(m, !playing)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    resync() {
      if (status === 'online') hello()
    },
    leave() {
      store.set(`${MEMBER_PREFIX}${clientId}`, null)
      flush()
      left = true
      clearSavedRoom(storage)
      // Laisse partir le dernier message avant de couper.
      setTimeout(() => store.close(), 300)
    },
    close() {
      if (closed) return
      closed = true
      if (saveTimer) clearTimeout(saveTimer)
      if (helloTimer) clearTimeout(helloTimer)
      transport.close()
      listeners.clear()
    },
  }

  // Inscription (ou retour après rechargement, en gardant sa place dans l'ordre).
  const me = membersOf(doc).find((m) => m.id === clientId)
  if (!me || me.name !== name) {
    store.set(`${MEMBER_PREFIX}${clientId}`, { name, at: me?.at ?? now(), ...(me?.spectator ? { spectator: true } : {}) })
  }
  persist()

  return store
}
