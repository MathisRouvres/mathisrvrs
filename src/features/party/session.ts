/**
 * Sauvegarde de la partie en cours, le temps de la session du navigateur
 * (sessionStorage) : un rechargement ou un retour à l'accueil ne fait plus
 * perdre la partie. Une entrée par jeu, liée au niveau joué, valable 4 h.
 * Lecture défensive : le stockage peut être vide, bloqué ou corrompu.
 */
import { CARD_RANKS, CARD_SUITS, type Deck, type PlayingCard } from './engine'

export const SESSION_KEY = 'party-session-v1'
export const SESSION_TTL_MS = 4 * 60 * 60 * 1000

export interface GameSession {
  level: string
  savedAt: number
  state: Record<string, unknown>
}

type Store = Record<string, GameSession>

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): StorageLike | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function isSession(value: unknown): value is GameSession {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.level === 'string' &&
    typeof v.savedAt === 'number' &&
    Number.isFinite(v.savedAt) &&
    !!v.state &&
    typeof v.state === 'object' &&
    !Array.isArray(v.state)
  )
}

/** Toutes les parties encore valables (les expirées sont ignorées). */
export function readStore(now = Date.now(), storage = defaultStorage()): Store {
  if (!storage) return {}
  try {
    const raw: unknown = JSON.parse(storage.getItem(SESSION_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out: Store = {}
    for (const [slug, entry] of Object.entries(raw)) {
      if (isSession(entry) && now - entry.savedAt < SESSION_TTL_MS && entry.savedAt <= now + 60_000) {
        out[slug] = entry
      }
    }
    return out
  } catch {
    return {}
  }
}

function writeStore(store: Store, storage: StorageLike | null) {
  if (!storage) return
  try {
    if (Object.keys(store).length === 0) storage.removeItem(SESSION_KEY)
    else storage.setItem(SESSION_KEY, JSON.stringify(store))
  } catch {
    // Stockage plein ou bloqué : la partie continue, seulement sans sauvegarde.
  }
}

/** État sauvegardé d'un jeu, s'il a été joué à ce niveau. */
export function readGameState(
  slug: string,
  level: string,
  now = Date.now(),
  storage = defaultStorage(),
): Record<string, unknown> | null {
  const entry = readStore(now, storage)[slug]
  return entry && entry.level === level ? entry.state : null
}

/** Enregistre un champ ; changer de niveau repart d'une partie vierge. */
export function writeGameField(
  slug: string,
  level: string,
  field: string,
  value: unknown,
  now = Date.now(),
  storage = defaultStorage(),
) {
  const store = readStore(now, storage)
  const previous = store[slug]
  const state = previous && previous.level === level ? previous.state : {}
  store[slug] = { level, savedAt: now, state: { ...state, [field]: value } }
  writeStore(store, storage)
}

export function clearGame(slug: string, now = Date.now(), storage = defaultStorage()) {
  const store = readStore(now, storage)
  if (!(slug in store)) return
  delete store[slug]
  writeStore(store, storage)
}

/** La dernière partie jouée, pour proposer de la reprendre. */
export function lastSession(
  now = Date.now(),
  storage = defaultStorage(),
): { slug: string; level: string; savedAt: number } | null {
  let best: { slug: string; level: string; savedAt: number } | null = null
  for (const [slug, entry] of Object.entries(readStore(now, storage))) {
    if (!best || entry.savedAt > best.savedAt) best = { slug, level: entry.level, savedAt: entry.savedAt }
  }
  return best
}

/* ------------------------------------------------------------------ */
/* Validation des valeurs relues                                       */
/* ------------------------------------------------------------------ */

export function isIntIn(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max
}

/** Paquet valide pour `size` cartes : permutation complète et position dans les bornes. */
export function isDeck(value: unknown, size: number): value is Deck {
  if (!value || typeof value !== 'object') return false
  const { order, position } = value as Record<string, unknown>
  if (!Array.isArray(order) || order.length !== size || !isIntIn(position, 0, Math.max(0, size - 1))) return false
  const seen = new Set<number>()
  for (const i of order) {
    if (!isIntIn(i, 0, size - 1) || seen.has(i)) return false
    seen.add(i)
  }
  return true
}

export function isPlayingCard(value: unknown): value is PlayingCard {
  if (!value || typeof value !== 'object') return false
  const { rank, suit } = value as Record<string, unknown>
  return (CARD_RANKS as readonly unknown[]).includes(rank) && (CARD_SUITS as readonly unknown[]).includes(suit)
}

/** Paquet de 52 cartes distinctes. */
export function isCardDeck(value: unknown): value is PlayingCard[] {
  if (!Array.isArray(value) || value.length !== CARD_RANKS.length * CARD_SUITS.length) return false
  const seen = new Set<string>()
  for (const card of value) {
    if (!isPlayingCard(card)) return false
    seen.add(`${card.rank}${card.suit}`)
  }
  return seen.size === value.length
}

export function isBoolArray(value: unknown, length: number): value is boolean[] {
  return Array.isArray(value) && value.length === length && value.every((v) => typeof v === 'boolean')
}

export function isIntArray(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every((v) => Number.isInteger(v))
}
