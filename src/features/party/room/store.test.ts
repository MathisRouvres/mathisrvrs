import { describe, expect, it } from 'vitest'
import { mergeDoc, newer, playersOf, sanitizeEntries, type Doc } from './doc'
import { createRoomStore, readSavedRoom, ROOM_STORAGE_KEY } from './store'
import { createLoopbackHub } from './transport'
import type { StorageLike } from '../session'

const settle = () => new Promise((r) => setTimeout(r, 0))

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

function phone(hub: ReturnType<typeof createLoopbackHub>, clientId: string, name: string, at: number) {
  return createRoomStore({ code: 'ABCD', clientId, name, factory: hub.factory, storage: null, now: () => at })
}

describe('document partagé (LWW)', () => {
  it('converge quel que soit l’ordre de réception', () => {
    const a: Doc = { k: { v: 1, s: [2, 'aaa'] } }
    const b: Doc = { k: { v: 2, s: [2, 'bbb'] } }
    expect(mergeDoc(mergeDoc({}, a).doc, b).doc).toEqual(mergeDoc(mergeDoc({}, b).doc, a).doc)
    expect(newer([3, 'a'], [2, 'z'])).toBe(true)
    expect(newer([2, 'a'], [2, 'z'])).toBe(false)
  })

  it('écarte les entrées mal formées venues du réseau', () => {
    const clean = sanitizeEntries({
      ok: { v: 'x', s: [1, 'abc'] },
      badStamp: { v: 'x', s: [1, 'ABC!'] },
      negative: { v: 'x', s: [-1, 'abc'] },
      noValue: { s: [1, 'abc'] },
      [`${'k'.repeat(200)}`]: { v: 1, s: [1, 'abc'] },
    })
    expect(Object.keys(clean)).toEqual(['ok'])
    expect(sanitizeEntries('nope')).toEqual({})
  })

  it('dédoublonne les prénoms et exclut les spectateurs', () => {
    const { players, names } = playersOf(
      [
        { id: 'a', name: 'Léa', at: 1 },
        { id: 'b', name: 'léa', at: 2 },
        { id: 'c', name: 'Max', at: 3, spectator: true },
      ],
      ['Tom'],
      16,
    )
    expect(players).toEqual(['Léa', 'léa 2', 'Tom'])
    expect(names.c).toBe('Max')
  })
})

describe('partie à plusieurs téléphones', () => {
  it('partage les écritures et la liste des joueurs', async () => {
    const hub = createLoopbackHub()
    const a = phone(hub, 'aaa', 'Léa', 1)
    const b = phone(hub, 'bbb', 'Max', 2)
    await settle()
    a.set('g/x', 42)
    await settle()
    expect(b.get('g/x')).toBe(42)
    expect(a.snapshot().players).toEqual(['Léa', 'Max'])
    expect(b.snapshot().players).toEqual(['Léa', 'Max'])
    expect(b.snapshot().myName).toBe('Max')
    expect(a.snapshot().members.every((m) => m.online)).toBe(true)
  })

  it('un téléphone qui arrive en retard récupère tout l’état', async () => {
    const hub = createLoopbackHub()
    const a = phone(hub, 'aaa', 'Léa', 1)
    await settle()
    a.set('meta/route', 'quiz')
    a.set('g/quiz/soft/scores', [2, 1])
    await settle()
    const c = phone(hub, 'ccc', 'Zoé', 3)
    await settle()
    await settle()
    expect(c.get('meta/route')).toBe('quiz')
    expect(c.get('g/quiz/soft/scores')).toEqual([2, 1])
    expect(c.snapshot().players).toEqual(['Léa', 'Zoé'])
  })

  it('les valeurs initiales concurrentes se départagent pareil partout, et cèdent à une vraie écriture', async () => {
    const hub = createLoopbackHub()
    const a = phone(hub, 'aaa', 'Léa', 1)
    const b = phone(hub, 'bbb', 'Max', 2)
    await settle()
    a.init('deck', 'A')
    b.init('deck', 'B')
    await settle()
    expect(a.get('deck')).toBe('B')
    expect(b.get('deck')).toBe('B')
    a.set('deck', 'C')
    b.init('deck', 'D')
    await settle()
    expect(a.get('deck')).toBe('C')
    expect(b.get('deck')).toBe('C')
  })

  it('les écritures faites hors ligne repartent au retour du réseau', async () => {
    const hub = createLoopbackHub()
    const a = phone(hub, 'aaa', 'Léa', 1)
    const b = phone(hub, 'bbb', 'Max', 2)
    await settle()
    hub.setOnline('ABCD', 'bbb', false)
    await settle()
    b.set('vote/Max', 'Léa')
    a.set('round', 2)
    await settle()
    expect(a.get('vote/Max')).toBeUndefined()
    hub.setOnline('ABCD', 'bbb', true)
    await settle()
    await settle()
    expect(a.get('vote/Max')).toBe('Léa')
    expect(b.get('round')).toBe(2)
    expect(a.getPrefix('vote/')).toEqual({ Max: 'Léa' })
    expect(a.getPrefix('vote/')).toBe(a.getPrefix('vote/'))
  })

  it('retirer un téléphone de la liste le passe spectateur ; quitter le retire', async () => {
    const hub = createLoopbackHub()
    const a = phone(hub, 'aaa', 'Léa', 1)
    const b = phone(hub, 'bbb', 'Max', 2)
    await settle()
    a.setPlayers(['Léa', 'Tom'])
    await settle()
    expect(b.snapshot().players).toEqual(['Léa', 'Tom'])
    expect(b.snapshot().myName).toBeNull()
    expect(b.snapshot().members).toHaveLength(2)
    b.setPlaying(true)
    await settle()
    expect(a.snapshot().players).toEqual(['Léa', 'Max', 'Tom'])
    b.leave()
    await settle()
    expect(a.snapshot().players).toEqual(['Léa', 'Tom'])
    expect(a.snapshot().members).toHaveLength(1)
  })

  it('se sauvegarde pour reprendre après un rechargement', async () => {
    const hub = createLoopbackHub()
    const storage = memoryStorage()
    const a = createRoomStore({ code: 'ABCD', clientId: 'aaa', name: 'Léa', factory: hub.factory, storage })
    a.set('meta/level', 'spicy')
    await new Promise((r) => setTimeout(r, 350))
    const saved = readSavedRoom(storage)
    expect(saved?.code).toBe('ABCD')
    expect(saved?.doc['meta/level']?.v).toBe('spicy')
    a.leave()
    expect(storage.data.has(ROOM_STORAGE_KEY)).toBe(false)
  })
})
