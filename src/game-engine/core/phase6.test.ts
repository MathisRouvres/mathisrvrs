import { describe, expect, it } from 'vitest'
import {
  advanceCareerSeason,
  buildSeasonInputFromPackage,
  completeSeason,
  createCareer,
  getNextDilemma,
  resolveDilemmaChoice,
  simulateSeasonDetailed as simulate,
} from '../index'
import type { CareerSavePackage } from '../types'
import type { MacroPositionId } from '../../game-content/macroPositions'

function makePkg(
  macro: MacroPositionId,
  seed: string,
  countryId = 'cote-brumeuse',
): CareerSavePackage {
  return createCareer({ countryId, macroPosition: macro, seed })
}

function mutateState(
  pkg: CareerSavePackage,
  patch: Partial<CareerSavePackage['snapshot']['state']>,
): CareerSavePackage {
  return {
    ...pkg,
    snapshot: {
      ...pkg.snapshot,
      state: { ...pkg.snapshot.state, ...patch },
    },
  }
}

function playSeason(pkg: CareerSavePackage): CareerSavePackage {
  const d1 = getNextDilemma(pkg)!
  const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
  const d2 = getNextDilemma(r1.package)!
  const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
  return completeSeason(r2.package).package
}

describe('simulation — cohérence par poste', () => {
  it('un gardien est jugé sur arrêts et clean sheets, jamais sur ses buts', () => {
    const pkg = makePkg('gk', 'p6-gk')
    const result = simulate(
      buildSeasonInputFromPackage(pkg, { forceExceptional: true }),
    )
    expect(result.matchStats.goals).toBe(0)
    expect(result.matchStats.keySaves).toBeGreaterThan(0)
    expect(result.matchStats.cleanSheets).toBeGreaterThan(0)
    expect(result.matchStats.averageRating).toBeGreaterThan(6.5)
  })

  it('un défenseur peut réussir une grande saison sans marquer', () => {
    const pkg = makePkg('defender', 'p6-def')
    const stats = { ...pkg.snapshot.state.stats, defense: 82, placement: 78 }
    const result = simulate(
      buildSeasonInputFromPackage(mutateState(pkg, { stats }), {
        forceClubRank: 3,
      }),
    )
    expect(result.matchStats.goals).toBeLessThanOrEqual(4)
    expect(result.matchStats.averageRating).toBeGreaterThan(6.4)
    expect(result.matchStats.keySaves).toBe(0)
  })

  it('un milieu est valorisé par son influence globale', () => {
    const pkg = makePkg('midfielder', 'p6-mid')
    const stats = { ...pkg.snapshot.state.stats, vision: 80, passe: 78 }
    const result = simulate(
      buildSeasonInputFromPackage(mutateState(pkg, { stats })),
    )
    expect(result.matchStats.averageRating).toBeGreaterThan(6.2)
  })

  it('un attaquant est porté par ses buts sans que ce soit le seul facteur', () => {
    const pkg = makePkg('attacker', 'p6-att')
    const withGoals = simulate(
      buildSeasonInputFromPackage(pkg, { forceExceptional: true }),
    )
    expect(withGoals.matchStats.goals).toBeGreaterThanOrEqual(14)
    expect(withGoals.matchStats.averageRating).toBeGreaterThan(6.8)
  })
})

describe('simulation — scénarios de saison', () => {
  it('saison exceptionnelle', () => {
    const pkg = makePkg('attacker', 'p6-exc')
    const result = simulate(
      buildSeasonInputFromPackage(pkg, { forceExceptional: true }),
    )
    expect(result.progressionLabel).toBe('exceptionnelle')
    expect(result.reputationAfter).toBeGreaterThan(result.reputationBefore)
  })

  it('saison moyenne — chiffres plausibles', () => {
    const pkg = makePkg('midfielder', 'p6-avg')
    const result = simulate(buildSeasonInputFromPackage(pkg))
    expect(result.matchStats.minutes).toBeGreaterThanOrEqual(0)
    expect(result.matchStats.minutes).toBeLessThanOrEqual(4000)
    expect(result.matchStats.averageRating).toBeGreaterThanOrEqual(5.2)
    expect(result.matchStats.averageRating).toBeLessThanOrEqual(8.8)
    expect(result.club.leagueRank).toBeGreaterThanOrEqual(1)
    expect(result.club.leagueRank).toBeLessThanOrEqual(result.club.leagueSize)
  })

  it('saison blanche — aucun temps de jeu', () => {
    const pkg = makePkg('midfielder', 'p6-blank')
    const result = simulate(
      buildSeasonInputFromPackage(pkg, { forceNoMinutes: true }),
    )
    expect(result.progressionLabel).toBe('sans_temps_de_jeu')
    expect(result.matchStats.minutes).toBe(0)
    expect(result.keyEvent).toBe('Saison blanche')
  })

  it('blessure longue', () => {
    const pkg = makePkg('defender', 'p6-inj')
    const result = simulate(
      buildSeasonInputFromPackage(pkg, { forceLongInjury: true }),
    )
    expect(result.progressionLabel).toBe('blessure')
    expect(result.matchStats.injuryDays).toBeGreaterThanOrEqual(60)
    expect(result.longInjury).toBe(true)
  })

  it('relégation — division 2 et niveau de compétition réduits', () => {
    const pkg = makePkg('midfielder', 'p6-releg')
    const before = pkg.snapshot.state.competitionLevel
    const { package: next, result } = advanceCareerSeason(pkg, {
      forceClubRank: 16,
    })
    expect(result.club.relegated).toBe(true)
    expect(next.snapshot.state.flags.division2).toBe(true)
    expect(next.snapshot.state.competitionLevel).toBeLessThan(before)
  })

  it('titre de champion — trophée + événement clé', () => {
    const pkg = makePkg('attacker', 'p6-title')
    const result = simulate(
      buildSeasonInputFromPackage(pkg, { forceClubRank: 1 }),
    )
    expect(result.club.trophies).toContain('Champion national')
    expect(result.keyEvent).toBe('Champion national')
    expect(result.matchStats.trophies).toContain('Champion national')
  })
})

