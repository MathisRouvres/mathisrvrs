import type { BoardTheme } from '../content/schema'
import type { GameState } from '../engine/types'
import { MONOVOMY_CONTENT_VERSION } from '../content'
import { applyIntent } from './hostReducer'
import { PROTOCOL_VERSION, type Intent, type IntentMeta } from './protocol'

/**
 * Session robuste (Phase 9) — cœur PUR, host-authoritative, testable sans réseau.
 *
 * Toute la logique de fiabilité vit ici : snapshots versionnés, idempotence des
 * intentions, migration d’hôte (hostEpoch), validation. Le client n’est jamais
 * source de vérité : il envoie des intentions estampillées, l’hôte tranche.
 */

/** Membre de la room : identité + siège + présence. */
export interface RoomMember {
  clientId: string
  playerId: string
  name: string
  avatar: string
  drinkMode: 'alcohol' | 'soft'
  seat: number
  connected: boolean
  lastSeenAt: number
}

/** Intention estampillée par un client (idempotence). */
export interface StampedIntent extends IntentMeta {
  intent: Intent
  protocolVersion: string
}

/** Entrée du journal des intentions appliquées. */
export interface AppliedRecord {
  intentId: string
  playerId: string
  sequence: number
  type: string
}

/** Snapshot versionné d’une partie — restaurable sans divergence. */
export interface Snapshot {
  snapshotVersion: number
  protocolVersion: string
  contentVersion: string
  gameId: string
  hostId: string
  hostEpoch: number
  seed: string
  /** Compteur PRNG (= state.rngState) au moment du snapshot. */
  rngState: number
  createdAt: number
  updatedAt: number
  state: GameState
  intentLog: AppliedRecord[]
  members: RoomMember[]
  lastSeqByPlayer: Record<string, number>
  seenIntentIds: string[]
}

export type ApplyOutcome =
  | 'applied'
  | 'duplicate'
  | 'stale_sequence'
  | 'spoofed_player'
  | 'unknown_sender'
  | 'wrong_game'
  | 'protocol_mismatch'
  | 'rejected'

export interface ApplyStampedResult {
  snapshot: Snapshot
  outcome: ApplyOutcome
  /** Résultat de tour à rediffuser (dé/carte) — null hors lancer. */
  sync: ReturnType<typeof applyIntent>['sync']
  error: string | null
}

const SEEN_WINDOW = 256
const JOURNAL_MAX = 500

/** Version majeure d’un semver (« 1.x.y » → « 1 »). */
function major(version: string): string {
  return version.split('.')[0] ?? version
}

export function isProtocolCompatible(version: string | undefined): boolean {
  return version === undefined || major(version) === major(PROTOCOL_VERSION)
}

export function isContentCompatible(version: string | undefined): boolean {
  return version === undefined || major(version) === major(MONOVOMY_CONTENT_VERSION)
}

export function gameIdForSeed(seed: string): string {
  return `g-${seed}`
}

/** Construit le snapshot initial (version 1, époque 1) d’une partie démarrée. */
export function initSnapshot(
  state: GameState,
  members: RoomMember[],
  hostId: string,
  now: number,
): Snapshot {
  return {
    snapshotVersion: 1,
    protocolVersion: PROTOCOL_VERSION,
    contentVersion: MONOVOMY_CONTENT_VERSION,
    gameId: gameIdForSeed(state.config.seed),
    hostId,
    hostEpoch: 1,
    seed: state.config.seed,
    rngState: state.rngState,
    createdAt: now,
    updatedAt: now,
    state,
    intentLog: [],
    members: members.map((m) => ({ ...m })),
    lastSeqByPlayer: {},
    seenIntentIds: [],
  }
}

function cloneSnapshot(snap: Snapshot): Snapshot {
  return {
    ...snap,
    members: snap.members.map((m) => ({ ...m })),
    intentLog: [...snap.intentLog],
    lastSeqByPlayer: { ...snap.lastSeqByPlayer },
    seenIntentIds: [...snap.seenIntentIds],
  }
}

function memberByClient(snap: Snapshot, clientId: string): RoomMember | undefined {
  return snap.members.find((m) => m.clientId === clientId)
}

function seatByClient(snap: Snapshot): Record<string, number> {
  const map: Record<string, number> = {}
  for (const m of snap.members) map[m.clientId] = m.seat
  return map
}

/**
 * Applique une intention estampillée à l’état autoritaire, de façon IDEMPOTENTE.
 * Rejette : mauvaise partie, protocole incompatible, émetteur inconnu, usurpation
 * de joueur, doublon (intentId déjà vu), séquence périmée. Puis délègue la
 * validation métier (tour/phase/actifs) à `applyIntent`. Fonction pure.
 */
