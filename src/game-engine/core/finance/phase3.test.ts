import { describe, expect, it } from 'vitest'
import {
  ageSponsorships,
  buildContract,
  completeSeason,
  computeAnnualFinance,
  createCareer,
  getNextDilemma,
  migrateCareerSave,
  resolveDilemmaChoice,
  SAVE_SCHEMA_VERSION,
} from '../index'
import { applyDilemmaEffects } from '../../dilemmas/applyEffects'
import type { DilemmaEffect } from '../../dilemmas/types'
import { createRng } from '../../random/createRng'
import type { CareerSavePackage } from '../../types'
import type { CareerState } from '../../types/career'
import type { SeasonMatchStats } from '../../types/season'
import { getAgentProfile } from '../../../game-content/agents'
import {
  isSponsorshipCompatible,
  sponsorCatalog,
} from '../../../game-content/sponsors'

function makePkg(seed: string): CareerSavePackage {
  return createCareer({
    countryId: 'capitale-miroir',
    macroPosition: 'midfielder',
    seed,
  })
}

const PROFILE = makePkg('p3-profile').playerProfile

/** Applique une liste d'effets à un état (hors moteur de saison). */
function applyFx(state: CareerState, effects: DilemmaEffect[]): CareerState {
  const ctx = {
    state: structuredClone(state),
    profile: PROFILE,
    rng: createRng('p3-test-rng'),
    log: [] as string[],
    skillChecks: [] as Array<{ id: string; passed: boolean }>,
  }
  return applyDilemmaEffects(ctx, effects, 'immediate')
}

const emptyMatch: SeasonMatchStats = {
  matches: 28,
  starts: 24,
  minutes: 2100,
  goals: 5,
  assists: 4,
  cleanSheets: 0,
  keySaves: 0,
  averageRating: 7.1,
  yellowCards: 3,
  redCards: 0,
  injuryDays: 0,
  trophies: [],
}

function proState(seed: string): CareerState {
  const base = makePkg(seed).snapshot.state
  return {
    ...base,
    age: 26,
    clubStatus: 'starter',
    competitionLevel: 60,
    resources: {
      ...base.resources,
      reputationSportive: 62,
      popularite: 55,
      discipline: 60,
    },
    contract: { weeksRemaining: 100, weeklyWage: 15000 },
  }
}

describe('agent — commission & salaire', () => {
  it('la commission dépend du profil (agressif > prudent)', () => {
    const base = proState('agent-comm')
    const aggressive = buildContract(
      { ...base, agentId: 'agressif' },
      { reason: 'extension', clubId: base.clubId, seasonIndex: 5 },
    )
    const prudent = buildContract(
      { ...base, agentId: 'prudent' },
      { reason: 'extension', clubId: base.clubId, seasonIndex: 5 },
    )
    expect(aggressive.agentCommissionRate!).toBeGreaterThan(
      prudent.agentCommissionRate!,
    )
    expect(getAgentProfile('agressif').commissionRate).toBeGreaterThan(
      getAgentProfile('prudent').commissionRate,
    )
  })

  it('un agent agressif négocie un salaire au moins égal au prudent', () => {
    const base = proState('agent-wage')
    const aggressive = buildContract(
      { ...base, agentId: 'agressif' },
      { reason: 'extension', clubId: base.clubId, seasonIndex: 5 },
    ).weeklyWage
    const prudent = buildContract(
      { ...base, agentId: 'prudent' },
      { reason: 'extension', clubId: base.clubId, seasonIndex: 5 },
    ).weeklyWage
    expect(aggressive).toBeGreaterThanOrEqual(prudent)
  })
})

describe('agent — changement', () => {
  it('setAgent change le profil et remet la relation à neutre', () => {
    const base = proState('agent-change')
    const before = base.agentId
    const next = applyFx(base, [{ type: 'setAgent', agentId: 'mediatique' }])
    expect(next.agentId).toBe('mediatique')
    expect(next.agentId).not.toBe(before)
    expect(next.npcs.agent.relation).toBe(50)
    expect(next.flags.agent_changed).toBe(true)
  })
})