describe('transferts automatiques — racontés dans le bilan', () => {
  it('fin de contrat + confiance basse → départ libre narré', () => {
    const pkg = makePkg('midfielder', 'p6-contract-end')
    const prepared = mutateState(pkg, {
      contract: { weeksRemaining: 40, weeklyWage: 500 },
      resources: {
        ...pkg.snapshot.state.resources,
        confianceEntraineur: 18,
      },
    })
    const { package: next, result } = advanceCareerSeason(prepared, {
      forceClubRank: 8,
    })
    expect(result.autoTransfer?.reason).toBe('fin_contrat')
    expect(next.snapshot.state.clubId).not.toBe(pkg.snapshot.state.clubId)
    expect(result.narrativeSummary).toContain(result.autoTransfer!.narrative)
    expect(next.snapshot.state.contract?.weeksRemaining).toBe(104)
  })

  it('transfert accepté en dilemme → concrétisé au bilan, flag consommé', () => {
    const pkg = makePkg('attacker', 'p6-chosen-move')
    const prepared = mutateState(pkg, {
      flags: { ...pkg.snapshot.state.flags, transfer_accepted: true },
    })
    const { package: next, result } = advanceCareerSeason(prepared, {
      forceClubRank: 8,
    })
    expect(result.autoTransfer?.reason).toBe('consequence_choix')
    expect(next.snapshot.state.flags.transfer_accepted).toBeUndefined()
    expect(next.snapshot.state.flags.lastSigningSeason).toBeDefined()
  })

  it('jeune sans minutes dans un grand club → prêt imposé', () => {
    const pkg = makePkg('attacker', 'p6-loan')
    const prepared = mutateState(pkg, { competitionLevel: 62 })
    const { result } = advanceCareerSeason(prepared, {
      forceNoMinutes: true,
      forceClubRank: 6,
    })
    expect(result.autoTransfer?.reason).toBe('pret_impose')
  })
})

describe('progression — âges et profils', () => {
  it('jeune joueur à fort potentiel progresse nettement', () => {
    const pkg = makePkg('midfielder', 'p6-young')
    const prepared = mutateState(pkg, {
      hiddenTraits: { ...pkg.snapshot.state.hiddenTraits, potentiel: 88 },
    })
    const result = simulate(
      buildSeasonInputFromPackage(prepared, { forceExceptional: true }),
    )
    expect(result.overallAfter).toBeGreaterThan(result.overallBefore)
  })

  it('vétéran offensif décline', () => {
    const pkg = makePkg('attacker', 'p6-vet')
    const prepared = mutateState(pkg, {
      age: 35,
      careerStage: 'declin',
    })
    const result = simulate(buildSeasonInputFromPackage(prepared))
    expect(result.overallAfter).toBeLessThanOrEqual(result.overallBefore + 1)
  })

  it('les statistiques ne saturent pas à 100', () => {
    const pkg = makePkg('attacker', 'p6-cap')
    let current = buildSeasonInputFromPackage(pkg, { forceExceptional: true })
    const result = simulate(current)
    for (const value of Object.values(result.statsAfter)) {
      expect(value).toBeLessThanOrEqual(99)
    }
  })
})

describe('boucle express — bilan et enchaînement', () => {
  it('reproductible : même seed → même résultat de simulation', () => {
    const pkg = makePkg('defender', 'p6-repro')
    const a = simulate(buildSeasonInputFromPackage(pkg))
    const b = simulate(buildSeasonInputFromPackage(pkg))
    expect(a).toEqual(b)
  })

  it('après le 2e dilemme : simulation auto, bilan complet, saison suivante', () => {
    const pkg = makePkg('midfielder', 'p6-loop')
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    expect(r2.shouldCompleteSeason).toBe(true)

    const { package: next, result } = completeSeason(r2.package)
    expect(result.club.leagueRank).toBeGreaterThanOrEqual(1)
    expect(result.keyEvent.length).toBeGreaterThan(0)
    expect(typeof result.overallBefore).toBe('number')
    expect(next.snapshot.state.seasonIndex).toBe(
      pkg.snapshot.state.seasonIndex + 1,
    )
    expect(next.snapshot.state.age).toBe(pkg.snapshot.state.age + 1)
    expect(next.snapshot.state.dilemmasResolvedThisSeason).toBe(0)
  })

  it('jamais de troisième dilemme, même après la simulation', () => {
    const pkg = makePkg('gk', 'p6-no-third')
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    expect(getNextDilemma(r2.package)).toBeNull()
    const next = playSeason(makePkg('gk', 'p6-no-third-2'))
    expect(next.snapshot.state.dilemmasResolvedThisSeason).toBe(0)
  })

  it('les saisons ne sont pas identiques d’une année à l’autre', () => {
    let pkg = makePkg('midfielder', 'p6-variety')
    const summaries: string[] = []
    for (let i = 0; i < 3; i += 1) {
      pkg = playSeason(pkg)
      const last =
        pkg.snapshot.state.seasonTimeline[
          pkg.snapshot.state.seasonTimeline.length - 1
        ]
      summaries.push(
        `${last?.matchStats.minutes}:${last?.matchStats.averageRating}:${last?.clubRank}`,
      )
    }
    expect(new Set(summaries).size).toBeGreaterThan(1)
  })
})
