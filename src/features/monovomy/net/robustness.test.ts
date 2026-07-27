import { describe, it, expect } from 'vitest'
import { soireeBoard } from '../content/board.soiree'
import { actionCards } from '../content/cards'
import { createGame, startClock } from '../engine'
import type { GameConfig, GameState, PlayerSetup } from '../engine/types'
import {
  initSnapshot,
  applyStampedIntent,
  createIntentStamper,
  setMemberConnected,
  electHost,
  acceptServerEpoch,
  restoreSnapshot,
  isNewerSnapshot,
  gameIdForSeed,
  type RoomMember,
  type Snapshot,
  type StampedIntent,
} from './session'
import { createMemorySnapshotStore } from './snapshotStore'
import { applyIntent } from './hostReducer'

const POOL = actionCards.map((c) => c.id)
const BOARD = soireeBoard
const cfg = (): GameConfig => ({ difficulty: 'inter', durationMinutes: 60, bankruptcy: 'none', themeId: 'soiree', seed: 'net9' })
const setups = (n: number): PlayerSetup[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `J${i + 1}`, avatar: `${i + 1}`, drinkMode: (i % 2 ? 'soft' : 'alcohol') as PlayerSetup['drinkMode'] }))

function members(n: number): RoomMember[] {
  return Array.from({ length: n }, (_, i) => ({
    clientId: `c${i + 1}`,
    playerId: `p${i + 1}`,
    name: `J${i + 1}`,
    avatar: `${i + 1}`,
    drinkMode: (i % 2 ? 'soft' : 'alcohol') as RoomMember['drinkMode'],
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

/** Estampille pour le joueur `playerId` (siège correspondant). */
function stamperFor(playerId: string) {
  return createIntentStamper(playerId, gameIdForSeed('net9'), 0)
}

describe('Phase 9 — idempotence des intentions', () => {
  it('n’applique un message dupliqué qu’une seule fois', () => {
    const snap = baseSnapshot()
    const s = stamperFor('p1')
    const roll = s.stamp({ type: 'roll' }, 1100)

    const first = applyStampedIntent(snap, BOARD, 'c1', roll, 1100)
    expect(first.outcome).toBe('applied')
    const second = applyStampedIntent(first.snapshot, BOARD, 'c1', roll, 1100)
    expect(second.outcome).toBe('duplicate')
    // Aucun double effet : version et état inchangés après le doublon.
    expect(second.snapshot.snapshotVersion).toBe(first.snapshot.snapshotVersion)
    expect(second.snapshot.state).toEqual(first.snapshot.state)
  })

  it('rejette une séquence périmée (message retardé / ordre inversé)', () => {
    const snap = baseSnapshot()
    const s = stamperFor('p1')
    const i1 = s.stamp({ type: 'roll' }, 1100) // seq 1
    // On applique d’abord une séquence supérieure fabriquée, puis l’ancienne.
    const i2: StampedIntent = { ...i1, intentId: 'p1-2', sequence: 2 }
    const afterHi = applyStampedIntent(snap, BOARD, 'c1', i2, 1100)
    expect(afterHi.outcome).toBe('applied')
    const afterLo = applyStampedIntent(afterHi.snapshot, BOARD, 'c1', i1, 1100)
    expect(afterLo.outcome).toBe('stale_sequence')
  })

  it('rejette un protocole incompatible', () => {
    const snap = baseSnapshot()
    const bad: StampedIntent = { intentId: 'x', playerId: 'p1', gameId: gameIdForSeed('net9'), sequence: 1, createdAt: 0, protocolVersion: '2.0.0', intent: { type: 'roll' } }
    expect(applyStampedIntent(snap, BOARD, 'c1', bad, 1100).outcome).toBe('protocol_mismatch')
  })
})

describe('Phase 9 — le client n’est pas source de vérité', () => {
  it('refuse une action au nom d’un autre joueur', () => {
    const snap = baseSnapshot()
    // c1 (p1) tente d’estampiller au nom de p2.
    const spoof: StampedIntent = { intentId: 'p2-1', playerId: 'p2', gameId: gameIdForSeed('net9'), sequence: 1, createdAt: 0, protocolVersion: '1.0.0', intent: { type: 'roll' } }
    expect(applyStampedIntent(snap, BOARD, 'c1', spoof, 1100).outcome).toBe('spoofed_player')
  })

  it('refuse un lancer hors tour', () => {
    const snap = baseSnapshot() // tour de p1
    const s = stamperFor('p2')
    const res = applyStampedIntent(snap, BOARD, 'c2', s.stamp({ type: 'roll' }, 1100), 1100)
    expect(res.outcome).toBe('rejected')
    expect(res.error).toBe('not_your_turn')
  })

  it('ne peut pas créer d’argent : achat sans fonds n’altère pas le cash', () => {
    const snap = baseSnapshot()
    // On force une décision d’achat sur une propriété trop chère.
    const prop = BOARD.spaces.find((sp) => sp.kind === 'property' && sp.price > 0)!
    const idx = BOARD.spaces.indexOf(prop)
    snap.state.phase = 'awaiting_purchase'
    snap.state.players[0]!.position = idx
    snap.state.players[0]!.cash = 10 // insuffisant
    const before = snap.state.players[0]!.cash
    const s = stamperFor('p1')
    const res = applyStampedIntent(snap, BOARD, 'c1', s.stamp({ type: 'buy', yes: true }, 1100), 1100)
    expect(res.outcome).toBe('applied')
    expect(res.snapshot.state.players[0]!.cash).toBe(before) // pas de cash négatif ni de bien acquis
    expect(res.snapshot.state.players[0]!.ownedSpaceIds).not.toContain(prop.id)
  })
})

describe('Phase 9 — déconnexion / reconnexion', () => {
  it('un joueur déconnecté conserve son patrimoine et n’est pas éliminé', () => {
    let snap = baseSnapshot()
    snap.state.players[1]!.cash = 1234
    snap = setMemberConnected(snap, 'c2', false, 2000)
    const m = snap.members.find((x) => x.clientId === 'c2')!
    expect(m.connected).toBe(false)
    expect(snap.state.players[1]!.eliminated).toBe(false)
    expect(snap.state.players[1]!.cash).toBe(1234)
    // Le joueur reste dans la partie (pas transformé en spectateur).
    expect(snap.members.some((x) => x.clientId === 'c2')).toBe(true)
  })

  it('déconnexion pendant un achat : l’action par défaut débloque sans créer d’argent', () => {
    const snap = baseSnapshot()
    snap.state.phase = 'awaiting_purchase'
    const before = snap.state.players[0]!.cash
    // Auto-résolution hôte (refus d’achat) — le joueur inactif ne bloque pas.
    const res = applyIntent(snap.state, 'c1', { c1: 0, c2: 1, c3: 2 }, { type: 'buy', yes: false }, BOARD, 3000)
    expect(res.error).toBeNull()
    expect(res.state.phase).toBe('turn_cleanup')
    expect(res.state.players[0]!.cash).toBe(before)
  })

  it('reconnexion pendant une carte : restaure identité, mode soft et phase', () => {
    const snap = baseSnapshot()
    snap.state.phase = 'awaiting_card'
    snap.state.pendingCardId = POOL[0]!
    const restored = restoreSnapshot(snap)
    expect(restored.error).toBeNull()
    expect(restored.snapshot!.state.phase).toBe('awaiting_card')
    const p2 = restored.snapshot!.members.find((m) => m.clientId === 'c2')!
    expect(p2.drinkMode).toBe('soft') // mode soft restauré
    expect(restored.snapshot!.state.players[1]!.drinkMode).toBe('soft')
  })
})

describe('Phase 9 — migration d’hôte', () => {
  it('élit un nouvel hôte déterministe et incrémente l’époque', () => {
    const snap = baseSnapshot() // hôte c1 (siège 0)
    const { snapshot: next, newHostId } = electHost(snap, 'c1', 4000)
    expect(newHostId).toBe('c2') // plus petit siège connecté restant
    expect(next.hostEpoch).toBe(snap.hostEpoch + 1)
    // La partie n’est pas annulée : l’état moteur est intact.
    expect(next.state).toEqual(snap.state)
  })

  it('empêche deux hôtes simultanés : les commandes de l’ancienne époque sont rejetées', () => {
    const snap = baseSnapshot()
    const { snapshot: migrated } = electHost(snap, 'c1', 4000)
    // Un client à jour (epoch 2) rejette un message serveur d’epoch 1 (ancien hôte).
    expect(acceptServerEpoch(migrated.hostEpoch, snap.hostEpoch)).toBe(false)
    expect(acceptServerEpoch(migrated.hostEpoch, migrated.hostEpoch)).toBe(true)
  })

  it('choisit le prochain siège si un candidat est déconnecté', () => {
    let snap = baseSnapshot()
    snap = setMemberConnected(snap, 'c2', false, 3500)
    const { newHostId } = electHost(snap, 'c1', 4000)
    expect(newHostId).toBe('c3')
  })
})

describe('Phase 9 — snapshots & versions', () => {
  it('ignore un snapshot plus ancien (ordre inversé) et accepte un plus récent', () => {
    const older = baseSnapshot()
    const newer = { ...older, snapshotVersion: 5 }
    expect(isNewerSnapshot(older, newer)).toBe(true)
    expect(isNewerSnapshot(newer, older)).toBe(false)
    // Une nouvelle époque prime sur la version.
    const migrated = { ...older, hostEpoch: older.hostEpoch + 1, snapshotVersion: 1 }
    expect(isNewerSnapshot(newer, migrated)).toBe(true)
  })

  it('refuse de restaurer un snapshot de contenu incompatible', () => {
    const snap = { ...baseSnapshot(), contentVersion: '9.9.9' }
    expect(restoreSnapshot(snap).error).toBe('incompatible_content')
  })
})

describe('Phase 9 — déterminisme après reconnexion', () => {
  it('recharger (save/load) ne change pas le résultat', async () => {
    const store = createMemorySnapshotStore()
    const s1 = stamperFor('p1')
    const roll = s1.stamp({ type: 'roll' }, 1100)

    // (a) sans interruption
    const direct = applyStampedIntent(baseSnapshot(), BOARD, 'c1', roll, 1100)

    // (b) avec sauvegarde + restauration avant application
    await store.save('ROOM', baseSnapshot())
    const loaded = await store.load('ROOM')
    const restored = restoreSnapshot(loaded!).snapshot!
    const afterReload = applyStampedIntent(restored, BOARD, 'c1', roll, 1100)

    expect(afterReload.snapshot.state).toEqual(direct.snapshot.state)
    expect(afterReload.snapshot.rngState).toBe(direct.snapshot.rngState)
  })

  it('un doublon injecté ne change pas l’état final vs un flux propre', () => {
    const clean = stamperFor('p1')
    const rc = clean.stamp({ type: 'roll' }, 1100)
    const cleanRun = applyStampedIntent(baseSnapshot(), BOARD, 'c1', rc, 1100)

    let dup = applyStampedIntent(baseSnapshot(), BOARD, 'c1', rc, 1100)
    dup = applyStampedIntent(dup.snapshot, BOARD, 'c1', rc, 1100) // doublon
    dup = applyStampedIntent(dup.snapshot, BOARD, 'c1', rc, 1100) // encore

    expect(dup.snapshot.state).toEqual(cleanRun.snapshot.state)
  })
})
