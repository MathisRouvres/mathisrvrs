import type {
  DifficultyId,
  BankruptcyRule,
  DrinkMode,
  EndReason,
  PartyIntensity,
} from './constants'
import type { TradeOffer } from './trade'
import type { ActiveRule } from './ambiance'

/** Paramètres de partie choisis dans le lobby (voir GDD §4). */
export interface GameConfig {
  difficulty: DifficultyId
  /** Durée de partie en minutes (presets 30/60/90 ou valeur libre pour le dev). */
  durationMinutes: number
  bankruptcy: BankruptcyRule
  themeId: string
  seed: string
  /** Limite de temps par tour en secondes ; `null`/absent = illimité. */
  turnSeconds?: number | null
  /** Mélange l’ordre de jeu avec le PRNG seedé (équité). Défaut : false. */
  shuffleOrder?: boolean
  /** Active la compensation de départ par rang d’ordre. Défaut : false. */
  startCompensation?: boolean
  /** Bonus de cash par rang d’ordre (€). Défaut : DEFAULT_COMPENSATION_STEP. */
  compensationStep?: number
  /** Enchère automatique sur toute propriété atterrie non achetée. Défaut : false. */
  auctionOnPass?: boolean
}

/** Choix d’un joueur avant le lancement. */
export interface PlayerSetup {
  id: string
  name: string
  avatar: string
  drinkMode: DrinkMode
  /** Index du pion choisi (catalogue 3D) — optionnel, défaut = siège. */
  pawn?: number
}

/** État runtime d’un joueur. */
export interface PlayerState extends PlayerSetup {
  position: number
  cash: number
  ownedSpaceIds: string[]
  /** Tours restants en prison (0 = libre / simple visite). */
  jailTurns: number
  /** En prison (mouvement bloqué tant que non résolu). */
  inJail: boolean
  /** Cartes « sortie de prison » en réserve. */
  jailCards: number
  bankrupt: boolean
  eliminated: boolean
}

/**
 * Phases de tour formalisées (machine à états — Phase 5).
 *
 * Phases persistées (états de repos où le moteur attend une intention) :
 *   waiting · awaiting_roll · awaiting_jail · awaiting_purchase ·
 *   awaiting_card · turn_cleanup · finished
 *
 * Phases transitoires (traversées de façon atomique dans `takeTurn`,
 * documentées dans `stateMachine.ts`) : rolling · moving · resolving_tile.
 * Phase réservée (à venir) : awaiting_trade.
 */
export type GamePhase =
  | 'waiting'
  | 'awaiting_roll'
  | 'awaiting_jail'
  | 'awaiting_purchase'
  | 'awaiting_card'
  | 'awaiting_trade'
  | 'awaiting_auction'
  | 'turn_cleanup'
  | 'finished'

/** Enchère en cours sur une propriété non achetée (Phase 11B-3). */
export interface AuctionState {
  spaceId: string
  name: string
  /** Meilleure mise courante (0 tant qu'aucune mise). */
  currentBid: number
  /** Joueur en tête (null tant qu'aucune mise). */
  highBidderId: string | null
  /** Joueurs encore en lice (playerIds). */
  activeBidders: string[]
  /** Incrément minimum entre deux mises. */
  minIncrement: number
  /** Fin d'enchère (timestamp absolu ms). 0 tant que non estampillé. */
  endsAt: number
}

/** État global d’une partie MonoVomy. */
export interface GameState {
  config: GameConfig
  players: PlayerState[]
  currentPlayerIndex: number
  turn: number
  phase: GamePhase
  finished: boolean
  ownership: Record<string, string>
  /** Niveau d'établissement par case (spaceId → 1..N). Absent = terrain nu (Phase 11B). */
  buildings?: Record<string, number>
  /** Propriétés hypothéquées (spaceId → true). Absent = aucune (Phase 11B). */
  mortgaged?: Record<string, boolean>
  /** Enchère en cours (phase `awaiting_auction`). null/absent hors enchère (Phase 11B-3). */
  auction?: AuctionState | null
  /** Doubles consécutifs du joueur courant (0 par défaut). 3 d'affilée → prison. */
  doublesStreak?: number
  /** Le joueur courant rejoue après ce tour (double). Absent/false = tour normal. */
  rollAgain?: boolean
  deck: string[]
  deckCursor: number
  rngState: number
  themeId: string
  /** Ordre de jeu : permutation des index de joueurs (position → index). */
  order: number[]
  /** Pointeur courant dans `order`. */
  orderCursor: number
  /** Identifiant de la dernière carte tirée (phase awaiting_card). */
  pendingCardId: string | null
  // ── Horloge (timestamps absolus partagés — voir clock.ts) ─────────────
  /** Timestamp de démarrage (ms). 0 tant que non démarré. */
  startedAt: number
  /** Timestamp de fin prévue (ms). 0 si pas de timer. */
  endsAt: number
  /** Snapshot du temps restant partie (ms), rafraîchi à chaque tick. */
  remainingTime: number
  /** Timestamp de fin du tour courant (ms). 0 si pas de timer de tour. */
  turnEndsAt: number
  /** Raison de fin de partie (null tant que non terminée). */
  endReason: EndReason | null
  // ── Négociation (canal parallèle non bloquant — voir trade.ts) ─────────
  /** Offres d’échange (historique borné aux plus récentes). */
  trades: TradeOffer[]
  /** Compteur d’identifiants d’offres (déterministe). */
  tradeSeq: number
  // ── Directeur d’ambiance (autoritatif — voir ambiance.ts) ──────────────
  /** Niveau d’ambiance courant (monte par cliquet). */
  partyIntensity: PartyIntensity
  /** Règles temporaires actives. */
  activeRules: ActiveRule[]
  /** Nombre de cartes action jouées (entrée du score d’ambiance). */
  cardsPlayed: number
  /** Compteur monotone de tours individuels (expiration des règles). */
  turnStep: number
}

export interface DiceRoll {
  d1: number
  d2: number
  total: number
  isDouble: boolean
}

/** Conséquence d’une faillite selon le preset choisi (voir GDD §8). */
export interface BankruptcyInfo {
  playerId: string
  rule: BankruptcyRule
  eliminated: boolean
  rescued: boolean
  penaltySips: number
}

/** Résultat de l’arrivée sur une case, à présenter au joueur. */
export type SpaceOutcome =
  | { kind: 'nothing'; name: string }
  | { kind: 'parking'; name: string }
  | { kind: 'jail_visit'; name: string }
  | { kind: 'go_jail'; name: string }
  /** Résolution prison : reste enfermé (double raté). */
  | { kind: 'jail_stay'; name: string; turnsLeft: number; sips: number }
  /** Résolution prison : libéré (avant de lancer), via caution / carte. */
  | { kind: 'jail_out'; name: string; via: 'bail' | 'card'; sips: number }
  | { kind: 'tax'; name: string; amount: number; sips: number }
  | { kind: 'draw_card'; cardId: string }
  | { kind: 'buy_offer'; spaceId: string; name: string; price: number }
  | { kind: 'cannot_afford'; name: string; price: number }
  | { kind: 'own_property'; name: string }
  | {
      kind: 'pay_rent'
      name: string
      toPlayerId: string
      toName: string
      amount: number
      sips: number
    }

export interface TurnResult {
  state: GameState
  roll: DiceRoll
  passedStart: boolean
  salary: number
  outcome: SpaceOutcome
  bankruptcy: BankruptcyInfo | null
}
