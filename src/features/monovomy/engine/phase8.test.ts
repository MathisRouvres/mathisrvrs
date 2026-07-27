import { describe, it, expect } from 'vitest'
import { soireeBoard } from '../content/board.soiree'
import { actionCards } from '../content/cards'
import { temporaryRules, getRuleById } from '../content/rules'
import { temporaryRuleSchema } from '../content/schema'
import {
  createGame,
  computeIntensity,
  advanceIntensity,
  intensityRank,
  cardAllowedAtIntensity,
  activateRule,
  expireRules,
  ruleStepsLeft,
  softAlternative,
  SOFT_CATEGORIES,
  evaluateReminder,
} from './index'
import type { GameConfig, GameState, PlayerSetup } from './types'

const POOL = actionCards.map((c) => c.id)
const BOARD = soireeBoard
const cfg = (): GameConfig => ({ difficulty: 'inter', durationMinutes: 60, bankruptcy: 'none', themeId: 'soiree', seed: 'p8' })
const setups = (n: number): PlayerSetup[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `J${i + 1}`, avatar: `${i + 1}`, drinkMode: 'alcohol' as const }))

function fresh(n = 3): GameState {
  return createGame(cfg(), setups(n), POOL)
}

describe('Phase 8 — intensité d’ambiance', () => {
  it('démarre en warmup', () => {
    const s = fresh()
    expect(s.partyIntensity).toBe('warmup')
    expect(computeIntensity(s, BOARD, s.startedAt)).toBe('warmup')
  })

  it('bascule en finale quand le temps est presque écoulé', () => {
    const s = fresh()
    s.startedAt = 1000
    s.endsAt = 1000 + 600_000
    expect(computeIntensity(s, BOARD, 1000 + 590_000)).toBe('finale')
  })

  it('est déterministe pour les mêmes entrées', () => {
    const s = fresh()
    s.turn = 8
    s.cardsPlayed = 10
    expect(computeIntensity(s, BOARD, 5000)).toBe(computeIntensity(s, BOARD, 5000))
  })

  it('ne redescend jamais (cliquet)', () => {
    const s = fresh()
    s.partyIntensity = 'chaos'
    // Conditions calmes → cible warmup/party, mais on ne redescend pas.
    const res = advanceIntensity(s, BOARD, s.startedAt)
    expect(res.changed).toBe(false)
    expect(res.state.partyIntensity).toBe('chaos')
  })

  it('monte visiblement avec le temps (warmup ≠ finale)', () => {
    const s = fresh()
    s.startedAt = 1000
    s.endsAt = 1000 + 600_000
    const early = computeIntensity(s, BOARD, 1000)
    const late = computeIntensity(s, BOARD, 1000 + 595_000)
    expect(intensityRank(late)).toBeGreaterThan(intensityRank(early))
  })
})

describe('Phase 8 — éligibilité des cartes par intensité', () => {
  it('filtre selon le niveau', () => {
    expect(cardAllowedAtIntensity(undefined, 'warmup')).toBe(true)
    expect(cardAllowedAtIntensity('finale', 'warmup')).toBe(false)
    expect(cardAllowedAtIntensity('finale', 'finale')).toBe(true)
    expect(cardAllowedAtIntensity('party', 'chaos')).toBe(true)
  })
})