export function applyStampedIntent(
  snap: Snapshot,
  board: BoardTheme,
  senderClientId: string,
  stamped: StampedIntent,
  now: number,
): ApplyStampedResult {
  const fail = (outcome: ApplyOutcome, error: string): ApplyStampedResult => ({ snapshot: snap, outcome, sync: null, error })

  if (!isProtocolCompatible(stamped.protocolVersion)) return fail('protocol_mismatch', 'protocol_mismatch')
  if (stamped.gameId !== snap.gameId) return fail('wrong_game', 'wrong_game')

  const sender = memberByClient(snap, senderClientId)
  if (!sender) return fail('unknown_sender', 'unknown_sender')
  if (sender.playerId !== stamped.playerId) return fail('spoofed_player', 'action_for_another_player')

  // Idempotence : intentId déjà vu, ou séquence périmée / déjà dépassée.
  if (snap.seenIntentIds.includes(stamped.intentId)) return fail('duplicate', 'duplicate')
  const lastSeq = snap.lastSeqByPlayer[stamped.playerId] ?? 0
  if (stamped.sequence <= lastSeq) return fail('stale_sequence', 'stale_sequence')

  const res = applyIntent(snap.state, senderClientId, seatByClient(snap), stamped.intent, board, now)

  // Enregistre l’intentId comme vu (même en cas de rejet métier) pour bloquer tout rejeu.
  const next = cloneSnapshot(snap)
  next.seenIntentIds = [...next.seenIntentIds, stamped.intentId].slice(-SEEN_WINDOW)

  if (res.error) {
    return { snapshot: next, outcome: 'rejected', sync: null, error: res.error }
  }

  next.state = res.state
  next.rngState = res.state.rngState
  next.snapshotVersion += 1
  next.updatedAt = now
  next.lastSeqByPlayer[stamped.playerId] = stamped.sequence
  next.intentLog = [...next.intentLog, {
    intentId: stamped.intentId,
    playerId: stamped.playerId,
    sequence: stamped.sequence,
    type: stamped.intent.type,
  }].slice(-JOURNAL_MAX)

  return { snapshot: next, outcome: 'applied', sync: res.sync, error: null }
}

/**
 * Valide un nouvel état moteur produit par l’hôte lui-même (action locale de
 * l’hôte, auto-résolution du timer, tick d’ambiance) — hors chemin idempotent
 * client. Incrémente la version et resynchronise l’identité soft des membres.
 */
export function commitState(snap: Snapshot, state: GameState, now: number): Snapshot {
  const next = cloneSnapshot(snap)
  next.state = state
  next.rngState = state.rngState
  next.snapshotVersion += 1
  next.updatedAt = now
  next.members = next.members.map((m) => {
    const p = state.players.find((pp) => pp.id === m.playerId)
    return p ? { ...m, drinkMode: p.drinkMode } : m
  })
  return next
}

/** Met à jour la présence d’un membre (connexion / déconnexion). */
export function setMemberConnected(snap: Snapshot, clientId: string, connected: boolean, now: number): Snapshot {
  if (!memberByClient(snap, clientId)) return snap
  const next = cloneSnapshot(snap)
  next.members = next.members.map((m) => (m.clientId === clientId ? { ...m, connected, lastSeenAt: now } : m))
  next.updatedAt = now
  return next
}

/**
 * Élit un nouvel hôte de façon DÉTERMINISTE (membre connecté au plus petit siège,
 * hors hôte disparu) et incrémente `hostEpoch` — toute commande de l’ancien hôte
 * (époque inférieure) sera rejetée, empêchant deux hôtes simultanés.
 */
export function electHost(snap: Snapshot, deadHostId: string, now: number): { snapshot: Snapshot; newHostId: string | null } {
  const candidates = snap.members
    .filter((m) => m.clientId !== deadHostId && m.connected)
    .sort((a, b) => a.seat - b.seat)
  const elected = candidates[0]
  if (!elected) return { snapshot: snap, newHostId: null }

  const next = cloneSnapshot(snap)
  next.hostId = elected.clientId
  next.hostEpoch += 1
  next.updatedAt = now
  return { snapshot: next, newHostId: elected.clientId }
}

/** Un message serveur d’époque `msgEpoch` est-il recevable pour un client à `knownEpoch` ? */
export function acceptServerEpoch(knownEpoch: number, msgEpoch: number): boolean {
  return msgEpoch >= knownEpoch
}

/**
 * Restaure une session depuis un snapshot. Rejette les versions incompatibles
 * (protocole / contenu). L’état moteur (dont `rngState`) étant complet, le rejeu
 * reprend sans divergence.
 */
export function restoreSnapshot(snap: Snapshot): { snapshot: Snapshot | null; error: string | null } {
  if (!isProtocolCompatible(snap.protocolVersion)) return { snapshot: null, error: 'incompatible_protocol' }
  if (!isContentCompatible(snap.contentVersion)) return { snapshot: null, error: 'incompatible_content' }
  return { snapshot: cloneSnapshot(snap), error: null }
}

/** Un snapshot reçu est-il plus récent que celui détenu ? (gère l’ordre inversé.) */
export function isNewerSnapshot(current: Snapshot | null, incoming: Snapshot): boolean {
  if (!current) return true
  if (incoming.hostEpoch !== current.hostEpoch) return incoming.hostEpoch > current.hostEpoch
  return incoming.snapshotVersion > current.snapshotVersion
}

/**
 * Fabrique d’intentions estampillées côté client : `sequence` monotone,
 * `intentId` déterministe (`playerId-seq`) — sans `Math.random`, donc rejouable
 * et idempotent. À conserver par le client (persistable pour la reconnexion).
 */
export function createIntentStamper(playerId: string, gameId: string, startSeq = 0) {
  let sequence = startSeq
  return {
    get sequence() {
      return sequence
    },
    stamp(intent: Intent, now: number): StampedIntent {
      sequence += 1
      return {
        intentId: `${playerId}-${sequence}`,
        playerId,
        gameId,
        sequence,
        createdAt: now,
        protocolVersion: PROTOCOL_VERSION,
        intent,
      }
    },
  }
}