describe('sponsors — contrat, incompatibilité, rupture', () => {
  const volt = sponsorCatalog.find((s) => s.id === 'volt_athletic')!

  const signVolt: DilemmaEffect = {
    type: 'signSponsor',
    sponsor: {
      sponsorId: 'volt_athletic',
      name: 'Volt Athletic',
      sector: 'equipement',
      prestige: 82,
      annualPay: 90000,
      durationSeasons: 3,
      imageTag: 'clean',
      reputationRisk: 10,
      exclusive: true,
    },
  }

  it('signer un sponsor ajoute un contrat et des revenus au bilan', () => {
    const base = proState('spon-sign')
    const signed = applyFx(base, [signVolt])
    expect(signed.sponsorships).toHaveLength(1)
    expect(signed.flags.sponsor_active).toBe(true)

    const input = {
      matchStats: emptyMatch,
      weeklyWageThisSeason: 15000,
      contractThisSeason: base.contract,
      clubTenure: 2,
    }
    const withSponsor = computeAnnualFinance({ ...input, state: signed })
    const without = computeAnnualFinance({ ...input, state: base })
    expect(withSponsor.income.sponsoring - without.income.sponsoring).toBe(90000)
  })

  it('incompatibilité : deux contrats exclusifs du même secteur refusés', () => {
    const base = proState('spon-incompat')
    const once = applyFx(base, [signVolt])
    const twice = applyFx(once, [signVolt])
    // Le second contrat équipement exclusif est refusé.
    expect(twice.sponsorships).toHaveLength(1)
    expect(isSponsorshipCompatible(once, volt).ok).toBe(false)
  })

  it('incompatibilité : exigences non remplies bloquent l’offre', () => {
    const weak = { ...proState('spon-weak') }
    weak.resources = { ...weak.resources, reputationSportive: 20 }
    // Volt exige une réputation ≥ 55.
    expect(isSponsorshipCompatible(weak, volt).ok).toBe(false)
  })

  it('rupture : endSponsor retire le contrat et coûte de la réputation', () => {
    const signed = applyFx(proState('spon-break'), [signVolt])
    const repBefore = signed.resources.reputationSportive
    const broken = applyFx(signed, [
      { type: 'endSponsor', sponsorId: 'volt_athletic', reputationHit: 8 },
    ])
    expect(broken.sponsorships).toHaveLength(0)
    expect(broken.resources.reputationSportive).toBe(repBefore - 8)
    expect(broken.flags.sponsor_broken).toBe(true)
  })

  it('expiration : ageSponsorships décompte et retire à échéance', () => {
    let state = applyFx(proState('spon-age'), [
      {
        type: 'signSponsor',
        sponsor: {
          sponsorId: 'brume_co',
          name: 'Brume & Co',
          sector: 'marque_locale',
          prestige: 30,
          annualPay: 12000,
          durationSeasons: 1,
          imageTag: 'local',
          reputationRisk: 6,
          exclusive: false,
        },
      },
    ])
    expect(state.sponsorships).toHaveLength(1)
    // 1 saison restante → expiré après une clôture (aging).
    state = ageSponsorships(state)
    expect(state.sponsorships).toHaveLength(0)
  })
})

describe('investissements — rendement, perte, application unique', () => {
  const investTech: DilemmaEffect = {
    type: 'makeInvestment',
    investment: {
      investmentId: 'technologie',
      label: 'Start-up tech',
      cost: 40000,
      sector: 'technologie',
    },
  }

  it('investir débite le cash et crée un actif', () => {
    const base = { ...proState('inv-make') }
    base.finances = { ...base.finances, cash: 100000 }
    const after = applyFx(base, [investTech])
    expect(after.finances.cash).toBe(60000)
    expect(after.finances.investments).toHaveLength(
      base.finances.investments.length + 1,
    )
    expect(after.flags['invested:technologie']).toBe(true)
  })

  it('rendement : un actif génère un revenu de placement au bilan', () => {
    const base = { ...proState('inv-yield') }
    base.finances = { ...base.finances, cash: 100000 }
    const withAsset = applyFx(base, [investTech])
    const af = computeAnnualFinance({
      state: withAsset,
      matchStats: emptyMatch,
      weeklyWageThisSeason: 15000,
      contractThisSeason: base.contract,
      clubTenure: 1,
    })
    expect(af.income.investmentIncome).toBeGreaterThan(0)
  })

  it('perte : un effet cash négatif réduit la trésorerie', () => {
    const base = { ...proState('inv-loss') }
    base.finances = { ...base.finances, cash: 50000 }
    const after = applyFx(base, [
      { type: 'delta', target: { kind: 'cash' }, delta: -30000 },
    ])
    expect(after.finances.cash).toBe(20000)
  })

  it('application unique : le même investissement ne compte qu’une fois', () => {
    const base = { ...proState('inv-once') }
    base.finances = { ...base.finances, cash: 200000 }
    const once = applyFx(base, [investTech])
    const twice = applyFx(once, [investTech])
    expect(twice.finances.investments).toHaveLength(
      base.finances.investments.length + 1,
    )
    // Cash inchangé au second essai (no-op).
    expect(twice.finances.cash).toBe(once.finances.cash)
  })
})

describe('boucle de saison — deux dilemmes maximum', () => {
  it('exactement deux dilemmes par saison, jamais un troisième', () => {
    const pkg = makePkg('p3-two-max')
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    // Plus aucun dilemme proposé après deux résolutions.
    expect(getNextDilemma(r2.package)).toBeNull()
    // Résoudre un troisième est interdit.
    expect(() => resolveDilemmaChoice(r2.package, d2, d2.choices[0]!.id)).toThrow()
  })

  it('une saison complète intègre agents/sponsors sans casser les invariants', () => {
    let pkg = makePkg('p3-season')
    const d1 = getNextDilemma(pkg)!
    pkg = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id).package
    const d2 = getNextDilemma(pkg)!
    pkg = resolveDilemmaChoice(pkg, d2, d2.choices[0]!.id).package
    const { package: next } = completeSeason(pkg)
    expect(Array.isArray(next.snapshot.state.sponsorships)).toBe(true)
    expect(typeof next.snapshot.state.agentId).toBe('string')
    expect(next.snapshot.state.wealth.current).toBeGreaterThanOrEqual(0)
  })
})

describe('migration v6 → v7', () => {
  it('ajoute sponsorships + agentId par défaut, conserve la carrière', () => {
    const modern = makePkg('p3-migrate')
    const state = { ...modern.snapshot.state } as Record<string, unknown>
    delete state.sponsorships
    state.agentId = null
    const rawV6 = {
      ...modern,
      schemaVersion: 6,
      snapshot: {
        ...modern.snapshot,
        saveSchemaVersion: 6,
        state,
      },
    }
    const migrated = migrateCareerSave(rawV6)
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.snapshot.state.sponsorships).toEqual([])
    expect(migrated.snapshot.state.agentId).toBe('loyal')
    // Données préservées.
    expect(migrated.snapshot.state.seed).toBe(modern.snapshot.state.seed)
    // Déterministe.
    const again = migrateCareerSave(rawV6)
    expect(again.snapshot.state.agentId).toBe('loyal')
  })
})
