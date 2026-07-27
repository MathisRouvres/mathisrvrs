import { describe, expect, it } from 'vitest'
import {
  SAVE_SCHEMA_VERSION,
  checkDilemmaInvariant,
  completeSeason,
  createCareer,
  getCareerSummary,
  getNextDilemma,
  getVisibleStats,
  isCareerFinished,
  migrateCareerSave,
  resolveDilemmaChoice,
  tryMigrateCareerSave,
} from '../index'
import type { CareerSavePackage } from '../types'

const INPUT = {
  countryId: 'cote-brumeuse',
  macroPosition: 'midfielder',
} as const

function resolveNext(pkg: CareerSavePackage, choiceIndex = 0) {
  const dilemma = getNextDilemma(pkg)
  expect(dilemma).not.toBeNull()
  const choice = dilemma!.choices[choiceIndex] ?? dilemma!.choices[0]!
  return resolveDilemmaChoice(pkg, dilemma!, choice.id)
}

/** Joue une saison complète : 2 dilemmes puis simulation + bilan. */
function playSeason(pkg: CareerSavePackage): CareerSavePackage {
  const first = resolveNext(pkg)
  expect(first.shouldCompleteSeason).toBe(false)
  const second = resolveNext(first.package)
  expect(second.shouldCompleteSeason).toBe(true)
  return completeSeason(second.package).package
}

describe('createCareer (express)', () => {
  it('génère identité, club, rôle et âge depuis la seed', () => {
    const pkg = createCareer({ ...INPUT, seed: 'express-seed-1' })
    const summary = getCareerSummary(pkg)
    expect(summary.countryId).toBe('cote-brumeuse')
    expect(summary.macroPosition).toBe('midfielder')
    expect(['cdm', 'cm', 'cam']).toContain(summary.preciseRole)
    expect(summary.displayName.length).toBeGreaterThan(2)
    expect([16, 17]).toContain(summary.age)
    expect(summary.clubId).not.toBeNull()
    expect(summary.dilemmasResolvedThisSeason).toBe(0)
    expect(summary.seasonLoopPhase).toBe('awaiting_dilemma_1')
    expect(checkDilemmaInvariant(pkg.snapshot.state)).toBe(true)
  })

  it('est reproductible : même seed → même carrière', () => {
    const a = getCareerSummary(createCareer({ ...INPUT, seed: 'repro' }))
    const b = getCareerSummary(createCareer({ ...INPUT, seed: 'repro' }))
    expect(a).toEqual(b)
  })

  it('rejette un pays ou un poste invalide', () => {
    expect(() =>
      createCareer({ countryId: 'nulle-part', macroPosition: 'midfielder' }),
    ).toThrow()
    expect(() =>
      // @ts-expect-error poste invalide volontaire
      createCareer({ countryId: 'cote-brumeuse', macroPosition: 'libero' }),
    ).toThrow()
  })
})

describe('boucle de saison (2 dilemmes exactement)', () => {
  it('le premier dilemme est disponible immédiatement après création', () => {
    const pkg = createCareer({ ...INPUT, seed: 'first-dilemma' })
    expect(getNextDilemma(pkg)).not.toBeNull()
  })

  it('propose le même dilemme pour la même seed (rechargement)', () => {
    const pkg = createCareer({ ...INPUT, seed: 'stable-pick' })
    expect(getNextDilemma(pkg)?.id).toBe(getNextDilemma(pkg)?.id)
  })

  it('interdit un troisième dilemme dans la même saison', () => {
    const pkg = createCareer({ ...INPUT, seed: 'no-third' })
    const after2 = resolveNext(resolveNext(pkg).package).package
    expect(after2.snapshot.state.dilemmasResolvedThisSeason).toBe(2)
    expect(getNextDilemma(after2)).toBeNull()
    const anyDilemma = getNextDilemma(pkg)!
    expect(() =>
      resolveDilemmaChoice(after2, anyDilemma, anyDilemma.choices[0]!.id),
    ).toThrow(/déjà résolus/)
  })

  it('refuse de clore la saison avant deux dilemmes', () => {
    const pkg = createCareer({ ...INPUT, seed: 'early-close' })
    expect(() => completeSeason(pkg)).toThrow(/deux dilemmes/)
    const after1 = resolveNext(pkg).package
    expect(() => completeSeason(after1)).toThrow(/deux dilemmes/)
  })

  it('après le bilan, la saison suivante repart à zéro dilemme', () => {
    const pkg = createCareer({ ...INPUT, seed: 'next-season' })
    const next = playSeason(pkg)
    expect(next.snapshot.state.seasonsCompleted).toBe(1)
    expect(next.snapshot.state.dilemmasResolvedThisSeason).toBe(0)
    expect(next.snapshot.state.totalDilemmasResolved).toBe(2)
    expect(checkDilemmaInvariant(next.snapshot.state)).toBe(true)
  })
})

