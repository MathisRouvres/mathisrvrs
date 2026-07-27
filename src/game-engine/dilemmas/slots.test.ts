import { describe, expect, it } from 'vitest'
import {
  createCareer,
  resolveDilemmaChoice,
  getNextDilemma,
} from '../index'
import {
  passesContextGuards,
  pickDilemmaForSlot,
  slotForCategory,
} from './slots'
import type { DilemmaDefinition } from './types'
import type { CareerState } from '../types/career'

function makeEvent(
  overrides: Partial<DilemmaDefinition> = {},
): DilemmaDefinition {
  return {
    id: 'slot_test_event',
    version: 1,
    title: 'Événement de test',
    body: 'Un corps narratif suffisamment long pour la validation minimale du schéma de dilemme.',
    category: 'match',
    tags: [],
    rarity: 'common',
    weight: 10,
    ageMin: 14,
    ageMax: 55,
    positions: null,
    careerStages: null,
    prerequisites: [],
    exclusions: [],
    cooldownSeasons: 2,
    unique: false,
    expiresAtSeason: null,
    followUpEventIds: [],
    choices: [
      {
        id: 'a',
        label: 'Option A',
        stance: 'prudent',
        riskPreview: 'Aperçu.',
        immediate: [
          { type: 'delta', target: { kind: 'resource', id: 'moral' }, delta: 2 },
        ],
        delayed: [],
        hidden: [],
      },
      {
        id: 'b',
        label: 'Option B',
        stance: 'ambitious',
        riskPreview: 'Aperçu.',
        immediate: [
          { type: 'delta', target: { kind: 'resource', id: 'moral' }, delta: -2 },
        ],
        delayed: [],
        hidden: [],
      },
    ],
    ...overrides,
  }
}

function baseState(): CareerState {
  const pkg = createCareer({
    countryId: 'cote-brumeuse',
    macroPosition: 'midfielder',
    seed: 'slots-test',
  })
  return pkg.snapshot.state
}

describe('slotForCategory', () => {
  it('classe le sportif en slot 1 et la carrière en slot 2', () => {
    expect(slotForCategory('match')).toBe(1)
    expect(slotForCategory('training')).toBe(1)
    expect(slotForCategory('coach')).toBe(1)
    expect(slotForCategory('injury')).toBe(1)
    expect(slotForCategory('rivalry')).toBe(1)
    expect(slotForCategory('transfer')).toBe(2)
    expect(slotForCategory('contract')).toBe(2)
    expect(slotForCategory('media')).toBe(2)
    expect(slotForCategory('national_team')).toBe(2)
    expect(slotForCategory('career_end')).toBe(2)
    expect(slotForCategory('narrative_chain')).toBeNull()
  })
})

describe('passesContextGuards', () => {
  it('bloque la répétition immédiate du même événement', () => {
    const state = baseState()
    const event = makeEvent()
    expect(passesContextGuards(event, state)).toBe(true)
    const repeated = { ...state, flags: { lastDilemmaId: event.id } }
    expect(passesContextGuards(event, repeated)).toBe(false)
  })

  it('bloque un transfert juste après une signature', () => {
    const state = baseState()
    const transfer = makeEvent({ category: 'transfer' })
    expect(passesContextGuards(transfer, state)).toBe(true)
    const justSigned = {
      ...state,
      flags: { lastSigningSeason: state.seasonIndex },
    }
    expect(passesContextGuards(transfer, justSigned)).toBe(false)
    const longAgo = {
      ...state,
      seasonIndex: state.seasonIndex + 3,
      flags: { lastSigningSeason: state.seasonIndex },
    }
    expect(passesContextGuards(transfer, longAgo)).toBe(true)
  })

  it('bloque la sélection nationale en cas de blessure grave', () => {
    const state = baseState()
    const call = makeEvent({ category: 'national_team' })
    expect(passesContextGuards(call, state)).toBe(true)
    const injured = {
      ...state,
      resources: { ...state.resources, sante: 20 },
    }
    expect(passesContextGuards(call, injured)).toBe(false)
    const flagged = { ...state, flags: { grave_injury_risk: true } }
    expect(passesContextGuards(call, flagged)).toBe(false)
  })

  it('bloque la retraite à 19 ans sans contexte exceptionnel', () => {
    const state = { ...baseState(), age: 19 }
    const retirement = makeEvent({ category: 'career_end' })
    expect(passesContextGuards(retirement, state)).toBe(false)
    const crisis = { ...state, flags: { career_crisis: true } }
    expect(passesContextGuards(retirement, crisis)).toBe(true)
    const old = { ...state, age: 34, flags: {} }
    expect(passesContextGuards(retirement, old)).toBe(true)
  })

  it('bloque une finale quand le club ne joue rien', () => {
    const state = { ...baseState(), competitionLevel: 20 }
    const finale = makeEvent({ tags: ['finale'] })
    expect(passesContextGuards(finale, state)).toBe(false)
    const contender = { ...state, competitionLevel: 60 }
    expect(passesContextGuards(finale, contender)).toBe(true)
  })
})

