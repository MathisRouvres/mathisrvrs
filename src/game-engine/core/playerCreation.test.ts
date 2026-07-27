import { describe, expect, it } from 'vitest'
import { foundingCategories } from '../../game-content/founding'
import { positions } from '../../game-content/positions'
import {
  HIDDEN_MAX,
  HIDDEN_MIN,
  HIDDEN_TRAIT_IDS,
  RESOURCE_IDS,
  RESOURCE_MAX,
  RESOURCE_MIN,
  SPORT_STAT_IDS,
  STAT_MAX,
  STAT_MIN,
  createPlayerCareerPackage,
  listDefaultFoundingChoices,
  quickGenerateDraft,
  type PlayerCreationDraft,
} from '../index'

function baseDraft(
  overrides: Partial<PlayerCreationDraft> = {},
): PlayerCreationDraft {
  return {
    firstName: 'Alex',
    lastName: 'Martin',
    nickname: null,
    originId: 'cote-brumeuse',
    birthYear: 2008,
    primaryPosition: 'cm',
    secondaryPosition: 'cam',
    strongFoot: 'right',
    heightCm: 178,
    playstyleId: 'architect',
    visualId: 'slate',
    difficulty: 'balanced',
    careerLength: 'standard',
    foundingChoices: listDefaultFoundingChoices(),
    seed: 'test-seed-player-creation',
    ...overrides,
  }
}

function assertBounds(pkg: ReturnType<typeof createPlayerCareerPackage>) {
  for (const id of SPORT_STAT_IDS) {
    const value = pkg.snapshot.state.stats[id]
    expect(value).toBeGreaterThanOrEqual(STAT_MIN)
    expect(value).toBeLessThanOrEqual(STAT_MAX)
  }
  for (const id of RESOURCE_IDS) {
    const value = pkg.snapshot.state.resources[id]
    expect(value).toBeGreaterThanOrEqual(RESOURCE_MIN)
    expect(value).toBeLessThanOrEqual(RESOURCE_MAX)
  }
  for (const id of HIDDEN_TRAIT_IDS) {
    const value = pkg.snapshot.state.hiddenTraits[id]
    expect(value).toBeGreaterThanOrEqual(HIDDEN_MIN)
    expect(value).toBeLessThanOrEqual(HIDDEN_MAX)
  }
  expect(pkg.playerProfile.potentialStars).toBeGreaterThanOrEqual(1)
  expect(pkg.playerProfile.potentialStars).toBeLessThanOrEqual(5)
  expect(pkg.journal.events.length).toBeGreaterThanOrEqual(2)
  expect(pkg.snapshot.state.phase).toBe('playing')
}

describe('création joueur Phase 2', () => {
  it('produit une carrière jouable avec bornes respectées', () => {
    const pkg = createPlayerCareerPackage(baseDraft())
    assertBounds(pkg)
    expect(pkg.playerProfile.displayName).toContain('Alex')
    expect(pkg.snapshot.state.hiddenTraits.potentiel).toBeTypeOf('number')
  })

  it('reste déterministe pour une même seed + mêmes choix', () => {
    const a = createPlayerCareerPackage(baseDraft({ seed: 'same-seed' }))
    const b = createPlayerCareerPackage(baseDraft({ seed: 'same-seed' }))
    expect(a.snapshot.state.stats).toEqual(b.snapshot.state.stats)
    expect(a.snapshot.state.hiddenTraits).toEqual(b.snapshot.state.hiddenTraits)
    expect(a.playerProfile.potentialStars).toBe(b.playerProfile.potentialStars)
  })

  it('couvre tous les postes principaux de façon jouable', () => {
    for (const position of positions) {
      const pkg = createPlayerCareerPackage(
        baseDraft({
          primaryPosition: position.id,
          secondaryPosition: null,
          seed: `pos-${position.id}`,
        }),
      )
      assertBounds(pkg)
      expect(pkg.playerProfile.primaryPosition).toBe(position.id)
      for (const key of position.keyStats) {
        expect(pkg.snapshot.state.stats[key]).toBeGreaterThanOrEqual(28)
      }
    }
  })

  it('couvre chaque option fondatrice sans sortir des bornes', () => {
    for (const category of foundingCategories) {
      for (const option of category.options) {
        const foundingChoices = listDefaultFoundingChoices()
        foundingChoices[category.id] = option.id
        const pkg = createPlayerCareerPackage(
          baseDraft({
            foundingChoices,
            seed: `founding-${category.id}-${option.id}`,
          }),
        )
        assertBounds(pkg)
      }
    }
  })

  it('génération rapide produit des profils valides', () => {
    for (let i = 0; i < 12; i += 1) {
      const draft = quickGenerateDraft(`quick-batch-${i}`)
      const pkg = createPlayerCareerPackage(draft)
      assertBounds(pkg)
    }
  })
})
