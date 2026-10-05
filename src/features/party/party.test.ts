import { describe, expect, it } from 'vitest'
import {
  LEVELS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_WEREWOLF_PLAYERS,
  PETIT_BAC_LETTERS,
  advanceDeck,
  assignImpostors,
  createCardDeck,
  createDeck,
  currentCard,
  dealWerewolfRoles,
  drawLetter,
  maxImpostors,
  pickStarter,
  sanitizePlayers,
  shuffle,
  werewolfCount,
  werewolfWinner,
} from './engine'
import { PARTY_BASE_PATH, PARTY_GAMES, findGame } from './games'
import { buildMixCard } from './mix'
import { KINGS_RULES, LAST_KING } from './content/kings'
import { NIGHT_STEPS, WEREWOLF_ROLES } from './content/werewolf'

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function seeded(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('Jeux de soirée — moteur', () => {
  it('shuffle garde les mêmes éléments sans muter la source', () => {
    const source = [1, 2, 3, 4, 5, 6]
    const out = shuffle(source, seeded(1))
    expect(source).toEqual([1, 2, 3, 4, 5, 6])
    expect([...out].sort()).toEqual(source)
  })

  it('le paquet montre chaque carte une fois avant de remélanger', () => {
    const rng = seeded(2)
    let deck = createDeck(10, rng)
    const seen = new Set<number | undefined>([currentCard(deck)])
    for (let i = 0; i < 9; i++) {
      deck = advanceDeck(deck, rng)
      seen.add(currentCard(deck))
    }
    expect(seen.size).toBe(10)
  })

  it('le remélange ne rejoue jamais immédiatement la dernière carte', () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = seeded(seed)
      let deck = createDeck(5, rng)
      for (let i = 0; i < 4; i++) deck = advanceDeck(deck, rng)
      const last = currentCard(deck)
      deck = advanceDeck(deck, rng)
      expect(deck.position).toBe(0)
      expect(currentCard(deck)).not.toBe(last)
    }
  })

  it('les imposteurs restent toujours minoritaires', () => {
    expect(maxImpostors(3)).toBe(1)
    expect(maxImpostors(4)).toBe(1)
    expect(maxImpostors(5)).toBe(2)
    expect(maxImpostors(8)).toBe(3)
    for (let n = 3; n <= MAX_PLAYERS; n++) {
      const roles = assignImpostors(n, 99, seeded(n))
      const count = roles.filter(Boolean).length
      expect(roles).toHaveLength(n)
      expect(count).toBe(maxImpostors(n))
      expect(count * 2).toBeLessThan(n)
    }
  })

  it('refuse une partie d’Imposteur à moins de 3 joueurs', () => {
    expect(() => assignImpostors(2, 1)).toThrow()
  })

  it('le premier à parler n’est jamais un imposteur', () => {
    for (let seed = 0; seed < 100; seed++) {
      const roles = assignImpostors(6, 2, seeded(seed))
      expect(roles[pickStarter(roles, seeded(seed + 1))]).toBe(false)
    }
  })

  it('sanitizePlayers nettoie, tronque et plafonne', () => {
    const long = 'x'.repeat(50)
    expect(sanitizePlayers(['  Léa  ', '', '   ', 'Tom   Hardy', 42, long])).toEqual([
      'Léa',
      'Tom Hardy',
      'x'.repeat(MAX_NAME_LENGTH),
    ])
    expect(sanitizePlayers(Array.from({ length: 30 }, (_, i) => `J${i}`))).toHaveLength(MAX_PLAYERS)
  })
})

describe('Jeux de soirée — Loup-Garou', () => {
  it('ajuste le nombre de loups à la table', () => {
    expect(werewolfCount(6)).toBe(2)
    expect(werewolfCount(9)).toBe(3)
    expect(werewolfCount(12)).toBe(4)
  })

  it('distribue un rôle par joueur avec au moins un villageois', () => {
    for (let n = MIN_WEREWOLF_PLAYERS; n <= MAX_PLAYERS; n++) {
      const roles = dealWerewolfRoles(n, ['seer', 'witch', 'hunter', 'cupid', 'littleGirl'], seeded(n))
      expect(roles).toHaveLength(n)
      expect(roles.filter((r) => r === 'wolf')).toHaveLength(werewolfCount(n))
      expect(roles).toContain('villager')
      expect(new Set(roles.filter((r) => r !== 'wolf' && r !== 'villager')).size).toBe(
        roles.filter((r) => r !== 'wolf' && r !== 'villager').length,
      )
    }
    expect(() => dealWerewolfRoles(5, [])).toThrow()
  })

  it('détermine le vainqueur', () => {
    const roles = ['wolf', 'wolf', 'villager', 'villager', 'seer', 'witch'] as const
    expect(werewolfWinner(roles, [true, true, true, true, true, true])).toBeNull()
    expect(werewolfWinner(roles, [false, false, true, true, true, true])).toBe('village')
    expect(werewolfWinner(roles, [true, true, true, true, false, false])).toBe('wolves')
  })

  it('décrit chaque rôle et chaque étape de nuit', () => {
    for (const meta of Object.values(WEREWOLF_ROLES)) expect(meta.description.length).toBeGreaterThan(0)
    for (const step of NIGHT_STEPS) {
      if (step.role) expect(WEREWOLF_ROLES[step.role]).toBeDefined()
    }
  })
})

