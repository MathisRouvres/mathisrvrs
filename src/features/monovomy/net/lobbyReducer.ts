import { z } from 'zod'
import { BOARD_MAP_IDS, DEFAULT_BOARD_MAP_ID, type BoardMapId } from '../content/maps/types'
import { getBoardMap, hasBoardMap, mapSupportsPlayerCount } from '../content/maps/registry'
import type { ClientId, LobbyIntent, RoomSettings } from './protocol'

/**
 * Réducteur de lobby (pur, host-authoritative).
 *
 * Le choix du plateau n'est **jamais** décidé par un client : seul l'hôte peut
 * émettre `select_map` / `update_room_settings` / `start_game`, et la map devient
 * immuable dès le lancement.
 */

/** État de lobby autoritaire (avant lancement de la partie). */
export interface LobbyRoom {
  hostId: ClientId
  /** La partie a déjà démarré : les réglages sont verrouillés. */
  started: boolean
  /** Nombre de joueurs présents (contrôle des bornes de la map). */
  memberCount: number
  settings: RoomSettings
}

export type LobbyError =
  | 'not_host'
  | 'unknown_map'
  | 'game_started'
  | 'unsupported_player_count'
  | 'unknown_lobby_intent'

export interface LobbyResult {
  room: LobbyRoom
  error: LobbyError | null
  /** `true` quand l'intention `start_game` est acceptée. */
  start: boolean
}

/** Réglages par défaut d'une room fraîche. */
export function defaultRoomSettings(): RoomSettings {
  return { mapId: DEFAULT_BOARD_MAP_ID }
}

export const lobbyIntentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('select_map'), mapId: z.enum(BOARD_MAP_IDS) }),
  z.object({
    type: z.literal('update_room_settings'),
    settings: z.object({ mapId: z.enum(BOARD_MAP_IDS).optional() }),
  }),
  z.object({ type: z.literal('start_game') }),
])

/** Valide une intention de lobby reçue du réseau. `null` = message rejeté. */
export function parseLobbyIntent(raw: unknown): LobbyIntent | null {
  const parsed = lobbyIntentSchema.safeParse(raw)
  return parsed.success ? (parsed.data as LobbyIntent) : null
}

function fail(room: LobbyRoom, error: LobbyError): LobbyResult {
  return { room, error, start: false }
}

/** Une map est-elle sélectionnable pour ce lobby ? */
export function canSelectMap(room: LobbyRoom, mapId: BoardMapId): boolean {
  return !room.started && hasBoardMap(mapId)
}

/**
 * Applique une intention de lobby. Pure : renvoie toujours une room (inchangée
 * en cas de rejet) et un code d'erreur explicite.
 */
export function applyLobbyIntent(
  room: LobbyRoom,
  fromClientId: ClientId,
  intent: LobbyIntent,
): LobbyResult {
  if (fromClientId !== room.hostId) return fail(room, 'not_host')
  if (room.started) return fail(room, 'game_started')

  switch (intent.type) {
    case 'select_map': {
      if (!hasBoardMap(intent.mapId)) return fail(room, 'unknown_map')
      return { room: { ...room, settings: { ...room.settings, mapId: intent.mapId } }, error: null, start: false }
    }
    case 'update_room_settings': {
      const nextMapId = intent.settings.mapId
      if (nextMapId !== undefined && !hasBoardMap(nextMapId)) return fail(room, 'unknown_map')
      return {
        room: { ...room, settings: { ...room.settings, ...intent.settings } },
        error: null,
        start: false,
      }
    }
    case 'start_game': {
      if (!hasBoardMap(room.settings.mapId)) return fail(room, 'unknown_map')
      const map = getBoardMap(room.settings.mapId)
      if (!mapSupportsPlayerCount(map, room.memberCount)) {
        return fail(room, 'unsupported_player_count')
      }
      return { room: { ...room, started: true }, error: null, start: true }
    }
    default:
      return fail(room, 'unknown_lobby_intent')
  }
}

/** Motif de blocage du bouton « Lancer », ou `null` si la partie peut démarrer. */
export function startBlocker(room: LobbyRoom): LobbyError | null {
  if (room.started) return 'game_started'
  if (!hasBoardMap(room.settings.mapId)) return 'unknown_map'
  return mapSupportsPlayerCount(getBoardMap(room.settings.mapId), room.memberCount)
    ? null
    : 'unsupported_player_count'
}
