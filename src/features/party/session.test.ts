import { describe, expect, it } from 'vitest'
import { createCardDeck, createDeck } from './engine'
import {
  SESSION_KEY,
  SESSION_TTL_MS,
  clearGame,
  isCardDeck,
  isDeck,
  lastSession,
  readGameState,
  readStore,
  writeGameField,
  type StorageLike,
} from './session'

function memoryStorage(initial?: string): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(SESSION_KEY, initial)
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const NOW = 1_800_000_000_000

describe('sauvegarde de partie', () => {
  it('relit un champ écrit pour le même jeu et le même niveau', () => {
    const storage = memoryStorage()
    writeGameField('quiz', 'soft', 'scores', [2, 1], NOW, storage)
    expect(readGameState('quiz', 'soft', NOW + 1000, storage)).toEqual({ scores: [2, 1] })
  })

  it('ignore une partie jouée à un autre niveau, et repart de zéro en écrivant', () => {
    const storage = memoryStorage()
    writeGameField('quiz', 'soft', 'scores', [2, 1], NOW, storage)
    expect(readGameState('quiz', 'spicy', NOW, storage)).toBeNull()
    writeGameField('quiz', 'spicy', 'team', 1, NOW, storage)
    expect(readGameState('quiz', 'spicy', NOW, storage)).toEqual({ team: 1 })
  })

  it('oublie une partie de plus de 4 h', () => {
    const storage = memoryStorage()
    writeGameField('quiz', 'soft', 'team', 1, NOW, storage)
    expect(readGameState('quiz', 'soft', NOW + SESSION_TTL_MS + 1, storage)).toBeNull()
  })

  it('résiste à un stockage corrompu ou absent', () => {
    expect(readStore(NOW, memoryStorage('{pas du json'))).toEqual({})
    expect(readStore(NOW, memoryStorage('[1,2]'))).toEqual({})
    expect(readStore(NOW, memoryStorage(JSON.stringify({ quiz: { level: 3 } })))).toEqual({})
    expect(readStore(NOW, null)).toEqual({})
    expect(() => writeGameField('quiz', 'soft', 'team', 1, NOW, null)).not.toThrow()
  })

  it('ne casse pas la partie si le stockage est plein', () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(() => writeGameField('quiz', 'soft', 'team', 1, NOW, storage)).not.toThrow()
  })

  it('donne la dernière partie jouée et permet de l’abandonner', () => {
    const storage = memoryStorage()
    writeGameField('quiz', 'soft', 'team', 1, NOW, storage)
    writeGameField('loup-garou', 'all', 'night', 2, NOW + 5000, storage)
    expect(lastSession(NOW + 6000, storage)).toEqual({ slug: 'loup-garou', level: 'all', savedAt: NOW + 5000 })
    clearGame('loup-garou', NOW + 6000, storage)
    expect(lastSession(NOW + 6000, storage)?.slug).toBe('quiz')
    clearGame('quiz', NOW + 6000, storage)
    expect(storage.data.has(SESSION_KEY)).toBe(false)
  })
})

describe('validation des valeurs relues', () => {
  it('accepte un paquet cohérent avec le nombre de cartes', () => {
    const deck = createDeck(10)
    expect(isDeck(deck, 10)).toBe(true)
    expect(isDeck(deck, 11)).toBe(false)
    expect(isDeck({ order: [0, 0, 1], position: 0 }, 3)).toBe(false)
    expect(isDeck({ order: [0, 1, 2], position: 3 }, 3)).toBe(false)
    expect(isDeck(null, 3)).toBe(false)
  })

  it('accepte un paquet de 52 cartes distinctes', () => {
    const deck = createCardDeck()
    expect(isCardDeck(deck)).toBe(true)
    expect(isCardDeck([...deck.slice(1), deck[0]])).toBe(true)
    expect(isCardDeck([...deck.slice(1), deck[1]])).toBe(false)
    expect(isCardDeck(deck.slice(1))).toBe(false)
  })
})
