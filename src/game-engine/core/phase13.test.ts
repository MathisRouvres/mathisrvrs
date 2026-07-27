import { describe, expect, it } from 'vitest'
import {
  buildSeasonInputFromPackage,
  careerSavePackageSchema,
  completeSeason,
  createCareer,
  getNextDilemma,
  getVisibleStats,
  positionOverall,
  resolveDilemmaChoice,
  simulateSeasonDetailed,
  ageGrowthFactor,
  getPositionCurve,
} from '../index'
import type { CareerSavePackage } from '../types'
import type { SeasonSimulationInput } from '../index'
import type { MacroPositionId } from '../../game-content/macroPositions'

function makePkg(macro: MacroPositionId, seed: string) {
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

function playCareer(pkg0: CareerSavePackage): { peak: number; final: CareerSavePackage } {
  let pkg = pkg0
  let peak = 0
  let guard = 0
  while (pkg.snapshot.state.phase !== 'retired' && guard < 30) {
    guard += 1
    const d1 = getNextDilemma(pkg)
    if (!d1) break
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)
    if (!d2) break
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    pkg = completeSeason(r2.package).package
    const niv = getVisibleStats(pkg.snapshot.state).niveau
    if (niv > peak) peak = niv
  }
  return { peak, final: pkg }
}

const MACROS: MacroPositionId[] = ['gk', 'defender', 'midfielder', 'attacker']

function maxed(pkg: CareerSavePackage): CareerSavePackage {
  const s = pkg.snapshot.state
  return mutate(pkg, {
    hiddenTraits: {
      ...s.hiddenTraits,
      potentiel: 92,
      professionnalisme: 90,
      constance: 85,
      ambition: 85,
      adaptabilite: 80,
    },
    resources: { ...s.resources, moral: 80, confianceEntraineur: 75, fatigue: 30 },
    competitionLevel: 82,
    clubInfrastructure: 82,
  })
}

// Croissance nette d'une saison (overall pondéré poste), en flottant.
function seasonGrowth(input: SeasonSimulationInput): number {
  const r = simulateSeasonDetailed(input)
  return (
    positionOverall(r.statsAfter, input.positionId) -
    positionOverall(r.statsBefore, input.positionId)
  )
}

function midCareerInput(macro: MacroPositionId, seed: string, over: Partial<SeasonSimulationInput> = {}) {
  const s = makePkg(macro, seed).snapshot.state
  const pkg = mutate(makePkg(macro, seed), {
    age: 23,
    hiddenTraits: { ...s.hiddenTraits, potentiel: 85 },
    resources: { ...s.resources, moral: 75, confianceEntraineur: 70, fatigue: 30 },
    competitionLevel: 72,
    clubInfrastructure: 72,
  })
  return { ...buildSeasonInputFromPackage(pkg), ...over }
}

describe('Phase 13 — le plateau 65 est corrigé', () => {
  it('niveau pondéré par le poste : un spécialiste n’est plus dilué', () => {
    const stats: Record<string, number> = {
      technique: 40, controle: 45, passe: 40, vision: 42, tir: 82, finition: 86,
      dribble: 55, vitesse: 78, endurance: 55, puissance: 80, defense: 35,
      placement: 84, tactique: 45, sangFroid: 70, leadership: 45,
    }
    // Ancienne moyenne plate ≈ 59 ; overall pondéré (attaquant) nettement plus haut.
    const flat = Object.values(stats).reduce((a, b) => a + b, 0) / 15
    const weighted = positionOverall(stats as never, 'st')
    expect(weighted).toBeGreaterThan(flat + 8)
    expect(weighted).toBeGreaterThan(70)
  })

  it('dépassement fréquent de 65 et raisonnable de 75 (belles carrières)', () => {
    const peaks: number[] = []
    for (const macro of MACROS) {
      for (let s = 0; s < 12; s += 1) peaks.push(playCareer(makePkg(macro, `p13-${macro}-${s}`)).peak)
    }
    const over65 = peaks.filter((p) => p > 65).length / peaks.length
    const over75 = peaks.filter((p) => p > 75).length
    expect(over65).toBeGreaterThan(0.6) // 65 n'est plus un plafond
    expect(over75).toBeGreaterThan(0) // 75 atteignable
    expect(Math.max(...peaks)).toBeGreaterThan(75)
  })

  it('dépassement rare de 85 et exceptionnel de 90 (carrières au sommet)', () => {
    const peaks: number[] = []
    for (const macro of MACROS) {
      for (let s = 0; s < 12; s += 1) peaks.push(playCareer(maxed(makePkg(macro, `p13-max-${macro}-${s}`))).peak)
    }
    const over85 = peaks.filter((p) => p > 85).length
    const over90 = peaks.filter((p) => p > 90).length
    expect(Math.max(...peaks)).toBeGreaterThanOrEqual(88) // sommet atteignable
    expect(over85).toBeGreaterThan(0) // rare mais possible
    expect(over90 / peaks.length).toBeLessThan(0.25) // exceptionnel
  })
})