describe('Phase 8 — règles temporaires', () => {
  it('active une règle et calcule l’expiration en étapes', () => {
    const def = getRuleById('rule_loyers_doubles')!
    const r = activateRule(fresh(), def, 1000)
    expect(r.state.activeRules).toHaveLength(1)
    const rule = r.state.activeRules[0]!
    expect(rule.expiresAtStep).toBe(def.duration.value) // turnStep 0 + 4
    expect(ruleStepsLeft(rule, 0)).toBe(def.duration.value)
  })

  it('respecte les politiques de cumul replace / stack / ignore', () => {
    const replaceDef = getRuleById('rule_loyers_doubles')! // replace
    let s = activateRule(fresh(), replaceDef, 0).state
    s = activateRule(s, replaceDef, 0).state
    expect(s.activeRules.filter((r) => r.id === replaceDef.id)).toHaveLength(1)

    const stackDef = getRuleById('rule_mot_interdit')! // stack
    let s2 = activateRule(fresh(), stackDef, 0).state
    s2 = activateRule(s2, stackDef, 0).state
    expect(s2.activeRules.filter((r) => r.id === stackDef.id)).toHaveLength(2)

    const ignoreDef = getRuleById('rule_encheres')! // ignore
    let s3 = activateRule(fresh(), ignoreDef, 0).state
    s3 = activateRule(s3, ignoreDef, 0).state
    expect(s3.activeRules.filter((r) => r.id === ignoreDef.id)).toHaveLength(1)
  })

  it('expire une règle en tours (turnStep) et en minutes', () => {
    const turnDef = getRuleById('rule_loyers_doubles')! // turn value 4
    let s = activateRule(fresh(), turnDef, 0).state
    s.turnStep = turnDef.duration.value
    const expTurn = expireRules(s, 0)
    expect(expTurn.changed).toBe(true)
    expect(expTurn.state.activeRules).toHaveLength(0)

    const minDef = getRuleById('rule_prix_reduits')! // minutes value 3
    const s2 = activateRule(fresh(), minDef, 1000).state
    expect(expireRules(s2, 1000 + 60_000).changed).toBe(false) // pas encore
    expect(expireRules(s2, 1000 + 3 * 60_000 + 1).changed).toBe(true)
  })
})

describe('Phase 8 — mode soft varié (déterministe)', () => {
  it('est déterministe pour une même clé', () => {
    expect(softAlternative('seed', 'k1')).toEqual(softAlternative('seed', 'k1'))
  })

  it('évite la catégorie précédente', () => {
    const a = softAlternative('seed', 'same')
    const b = softAlternative('seed', 'same', a.category)
    expect(b.category).not.toBe(a.category)
  })

  it('produit de la variété entre clés', () => {
    const cats = new Set(Array.from({ length: 12 }, (_, i) => softAlternative('seed', `key-${i}`).category))
    expect(cats.size).toBeGreaterThanOrEqual(3)
    for (const c of cats) expect(SOFT_CATEGORIES).toContain(c)
  })
})

describe('Phase 8 — rappels de modération', () => {
  it('déclenche au passage en chaos', () => {
    expect(evaluateReminder({ now: 0, lastReminderAt: 0, sanctionStreak: 0, prevIntensity: 'party', intensity: 'chaos' })?.kind).toBe('chaos')
  })
  it('déclenche avant la finale', () => {
    expect(evaluateReminder({ now: 0, lastReminderAt: 0, sanctionStreak: 0, prevIntensity: 'chaos', intensity: 'finale' })?.kind).toBe('pre_finale')
  })
  it('déclenche sur une séquence de sanctions', () => {
    expect(evaluateReminder({ now: 0, lastReminderAt: 0, sanctionStreak: 6, prevIntensity: 'party', intensity: 'party' })?.kind).toBe('streak')
  })
  it('déclenche après l’intervalle d’hydratation', () => {
    expect(evaluateReminder({ now: 10 * 60_000, lastReminderAt: 0, sanctionStreak: 0, prevIntensity: 'party', intensity: 'party' })?.kind).toBe('hydration')
  })
  it('ne déclenche rien sinon', () => {
    expect(evaluateReminder({ now: 1000, lastReminderAt: 500, sanctionStreak: 0, prevIntensity: 'party', intensity: 'party' })).toBeNull()
  })
})

describe('Phase 8 — contenu', () => {
  it('toutes les règles temporaires respectent le schéma', () => {
    for (const rule of temporaryRules) expect(() => temporaryRuleSchema.parse(rule)).not.toThrow()
  })
  it('toute carte à ruleId référence une règle existante', () => {
    for (const card of actionCards) {
      if (card.ruleId) expect(getRuleById(card.ruleId), card.id).toBeDefined()
    }
  })
  it('propose du contenu de finale et de rattrapage', () => {
    expect(actionCards.some((c) => c.tags?.includes('finale'))).toBe(true)
    expect(actionCards.some((c) => c.tags?.includes('catchup'))).toBe(true)
    expect(actionCards.some((c) => c.intensity === 'finale')).toBe(true)
  })
})
