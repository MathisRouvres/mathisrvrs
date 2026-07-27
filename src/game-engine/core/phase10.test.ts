import { describe, expect, it } from 'vitest'
import {
  advanceCareerSeason,
  buildFinalReport,
  buildPalmares,
  buildShareCard,
  careerSavePackageSchema,
  collectAchievements,
  completeSeason,
  computeContribution,
  computeTrophyValue,
  createCareer,
  generateBonusTrophies,
  getNextDilemma,
  resolveDilemmaChoice,
  seasonTrophyImpact,
  topCelebration,
  trophyMeta,
  TROPHY_LABELS as T,
} from '../index'
import type { CareerSavePackage } from '../types'
import type { ClubSeasonResult, SeasonMatchStats } from '../types/season'
import type { MacroPositionId } from '../../game-content/macroPositions'

function makePkg(macro: MacroPositionId, seed: string): CareerSavePackage {
  return createCareer({ countryId: 'capitale-miroir', macroPosition: macro, seed })
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

function playSeason(pkg: CareerSavePackage): CareerSavePackage {
  const d1 = getNextDilemma(pkg)!
  const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
  const d2 = getNextDilemma(r1.package)!
  const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
  return completeSeason(r2.package).package
}

const LOW_STATS: SeasonMatchStats = {
  matches: 6,
  starts: 2,
  minutes: 320,
  goals: 0,
  assists: 1,
  cleanSheets: 0,
  keySaves: 0,
  averageRating: 6.1,
  yellowCards: 1,
  redCards: 0,
  injuryDays: 60,
  trophies: [],
}

const HIGH_STATS: SeasonMatchStats = {
  matches: 34,
  starts: 33,
  minutes: 2900,
  goals: 18,
  assists: 9,
  cleanSheets: 0,
  keySaves: 0,
  averageRating: 7.6,
  yellowCards: 3,
  redCards: 0,
  injuryDays: 0,
  trophies: [],
}

function club(partial: Partial<ClubSeasonResult> = {}): ClubSeasonResult {
  return {
    clubId: 'c1',
    leagueRank: 1,
    leagueSize: 16,
    leagueLevel: 60,
    division: 1,
    cupRun: 'aucune',
    continentalQualified: false,
    trophies: [],
    promoted: false,
    relegated: false,
    coachChanged: false,
    wins: 22,
    draws: 6,
    losses: 2,
    goalsFor: 62,
    goalsAgainst: 24,
    unbeaten: false,
    ...partial,
  }
}

describe('Phase 10 — contribution du joueur', () => {
  it('faible participation → catégorie basse', () => {
    const c = computeContribution(LOW_STATS)
    expect(['participation_limitee', 'rotation']).toContain(c.tier)
    expect(c.score).toBeLessThan(0.4)
  })

  it('forte participation → catégorie haute', () => {
    const c = computeContribution(HIGH_STATS)
    expect(['leader_du_titre', 'heros']).toContain(c.tier)
    expect(c.score).toBeGreaterThan(0.8)
  })
})

describe('Phase 10 — valeur d’un trophée', () => {
  const meta = trophyMeta(T.championNational)

  it('titre avec faible contribution < titre avec forte contribution', () => {
    const low = computeTrophyValue({
      trophyPrestige: meta.prestige,
      championshipDifficulty: 60,
      clubStanding: 'pretendant',
      contribution: computeContribution(LOW_STATS).score,
    })
    const high = computeTrophyValue({
      trophyPrestige: meta.prestige,
      championshipDifficulty: 60,
      clubStanding: 'pretendant',
      contribution: computeContribution(HIGH_STATS).score,
    })
    expect(high).toBeGreaterThan(low)
  })

  it('titre en favori < titre en outsider (inattendu)', () => {
    const favori = computeTrophyValue({
      trophyPrestige: meta.prestige,
      championshipDifficulty: 60,
      clubStanding: 'grand_favori',
      contribution: 0.7,
    })
    const outsider = computeTrophyValue({
      trophyPrestige: meta.prestige,
      championshipDifficulty: 60,
      clubStanding: 'outsider',
      contribution: 0.7,
    })
    expect(outsider).toBeGreaterThan(favori)
  })

  it('trophée international >> supercoupe', () => {
    const inter = computeTrophyValue({
      trophyPrestige: trophyMeta(T.championMondeNations).prestige,
      championshipDifficulty: 60,
      clubStanding: 'pretendant',
      contribution: 0.7,
    })
    const supercoupe = computeTrophyValue({
      trophyPrestige: trophyMeta(T.supercoupe).prestige,
      championshipDifficulty: 60,
      clubStanding: 'pretendant',
      contribution: 0.7,
    })
    expect(inter).toBeGreaterThan(supercoupe * 1.5)
  })
})

describe('Phase 10 — niveaux de célébration', () => {
  it('mappe correctement les célébrations', () => {
    expect(trophyMeta(T.supercoupe).celebration).toBe('mineur')
    expect(trophyMeta(T.coupeNationale).celebration).toBe('national')
    expect(trophyMeta(T.championNational).celebration).toBe('majeur')
    expect(trophyMeta(T.ligueContinentale).celebration).toBe('continental')
    expect(trophyMeta(T.championMondeNations).celebration).toBe('international')
  })

  it('retient la célébration la plus élevée', () => {
    expect(topCelebration([T.supercoupe, T.championMondeNations])).toBe(
      'international',
    )
    expect(topCelebration([])).toBeNull()
  })
})

describe('Phase 10 — accomplissements collectifs (non-trophées)', () => {
  it('maintien inattendu + dernière journée', () => {
    const a = collectAchievements(
      club({ leagueRank: 14, cupRun: 'aucune' }),
      'candidat_maintien',
      'maintien',
      [],
      'c1',
    )
    expect(a).toContain('maintien_dernier_souffle')
  })

  it('promotion surprise', () => {
    const a = collectAchievements(
      club({ division: 2, leagueRank: 2, promoted: true }),
      'outsider',
      'promotion',
      [],
      'c1',
    )
    expect(a).toContain('promotion_surprise')
  })

  it('qualification continentale historique + titre outsider + invincibilité', () => {
    const a = collectAchievements(
      club({
        leagueRank: 1,
        continentalQualified: true,
        trophies: [T.championNational],
        losses: 0,
        unbeaten: true,
        goalsFor: 70,
        goalsAgainst: 20,
      }),
      'outsider',
      'titre',
      [],
      'c1',
    )
    expect(a).toContain('qualif_continentale_historique')
    expect(a).toContain('titre_outsider')
    expect(a).toContain('saison_invaincue')
    expect(a).toContain('meilleure_attaque')
    expect(a).toContain('meilleure_defense')
    // Pas de doublon.
    expect(a.length).toBe(new Set(a).size)
  })

  it('finale/demi inattendue pour un petit club', () => {
    expect(
      collectAchievements(club({ cupRun: 'finale' }), 'outsider', 'maintien', [], 'c1'),
    ).toContain('finale_inattendue')
    expect(
      collectAchievements(club({ cupRun: 'demi' }), 'outsider', 'maintien', [], 'c1'),
    ).toContain('demi_historique')
  })
})

describe('Phase 10 — trophées bonus déterministes', () => {
  const base = makePkg('midfielder', 'p10-bonus')

  it('finale de coupe perdue → trophée de finaliste', () => {
    const out = generateBonusTrophies(base.snapshot.state, club({ cupRun: 'finale' }))
    expect(out).toContain(T.coupeFinaliste)
  })

  it('promotion (non-champion) → trophée de montée', () => {
    const out = generateBonusTrophies(
      base.snapshot.state,
      club({ division: 2, promoted: true, leagueRank: 2 }),
    )
    expect(out).toContain(T.montee)
  })

  it('champion de D2 → pas de doublon montée', () => {
    const out = generateBonusTrophies(
      base.snapshot.state,
      club({ division: 2, promoted: true, leagueRank: 1, trophies: [T.championD2] }),
    )
    expect(out).not.toContain(T.montee)
  })

  it('titre continental atteignable seulement si le club y participe', () => {
    // Sans participation continentale : jamais de trophée continental.
    for (let s = 0; s < 40; s += 1) {
      const pkg = mutate(makePkg('attacker', `p10-noc-${s}`), { competitionLevel: 80 })
      const out = generateBonusTrophies(pkg.snapshot.state, club({ leagueRank: 2 }))
      expect(out).not.toContain(T.ligueContinentale)
      expect(out).not.toContain(T.coupeContinentale)
    }
    // Avec participation + club fort : le titre continental est atteignable.
    let continentalSeen = false
    for (let s = 0; s < 60 && !continentalSeen; s += 1) {
      const pkg = mutate(makePkg('attacker', `p10-c-${s}`), {
        competitionLevel: 82,
        flags: { ...makePkg('attacker', `p10-c-${s}`).snapshot.state.flags, continental_entrant: true },
      })
      const out = generateBonusTrophies(pkg.snapshot.state, club({ leagueRank: 1 }))
      if (out.includes(T.ligueContinentale) || out.includes(T.finalisteContinental)) {
        continentalSeen = true
      }
    }
    expect(continentalSeen).toBe(true)
  })

  it('titre international (sélection) atteignable pour un international', () => {
    let seen = false
    for (let s = 0; s < 80 && !seen; s += 1) {
      const raw = makePkg('attacker', `p10-int-${s}`)
      const pkg = mutate(raw, {
        seasonIndex: 4,
        resources: { ...raw.snapshot.state.resources, reputationSportive: 96 },
        flags: { ...raw.snapshot.state.flags, national_regular: true },
      })
      const out = generateBonusTrophies(pkg.snapshot.state, club())
      if (
        out.includes(T.championMondeNations) ||
        out.includes(T.championContinentalNations)
      ) {
        seen = true
      }
    }
    expect(seen).toBe(true)
  })
})

describe('Phase 10 — impact carrière modéré', () => {
  it('un titre majeur reste un bonus borné (pas de dopage de niveau)', () => {
    const impact = seasonTrophyImpact([T.championNational], 0.9, 60, 'pretendant')
    expect(impact.reputation).toBeGreaterThan(0)
    expect(impact.reputation).toBeLessThanOrEqual(14)
    expect(impact.popularite).toBeLessThanOrEqual(12)
    expect(impact.flags).toContain('won_major')
  })

  it('titre international → flag héritage/sélection', () => {
    const impact = seasonTrophyImpact([T.championMondeNations], 0.8, 60, 'pretendant')
    expect(impact.flags).toContain('won_international')
  })

  it('faible contribution → impact réduit', () => {
    const low = seasonTrophyImpact([T.championNational], 0.1, 60, 'pretendant')
    const high = seasonTrophyImpact([T.championNational], 0.95, 60, 'pretendant')
    expect(low.reputation).toBeLessThan(high.reputation)
  })
})

describe('Phase 10 — intégration boucle de saison', () => {
  it('une saison enrichit la timeline (contribution + statut) sans 3e dilemme', () => {
    const pkg = makePkg('midfielder', 'p10-loop')
    // Deux dilemmes suffisent toujours à clore la saison (aucun dilemme ajouté).
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    const done = completeSeason(r2.package).package

    expect(done.snapshot.state.dilemmasResolvedThisSeason).toBe(0)
    const entry = done.snapshot.state.seasonTimeline.at(-1)!
    expect(entry.contributionTier).toBeDefined()
    expect(entry.clubStanding).toBeDefined()
    expect(Array.isArray(entry.achievements)).toBe(true)
  })

  it('le palmarès s’incrémente et survit à un save/reload', () => {
    let pkg = makePkg('attacker', 'p10-palmares')
    for (let i = 0; i < 4; i += 1) pkg = playSeason(pkg)

    const before = buildPalmares(pkg.snapshot.state)
    // Sérialisation → rechargement via le schéma de sauvegarde.
    const reloaded = careerSavePackageSchema.parse(
      JSON.parse(JSON.stringify(pkg)),
    ) as CareerSavePackage
    const after = buildPalmares(reloaded.snapshot.state)
    expect(after).toEqual(before)
    // Chaque entrée de palmarès porte le contexte structuré demandé.
    for (const p of after) {
      expect(p).toHaveProperty('seasonIndex')
      expect(p).toHaveProperty('age')
      expect(p).toHaveProperty('clubId')
      expect(p).toHaveProperty('competition')
      expect(p).toHaveProperty('prestige')
    }
  })

  it('aucun trophée en double dans la timeline', () => {
    let pkg = makePkg('attacker', 'p10-nodup')
    for (let i = 0; i < 5; i += 1) pkg = playSeason(pkg)
    for (const entry of pkg.snapshot.state.seasonTimeline) {
      const trophies = entry.matchStats.trophies
      expect(trophies.length).toBe(new Set(trophies).size)
    }
  })

  it('advanceCareerSeason expose les trophées enrichis dans le bilan', () => {
    const pkg = mutate(makePkg('attacker', 'p10-adv'), {
      // Club fort → chances de trophées non nulles ; test structurel du bilan.
      competitionLevel: 78,
    })
    const { result } = advanceCareerSeason(pkg)
    expect(Array.isArray(result.matchStats.trophies)).toBe(true)
    // Le bilan et la timeline partagent la même liste de trophées.
    // (les deux sont enrichis depuis la même source)
  })

  it('le bilan final agrège palmarès + faits marquants + carte de partage', () => {
    let pkg = makePkg('attacker', 'p10-final')
    for (let i = 0; i < 4; i += 1) pkg = playSeason(pkg)
    pkg = mutate(pkg, { phase: 'retired', careerStage: 'carriere_terminee' })
    const report = buildFinalReport(pkg)
    expect(Array.isArray(report.palmares)).toBe(true)
    expect(Array.isArray(report.faitsMarquants)).toBe(true)
    const card = buildShareCard(report)
    expect(card).toHaveProperty('topTrophy')
    // Faits marquants dédupliqués.
    expect(report.faitsMarquants.length).toBe(new Set(report.faitsMarquants).size)
  })
})