describe('Phase 13 — potentiel = plafond souple', () => {
  it('un potentiel plus élevé produit un pic plus élevé en moyenne', () => {
    const cohort = (pot: number) => {
      let sum = 0
      const n = 10
      for (let s = 0; s < n; s += 1) {
        const base = makePkg('attacker', `p13-pot-${pot}-${s}`)
        const st = base.snapshot.state
        const pkg = mutate(base, { hiddenTraits: { ...st.hiddenTraits, potentiel: pot } })
        sum += playCareer(pkg).peak
      }
      return sum / n
    }
    const low = cohort(52)
    const mid = cohort(70)
    const high = cohort(88)
    expect(mid).toBeGreaterThan(low)
    expect(high).toBeGreaterThan(mid)
  })

  it('progression rare AU-DESSUS du potentiel (jamais un mur net)', () => {
    // Stats déjà au plafond souple : la croissance ralentit mais ne s'annule pas.
    const input = midCareerInput('attacker', 'p13-ceiling', { forceExceptional: false })
    const g = seasonGrowth(input)
    expect(g).toBeGreaterThan(-0.5) // pas de blocage brutal
  })
})

describe('Phase 13 — facteurs de progression', () => {
  it('titulaire progresse plus qu’un remplaçant', () => {
    let starter = 0
    let bench = 0
    for (let s = 0; s < 6; s += 1) {
      starter += seasonGrowth(midCareerInput('midfielder', `p13-min-${s}`, { forceNoMinutes: false }))
      bench += seasonGrowth(midCareerInput('midfielder', `p13-min-${s}`, { forceNoMinutes: true }))
    }
    expect(starter).toBeGreaterThan(bench)
  })

  it('saison exceptionnelle (percée) accélère la progression, bornée', () => {
    let exceptional = 0
    let normal = 0
    for (let s = 0; s < 6; s += 1) {
      exceptional += seasonGrowth(midCareerInput('attacker', `p13-exc-${s}`, { forceExceptional: true }))
      normal += seasonGrowth(midCareerInput('attacker', `p13-exc-${s}`, { forceExceptional: false }))
    }
    expect(exceptional).toBeGreaterThan(normal)
    // Bornée : une seule saison ne fait pas gagner un nombre absurde de points.
    expect(exceptional / 6).toBeLessThan(12)
  })

  it('blessure grave réduit la progression', () => {
    let healthy = 0
    let injured = 0
    for (let s = 0; s < 6; s += 1) {
      healthy += seasonGrowth(midCareerInput('defender', `p13-inj-${s}`, { forceLongInjury: false }))
      injured += seasonGrowth(midCareerInput('defender', `p13-inj-${s}`, { forceLongInjury: true }))
    }
    expect(injured).toBeLessThan(healthy)
  })

  it('la jeunesse progresse plus vite que l’âge mûr (déclin)', () => {
    const young = seasonGrowth(midCareerInput('midfielder', 'p13-age', { age: 19 }))
    const old = seasonGrowth(midCareerInput('midfielder', 'p13-age', { age: 35 }))
    expect(young).toBeGreaterThan(old)
  })
})

describe('Phase 13 — courbes par poste', () => {
  it('gardien : pic plus tardif qu’un ailier', () => {
    const gk = getPositionCurve('gk')
    const winger = getPositionCurve('winger')
    expect(gk.peakAge).toBeGreaterThan(winger.peakAge)
    // À 29 ans, le gardien est encore en croissance, l'ailier décline.
    expect(ageGrowthFactor(29, gk)).toBeGreaterThan(ageGrowthFactor(29, winger))
  })

  it('les quatre postes peuvent dépasser 65', () => {
    for (const macro of MACROS) {
      let best = 0
      for (let s = 0; s < 8; s += 1) best = Math.max(best, playCareer(makePkg(macro, `p13-four-${macro}-${s}`)).peak)
      expect(best).toBeGreaterThan(65)
    }
  })

  it('reconversion : le changement de poste réussi ne pénalise pas la progression', () => {
    const base = seasonGrowth(midCareerInput('midfielder', 'p13-switch'))
    const switched = seasonGrowth(
      midCareerInput('midfielder', 'p13-switch', {
        flags: { ...makePkg('midfielder', 'p13-switch').snapshot.state.flags, position_switch: true },
      }),
    )
    expect(switched).toBeGreaterThanOrEqual(base)
  })
})

describe('Phase 13 — persistance & déterminisme', () => {
  it('la progression fractionnaire survit à un save/reload', () => {
    let pkg = maxed(makePkg('attacker', 'p13-save'))
    for (let i = 0; i < 4; i += 1) {
      const d1 = getNextDilemma(pkg)!
      const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
      const d2 = getNextDilemma(r1.package)!
      const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
      pkg = completeSeason(r2.package).package
    }
    const before = pkg.snapshot.state.stats
    const nivBefore = getVisibleStats(pkg.snapshot.state).niveau
    const reloaded = careerSavePackageSchema.parse(
      JSON.parse(JSON.stringify(pkg)),
    ) as CareerSavePackage
    expect(reloaded.snapshot.state.stats).toEqual(before)
    expect(getVisibleStats(reloaded.snapshot.state).niveau).toBe(nivBefore)
  })

  it('déterminisme : deux carrières identiques donnent le même pic et les mêmes stats', () => {
    const a = playCareer(makePkg('attacker', 'p13-det'))
    const b = playCareer(makePkg('attacker', 'p13-det'))
    expect(a.peak).toBe(b.peak)
    expect(a.final.snapshot.state.stats).toEqual(b.final.snapshot.state.stats)
  })
})