describe('Jeux de soirée — Petit Bac, Jeu du Roi, Mix', () => {
  it('tire une lettre jouable différente de la précédente', () => {
    for (let seed = 0; seed < 100; seed++) {
      const letter = drawLetter(seeded(seed), 'A')
      expect(PETIT_BAC_LETTERS).toContain(letter)
      expect(letter).not.toBe('A')
    }
  })

  it('le paquet du Jeu du Roi a 52 cartes uniques dont 4 Rois, toutes avec une règle', () => {
    const deck = createCardDeck(seeded(3))
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map((c) => `${c.rank}${c.suit}`)).size).toBe(52)
    expect(deck.filter((c) => c.rank === 'K')).toHaveLength(4)
    for (const card of deck) {
      for (const level of LEVELS) expect(KINGS_RULES[card.rank].text[level].length).toBeGreaterThan(0)
    }
    for (const level of LEVELS) expect(LAST_KING[level].length).toBeGreaterThan(0)
  })

  it('le Mix adresse ses cartes aux joueurs, à tous les niveaux', () => {
    const players = ['Léa', 'Tom', 'Sam']
    for (const level of LEVELS) {
      for (let seed = 0; seed < 300; seed++) {
        const card = buildMixCard(level, players, seeded(seed))
        expect(card.text.length).toBeGreaterThan(10)
        expect(card.text).not.toContain('undefined')
      }
    }
    expect(() => buildMixCard('soft', ['Seul'])).toThrow()
  })
})

describe('Jeux de soirée — catalogue', () => {
  it('a des slugs uniques et retrouvables', () => {
    const slugs = PARTY_GAMES.map((g) => g.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(findGame(slug)?.slug).toBe(slug)
    }
    expect(findGame('inconnu')).toBeUndefined()
    expect(PARTY_BASE_PATH).toBe('/games/soiree')
  })

  it('chaque jeu propose assez de contenu, sans doublon, à chaque niveau', () => {
    for (const game of PARTY_GAMES) {
      const pools: string[][] =
        game.kind === 'truth-or-dare'
          ? LEVELS.flatMap((l) => [game.cards.truth[l], game.cards.dare[l]])
          : game.kind === 'impostor'
            ? LEVELS.map((l) => game.cards[l].map((s) => s.word))
            : game.kind === 'choice' || game.kind === 'undercover'
              ? LEVELS.map((l) => game.cards[l].map(([a, b]) => `${a} | ${b}`))
              : game.kind === 'timed' && game.variant === 'taboo'
                ? LEVELS.map((l) => game.cards[l].map((c) => c.word))
                : game.kind === 'deck' || game.kind === 'timed' || game.kind === 'petit-bac'
                  ? LEVELS.map((l) => game.cards[l])
                  : []

      for (const pool of pools) {
        expect(pool.length, game.slug).toBeGreaterThanOrEqual(150)
        expect(new Set(pool).size, game.slug).toBe(pool.length)
        for (const entry of pool) expect(entry.trim().length, game.slug).toBeGreaterThan(0)
      }
    }
  })

  it('chaque carte Mot interdit a 5 mots interdits distincts, sans le mot à deviner', () => {
    const taboo = findGame('mot-interdit')
    if (taboo?.kind !== 'timed' || taboo.variant !== 'taboo') throw new Error('Mot interdit introuvable')
    for (const level of LEVELS) {
      for (const card of taboo.cards[level]) {
        const forbidden = card.forbidden.map((f) => f.toLowerCase())
        expect(new Set(forbidden).size, card.word).toBe(5)
        expect(forbidden, card.word).not.toContain(card.word.toLowerCase())
      }
    }
  })

  it('a des règles et un minimum de joueurs cohérent', () => {
    for (const game of PARTY_GAMES) {
      expect(game.rules.length).toBeGreaterThan(0)
      expect(game.minPlayers).toBeGreaterThanOrEqual(game.kind === 'impostor' ? 3 : 2)
    }
  })
})
