import type { BankruptcyInfo, DiceRoll, GameState, SpaceOutcome } from '../engine/types'
import type { TradeBundle } from '../engine/trade'
import type { BoardMapId } from '../content/maps/types'

export type ClientId = string
export type RoomCode = string
export type DrinkMode = 'alcohol' | 'soft'

/** Version du protocole réseau (Phase 9). Un message d’une autre version majeure est rejeté. */
export const PROTOCOL_VERSION = '1.0.0'

/**
 * Métadonnées d’une intention (Phase 9 — idempotence). `intentId` unique,
 * `sequence` monotone par joueur : l’hôte n’applique une intention qu’une fois.
 */
export interface IntentMeta {
  intentId: string
  playerId: string
  gameId: string
  sequence: number
  createdAt: number
}

export interface LobbyMember {
  clientId: ClientId
  name: string
  avatar: string
  drinkMode: DrinkMode
  seat: number
  isHost: boolean
}

/**
 * Réglages de room contrôlés par l’hôte (Phase multi-map). Diffusés à tout le
 * lobby : aucun client ne peut imposer sa propre valeur.
 */
export interface RoomSettings {
  mapId: BoardMapId
}

/** Intentions de lobby (avant lancement). Réservées à l’hôte. */
export type LobbyIntent =
  | { type: 'select_map'; mapId: BoardMapId }
  | { type: 'update_room_settings'; settings: Partial<RoomSettings> }
  | { type: 'start_game' }

export interface HelloPayload {
  clientId: ClientId
  name: string
  avatar: string
  drinkMode: DrinkMode
}

/** Résolution de prison choisie par le joueur (Phase 5). */
export type JailAction = 'bail' | 'double' | 'card'

/** Actions qu’un joueur peut demander pendant son tour. */
export type Intent =
  | { type: 'roll' }
  | { type: 'buy'; yes: boolean }
  | { type: 'ackCard' }
  | { type: 'jail'; action: JailAction }
  | { type: 'endTurn' }
  | { type: 'endGame' }
  // ── Gestion des établissements & hypothèques (Phase 11B, hors déplacement) ──
  | { type: 'build'; spaceId: string }
  | { type: 'sellBuilding'; spaceId: string }
  | { type: 'mortgage'; spaceId: string }
  | { type: 'unmortgage'; spaceId: string }
  // ── Enchères (canal parallèle : tout joueur, phase awaiting_auction) ────────
  | { type: 'bid'; amount: number }
  | { type: 'passBid' }
  // ── Négociation (canal parallèle, hors machine à états du tour) ─────────
  | { type: 'tradeCreate'; receiverId: string; offered: TradeBundle; requested: TradeBundle }
  | { type: 'tradeRespond'; offerId: string; accept: boolean }
  | { type: 'tradeCounter'; offerId: string; offered: TradeBundle; requested: TradeBundle }
  | { type: 'tradeCancel'; offerId: string }
  // ── Marché Noir : achat sur la case (phase awaiting_market) ────────────
  /** `cardId: null` = quitter le marché sans acheter. `pay` = argent ou gorgées. */
  | { type: 'marketBuy'; cardId: string | null; pay: 'cash' | 'sips' }
  // ── Marché Noir : jouer une carte (canal parallèle, même hors de son tour) ──
  | { type: 'marketUse'; cardId: string; targetId?: string | null }
  // ── Ambiance : bascule de mode de boisson (soft à tout moment) ──────────
  | { type: 'setDrinkMode'; mode: DrinkMode }

/** Résultat d’un lancer à rediffuser aux clients (les gorgées sont dérivées côté client). */
export interface SyncResult {
  roll: DiceRoll
  outcome: SpaceOutcome
  salary: number
  passedStart: boolean
  byClientId: ClientId
  bankruptcy: BankruptcyInfo | null
}

/** Messages émis par un client vers l’hôte. */
export type ClientMessage =
  | { t: 'hello'; hello: HelloPayload; protocolVersion?: string }
  | { t: 'intent'; clientId: ClientId; intent: Intent; meta?: IntentMeta; protocolVersion?: string }
  /** Intention de lobby (choix du plateau, réglages, lancement) — hôte uniquement. */
  | { t: 'lobbyIntent'; clientId: ClientId; intent: LobbyIntent; protocolVersion?: string }
  | { t: 'chat'; clientId: ClientId; text: string }
  | { t: 'leave'; clientId: ClientId }
  /** Demande de resynchronisation (reconnexion) : le client indique la version qu’il détient. */
  | { t: 'resync'; clientId: ClientId; haveVersion: number }

/** Messages émis par l’hôte (autorité) vers tous les clients. */
export type ServerMessage =
  | { t: 'lobby'; members: LobbyMember[]; settings?: RoomSettings }
  | { t: 'state'; state: GameState; sync: SyncResult | null; hostEpoch?: number; snapshotVersion?: number }
  /** Mise à jour d’état liée à la négociation : ne touche pas au reveal du tour. */
  | { t: 'tradeState'; state: GameState; hostEpoch?: number; snapshotVersion?: number }
  /** Snapshot complet (reconnexion / migration d’hôte). */
  | { t: 'snapshot'; snapshot: unknown; to?: ClientId; hostEpoch: number }
  /** Changement d’hôte (nouvelle époque autoritaire). */
  | { t: 'hostChanged'; hostId: ClientId; hostEpoch: number; members: LobbyMember[] }
  | { t: 'chat'; clientId: ClientId; name: string; text: string; at: number }
  | { t: 'error'; to: ClientId; message: string }
