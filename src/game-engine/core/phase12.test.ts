import { describe, expect, it } from 'vitest'
import {
  buildCareerRecords,
  buildFinalReport,
  careerSavePackageSchema,
  completeSeason,
  computeMajorDistinctions,
  computeSeasonRecords,
  createCareer,
  getNextDilemma,
  resolveDilemmaChoice,
  worldAccessScore,
} from '../index'
import { getChampionshipByCountry } from '../../game-content/championships'
import type { CareerSavePackage } from '../types'
import type { ClubSeasonResult, RecordEntry, SeasonMatchStats } from '../types/season'
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

function strong(
  pkg: CareerSavePackage,
  extra: Record<string, boolean | number | string> = {},
) {
  const s = pkg.snapshot.state
  return mutate(pkg, {
    resources: { ...s.resources, reputationSportive: 92 },
    hiddenTraits: { ...s.hiddenTraits, grandsMatchs: 88 },
    flags: { ...s.flags, ...extra },
  })
}

function stats(partial: Partial<SeasonMatchStats> = {}): SeasonMatchStats {
  return {
    matches: 33,
    starts: 32,
    minutes: 2900,
    goals: 28,
    assists: 12,
    cleanSheets: 0,
    keySaves: 0,
    averageRating: 8.0,
    yellowCards: 2,
    redCards: 0,
    injuryDays: 0,
    trophies: [],
    ...partial,
  }
}

function club(partial: Partial<ClubSeasonResult> = {}): ClubSeasonResult {
  return {
    clubId: 'c1',
    leagueRank: 1,
    leagueSize: 16,
    leagueLevel: 70,
    division: 1,
    cupRun: 'aucune',
    continentalQualified: true,
    trophies: [],
    promoted: false,
    relegated: false,
    coachChanged: false,
    goalsFor: 72,
    goalsAgainst: 22,
    unbeaten: false,
    ...partial,
  }
}

const champElite = getChampionshipByCountry('capitale-miroir')!
const champMinor = getChampionshipByCountry('cote-brumeuse')!

function runMajor(pkg: CareerSavePackage, opts: {
  s?: SeasonMatchStats
  c?: ClubSeasonResult
  age?: number
  champ?: typeof champElite
  trophies?: string[]
  isAbroad?: boolean
} = {}) {
  return computeMajorDistinctions(pkg.snapshot.state, {
    matchStats: opts.s ?? stats(),
    club: opts.c ?? club(),
    ageDuringSeason: opts.age ?? 26,
    championship: opts.champ ?? champElite,
    seasonTrophies: opts.trophies ?? [],
    countryLabel: 'Test',
    isAbroad: opts.isAbroad ?? false,
  })
}

