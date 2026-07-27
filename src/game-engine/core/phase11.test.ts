import { describe, expect, it } from 'vitest'
import {
  careerSavePackageSchema,
  completeSeason,
  computeSeasonDistinctions,
  createCareer,
  familyFromRole,
  getNextDilemma,
  isEligible,
  resolveDilemmaChoice,
  scoreForAward,
  type AwardPerf,
} from '../index'
import { AWARD_DEFINITIONS } from '../../game-content/awards/catalog'
import { getChampionshipByCountry } from '../../game-content/championships'
import type { CareerSavePackage } from '../types'
import type { ClubSeasonResult, SeasonMatchStats } from '../types/season'
import type { MacroPositionId } from '../../game-content/macroPositions'

function makePkg(macro: MacroPositionId, seed: string, country = 'capitale-miroir') {
  return createCareer({ countryId: country, macroPosition: macro, seed })
}

function mutate(
  pkg: CareerSavePackage,
  patch: Partial<CareerSavePackage['snapshot']['state']>,
): CareerSavePackage {
  return {
    ...pkg,
    snapshot: { ...pkg.snapshot, state: { ...pkg.snapshot.state, ...patch } },
  }
}

function perf(partial: Partial<AwardPerf> = {}): AwardPerf {
  return {
    family: 'att',
    age: 25,
    matches: 32,
    starts: 30,
    minutes: 2700,
    goals: 20,
    assists: 8,
    cleanSheets: 0,
    keySaves: 0,
    averageRating: 7.6,
    yellowCards: 3,
    redCards: 0,
    injuryDays: 0,
    clubGoalsAgainst: 30,
    clubRank: 3,
    leagueSize: 16,
    reputation: 72,
    grandsMatchs: 72,
    ...partial,
  }
}

function stats(partial: Partial<SeasonMatchStats> = {}): SeasonMatchStats {
  return {
    matches: 32,
    starts: 30,
    minutes: 2700,
    goals: 20,
    assists: 8,
    cleanSheets: 0,
    keySaves: 0,
    averageRating: 7.6,
    yellowCards: 3,
    redCards: 0,
    injuryDays: 0,
    trophies: [],
    ...partial,
  }
}

function club(partial: Partial<ClubSeasonResult> = {}): ClubSeasonResult {
  return {
    clubId: 'c1',
    leagueRank: 3,
    leagueSize: 16,
    leagueLevel: 70,
    division: 1,
    cupRun: 'aucune',
    continentalQualified: false,
    trophies: [],
    promoted: false,
    relegated: false,
    coachChanged: false,
    goalsFor: 60,
    goalsAgainst: 28,
    unbeaten: false,
    ...partial,
  }
}

