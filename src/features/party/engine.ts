/**
 * Moteur des jeux de soirée : fonctions pures, sans React ni DOM.
 * Le hasard est injectable (`rng`) pour rendre les tests déterministes.
 */

export const LEVELS = ['soft', 'spicy', 'hot'] as const
export type Level = (typeof LEVELS)[number]

export type Rng = () => number

export const MIN_IMPOSTOR_PLAYERS = 3
export const MAX_PLAYERS = 16
export const MAX_NAME_LENGTH = 20

export function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && (LEVELS as readonly string[]).includes(value)
}

/** Fisher-Yates : renvoie une copie mélangée. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i] as T
    out[i] = out[j] as T
    out[j] = tmp
  }
  return out
}

/**
 * Pioche sans remise : un ordre mélangé d'indices et la position courante.
 * Quand le paquet est épuisé, on remélange en évitant de rejouer tout de suite
 * la dernière carte vue.
 */
export interface Deck {
  order: number[]
  position: number
}

export function createDeck(size: number, rng: Rng = Math.random): Deck {
  return { order: shuffle(Array.from({ length: size }, (_, i) => i), rng), position: 0 }
}

export function advanceDeck(deck: Deck, rng: Rng = Math.random): Deck {
  if (deck.position + 1 < deck.order.length) {
    return { order: deck.order, position: deck.position + 1 }
  }
  const last = deck.order[deck.position]
  const next = createDeck(deck.order.length, rng)
  if (next.order.length > 1 && next.order[0] === last) {
    const [first, second, ...rest] = next.order as [number, number, ...number[]]
    next.order = [second, first, ...rest]
  }
  return next
}

export function currentCard(deck: Deck): number | undefined {
  return deck.order[deck.position]
}

/** Nombre maximal d'imposteurs : toujours strictement moins que la moitié des joueurs. */
export function maxImpostors(playerCount: number): number {
  return Math.max(1, Math.floor((playerCount - 1) / 2))
}

/** Tire les imposteurs : renvoie un tableau de booléens aligné sur les joueurs. */
export function assignImpostors(playerCount: number, impostorCount: number, rng: Rng = Math.random): boolean[] {
  if (playerCount < MIN_IMPOSTOR_PLAYERS) {
    throw new Error(`Il faut au moins ${MIN_IMPOSTOR_PLAYERS} joueurs`)
  }
  const count = Math.min(Math.max(1, Math.floor(impostorCount)), maxImpostors(playerCount))
  const chosen = new Set(shuffle(Array.from({ length: playerCount }, (_, i) => i), rng).slice(0, count))
  return Array.from({ length: playerCount }, (_, i) => chosen.has(i))
}

/** Choisit qui ouvre la discussion, parmi les joueurs qui connaissent le mot. */
export function pickStarter(impostors: readonly boolean[], rng: Rng = Math.random): number {
  const civilians = impostors.flatMap((isImpostor, i) => (isImpostor ? [] : [i]))
  return civilians[Math.floor(rng() * civilians.length)] ?? 0
}

/** Nettoie une liste de noms saisis : espaces, longueur, vides, plafond. */
export function sanitizePlayers(names: readonly unknown[]): string[] {
  return names
    .filter((n): n is string => typeof n === 'string')
    .map((n) => n.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH))
    .filter((n) => n.length > 0)
    .slice(0, MAX_PLAYERS)
}