describe('pickDilemmaForSlot', () => {
  const maxRng = {
    weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
      let best = 0
      for (let i = 1; i < weights.length; i += 1) {
        if ((weights[i] ?? 0) > (weights[best] ?? 0)) best = i
      }
      return items[best] as T
    },
  }

  it('favorise le sportif au slot 1 et la carrière au slot 2', () => {
    const pkg = createCareer({
      countryId: 'cote-brumeuse',
      macroPosition: 'midfielder',
      seed: 'slot-pick',
    })
    const catalog = [
      makeEvent({ id: 'ev_sport', category: 'match', weight: 10 }),
      makeEvent({ id: 'ev_career', category: 'contract', weight: 10 }),
    ]
    const state = pkg.snapshot.state
    const slot1 = pickDilemmaForSlot(catalog, state, pkg.playerProfile, maxRng, 1)
    const slot2 = pickDilemmaForSlot(catalog, state, pkg.playerProfile, maxRng, 2)
    expect(slot1?.id).toBe('ev_sport')
    expect(slot2?.id).toBe('ev_career')
  })

  it('retombe sur l’autre famille si le slot est vide (total reste 2)', () => {
    const pkg = createCareer({
      countryId: 'cote-brumeuse',
      macroPosition: 'midfielder',
      seed: 'slot-fallback',
    })
    const onlyCareer = [makeEvent({ id: 'ev_only', category: 'contract' })]
    const picked = pickDilemmaForSlot(
      onlyCareer,
      pkg.snapshot.state,
      pkg.playerProfile,
      maxRng,
      1,
    )
    expect(picked?.id).toBe('ev_only')
  })
})

describe('résolution express — retours UI', () => {
  it('expose variations visibles et signal de conséquences cachées', () => {
    const pkg = createCareer({
      countryId: 'cote-brumeuse',
      macroPosition: 'attacker',
      seed: 'deltas-test',
    })
    const dilemma = getNextDilemma(pkg)
    expect(dilemma).not.toBeNull()
    const choice = dilemma!.choices[0]!
    const result = resolveDilemmaChoice(pkg, dilemma!, choice.id)
    expect(Array.isArray(result.visibleDeltas)).toBe(true)
    for (const d of result.visibleDeltas) {
      expect(typeof d.delta).toBe('number')
      expect(d.delta).not.toBe(0)
    }
    const expectHidden =
      choice.delayed.length > 0 ||
      choice.hidden.length > 0 ||
      (choice.nextEventIds?.length ?? 0) > 0 ||
      choice.immediate.some(
        (e) => e.type === 'queueEvent' || e.type === 'narrativeDebt',
      )
    expect(result.hasHiddenConsequences).toBe(expectHidden)
  })

  it('horodate la signature pour bloquer un transfert immédiat', () => {
    const pkg = createCareer({
      countryId: 'baie-lumen',
      macroPosition: 'midfielder',
      seed: 'signing-test',
    })
    const signing = makeEvent({
      id: 'test_signing',
      category: 'contract',
      choices: [
        {
          id: 'sign',
          label: 'Signer',
          stance: 'financial',
          riskPreview: 'Engagement.',
          immediate: [{ type: 'setFlag', key: 'contract_signed', value: true }],
          delayed: [],
          hidden: [],
        },
        {
          id: 'wait',
          label: 'Attendre',
          stance: 'prudent',
          riskPreview: 'Patience.',
          immediate: [
            {
              type: 'delta',
              target: { kind: 'resource', id: 'moral' },
              delta: -2,
            },
          ],
          delayed: [],
          hidden: [],
        },
      ],
    })
    const { package: next } = resolveDilemmaChoice(pkg, signing, 'sign')
    expect(next.snapshot.state.flags.lastSigningSeason).toBe(
      next.snapshot.state.seasonIndex,
    )
    const transfer = makeEvent({ id: 'test_transfer', category: 'transfer' })
    expect(passesContextGuards(transfer, next.snapshot.state)).toBe(false)
  })
})
