import { describe, expect, it } from 'vitest'
import {
  assertValidDilemmaCatalog,
  createPlayerCareerPackage,
  createRng,
  isDilemmaEligible,
  listDefaultFoundingChoices,
  pickDilemma,
  processDueDilemmaEffects,
  quickGenerateDraft,
  resolveDilemmaChoiceEngine,
  validateDilemmaCatalog,
  type PlayerCreationDraft,
} from '../index'
import type { DilemmaDefinition } from './types'

function draft(seed: string): PlayerCreationDraft {
  return {
    ...quickGenerateDraft(seed),
    firstName: 'Léo',
    lastName: 'Martin',
    foundingChoices: listDefaultFoundingChoices(),
    seed,
  }
}

function sampleEvent(overrides: Partial<DilemmaDefinition> = {}): DilemmaDefinition {
  return {
    id: 'test_sample_event',
    version: 1,
    title: 'Test événement',
    body: 'Un texte narratif assez long pour passer la validation minimale du schéma.',
    category: 'mental',
    tags: ['test'],
    rarity: 'common',
    weight: 10,
    ageMin: 16,
    ageMax: 40,
    positions: null,
    careerStages: null,
    prerequisites: [],
    exclusions: [],
    cooldownSeasons: 1,
    unique: false,
    expiresAtSeason: null,
    followUpEventIds: [],
    choices: [
      {
        id: 'a',
        label: 'Prudence',
        stance: 'prudent',
        riskPreview: 'Peu de gain, peu de perte visible.',
        immediate: [
          { type: 'delta', target: { kind: 'resource', id: 'moral' }, delta: 2 },
        ],
        delayed: [],
        hidden: [],
      },
      {
        id: 'b',
        label: 'Risque',
        stance: 'high_risk',
        riskPreview: 'Gain possible, contrepartie floue.',
        immediate: [
          {
            type: 'delta',
            target: { kind: 'resource', id: 'popularite' },
            delta: 5,
          },
        ],
        delayed: [
          {
            seasonOffset: 2,
            effects: [
              {
                type: 'delta',
                target: { kind: 'relation', id: 'coach' },
                delta: -8,
              },
            ],
          },
        ],
        hidden: [
          {
            type: 'delta',
            target: { kind: 'hidden', id: 'ambition' },
            delta: 3,
          },
        ],
        nextEventIds: [],
      },
    ],
    ...overrides,
  }
}

describe('validateDilemmaCatalog', () => {
  it('accepte un mini-catalogue cohérent', () => {
    const issues = validateDilemmaCatalog([sampleEvent()]).filter(
      (i) => i.severity === 'error',
    )
    expect(issues).toEqual([])
  })

  it('rejette un événement sans choix suffisants', () => {
    const broken = {
      ...sampleEvent(),
      choices: [sampleEvent().choices[0]],
    } as DilemmaDefinition
    const issues = validateDilemmaCatalog([broken])
    expect(
      issues.some(
        (i) =>
          i.message.includes('choix') ||
          i.message.includes('Schéma invalide'),
      ),
    ).toBe(true)
  })

  it('rejette une référence vers un événement inexistant', () => {
    const base = sampleEvent()
    const withBadRef = sampleEvent({
      choices: [
        base.choices[0]!,
        {
          ...base.choices[1]!,
          nextEventIds: ['does_not_exist'],
        },
      ],
    })
    const issues = validateDilemmaCatalog([withBadRef])
    expect(issues.some((i) => i.message.includes('inexistant'))).toBe(true)
  })

  it('détecte une boucle narrative A→B→A', () => {
    const fillerA = sampleEvent().choices[0]!
    const fillerB = sampleEvent().choices[1]!
    const a = sampleEvent({
      id: 'loop_a',
      choices: [
        {
          id: 'go',
          label: 'Vers B',
          stance: 'ambitious',
          riskPreview: 'Suite.',
          immediate: [{ type: 'queueEvent', eventId: 'loop_b' }],
          delayed: [],
          hidden: [],
        },
        fillerA,
      ],
    })
    const b = sampleEvent({
      id: 'loop_b',
      choices: [
        {
          id: 'back',
          label: 'Vers A',
          stance: 'emotional',
          riskPreview: 'Retour.',
          immediate: [{ type: 'queueEvent', eventId: 'loop_a' }],
          delayed: [],
          hidden: [],
        },
        fillerB,
      ],
    })
    const issues = validateDilemmaCatalog([a, b])
    expect(issues.some((i) => i.message.includes('Boucle'))).toBe(true)
  })

  it('assertValidDilemmaCatalog throw si erreurs', () => {
    const base = sampleEvent()
    expect(() =>
      assertValidDilemmaCatalog([
        sampleEvent({
          choices: [
            base.choices[0]!,
            {
              ...base.choices[1]!,
              nextEventIds: ['missing_target'],
            },
          ],
        }),
      ]),
    ).toThrow(/invalide/)
  })
})

describe('resolveDilemmaChoice + delayed', () => {
  it('applique effets immédiats, cache et file des retardés', () => {
    const pkg = createPlayerCareerPackage(draft('dilemma-resolve-test'))
    const event = sampleEvent()
    const { package: next, log } = resolveDilemmaChoiceEngine(pkg, event, 'b')
    expect(log.choiceId).toBe('b')
    expect(log.queuedDelayed).toBe(1)
    expect(next.snapshot.state.resources.popularite).toBeGreaterThan(
      pkg.snapshot.state.resources.popularite,
    )
    expect(next.snapshot.state.flags[`seen:${event.id}`]).toBe(true)
    expect(next.snapshot.state.pendingEffects.length).toBeGreaterThan(0)

    const dueSeason =
      next.snapshot.state.pendingEffects.find(
        (p) => p.payload.kind === 'dilemma_delayed',
      )?.triggerSeason ?? next.snapshot.state.seasonIndex + 2

    const aged = {
      ...next,
      snapshot: {
        ...next.snapshot,
        state: {
          ...next.snapshot.state,
          seasonIndex: dueSeason,
        },
      },
    }

    const coachBefore = aged.snapshot.state.relationships.coach
    const processed = processDueDilemmaEffects(aged)
    expect(processed.snapshot.state.relationships.coach).toBeLessThan(coachBefore)
    expect(
      processed.snapshot.state.pendingEffects.some(
        (p) => p.payload.kind === 'dilemma_delayed',
      ),
    ).toBe(false)
  })

  it('pickDilemma est déterministe pour une seed donnée', () => {
    const pkg = createPlayerCareerPackage(draft('pick-dilemma-seed'))
    const catalog = [
      sampleEvent({ id: 'pick_a', weight: 10 }),
      sampleEvent({ id: 'pick_b', weight: 10 }),
      sampleEvent({ id: 'pick_c', weight: 10 }),
    ]
    const a = pickDilemma(
      catalog,
      pkg.snapshot.state,
      pkg.playerProfile,
      createRng('pick-dilemma-seed:season:1'),
    )
    const b = pickDilemma(
      catalog,
      pkg.snapshot.state,
      pkg.playerProfile,
      createRng('pick-dilemma-seed:season:1'),
    )
    expect(a?.id).toBe(b?.id)
    expect(a).not.toBeNull()
    expect(isDilemmaEligible(a!, pkg.snapshot.state, pkg.playerProfile)).toBe(
      true,
    )
  })
})
