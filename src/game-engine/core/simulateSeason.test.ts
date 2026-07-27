import { describe, expect, it } from 'vitest'
import {
  STAT_MAX,
  STAT_MIN,
  createPlayerCareerPackage,
  listDefaultFoundingChoices,
  simulateSeasonDetailed as simulateSeason,
  type SeasonSimulationInput,
} from '../index'
import { SPORT_STAT_IDS } from './constants'

function baseInput(
  overrides: Partial<SeasonSimulationInput> = {},
): SeasonSimulationInput {
  const pkg = createPlayerCareerPackage({
    firstName: 'Nora',
    lastName: 'Veld',
    originId: 'cote-brumeuse',
    birthYear: 2008,
    primaryPosition: 'cm',
    strongFoot: 'right',
    heightCm: 176,
    playstyleId: 'architect',
    visualId: 'slate',
    difficulty: 'balanced',
    careerLength: 'standard',
    foundingChoices: listDefaultFoundingChoices(),
    seed: 'season-sim-base',
  })
  const s = pkg.snapshot.state
  return {
    seed: s.seed,
    seasonIndex: s.seasonIndex,
    age: s.age,
    positionId: pkg.playerProfile.primaryPosition,
    difficulty: pkg.playerProfile.difficulty,
    mode: 'standard',
    careerStage: s.careerStage,
    stats: s.stats,
    resources: s.resources,
    hiddenTraits: s.hiddenTraits,
    relationships: s.relationships,
    clubInfrastructure: s.clubInfrastructure,
    competitionLevel: s.competitionLevel,
    estimatedValue: s.estimatedValue,
    injuryWeeksRemaining: 0,
    contractWeeksRemaining: s.contract?.weeksRemaining ?? 104,
    maxSeasons: s.maxSeasons,
    ...overrides,
  }
}

function assertStatBounds(stats: Record<string, number>) {
  for (const id of SPORT_STAT_IDS) {
    expect(stats[id]).toBeGreaterThanOrEqual(STAT_MIN)
    expect(stats[id]).toBeLessThanOrEqual(STAT_MAX)
  }
}

describe('simulateSeason', () => {
  it('simule une saison normale avec bilan complet', () => {
    const result = simulateSeason(baseInput())
    expect(result.matchStats.matches).toBeGreaterThan(0)
    expect(result.matchStats.minutes).toBeGreaterThan(200)
    expect(result.beats.length).toBeGreaterThanOrEqual(5)
    expect(result.narrativeSummary.length).toBeGreaterThan(20)
    expect(result.ageAfter).toBe(result.ageBefore + 1)
    assertStatBounds(result.statsAfter)
  })

  it('gère une saison sans temps de jeu', () => {
    const result = simulateSeason(baseInput({ forceNoMinutes: true }))
    expect(result.matchStats.minutes).toBe(0)
    expect(result.matchStats.starts).toBe(0)
    expect(result.progressionLabel).toBe('sans_temps_de_jeu')
    assertStatBounds(result.statsAfter)
  })

  it('gère une saison avec blessure longue', () => {
    const result = simulateSeason(baseInput({ forceLongInjury: true }))
    expect(result.longInjury).toBe(true)
    expect(result.matchStats.injuryDays).toBeGreaterThanOrEqual(60)
    expect(result.progressionLabel).toBe('blessure')
    expect(result.matchStats.minutes).toBeLessThan(500)
    assertStatBounds(result.statsAfter)
  })

  it('gère une saison exceptionnelle', () => {
    const result = simulateSeason(baseInput({ forceExceptional: true }))
    expect(result.progressionLabel).toBe('exceptionnelle')
    expect(result.matchStats.minutes).toBeGreaterThan(2000)
    expect(result.matchStats.averageRating).toBeGreaterThanOrEqual(6.8)
    assertStatBounds(result.statsAfter)
  })

  it('simule un joueur âgé en déclin possible', () => {
    const result = simulateSeason(
      baseInput({
        age: 34,
        careerStage: 'progression',
        seed: 'aged-player',
      }),
    )
    expect(result.ageAfter).toBe(35)
    expect(['declin', 'retraite', 'fin_contrat', 'progression', 'apogee']).toContain(
      result.careerStageAfter,
    )
    assertStatBounds(result.statsAfter)
  })

  it('simule un joueur à fort potentiel', () => {
    const input = baseInput({ seed: 'high-potential' })
    input.hiddenTraits = { ...input.hiddenTraits, potentiel: 92 }
    input.stats = { ...input.stats, technique: 58, passe: 56, vision: 57 }
    const result = simulateSeason(input)
    expect(result.valueAfter).toBeGreaterThan(result.valueBefore * 0.9)
    assertStatBounds(result.statsAfter)
  })

  it('est reproductible avec la même seed', () => {
    const a = simulateSeason(baseInput({ seed: 'same-season-seed' }))
    const b = simulateSeason(baseInput({ seed: 'same-season-seed' }))
    expect(a).toEqual(b)
  })
})
