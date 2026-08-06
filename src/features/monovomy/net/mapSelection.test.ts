import { describe, it, expect } from 'vitest'
import { classicSquareMap } from '../content/maps/classicSquare'
import { actionCards } from '../content/cards'
import { createGame, startClock, boardForState, boardForMapId } from '../engine'
import type { GameConfig, GameState, PlayerSetup } from '../engine/types'
import {
  initSnapshot,
  restoreSnapshot,
  applyStampedIntent,
  createIntentStamper,
  gameIdForSeed,
  isMapCompatible,
  snapshotMapId,
  type RoomMember,
  type Snapshot,
} from './session'
import {
  applyLobbyIntent,
  defaultRoomSettings,
  parseLobbyIntent,
  startBlocker,
  type LobbyRoom,
} from './lobbyReducer'

const POOL = actionCards.map((c) => c.id)
const cfg = (extra: Partial<GameConfig> = {}): GameConfig => ({
  difficulty: 'inter',
  durationMinutes: 60,
  bankruptcy: 'none',
  themeId: 'soiree',
  seed: 'map-net',
  ...extra,
})
const setups = (n: number): PlayerSetup[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `J${i + 1}`,
    avatar: `${i + 1}`,
    drinkMode: 'alcohol' as const,
  }))

function members(n: number): RoomMember[] {
  return Array.from({ length: n }, (_, i) => ({
    clientId: `c${i + 1}`,
    playerId: `p${i + 1}`,
    name: `J${i + 1}`,
    avatar: `${i + 1}`,
    drinkMode: 'alcohol' as RoomMember['drinkMode'],
    seat: i,
    connected: true,
    lastSeenAt: 0,
  }))
}

function baseGame(): GameState {
  return startClock(createGame(cfg(), setups(3), POOL), 1000)
}
function baseSnapshot(): Snapshot {
  return initSnapshot(baseGame(), members(3), 'c1', 1000)
}

const room = (patch: Partial<LobbyRoom> = {}): LobbyRoom => ({
  hostId: 'c1',
  started: false,
  memberCount: 4,
  settings: defaultRoomSettings(),
  ...patch,
})

describe('état de partie — map figée à la création', () => {
  it('inscrit mapId et mapVersion dans l’état', () => {
    const state = createGame(cfg(), setups(3), POOL)
    expect(state.mapId).toBe('classic_square')
    expect(state.mapVersion).toBe(classicSquareMap.version)
  })

  it('retombe sur le plateau classique quand la config ne précise rien', () => {
    const state = createGame(cfg(), setups(3), POOL)
    expect(boardForState(state)).toBe(classicSquareMap)
  })

  it('refuse une map inconnue à la création', () => {
    expect(() => boardForMapId('nawak')).toThrow(/unknown_map/)
    // @ts-expect-error map hors registre : la création doit échouer bruyamment
    expect(() => createGame(cfg({ mapId: 'nawak' }), setups(3), POOL)).toThrow(/unknown_map/)
  })

  it('résout le plateau par défaut hors partie', () => {
    expect(boardForState(null)).toBe(classicSquareMap)
  })

  it('conserve la map à travers les tours (immuable)', () => {
    let state = createGame(cfg(), setups(3), POOL)
    const before = state.mapId
    state = startClock(state, 1000)
    expect(state.mapId).toBe(before)
    expect(state.mapVersion).toBe(classicSquareMap.version)
  })
})

