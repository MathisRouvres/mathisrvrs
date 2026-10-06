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

/* ------------------------------------------------------------------ */
/* Loup-Garou                                                          */
/* ------------------------------------------------------------------ */

export const MIN_WEREWOLF_PLAYERS = 6

export type WerewolfRole = 'wolf' | 'villager' | 'seer' | 'witch' | 'hunter' | 'cupid' | 'littleGirl'
export type WerewolfSpecial = Exclude<WerewolfRole, 'wolf' | 'villager'>

/** Un loup pour trois ou quatre joueurs : 2 loups à 6-8, 3 à 9-11, 4 à 12 et plus. */
export function werewolfCount(playerCount: number): number {
  if (playerCount >= 12) return 4
  if (playerCount >= 9) return 3
  return 2
}

/**
 * Distribue les rôles : loups, puis rôles spéciaux demandés (dans la limite des
 * places), le reste en villageois. Renvoie un tableau aligné sur les joueurs.
 */
export function dealWerewolfRoles(
  playerCount: number,
  specials: readonly WerewolfSpecial[],
  rng: Rng = Math.random,
): WerewolfRole[] {
  if (playerCount < MIN_WEREWOLF_PLAYERS) {
    throw new Error(`Il faut au moins ${MIN_WEREWOLF_PLAYERS} joueurs`)
  }
  const wolves = werewolfCount(playerCount)
  const chosen = [...new Set(specials)].slice(0, playerCount - wolves - 1)
  const roles: WerewolfRole[] = [
    ...Array.from({ length: wolves }, () => 'wolf' as const),
    ...chosen,
  ]
  while (roles.length < playerCount) roles.push('villager')
  return shuffle(roles, rng)
}

/** Village gagne sans loup vivant ; loups gagnent dès qu'ils égalent les autres vivants. */
export function werewolfWinner(roles: readonly WerewolfRole[], alive: readonly boolean[]): 'village' | 'wolves' | null {
  let wolves = 0
  let others = 0
  roles.forEach((role, i) => {
    if (!alive[i]) return
    if (role === 'wolf') wolves++
    else others++
  })
  if (wolves === 0) return 'village'
  if (wolves >= others) return 'wolves'
  return null
}

/* ------------------------------------------------------------------ */
/* Petit Bac                                                           */
/* ------------------------------------------------------------------ */

/** Lettres jouables : on écarte celles qui bloquent presque toutes les catégories. */
export const PETIT_BAC_LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('')

export function drawLetter(rng: Rng = Math.random, avoid?: string): string {
  const pool = PETIT_BAC_LETTERS.filter((l) => l !== avoid)
  return pool[Math.floor(rng() * pool.length)] ?? 'A'
}

export function pickSome<T>(items: readonly T[], count: number, rng: Rng = Math.random): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, count))
}

/* ------------------------------------------------------------------ */
/* Jeu du Roi                                                          */
/* ------------------------------------------------------------------ */

export const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export type CardRank = (typeof CARD_RANKS)[number]
export const CARD_SUITS = ['♠', '♥', '♦', '♣'] as const
export type CardSuit = (typeof CARD_SUITS)[number]

export interface PlayingCard {
  rank: CardRank
  suit: CardSuit
}

/** Valeur d'une carte : l'As est la plus forte (14). */
export function cardValue(rank: CardRank): number {
  const faces: Partial<Record<CardRank, number>> = { J: 11, Q: 12, K: 13, A: 14 }
  return faces[rank] ?? Number(rank)
}

export function isRedSuit(suit: CardSuit): boolean {
  return suit === '♥' || suit === '♦'
}

/* ------------------------------------------------------------------ */
/* Le Bus                                                              */
/* ------------------------------------------------------------------ */

export type BusAnswer = 'red' | 'black' | 'higher' | 'lower' | 'inside' | 'outside' | CardSuit

/** Les quatre questions du Bus, dans l'ordre. */
export const BUS_STEPS = ['color', 'higherLower', 'insideOutside', 'suit'] as const

/**
 * Vérifie la réponse à l'étape `step`, `drawn` contenant les cartes déjà
 * retournées, la dernière étant celle qui vient de sortir. Une égalité perd.
 */
export function busCorrect(step: number, drawn: readonly PlayingCard[], answer: BusAnswer): boolean {
  const card = drawn[step]
  if (!card) return false
  const value = cardValue(card.rank)
  switch (BUS_STEPS[step]) {
    case 'color':
      return answer === (isRedSuit(card.suit) ? 'red' : 'black')
    case 'higherLower': {
      const first = cardValue(drawn[0]!.rank)
      return (answer === 'higher' && value > first) || (answer === 'lower' && value < first)
    }
    case 'insideOutside': {
      const a = cardValue(drawn[0]!.rank)
      const b = cardValue(drawn[1]!.rank)
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      return (answer === 'inside' && value > lo && value < hi) || (answer === 'outside' && (value < lo || value > hi))
    }
    case 'suit':
      return answer === card.suit
    default:
      return false
  }
}

/** Paquet de 52 cartes mélangé. */
export function createCardDeck(rng: Rng = Math.random): PlayingCard[] {
  return shuffle(
    CARD_SUITS.flatMap((suit) => CARD_RANKS.map((rank) => ({ rank, suit }))),
    rng,
  )
}