describe('invariant et bornes sur une carrière longue', () => {
  it('total = saisons_terminées × 2 + dilemmes_saison_courante, stats bornées', () => {
    let pkg = createCareer({ ...INPUT, seed: 'long-run' })
    let guard = 0
    while (!isCareerFinished(pkg) && guard < 30) {
      const first = resolveNext(pkg)
      expect(checkDilemmaInvariant(first.package.snapshot.state)).toBe(true)
      const second = resolveNext(first.package, 1)
      expect(checkDilemmaInvariant(second.package.snapshot.state)).toBe(true)
      pkg = completeSeason(second.package).package
      expect(checkDilemmaInvariant(pkg.snapshot.state)).toBe(true)

      const visible = getVisibleStats(pkg.snapshot.state)
      for (const [key, value] of Object.entries(visible)) {
        if (key === 'argent') {
          expect(value).toBeGreaterThanOrEqual(0)
        } else {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThanOrEqual(100)
        }
      }
      guard += 1
    }
    expect(isCareerFinished(pkg)).toBe(true)
    expect(pkg.snapshot.state.totalDilemmasResolved).toBe(
      pkg.snapshot.state.seasonsCompleted * 2,
    )
  })

  it('la carrière ne se termine jamais en cours de saison', () => {
    let pkg = createCareer({ ...INPUT, seed: 'end-timing' })
    let guard = 0
    while (!isCareerFinished(pkg) && guard < 30) {
      const first = resolveNext(pkg)
      expect(isCareerFinished(first.package)).toBe(false)
      pkg = playSeasonFrom(first.package)
      guard += 1
    }
    expect(pkg.snapshot.state.dilemmasResolvedThisSeason).toBe(0)
  })
})

function playSeasonFrom(afterFirst: CareerSavePackage): CareerSavePackage {
  const second = resolveNext(afterFirst)
  return completeSeason(second.package).package
}

describe('reproductibilité complète', () => {
  it('même seed + mêmes choix → même trajectoire', () => {
    const run = (seed: string) => {
      let pkg = createCareer({ ...INPUT, seed })
      for (let i = 0; i < 3; i += 1) pkg = playSeason(pkg)
      const summary = getCareerSummary(pkg)
      return {
        summary,
        stats: pkg.snapshot.state.stats,
        resources: pkg.snapshot.state.resources,
        hidden: pkg.snapshot.state.hiddenTraits,
      }
    }
    expect(run('same-path')).toEqual(run('same-path'))
  })
})

describe('migration des sauvegardes', () => {
  it('migre une sauvegarde v3 (sans champs express) vers v4', () => {
    const modern = createCareer({ ...INPUT, seed: 'to-downgrade' })
    const state = { ...modern.snapshot.state } as Record<string, unknown>
    delete state.countryId
    delete state.macroPosition
    delete state.preciseRole
    delete state.clubStatus
    delete state.dilemmasResolvedThisSeason
    delete state.seasonsCompleted
    delete state.totalDilemmasResolved
    delete state.seasonLoopPhase
    delete state.provisionalLegacyScore
    const profile = { ...modern.playerProfile } as Record<string, unknown>
    delete profile.countryId
    delete profile.macroPosition
    delete profile.creationMode
    const legacyRaw = {
      ...modern,
      schemaVersion: 3,
      playerProfile: profile,
      snapshot: {
        ...modern.snapshot,
        saveSchemaVersion: 3,
        state,
      },
    }

    const migrated = migrateCareerSave(legacyRaw)
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.snapshot.state.npcs.rival.displayName.length).toBeGreaterThan(2)
    expect(migrated.snapshot.state.dilemmasResolvedThisSeason).toBe(0)
    expect(migrated.snapshot.state.countryId).toBeTruthy()
    expect(migrated.snapshot.state.flags.legacyCreation).toBe(true)
    expect(migrated.playerProfile.creationMode).toBe('legacy')
    expect(checkDilemmaInvariant(migrated.snapshot.state)).toBe(true)
  })

  it('classe une sauvegarde illisible en legacy sans jeter', () => {
    const result = tryMigrateCareerSave({ schemaVersion: 2, snapshot: null })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(0)
  })
})