describe('lobby — sélection de la map par l’hôte', () => {
  it('accepte la sélection de l’hôte', () => {
    const r = applyLobbyIntent(room(), 'c1', { type: 'select_map', mapId: 'classic_square' })
    expect(r.error).toBeNull()
    expect(r.room.settings.mapId).toBe('classic_square')
  })

  it('refuse la sélection d’un client non-hôte', () => {
    const r = applyLobbyIntent(room(), 'c2', { type: 'select_map', mapId: 'classic_square' })
    expect(r.error).toBe('not_host')
    expect(r.room.settings.mapId).toBe(defaultRoomSettings().mapId)
  })

  it('accepte de basculer sur Infinity Party', () => {
    const r = applyLobbyIntent(room(), 'c1', { type: 'select_map', mapId: 'infinity_party' })
    expect(r.error).toBeNull()
    expect(r.room.settings.mapId).toBe('infinity_party')
  })

  it('refuse une map absente du registre', () => {
    // @ts-expect-error identifiant hors registre
    const r = applyLobbyIntent(room(), 'c1', { type: 'select_map', mapId: 'atlantide' })
    expect(r.error).toBe('unknown_map')
  })

  it('refuse tout changement de map après le lancement', () => {
    const r = applyLobbyIntent(room({ started: true }), 'c1', {
      type: 'select_map',
      mapId: 'classic_square',
    })
    expect(r.error).toBe('game_started')
  })

  it('met à jour les réglages de room', () => {
    const r = applyLobbyIntent(room(), 'c1', {
      type: 'update_room_settings',
      settings: { mapId: 'classic_square' },
    })
    expect(r.error).toBeNull()
    expect(r.room.settings.mapId).toBe('classic_square')
  })

  it('refuse le lancement si la map ne supporte pas le nombre de joueurs', () => {
    const r = applyLobbyIntent(room({ memberCount: 2 }), 'c1', { type: 'start_game' })
    expect(r.error).toBe('unsupported_player_count')
    expect(r.start).toBe(false)
    expect(startBlocker(room({ memberCount: 2 }))).toBe('unsupported_player_count')
    expect(startBlocker(room({ memberCount: 4 }))).toBeNull()
  })

  it('verrouille la room au lancement', () => {
    const r = applyLobbyIntent(room(), 'c1', { type: 'start_game' })
    expect(r.error).toBeNull()
    expect(r.start).toBe(true)
    expect(r.room.started).toBe(true)
  })

  it('valide les intentions reçues du réseau', () => {
    expect(parseLobbyIntent({ type: 'select_map', mapId: 'classic_square' })).toEqual({
      type: 'select_map',
      mapId: 'classic_square',
    })
    expect(parseLobbyIntent({ type: 'select_map', mapId: 'carre' })).toBeNull()
    expect(parseLobbyIntent({ type: 'pirate' })).toBeNull()
    expect(parseLobbyIntent(null)).toBeNull()
  })
})

describe('snapshots — la map voyage avec la partie', () => {
  it('inscrit la map dans le snapshot initial', () => {
    const snap = baseSnapshot()
    expect(snap.mapId).toBe('classic_square')
    expect(snap.mapVersion).toBe(classicSquareMap.version)
    expect(snapshotMapId(snap)).toBe('classic_square')
  })

  it('restaure une partie sur sa propre map', () => {
    const r = restoreSnapshot(baseSnapshot())
    expect(r.error).toBeNull()
    expect(r.snapshot?.mapId).toBe('classic_square')
    expect(boardForState(r.snapshot?.state)).toBe(classicSquareMap)
  })

  it('accepte un ancien snapshot sans mapId et matérialise le repli', () => {
    const snap = baseSnapshot()
    const legacy = { ...snap, mapId: undefined, mapVersion: undefined } as Snapshot
    // @ts-expect-error simulation d'un état antérieur au multi-map
    legacy.state = { ...legacy.state, mapId: undefined, mapVersion: undefined }
    const r = restoreSnapshot(legacy)
    expect(r.error).toBeNull()
    expect(r.snapshot?.mapId).toBe('classic_square')
    expect(r.snapshot?.state.mapId).toBe('classic_square')
  })

  it('refuse une map inconnue au lieu de restaurer sur une autre', () => {
    const snap = { ...baseSnapshot(), mapId: 'atlantide' } as unknown as Snapshot
    const r = restoreSnapshot(snap)
    expect(r.snapshot).toBeNull()
    expect(r.error).toBe('unknown_map')
  })

  it('refuse une version de map incompatible', () => {
    const snap = { ...baseSnapshot(), mapVersion: '99.0.0' } as Snapshot
    const r = restoreSnapshot(snap)
    expect(r.snapshot).toBeNull()
    expect(r.error).toBe('incompatible_map')
    expect(isMapCompatible('classic_square', '99.0.0')).toBe(false)
    expect(isMapCompatible('classic_square', classicSquareMap.version)).toBe(true)
  })

  it('rejette une intention résolue sur une autre map que celle de la partie', () => {
    const snap = baseSnapshot()
    const stamper = createIntentStamper('p1', gameIdForSeed('map-net'), 0)
    const wrongBoard = { ...classicSquareMap, id: 'infinity_party' as const }
    const r = applyStampedIntent(snap, wrongBoard, 'c1', stamper.stamp({ type: 'roll' }, 1100), 1100)
    expect(r.outcome).toBe('map_mismatch')
    expect(r.snapshot).toBe(snap)
  })

  it('applique normalement une intention sur la bonne map', () => {
    const snap = baseSnapshot()
    const stamper = createIntentStamper('p1', gameIdForSeed('map-net'), 0)
    const r = applyStampedIntent(snap, classicSquareMap, 'c1', stamper.stamp({ type: 'roll' }, 1100), 1100)
    expect(r.outcome).toBe('applied')
    expect(r.snapshot.state.mapId).toBe('classic_square')
  })
})