describe('Phase 12 — distinctions majeures', () => {
  it('distinction nationale pour une grande saison', () => {
    const a = runMajor(strong(makePkg('attacker', 'p12-nat')))
    expect(a.records.some((r) => r.tier === 'national')).toBe(true)
  })

  it('distinction continentale si le club participe à l’Europe', () => {
    const pkg = strong(makePkg('attacker', 'p12-cont'), { continental_entrant: true })
    const a = runMajor(pkg)
    expect(a.records.some((r) => r.tier === 'continental')).toBe(true)
  })

  it('récompense par poste : gardien continental', () => {
    const pkg = strong(
      mutate(makePkg('gk', 'p12-gk'), { preciseRole: 'gk' }),
      { continental_entrant: true },
    )
    const gkStats = stats({ goals: 0, assists: 0, cleanSheets: 18, keySaves: 78, averageRating: 7.9 })
    const a = runMajor(pkg, { s: gkStats })
    expect(a.records.some((r) => r.tier === 'continental' && r.positionFamily === 'gk')).toBe(true)
  })

  it('distinction mondiale accessible à une carrière au sommet', () => {
    let sawWorld = false
    for (let s = 0; s < 40 && !sawWorld; s += 1) {
      const pkg = strong(makePkg('attacker', `p12-world-${s}`), {
        continental_entrant: true,
        won_continental: true,
        won_international: true,
        national_regular: true,
      })
      const a = runMajor(pkg, {
        s: stats({ goals: 33, assists: 15, averageRating: 8.6 }),
        trophies: ['Champion national', 'Vainqueur de la Ligue continentale'],
      })
      if (a.records.some((r) => r.tier === 'mondial')) sawWorld = true
    }
    expect(sawWorld).toBe(true)
  })

  it('accès mondial : sommet élevé, joueur moyen faible', () => {
    const top = strong(makePkg('attacker', 'p12-wa1'), {
      won_continental: true,
      won_international: true,
      national_regular: true,
    })
    const wa = worldAccessScore(
      top.snapshot.state,
      // profil dérivé par le moteur via buildPlayerPerf → on passe par computeMajor
      // ici on vérifie surtout via le champ exposé.
      {
        family: 'att', age: 26, matches: 33, starts: 32, minutes: 2900,
        goals: 32, assists: 14, cleanSheets: 0, keySaves: 0, averageRating: 8.5,
        yellowCards: 2, redCards: 0, injuryDays: 0, clubGoalsAgainst: 22,
        clubRank: 1, leagueSize: 16, reputation: 92, grandsMatchs: 88,
      },
      champElite,
      ['Champion national', 'Vainqueur de la Ligue continentale'],
    )
    expect(wa).toBeGreaterThanOrEqual(0.62)
  })

  it('championnat mineur : nomination mondiale possible seulement avec saison exceptionnelle + titre', () => {
    const exceptional = worldAccessScore(
      strong(makePkg('attacker', 'p12-minor'), {}).snapshot.state,
      {
        family: 'att', age: 25, matches: 34, starts: 34, minutes: 3000,
        goals: 34, assists: 12, cleanSheets: 0, keySaves: 0, averageRating: 8.6,
        yellowCards: 1, redCards: 0, injuryDays: 0, clubGoalsAgainst: 20,
        clubRank: 1, leagueSize: 16, reputation: 95, grandsMatchs: 92,
      },
      champMinor,
      ['Champion national'],
    )
    const mediocre = worldAccessScore(
      makePkg('attacker', 'p12-minor2').snapshot.state,
      {
        family: 'att', age: 25, matches: 26, starts: 22, minutes: 1900,
        goals: 9, assists: 4, cleanSheets: 0, keySaves: 0, averageRating: 6.7,
        yellowCards: 3, redCards: 0, injuryDays: 20, clubGoalsAgainst: 40,
        clubRank: 9, leagueSize: 16, reputation: 55, grandsMatchs: 50,
      },
      champMinor,
      [],
    )
    expect(exceptional).toBeGreaterThanOrEqual(0.6)
    expect(mediocre).toBeLessThan(0.5)
  })

  it('championnat majeur : viviers plus forts, distinctions crédibles', () => {
    const a = runMajor(strong(makePkg('attacker', 'p12-major')))
    expect(a.records.length).toBeGreaterThan(0)
  })

  it('nomination sans victoire possible (statut ≠ vainqueur)', () => {
    let sawNomination = false
    for (let s = 0; s < 50 && !sawNomination; s += 1) {
      const pkg = strong(makePkg('attacker', `p12-nom-${s}`), { continental_entrant: true })
      const a = runMajor(pkg, { s: stats({ goals: 19, assists: 8, averageRating: 7.2 }) })
      if (a.records.some((r) => r.result !== 'vainqueur')) sawNomination = true
    }
    expect(sawNomination).toBe(true)
  })

  it('déterminisme + absence de doublon', () => {
    const pkg = strong(makePkg('attacker', 'p12-det'), { continental_entrant: true })
    const a = runMajor(pkg)
    const b = runMajor(pkg)
    expect(a).toEqual(b)
    const ids = a.records.map((r) => r.awardId)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('impact borné (pas de saut de niveau)', () => {
    const a = runMajor(
      strong(makePkg('attacker', 'p12-imp'), { continental_entrant: true, won_continental: true }),
      { s: stats({ goals: 33, assists: 16, averageRating: 8.6 }) },
    )
    expect(a.impact.reputation).toBeLessThanOrEqual(16)
    expect(a.impact.popularite).toBeLessThanOrEqual(14)
    expect(a.impact.valuePct).toBeLessThanOrEqual(0.12)
  })
})

describe('Phase 12 — records', () => {
  function runRecords(pkg: CareerSavePackage, s: SeasonMatchStats, opts: {
    valueBefore?: number
    valueAfter?: number
    weeklyWage?: number
    age?: number
  } = {}) {
    return computeSeasonRecords(pkg.snapshot.state, {
      matchStats: s,
      club: club(),
      ageDuringSeason: opts.age ?? 25,
      championship: champElite,
      valueBefore: opts.valueBefore ?? 1_000_000,
      valueAfter: opts.valueAfter ?? 1_200_000,
      weeklyWage: opts.weeklyWage ?? 40_000,
      distinctions: [],
      collectiveTrophyCount: 1,
    })
  }

  it('record de club', () => {
    const r = runRecords(makePkg('attacker', 'p12-rec-club'), stats({ goals: 14, assists: 6 }))
    expect(r.newRecords.some((x) => x.scope === 'club')).toBe(true)
  })

  it('record national (seuil élevé)', () => {
    const r = runRecords(makePkg('attacker', 'p12-rec-nat'), stats({ goals: 20 }))
    expect(r.newRecords.some((x) => x.rarity === 'record_national')).toBe(true)
  })

  it('record mondial (seuil très élevé)', () => {
    const r = runRecords(makePkg('attacker', 'p12-rec-monde'), stats({ goals: 31 }))
    expect(r.newRecords.some((x) => x.rarity === 'record_mondial')).toBe(true)
  })

  it('record battu : une meilleure saison remplace la précédente', () => {
    const pkg = makePkg('attacker', 'p12-rec-beat')
    const first = runRecords(pkg, stats({ goals: 20 }))
    const withLedger = mutate(pkg, { records: first.ledger, seasonIndex: pkg.snapshot.state.seasonIndex + 1 })
    const better = computeSeasonRecords(withLedger.snapshot.state, {
      matchStats: stats({ goals: 26 }),
      club: club(),
      ageDuringSeason: 26,
      championship: champElite,
      valueBefore: 1_000_000,
      valueAfter: 1_200_000,
      weeklyWage: 40_000,
      distinctions: [],
      collectiveTrophyCount: 1,
    })
    const rec = better.newRecords.find((x) => x.id === 'perso_buts')
    expect(rec?.value).toBe(26)

    // Une saison moins bonne ne bat pas le record.
    const worse = computeSeasonRecords(
      mutate(pkg, { records: better.ledger }).snapshot.state,
      {
        matchStats: stats({ goals: 18 }),
        club: club(),
        ageDuringSeason: 27,
        championship: champElite,
        valueBefore: 1_000_000,
        valueAfter: 1_100_000,
        weeklyWage: 40_000,
        distinctions: [],
        collectiveTrophyCount: 1,
      },
    )
    expect(worse.newRecords.some((x) => x.id === 'perso_buts')).toBe(false)
  })

  it('déterminisme + absence de doublon d’ids', () => {
    const pkg = makePkg('attacker', 'p12-rec-det')
    const a = runRecords(pkg, stats({ goals: 22 }))
    const b = runRecords(pkg, stats({ goals: 22 }))
    expect(a).toEqual(b)
    const ids = a.ledger.map((x) => x.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('rareté : pas de spam (les accomplissements mineurs ne sont pas émis)', () => {
    // Saison très modeste : aucun record notable.
    const r = runRecords(makePkg('attacker', 'p12-rec-modeste'), stats({ goals: 3, assists: 2, minutes: 1200, averageRating: 6.4 }))
    expect(r.newRecords.length).toBe(0)
    // Le registre est tout de même mis à jour en silence.
    expect(r.ledger.length).toBeGreaterThan(0)
  })
})

describe('Phase 12 — intégration & bilan', () => {
  function playSeason(pkg: CareerSavePackage): CareerSavePackage {
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    return completeSeason(r2.package).package
  }

  it('la saison stocke distinctions majeures + records sans 3e dilemme', () => {
    const pkg = mutate(makePkg('attacker', 'p12-loop'), { age: 27, competitionLevel: 74 })
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    const done = completeSeason(r2.package).package
    expect(done.snapshot.state.dilemmasResolvedThisSeason).toBe(0)
    const entry = done.snapshot.state.seasonTimeline.at(-1)!
    expect(Array.isArray(entry.distinctions)).toBe(true)
    expect(Array.isArray(entry.records)).toBe(true)
    expect(Array.isArray(done.snapshot.state.records)).toBe(true)
  })

  it('records + distinctions survivent à un save/reload', () => {
    let pkg = mutate(makePkg('attacker', 'p12-save'), { age: 27, competitionLevel: 74 })
    for (let i = 0; i < 4; i += 1) pkg = playSeason(pkg)
    const beforeLedger = pkg.snapshot.state.records ?? []
    const reloaded = careerSavePackageSchema.parse(
      JSON.parse(JSON.stringify(pkg)),
    ) as CareerSavePackage
    expect(reloaded.snapshot.state.records ?? []).toEqual(beforeLedger)
  })

  it('bilan de retraite : présente les points forts Phase 12', () => {
    let pkg = mutate(makePkg('attacker', 'p12-final'), { age: 28, competitionLevel: 76 })
    for (let i = 0; i < 4; i += 1) pkg = playSeason(pkg)
    pkg = mutate(pkg, { phase: 'retired', careerStage: 'carriere_terminee' })
    const report = buildFinalReport(pkg)
    expect(report.retirement).toBeDefined()
    expect(report.retirement.careerRecords.longevity).toBeGreaterThan(0)
    expect(Array.isArray(report.retirement.recordsStillHeld)).toBe(true)
    const career = buildCareerRecords(pkg.snapshot.state)
    expect(career.clubs).toBeGreaterThanOrEqual(1)
  })

  it('un record ne se déclenche pas presque chaque saison (rareté)', () => {
    let pkg = makePkg('attacker', 'p12-rarity')
    let seasonsWithRecord = 0
    for (let i = 0; i < 6; i += 1) {
      pkg = playSeason(pkg)
      const entry = pkg.snapshot.state.seasonTimeline.at(-1)!
      if ((entry.records ?? []).length > 0) seasonsWithRecord += 1
    }
    // Tolérant, mais interdit un record chaque saison sur un début de carrière modeste.
    expect(seasonsWithRecord).toBeLessThan(6)
  })

  it('absence de doublon dans les distinctions de timeline', () => {
    let pkg = mutate(makePkg('attacker', 'p12-nodup'), { age: 27, competitionLevel: 74 })
    for (let i = 0; i < 4; i += 1) pkg = playSeason(pkg)
    for (const entry of pkg.snapshot.state.seasonTimeline) {
      const ids = (entry.distinctions ?? []).map((d) => `${d.awardId}:${d.tier ?? 'championnat'}`)
      expect(ids.length).toBe(new Set(ids).size)
      const tro = entry.matchStats.trophies
      expect(tro.length).toBe(new Set(tro).size)
    }
  })
})