describe('Phase 11 — scoring spécifique au poste', () => {
  it('gardien : forte saison sans buts reste haute (pas de formule pro-attaquant)', () => {
    const gk = perf({ family: 'gk', goals: 0, assists: 0, cleanSheets: 16, keySaves: 74, averageRating: 7.6, clubGoalsAgainst: 20 })
    const score = scoreForAward(AWARD_DEFINITIONS.meilleur_gardien, gk)
    expect(score).toBeGreaterThan(55)
  })

  it('gardien fort > gardien faible', () => {
    const strong = perf({ family: 'gk', goals: 0, cleanSheets: 16, keySaves: 78, averageRating: 7.7, clubGoalsAgainst: 18 })
    const weak = perf({ family: 'gk', goals: 0, cleanSheets: 4, keySaves: 25, averageRating: 6.3, clubGoalsAgainst: 48 })
    expect(scoreForAward(AWARD_DEFINITIONS.meilleur_gardien, strong)).toBeGreaterThan(
      scoreForAward(AWARD_DEFINITIONS.meilleur_gardien, weak),
    )
  })

  it('défenseur récompensé sur la solidité, pas les buts', () => {
    const solid = perf({ family: 'def', goals: 1, assists: 2, cleanSheets: 15, averageRating: 7.3, clubGoalsAgainst: 20 })
    const leaky = perf({ family: 'def', goals: 1, assists: 2, cleanSheets: 3, averageRating: 6.4, clubGoalsAgainst: 50 })
    expect(scoreForAward(AWARD_DEFINITIONS.meilleur_defenseur, solid)).toBeGreaterThan(
      scoreForAward(AWARD_DEFINITIONS.meilleur_defenseur, leaky),
    )
  })

  it('milieu récompensé sur création + note', () => {
    const creator = perf({ family: 'mid', goals: 8, assists: 13, averageRating: 7.5 })
    const passive = perf({ family: 'mid', goals: 1, assists: 2, averageRating: 6.4 })
    expect(scoreForAward(AWARD_DEFINITIONS.meilleur_milieu, creator)).toBeGreaterThan(
      scoreForAward(AWARD_DEFINITIONS.meilleur_milieu, passive),
    )
  })

  it('attaquant fort > attaquant faible', () => {
    const sharp = perf({ family: 'att', goals: 24, assists: 9, averageRating: 7.8 })
    const blunt = perf({ family: 'att', goals: 6, assists: 2, averageRating: 6.5 })
    expect(scoreForAward(AWARD_DEFINITIONS.meilleur_attaquant, sharp)).toBeGreaterThan(
      scoreForAward(AWARD_DEFINITIONS.meilleur_attaquant, blunt),
    )
  })

  it('meilleur buteur discrimine sur les buts', () => {
    expect(
      scoreForAward(AWARD_DEFINITIONS.meilleur_buteur, perf({ goals: 26 })),
    ).toBeGreaterThan(scoreForAward(AWARD_DEFINITIONS.meilleur_buteur, perf({ goals: 6 })))
  })

  it('meilleur passeur discrimine sur les passes', () => {
    expect(
      scoreForAward(AWARD_DEFINITIONS.meilleur_passeur, perf({ assists: 15 })),
    ).toBeGreaterThan(scoreForAward(AWARD_DEFINITIONS.meilleur_passeur, perf({ assists: 2 })))
  })
})

describe('Phase 11 — éligibilité', () => {
  it('limite d’âge (meilleur jeune)', () => {
    expect(isEligible(AWARD_DEFINITIONS.jeune_joueur_saison, perf({ age: 20 }))).toBe(true)
    expect(isEligible(AWARD_DEFINITIONS.jeune_joueur_saison, perf({ age: 24 }))).toBe(false)
  })

  it('minimum de minutes (joueur de la saison)', () => {
    expect(
      isEligible(AWARD_DEFINITIONS.joueur_saison, perf({ minutes: 800, averageRating: 6.5, goals: 4, assists: 2 })),
    ).toBe(false)
    expect(isEligible(AWARD_DEFINITIONS.joueur_saison, perf({ minutes: 2000 }))).toBe(true)
  })

  it('une saison exceptionnelle assouplit le minimum de minutes (blessure)', () => {
    // 1100 < 1500 mais ≥ 0.7×1500 et note/impact exceptionnels.
    expect(
      isEligible(
        AWARD_DEFINITIONS.joueur_saison,
        perf({ minutes: 1100, matches: 22, averageRating: 7.8, goals: 15, assists: 6, injuryDays: 90 }),
      ),
    ).toBe(true)
  })

  it('gardien : doit avoir suffisamment joué', () => {
    expect(isEligible(AWARD_DEFINITIONS.meilleur_gardien, perf({ family: 'gk', minutes: 1000, matches: 12 }))).toBe(false)
    expect(isEligible(AWARD_DEFINITIONS.meilleur_gardien, perf({ family: 'gk', minutes: 1800 }))).toBe(true)
  })

  it('meilleur remplaçant : réservé à un faible ratio de titularisation', () => {
    expect(
      isEligible(AWARD_DEFINITIONS.meilleur_remplacant, perf({ matches: 24, starts: 22, minutes: 1900 })),
    ).toBe(false)
    expect(
      isEligible(AWARD_DEFINITIONS.meilleur_remplacant, perf({ matches: 24, starts: 8, minutes: 900 })),
    ).toBe(true)
  })

  it('poste incompatible = inéligible (gardien vs meilleur attaquant)', () => {
    expect(isEligible(AWARD_DEFINITIONS.meilleur_attaquant, perf({ family: 'gk' }))).toBe(false)
  })
})

