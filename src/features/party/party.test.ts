import { describe, expect, it } from 'vitest'
import {
  LEVELS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_WEREWOLF_PLAYERS,
  PETIT_BAC_LETTERS,
  type CardRank,
  type CardSuit,
  advanceDeck,
  assignImpostors,
  busCorrect,
  cardValue,
  DEALER_MAX_PENALTY,
  FUSES,
  GUESS_WHO_SIZE,
  dealGuessWho,
  isGuessWhoCode,
  normalizeCode,
  randomCode,
  MAX_PYRAMID_PLAYERS,
  MIN_PYRAMID_PLAYERS,
  PYRAMID_HAND,
  PYRAMID_SIZE,
  dealPyramid,
  dealerPenalty,
  dealerValue,
  dealerVerdict,
  holdsRank,
  pyramidRow,
  randomFuse,
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
import { HUB_ORDER, PARTY_BASE_PATH, PARTY_GAMES, findGame } from './games'
import { buildMixCard } from './mix'
import { KINGS_RULES, LAST_KING } from './content/kings'
import { NIGHT_STEPS, WEREWOLF_ROLES } from './content/werewolf'
import { suspectPhotos } from './content/guessWhoPhotos'

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

describe('Jeux de soirée — Le Bus', () => {
  const c = (rank: CardRank, suit: CardSuit) => ({ rank, suit })

  it('rouge ou noir', () => {
    expect(busCorrect(0, [c('7', '♥')], 'red')).toBe(true)
    expect(busCorrect(0, [c('7', '♣')], 'red')).toBe(false)
    expect(busCorrect(0, [c('7', '♠')], 'black')).toBe(true)
  })

  it('plus haut ou plus bas, l’As est le plus fort et l’égalité perd', () => {
    expect(busCorrect(1, [c('7', '♥'), c('A', '♠')], 'higher')).toBe(true)
    expect(busCorrect(1, [c('7', '♥'), c('2', '♠')], 'lower')).toBe(true)
    expect(busCorrect(1, [c('7', '♥'), c('7', '♠')], 'higher')).toBe(false)
    expect(busCorrect(1, [c('7', '♥'), c('7', '♠')], 'lower')).toBe(false)
    expect(cardValue('A')).toBe(14)
    expect(cardValue('J')).toBe(11)
  })

  it('entre les deux ou à l’extérieur, bornes perdantes', () => {
    const base = [c('4', '♥'), c('Q', '♠')]
    expect(busCorrect(2, [...base, c('9', '♦')], 'inside')).toBe(true)
    expect(busCorrect(2, [...base, c('K', '♦')], 'outside')).toBe(true)
    expect(busCorrect(2, [...base, c('2', '♦')], 'outside')).toBe(true)
    expect(busCorrect(2, [...base, c('4', '♦')], 'inside')).toBe(false)
    expect(busCorrect(2, [...base, c('4', '♦')], 'outside')).toBe(false)
  })

  it('l’enseigne', () => {
    const drawn = [c('4', '♥'), c('Q', '♠'), c('9', '♦'), c('3', '♣')]
    expect(busCorrect(3, drawn, '♣')).toBe(true)
    expect(busCorrect(3, drawn, '♥')).toBe(false)
  })
})

describe('Jeux de soirée — Croupier, Pyramide, Patate chaude', () => {
  const c = (rank: CardRank, suit: CardSuit = '♠') => ({ rank, suit })

  it('Croupier : As = 1, Roi = 13, verdict et pénalité plafonnée', () => {
    expect(dealerValue('A')).toBe(1)
    expect(dealerValue('K')).toBe(13)
    expect(dealerVerdict(c('7'), 7)).toBe('exact')
    expect(dealerVerdict(c('7'), 3)).toBe('higher')
    expect(dealerVerdict(c('7'), 10)).toBe('lower')
    expect(dealerPenalty(c('7'), 5)).toBe(2)
    expect(dealerPenalty(c('A'), 13)).toBe(DEALER_MAX_PENALTY)
  })

  it('Pyramide : mains de 4 cartes, 15 cartes de pyramide, aucune carte en double', () => {
    for (let n = MIN_PYRAMID_PLAYERS; n <= MAX_PYRAMID_PLAYERS; n++) {
      const { hands, pyramid } = dealPyramid(n, seeded(n))
      expect(hands).toHaveLength(n)
      for (const hand of hands) expect(hand).toHaveLength(PYRAMID_HAND)
      expect(pyramid).toHaveLength(PYRAMID_SIZE)
      const all = [...hands.flat(), ...pyramid].map((x) => `${x.rank}${x.suit}`)
      expect(new Set(all).size).toBe(all.length)
    }
    expect(() => dealPyramid(1)).toThrow()
    expect(() => dealPyramid(MAX_PYRAMID_PLAYERS + 1)).toThrow()
  })

  it('Pyramide : étages de la base (1) au sommet (5)', () => {
    expect([0, 4, 5, 8, 9, 11, 12, 13, 14].map(pyramidRow)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5])
    expect(holdsRank([c('7'), c('K')], 'K')).toBe(true)
    expect(holdsRank([c('7'), c('K')], 'A')).toBe(false)
  })

  it('Patate chaude : la mèche reste dans son intervalle', () => {
    for (const fuse of ['short', 'normal', 'long'] as const) {
      for (let seed = 0; seed < 200; seed++) {
        const s = randomFuse(fuse, seeded(seed))
        expect(s).toBeGreaterThanOrEqual(FUSES[fuse][0])
        expect(s).toBeLessThanOrEqual(FUSES[fuse][1])
      }
    }
  })

  it('Roue des gages : intitulés courts, au moins 8 gages par niveau', () => {
    const wheel = findGame('roue-des-gages')
    if (wheel?.kind !== 'wheel') throw new Error('Roue des gages introuvable')
    for (const level of LEVELS) {
      expect(wheel.cards[level].length).toBeGreaterThanOrEqual(8)
      for (const g of wheel.cards[level]) expect(g.label.length, g.label).toBeLessThanOrEqual(14)
    }
  })
})

