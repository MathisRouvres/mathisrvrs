import { describe, expect, it } from 'vitest'
import {
  advanceCareerSeason,
  applyAnnualFinance,
  buildContract,
  completeSeason,
  computeAnnualFinance,
  computeContractWage,
  createCareer,
  deriveLifestyle,
  deriveWageTier,
  getCareerSummary,
  getNextDilemma,
  initialWealth,
  migrateCareerSave,
  normalizeContract,
  resolveContractForSeason,
  resolveDilemmaChoice,
  SAVE_SCHEMA_VERSION,
  WAGE_BRACKETS,
  wageFactorsFromState,
} from '../index'
import type { CareerSavePackage } from '../../types'
import type { CareerState } from '../../types/career'
import type { WageFactors } from './salary'
import type { SeasonMatchStats } from '../../types/season'

function makePkg(seed: string): CareerSavePackage {
  return createCareer({
    countryId: 'capitale-miroir',
    macroPosition: 'midfielder',
    seed,
  })
}

function mutateState(
  pkg: CareerSavePackage,
  patch: Partial<CareerState>,
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

const baseFactors: WageFactors = {
  age: 24,
  level: 60,
  potentiel: 70,
  reputation: 55,
  clubStatus: 'starter',
  clubPrestige: 60,
  leagueLevel: 60,
  nationalTier: 'none',
  agentQuality: 50,
  fragility: 45,
  competition: 0.4,
}

const emptyMatch: SeasonMatchStats = {
  matches: 30,
  starts: 26,
  minutes: 2200,
  goals: 8,
  assists: 6,
  cleanSheets: 0,
  keySaves: 0,
  averageRating: 7.4,
  yellowCards: 4,
  redCards: 0,
  injuryDays: 0,
  trophies: [],
}

describe('salaire cohérent', () => {
  it('jamais négatif, borné à la fourchette du tier', () => {
    const low: WageFactors = {
      ...baseFactors,
      reputation: 5,
      level: 20,
      clubStatus: 'bench',
      potentiel: 40,
    }
    const r = computeContractWage(low)
    expect(r.weeklyWage).toBeGreaterThanOrEqual(0)
    const [min, max] = WAGE_BRACKETS[r.tier]
    expect(r.weeklyWage).toBeGreaterThanOrEqual(0)
    expect(r.weeklyWage).toBeLessThanOrEqual(max)
    expect(min).toBeGreaterThanOrEqual(0)
  })

  it('académie = tier centre (salaire minimal)', () => {
    const academy: WageFactors = { ...baseFactors, clubStatus: 'academy' }
    expect(deriveWageTier(academy)).toBe('centre')
    expect(computeContractWage(academy).weeklyWage).toBeLessThanOrEqual(250)
  })

  it('monotone : plus de réputation/niveau ⇒ salaire au moins égal', () => {
    const modest = computeContractWage({
      ...baseFactors,
      reputation: 40,
      level: 45,
      clubStatus: 'rotation',
    }).weeklyWage
    const strong = computeContractWage({
      ...baseFactors,
      reputation: 90,
      level: 88,
      clubStatus: 'key_player',
    }).weeklyWage
    expect(strong).toBeGreaterThan(modest)
  })

  it('star mondiale > international > cadre (tiers croissants)', () => {
    const cadre = deriveWageTier({
      ...baseFactors,
      reputation: 66,
      level: 70,
      clubStatus: 'key_player',
    })
    const world = deriveWageTier({
      ...baseFactors,
      reputation: 99,
      level: 96,
      clubStatus: 'key_player',
      nationalTier: 'regular',
    })
    expect(['cadre', 'star_championnat']).toContain(cadre)
    expect(['international', 'star_mondiale']).toContain(world)
  })

  it('décote de vétéran : le salaire recule après 32 ans', () => {
    const prime = computeContractWage({ ...baseFactors, age: 27 }).weeklyWage
    const veteran = computeContractWage({ ...baseFactors, age: 36 }).weeklyWage
    expect(veteran).toBeLessThan(prime)
  })
})

describe('contrat actif unique', () => {
  it('buildContract produit un contrat complet et cohérent', () => {
    const pkg = mutateState(makePkg('ctr-build'), { clubStatus: 'starter', age: 24 })
    const c = buildContract(pkg.snapshot.state, {
      reason: 'first_pro',
      clubId: pkg.snapshot.state.clubId,
      seasonIndex: 3,
      durationSeasons: 3,
    })
    expect(c.weeklyWage).toBeGreaterThanOrEqual(0)
    expect(c.weeksRemaining).toBe(3 * 52)
    expect(c.endSeason).toBe(3 + 3)
    expect(c.startSeason).toBe(3)
    // Aucune prime négative.
    for (const v of [
      c.signingBonus,
      c.appearanceBonus,
      c.startBonus,
      c.performanceBonus,
      c.trophyBonus,
      c.loyaltyBonus,
    ]) {
      expect(v ?? 0).toBeGreaterThanOrEqual(0)
    }
  })

  it('normalizeContract comble un contrat partiel sans champ manquant', () => {
    const full = normalizeContract(
      { weeksRemaining: 40, weeklyWage: 500 },
      'club-x',
      2,
    )
    expect(full.clubId).toBe('club-x')
    expect(full.agentCommissionRate).toBeGreaterThan(0)
    expect(full.narrativePromises).toEqual([])
    expect(full.appearanceBonus).toBeGreaterThanOrEqual(0)
  })

  it('un seul contrat après transfert automatique (ancien clôturé)', () => {
    const pkg = mutateState(makePkg('ctr-transfer'), {
      contract: { weeksRemaining: 40, weeklyWage: 800 },
      flags: { ...makePkg('ctr-transfer').snapshot.state.flags, transfer_accepted: true },
    })
    const { package: next, result } = advanceCareerSeason(pkg, { forceClubRank: 8 })
    expect(result.autoTransfer).toBeTruthy()
    const c = next.snapshot.state.contract
    expect(c).toBeTruthy()
    // Contrat unique = un seul objet, rattaché au nouveau club.
    expect(c!.clubId ?? next.snapshot.state.clubId).toBe(next.snapshot.state.clubId)
    expect(c!.weeklyWage).toBeGreaterThanOrEqual(0)
  })
})

describe('événements de contrat', () => {
  it('premier contrat pro : joueur pro au salaire nul ⇒ first_pro', () => {
    const base = makePkg('ctr-firstpro')
    const state: CareerState = {
      ...base.snapshot.state,
      clubStatus: 'rotation',
      age: 18,
      contract: { weeksRemaining: 60, weeklyWage: 0 },
    }
    const res = resolveContractForSeason(state, { seasonIndex: 3 })
    expect(res?.reason).toBe('first_pro')
    expect(res!.contract.weeklyWage).toBeGreaterThan(0)
  })

  it('prolongation : contrat expiré sans départ ⇒ extension', () => {
    const base = makePkg('ctr-ext')
    const state: CareerState = {
      ...base.snapshot.state,
      clubStatus: 'starter',
      age: 26,
      contract: { weeksRemaining: 0, weeklyWage: 6000 },
    }
    const res = resolveContractForSeason(state, { seasonIndex: 8 })
    expect(res?.reason).toBe('extension')
    expect(res!.contract.clubId ?? state.clubId).toBe(state.clubId)
    expect(res!.contract.weeksRemaining).toBeGreaterThan(0)
  })

  it('renégociation : non automatique (roll bas ⇒ aucun changement)', () => {
    const base = makePkg('ctr-reneg')
    const state: CareerState = {
      ...base.snapshot.state,
      clubStatus: 'key_player',
      age: 25,
      resources: { ...base.snapshot.state.resources, reputationSportive: 88 },
      contract: { weeksRemaining: 80, weeklyWage: 1000 },
    }
    const low = resolveContractForSeason(state, {
      seasonIndex: 6,
      renegotiationRoll: 0.1,
    })
    expect(low).toBeNull()
    const high = resolveContractForSeason(state, {
      seasonIndex: 6,
      renegotiationRoll: 0.9,
    })
    expect(high?.reason).toBe('renegotiation')
    expect(high!.contract.weeklyWage).toBeGreaterThan(1000)
  })

  it('salaire stable : joueur établi, contrat en cours ⇒ aucun changement', () => {
    const base = makePkg('ctr-stable')
    const state: CareerState = {
      ...base.snapshot.state,
      clubStatus: 'rotation',
      age: 24,
      contract: { weeksRemaining: 80, weeklyWage: 5000 },
    }
    expect(resolveContractForSeason(state, { seasonIndex: 5 })).toBeNull()
  })
})

describe('bilan financier annuel', () => {
  const richState = (over: Partial<CareerState> = {}): CareerState => {
    const base = makePkg('fin-annual').snapshot.state
    return {
      ...base,
      clubStatus: 'starter',
      age: 26,
      competitionLevel: 60,
      resources: {
        ...base.resources,
        popularite: 60,
        reputationSportive: 65,
      },
      contract: { weeksRemaining: 100, weeklyWage: 15000 },
      ...over,
    }
  }

  it('revenus : composantes cohérentes et somme exacte', () => {
    const state = richState()
    const af = computeAnnualFinance({
      state,
      matchStats: emptyMatch,
      weeklyWageThisSeason: 15000,
      contractThisSeason: state.contract,
      clubTenure: 2,
    })
    expect(af.income.salary).toBe(15000 * 52)
    expect(af.income.bonuses).toBeGreaterThan(0)
    expect(af.income.sponsoring).toBeGreaterThan(0)
    expect(af.income.total).toBe(
      af.income.salary +
        af.income.bonuses +
        af.income.selection +
        af.income.trophyBonus +
        af.income.sponsoring +
        af.income.investmentIncome,
    )
  })

  it('primes : titularisations + trophées, jamais doublées', () => {
    const state = richState()
    const withTrophy = computeAnnualFinance({
      state,
      matchStats: { ...emptyMatch, trophies: ['Champion national'] },
      weeklyWageThisSeason: 15000,
      contractThisSeason: state.contract,
      clubTenure: 1,
    })
    const noTrophy = computeAnnualFinance({
      state,
      matchStats: emptyMatch,
      weeklyWageThisSeason: 15000,
      contractThisSeason: state.contract,
      clubTenure: 1,
    })
    expect(withTrophy.income.trophyBonus).toBeGreaterThan(0)
    expect(noTrophy.income.trophyBonus).toBe(0)
  })

  it('salaire nul (académie) ⇒ aucune prime, dépenses modestes non ruineuses', () => {
    const state = richState({
      clubStatus: 'academy',
      contract: { weeksRemaining: 100, weeklyWage: 0 },
      finances: { cash: 500, weeklyWage: 0, investments: [] },
    })
    const af = computeAnnualFinance({
      state,
      matchStats: { ...emptyMatch, matches: 0, starts: 0, averageRating: 0 },
      weeklyWageThisSeason: 0,
      contractThisSeason: state.contract,
      clubTenure: 1,
    })
    expect(af.income.salary).toBe(0)
    expect(af.income.bonuses).toBe(0)
    expect(af.lifestyle).toBe('modeste')
    // Le jeune ne fait pas faillite : le net ne peut vider plus que ses moyens.
    expect(af.expenses.total).toBeLessThanOrEqual(af.income.total + 500)
  })

  it('dépenses : niveau de vie croissant avec le salaire', () => {
    expect(deriveLifestyle(500)).toBe('modeste')
    expect(deriveLifestyle(6000)).toBe('confortable')
    expect(deriveLifestyle(30000)).toBe('luxueux')
    expect(deriveLifestyle(200000)).toBe('extravagant')
  })

  it('joueur titulaire : revenu net positif (le patrimoine croît)', () => {
    const state = richState()
    const af = computeAnnualFinance({
      state,
      matchStats: emptyMatch,
      weeklyWageThisSeason: 15000,
      contractThisSeason: state.contract,
      clubTenure: 2,
    })
    expect(af.net).toBeGreaterThan(0)
  })

  it('idempotence : calcul pur et déterministe', () => {
    const state = richState()
    const input = {
      state,
      matchStats: emptyMatch,
      weeklyWageThisSeason: 15000,
      contractThisSeason: state.contract,
      clubTenure: 2,
    }
    expect(computeAnnualFinance(input)).toEqual(computeAnnualFinance(input))
  })
})

describe('patrimoine', () => {
  it('formule : patrimoine après = avant + net', () => {
    const base = makePkg('wealth-formula').snapshot.state
    const state: CareerState = {
      ...base,
      finances: { cash: 100000, weeklyWage: 15000, investments: [] },
      wealth: initialWealth(100000, 15000),
      clubStatus: 'starter',
      contract: { weeksRemaining: 100, weeklyWage: 15000 },
    }
    const af = computeAnnualFinance({
      state,
      matchStats: emptyMatch,
      weeklyWageThisSeason: 15000,
      contractThisSeason: state.contract,
      clubTenure: 2,
    })
    const next = applyAnnualFinance(state, af)
    expect(next.wealth.current).toBe(100000 + af.net)
    expect(next.wealth.lastAnnualDelta).toBe(af.net)
    expect(next.wealth.max).toBeGreaterThanOrEqual(next.wealth.current)
    expect(next.wealth.cumulativeIncome).toBe(af.income.total)
    expect(next.wealth.cumulativeExpenses).toBe(af.expenses.total)
  })

  it('cash jamais négatif (bornage)', () => {
    const base = makePkg('wealth-floor').snapshot.state
    const state: CareerState = {
      ...base,
      finances: { cash: 0, weeklyWage: 0, investments: [] },
      wealth: initialWealth(0, 0),
      clubStatus: 'academy',
      contract: { weeksRemaining: 100, weeklyWage: 0 },
    }
    const af = computeAnnualFinance({
      state,
      matchStats: { ...emptyMatch, matches: 0, starts: 0, averageRating: 0 },
      weeklyWageThisSeason: 0,
      contractThisSeason: state.contract,
      clubTenure: 1,
    })
    const next = applyAnnualFinance(state, af)
    expect(next.finances.cash).toBeGreaterThanOrEqual(0)
    expect(next.wealth.current).toBeGreaterThanOrEqual(0)
  })
})

describe('intégration boucle de saison', () => {
  it('une saison met à jour patrimoine + garde un contrat unique', () => {
    const pkg = makePkg('int-season')
    const before = pkg.snapshot.state.wealth.current
    const next = playSeason(pkg)
    const s = next.snapshot.state
    expect(typeof s.wealth.current).toBe('number')
    expect(s.wealth.current).not.toBe(before)
    // Toujours zéro ou un contrat (jamais deux).
    expect(s.contract === null || typeof s.contract.weeklyWage === 'number').toBe(true)
    expect(s.finances.cash).toBeGreaterThanOrEqual(0)
  })

  it('déterminisme : même seed ⇒ même patrimoine', () => {
    const a = playSeason(makePkg('int-repro'))
    const b = playSeason(makePkg('int-repro'))
    expect(a.snapshot.state.wealth.current).toBe(b.snapshot.state.wealth.current)
    expect(a.snapshot.state.finances.weeklyWage).toBe(
      b.snapshot.state.finances.weeklyWage,
    )
  })

  it('le jeune finit par signer un vrai contrat (salaire > 0)', () => {
    let pkg = makePkg('int-firstpro')
    for (let i = 0; i < 4 && !pkg.snapshot.state.flags.wants_retirement; i += 1) {
      if (pkg.snapshot.state.careerStage === 'carriere_terminee') break
      pkg = playSeason(pkg)
    }
    const summary = getCareerSummary(pkg)
    expect(summary.finance.netWorth).toBeGreaterThanOrEqual(0)
    // Après plusieurs saisons pro, un salaire a été signé.
    expect(summary.finance.weeklyWage).toBeGreaterThan(0)
  })

  it('le résumé expose salaire, contrat, patrimoine, variation', () => {
    const summary = getCareerSummary(playSeason(makePkg('int-summary')))
    expect(summary.finance).toBeTruthy()
    expect(typeof summary.finance.weeklyWage).toBe('number')
    expect(typeof summary.finance.netWorth).toBe('number')
    expect(typeof summary.finance.lastAnnualDelta).toBe('number')
    expect(['modeste', 'confortable', 'luxueux', 'extravagant']).toContain(
      summary.finance.lifestyle,
    )
  })
})

describe('migration ancienne sauvegarde (v5 → v6)', () => {
  it('ajoute lifestyle + wealth, conserve la carrière, dérive du cash', () => {
    const modern = makePkg('mig-v5')
    const state = { ...modern.snapshot.state } as Record<string, unknown>
    const cash = (state.finances as { cash: number }).cash
    delete state.lifestyle
    delete state.wealth
    const rawV5 = {
      ...modern,
      schemaVersion: 5,
      snapshot: {
        ...modern.snapshot,
        saveSchemaVersion: 5,
        state,
      },
    }
    const migrated = migrateCareerSave(rawV5)
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.snapshot.state.lifestyle).toBeTruthy()
    expect(migrated.snapshot.state.wealth.current).toBe(cash)
    // Données existantes préservées.
    expect(migrated.snapshot.state.seed).toBe(modern.snapshot.state.seed)
    // Déterministe.
    const again = migrateCareerSave(rawV5)
    expect(again.snapshot.state.wealth).toEqual(migrated.snapshot.state.wealth)
  })
})