describe('Phase 11 — distinctions de saison (concurrents synthétiques)', () => {
  const champElite = getChampionshipByCountry('capitale-miroir')!
  const champLocal = getChampionshipByCountry('cote-brumeuse')!

  function run(pkg: CareerSavePackage, s: SeasonMatchStats, c: ClubSeasonResult, age: number, champ = champElite) {
    return computeSeasonDistinctions(pkg.snapshot.state, {
      matchStats: s,
      club: c,
      ageDuringSeason: age,
      championship: champ,
    })
  }

  it('un attaquant décisif obtient des distinctions (déterministe)', () => {
    const pkg = makePkg('attacker', 'p11-att')
    const s = stats({ goals: 26, assists: 10, averageRating: 7.9 })
    const a = run(pkg, s, club(), 25)
    const b = run(pkg, s, club(), 25)
    expect(a.records.length).toBeGreaterThan(0)
    expect(a).toEqual(b) // déterminisme
  })

  it('podium stocké avec le joueur et des concurrents crédibles', () => {
    const pkg = makePkg('attacker', 'p11-podium')
    const a = run(pkg, stats({ goals: 28, assists: 11, averageRating: 8.1 }), club({ leagueRank: 1 }), 26)
    const withPodium = a.records.find((r) => r.competitors.length > 0)
    expect(withPodium).toBeDefined()
    expect(withPodium!.competitors.some((c) => c.isPlayer)).toBe(true)
    expect(withPodium!.competitors.length).toBeLessThanOrEqual(3)
  })

  it('joueur trop peu utilisé = aucune distinction', () => {
    const pkg = makePkg('attacker', 'p11-weak')
    const a = run(pkg, stats({ matches: 5, starts: 2, minutes: 240, goals: 1, assists: 0, averageRating: 6.1 }), club({ leagueRank: 12 }), 24)
    expect(a.records.length).toBe(0)
  })

  it('aucun favoritisme : un joueur moyen ne gagne pas le trophée majeur', () => {
    const pkg = makePkg('attacker', 'p11-fair')
    // Éligible (minutes/matchs) mais performances quelconques dans un championnat d’élite.
    const a = run(pkg, stats({ matches: 26, starts: 24, minutes: 2000, goals: 6, assists: 3, averageRating: 6.5 }), club({ leagueRank: 9 }), 27)
    const js = a.records.find((r) => r.awardId === 'joueur_saison')
    expect(js?.result === 'vainqueur').toBe(false)
  })

  it('égalité/déterminisme : deux passages identiques donnent le même classement', () => {
    const pkg = makePkg('midfielder', 'p11-tie')
    const s = stats({ family: undefined, goals: 10, assists: 12, averageRating: 7.4 } as Partial<SeasonMatchStats>)
    const c = club({ leagueRank: 4 })
    expect(run(pkg, s, c, 25)).toEqual(run(pkg, s, c, 25))
  })

  it('petit championnat : moins de récompenses qu’un championnat d’élite', () => {
    expect(champLocal.awards.length).toBeLessThan(champElite.awards.length)
    const pkg = makePkg('attacker', 'p11-small', 'cote-brumeuse')
    const a = run(pkg, stats({ goals: 22, assists: 8, averageRating: 7.7 }), club({ leagueLevel: 42 }), 25, champLocal)
    // Un très bon joueur reste distingué même dans un petit championnat.
    expect(a.records.length).toBeGreaterThan(0)
  })

  it('équipe type : un joueur fort est retenu, un faible est absent', () => {
    const pkg = makePkg('attacker', 'p11-team')
    const strong = run(pkg, stats({ goals: 27, assists: 12, averageRating: 8.2 }), club({ leagueRank: 1 }), 26)
    const teamRec = strong.records.find((r) => r.awardId === 'equipe_type')
    expect(teamRec).toBeDefined()
    expect(['titulaire', 'meilleur', 'elargi']).toContain(teamRec!.teamStatus)

    const pkgW = makePkg('attacker', 'p11-team-weak')
    const weak = run(pkgW, stats({ matches: 6, starts: 2, minutes: 300, goals: 1, averageRating: 6.0 }), club({ leagueRank: 14 }), 24)
    expect(weak.records.find((r) => r.awardId === 'equipe_type')).toBeUndefined()
  })

  it('impact carrière borné (pas de saut de niveau)', () => {
    const pkg = makePkg('attacker', 'p11-impact')
    const a = run(pkg, stats({ goals: 30, assists: 14, averageRating: 8.5 }), club({ leagueRank: 1 }), 26)
    expect(a.impact.reputation).toBeLessThanOrEqual(12)
    expect(a.impact.popularite).toBeLessThanOrEqual(10)
    expect(a.impact.valuePct).toBeLessThanOrEqual(0.09)
  })
})