describe('Jeux de soirée — Qui est-ce ?', () => {
  it('même code, même partie ; secrets distincts, plateau sans doublon', () => {
    for (let seed = 0; seed < 100; seed++) {
      const code = randomCode(seeded(seed))
      expect(isGuessWhoCode(code)).toBe(true)
      for (const round of [0, 1, 7]) {
        const a = dealGuessWho(`${code}-soft`, round, 62)
        expect(dealGuessWho(`${code}-soft`, round, 62)).toEqual(a)
        expect(a.board).toHaveLength(GUESS_WHO_SIZE)
        expect(new Set(a.board).size).toBe(GUESS_WHO_SIZE)
        for (const i of a.board) expect(i).toBeLessThan(62)
        expect(a.secrets[0]).not.toBe(a.secrets[1])
        for (const s of a.secrets) expect(s).toBeLessThan(GUESS_WHO_SIZE)
      }
    }
    expect(() => dealGuessWho('ABCD', 0, GUESS_WHO_SIZE - 1)).toThrow()
  })

  it('roulement : aucun suspect ne revient avant que tout le paquet soit passé', () => {
    const size = 62
    const rounds = Math.floor(size / GUESS_WHO_SIZE)
    const seen = Array.from({ length: rounds }, (_, r) => dealGuessWho('ABCD-hot', r, size).board).flat()
    expect(new Set(seen).size).toBe(rounds * GUESS_WHO_SIZE)
    // Sur un cycle complet, chaque suspect passe au moins une fois.
    const cycle = Array.from({ length: Math.ceil(size / GUESS_WHO_SIZE) }, (_, r) => dealGuessWho('ABCD-hot', r, size).board)
    expect(new Set(cycle.flat()).size).toBe(size)
  })

  it('normalise la saisie du code', () => {
    expect(normalizeCode(' ab-c d9z ')).toBe('ABCD')
    expect(normalizeCode('io01')).toBe('')
    expect(isGuessWhoCode('abcd')).toBe(false)
    expect(isGuessWhoCode('ABC')).toBe(false)
  })

  it('assez de suspects par niveau, noms uniques, fiches courtes', () => {
    const game = findGame('qui-est-ce')
    if (game?.kind !== 'guess-who') throw new Error('Qui est-ce ? introuvable')
    const all = LEVELS.flatMap((l) => game.cards[l].map((s) => s.name))
    expect(new Set(all).size).toBe(all.length)
    for (const level of LEVELS) {
      expect(game.cards[level].length).toBeGreaterThanOrEqual(60)
      for (const s of game.cards[level]) {
        expect(s.name.length, s.name).toBeLessThanOrEqual(24)
        expect(s.record.length, s.name).toBeLessThanOrEqual(100)
        expect(s.emoji.length, s.name).toBeGreaterThan(0)
        // Photo libre obligatoire (npm run party:photos) ; l'emoji ne sert que si elle ne charge pas.
        const photo = suspectPhotos[s.name]
        expect(photo?.src, s.name).toMatch(/^https:\/\/upload\.wikimedia\.org\//)
        expect(photo?.license.length, s.name).toBeGreaterThan(0)
      }
    }
  })
})

describe('Jeux de soirée — catalogue', () => {
  it('le classement par popularité couvre chaque jeu une seule fois', () => {
    expect([...HUB_ORDER].sort()).toEqual(PARTY_GAMES.map((g) => g.slug).sort())
    expect(PARTY_GAMES.map((g) => g.slug)).toEqual(HUB_ORDER)
  })

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
                : game.kind === 'quiz'
                  ? LEVELS.map((l) => game.cards[l].map((q) => q.question))
                  : game.kind === 'wheel'
                    ? LEVELS.map((l) => game.cards[l].map((g) => g.text))
                    : game.kind === 'hot-potato'
                      ? LEVELS.map((l) => game.cards[l])
                  : game.kind === 'deck' ||
                      game.kind === 'timed' ||
                      game.kind === 'petit-bac' ||
                      game.kind === 'five-seconds' ||
                      game.kind === 'yes-no'
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
