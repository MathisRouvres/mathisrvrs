import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { SUPABASE_CONFIG, SUPABASE_ENABLED } from '../../../config/features'
import { clearSavedRoom, createRoomStore, readSavedRoom } from './store'
import { cleanName, isRoomCode, newRoomCode, randomClientId } from './doc'
import { broadcastChannelTransport, supabaseTransport } from './transport'

/** Partie à plusieurs téléphones en cours (RoomStore), ou null en mode un seul téléphone. */
export const RoomContext = createContext(null)

/**
 * Transport réel, si Supabase est configuré ; sinon le mode multi-téléphones
 * est masqué. En développement, `VITE_PARTY_ROOM_TRANSPORT=tabs` relie les
 * onglets du navigateur, sans serveur.
 */
export const defaultRoomTransport =
  import.meta.env.DEV && import.meta.env.VITE_PARTY_ROOM_TRANSPORT === 'tabs'
    ? broadcastChannelTransport()
    : SUPABASE_ENABLED
      ? supabaseTransport(SUPABASE_CONFIG)
      : null

const NAME_KEY = 'party-name-v1'
const noop = () => () => {}
const EMPTY = {}

function sessionStore() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function readLastName() {
  try {
    return cleanName(localStorage.getItem(NAME_KEY) ?? '')
  } catch {
    return ''
  }
}

function rememberName(name) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // Stockage indisponible : le prénom sera simplement redemandé.
  }
}

export function useRoom() {
  return useContext(RoomContext)
}

/** État de la partie (membres, joueurs, connexion), ou null hors partie. */
export function useRoomSnapshot(store) {
  const subscribe = useCallback((cb) => (store ? store.subscribe(cb) : noop()), [store])
  return useSyncExternalStore(subscribe, () => (store ? store.snapshot() : null))
}

/**
 * Place de ce téléphone dans la partie : `myName` (null hors partie ou en
 * spectateur), `phones` (prénoms des joueurs qui ont leur téléphone) et
 * `watchers` (nombre de téléphones spectateurs).
 */
export function useRoomPlayer() {
  const store = useContext(RoomContext)
  const snapshot = useRoomSnapshot(store)
  return useMemo(
    () => ({
      inRoom: Boolean(store),
      myName: snapshot?.myName ?? null,
      phones: new Set(snapshot ? snapshot.members.filter((m) => !m.spectator).map((m) => m.displayName) : []),
      players: snapshot?.players ?? [],
      /** Téléphones en spectateur (meneur…). */
      watchers: snapshot ? snapshot.members.filter((m) => m.spectator).length : 0,
    }),
    [store, snapshot],
  )
}

/** Valeur partagée d'une clé, ou undefined hors partie / clé absente. */
export function useRoomValue(store, key) {
  const subscribe = useCallback((cb) => (store && key ? store.subscribe(cb) : noop()), [store, key])
  return useSyncExternalStore(subscribe, () => (store && key ? store.get(key) : undefined))
}

/** Toutes les valeurs `prefix…`, indexées par la fin de la clé. */
export function useRoomPrefix(store, prefix) {
  const subscribe = useCallback((cb) => (store && prefix ? store.subscribe(cb) : noop()), [store, prefix])
  return useSyncExternalStore(subscribe, () => (store && prefix ? store.getPrefix(prefix) : EMPTY))
}

/**
 * Partie en cours sur ce téléphone, hors de React : un gestionnaire par
 * transport, qui reprend tout seul la partie sauvegardée (rechargement de page).
 */
const managers = new WeakMap()

function getManager(factory, storage) {
  let manager = managers.get(factory)
  if (manager) return manager
  let store = null
  const listeners = new Set()
  const open = (session) => {
    store?.close()
    store = session ? createRoomStore({ ...session, factory, storage }) : null
    listeners.forEach((l) => l())
  }
  manager = {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get: () => store,
    join(code, name) {
      const clean = cleanName(name)
      if (!isRoomCode(code) || !clean) return false
      rememberName(clean)
      clearSavedRoom(storage)
      open({ code, clientId: randomClientId(), name: clean, doc: {} })
      return true
    },
    leave() {
      const leaving = store
      store = null
      leaving?.leave()
      clearSavedRoom(storage)
      listeners.forEach((l) => l())
    },
  }
  managers.set(factory, manager)
  const saved = readSavedRoom(storage)
  if (saved && isRoomCode(saved.code)) open(saved)
  return manager
}

const noManager = { subscribe: noop, get: () => null }

/**
 * Cycle de vie de la partie sur ce téléphone : créer, rejoindre, quitter, et
 * reprendre automatiquement après un rechargement de la page.
 */
export function useRoomSession(factory, storage) {
  const [manager] = useState(() => (factory ? getManager(factory, storage === undefined ? sessionStore() : storage) : noManager))
  const store = useSyncExternalStore(manager.subscribe, manager.get)

  // Retour au premier plan (téléphone déverrouillé) : on se remet à jour.
  useEffect(() => {
    if (!store) return undefined
    const onVisible = () => {
      if (document.visibilityState === 'visible') store.resync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [store])

  const join = useCallback((code, name) => (factory ? manager.join(code, name) : false), [factory, manager])
  const create = useCallback((name) => join(newRoomCode(), name), [join])
  const leave = useCallback(() => manager.leave?.(), [manager])

  return { store, available: Boolean(factory), create, join, leave }
}