describe('Phase 11 — statuts de nomination', () => {
  it('nomination sans victoire possible (statut ≠ vainqueur)', () => {
    // Balayage de graines : un joueur correct mais non dominant est parfois nommé.
    let sawNomination = false
    for (let s = 0; s < 40 && !sawNomination; s += 1) {
      const pkg = makePkg('attacker', `p11-nom-${s}`)
      const champ = getChampionshipByCountry('capitale-miroir')!
      const a = computeSeasonDistinctions(pkg.snapshot.state, {
        matchStats: stats({ matches: 28, starts: 26, minutes: 2200, goals: 13, assists: 6, averageRating: 7.1 }),
        club: club({ leagueRank: 5 }),
        ageDuringSeason: 25,
        championship: champ,
      })
      if (a.records.some((r) => r.result !== 'vainqueur')) sawNomination = true
    }
    expect(sawNomination).toBe(true)
  })
})

describe('Phase 11 — intégration boucle de saison', () => {
  function playSeason(pkg: CareerSavePackage): CareerSavePackage {
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    return completeSeason(r2.package).package
  }

  it('la saison stocke les distinctions sans 3e dilemme', () => {
    const pkg = makePkg('attacker', 'p11-loop')
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    const done = completeSeason(r2.package).package
    expect(done.snapshot.state.dilemmasResolvedThisSeason).toBe(0)
    const entry = done.snapshot.state.seasonTimeline.at(-1)!
    expect(Array.isArray(entry.distinctions)).toBe(true)
  })

  it('les distinctions survivent à un save/reload', () => {
    const veteran = mutate(makePkg('attacker', 'p11-save'), { age: 27, competitionLevel: 72 })
    let pkg = veteran
    for (let i = 0; i < 3; i += 1) pkg = playSeason(pkg)
    const before = pkg.snapshot.state.seasonTimeline.map((e) => e.distinctions ?? [])
    const reloaded = careerSavePackageSchema.parse(
      JSON.parse(JSON.stringify(pkg)),
    ) as CareerSavePackage
    const after = reloaded.snapshot.state.seasonTimeline.map((e) => e.distinctions ?? [])
    expect(after).toEqual(before)
  })

  it('familyFromRole mappe correctement les postes', () => {
    expect(familyFromRole('gk')).toBe('gk')
    expect(familyFromRole('cb')).toBe('def')
    expect(familyFromRole('cm')).toBe('mid')
    expect(familyFromRole('st')).toBe('att')
  })
})
