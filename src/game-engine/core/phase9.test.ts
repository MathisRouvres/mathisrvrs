import { describe, expect, it } from 'vitest'
import {
  buildFinalReport,
  buildShareCard,
  completeSeason,
  computeLegacy,
  createCareer,
  getNextDilemma,
  pickArchetype,
  resolveDilemmaChoice,
} from '../index'
import { pickDilemmaForSlot } from '../dilemmas/slots'
import { activeDilemmaCatalog } from '../../game-content/events/active'
import type { CareerSavePackage } from '../types'
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

describe('déclenchement de la retraite', () => {
  it('la retraite volontaire ne s’applique qu’après le 2e dilemme', () => {
    const pkg = mutate(makePkg('midfielder', 'p9-retire'), {
      age: 34,
      flags: {
        ...makePkg('midfielder', 'p9-retire').snapshot.state.flags,
        wants_retirement: true,
      },
    })
    // Un seul dilemme résolu : la saison ne peut pas se clore, donc pas de retraite.
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    expect(() => completeSeason(r1.package)).toThrow(/deux dilemmes/)

    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    const { package: done } = completeSeason(r2.package)
    expect(done.snapshot.state.phase).toBe('retired')
    expect(done.snapshot.status).toBe('finished')
    expect(done.snapshot.state.dilemmasResolvedThisSeason).toBe(0)
  })

  it('santé critique met fin à la carrière après la simulation', () => {
    let pkg = mutate(makePkg('defender', 'p9-health'), {
      age: 33,
      resources: {
        ...makePkg('defender', 'p9-health').snapshot.state.resources,
        sante: 6,
      },
    })
    pkg = playSeason(pkg)
    expect(pkg.snapshot.state.phase).toBe('retired')
  })
})

describe('pondération fin de carrière (31+)', () => {
  it('favorise les dilemmes de fin de carrière avec l’âge', () => {
    const base = makePkg('midfielder', 'p9-late')
    const young = mutate(base, { age: 22 })
    const old = mutate(base, { age: 38, careerStage: 'declin' })

    const lateCategories = new Set(['career_end', 'contract', 'national_team'])
    const countLate = (state: CareerSavePackage) => {
      let late = 0
      for (let i = 0; i < 40; i += 1) {
        const picked = pickDilemmaForSlot(
          activeDilemmaCatalog,
          state.snapshot.state,
          state.playerProfile,
          {
            weightedPick: <T,>(items: readonly T[]) =>
              items[i % items.length] as T,
          },
          2,
        )
        // Échantillon déterministe : on mesure surtout via le poids, donc
        // on s’appuie sur un vrai tirage pondéré ci-dessous.
        void picked
        late += 0
      }
      return late
    }
    void countLate

    // Tirage pondéré réel : sur 200 tirages, l’ancien voit plus de fins.
    const sample = (state: CareerSavePackage, seedBase: number) => {
      let late = 0
      for (let i = 0; i < 200; i += 1) {
        let acc = 0
        const rngLike = {
          weightedPick: <T,>(items: readonly T[], weights: readonly number[]) => {
            const total = weights.reduce((a, b) => a + b, 0)
            // pseudo-aléa déterministe basé sur i
            const r = ((i * 9301 + seedBase * 49297) % 233280) / 233280
            let target = r * total
            for (let k = 0; k < items.length; k += 1) {
              acc += weights[k]!
              if (target <= acc) return items[k] as T
            }
            return items[items.length - 1] as T
          },
        }
        const picked = pickDilemmaForSlot(
          activeDilemmaCatalog,
          state.snapshot.state,
          state.playerProfile,
          rngLike,
          2,
        )
        if (picked && lateCategories.has(picked.category)) late += 1
      }
      return late
    }

    const lateOld = sample(old, 1)
    const lateYoung = sample(young, 1)
    expect(lateOld).toBeGreaterThan(lateYoung)
  })
})

describe('score d’héritage multi-dimensionnel', () => {
  it('récompense la fidélité et la longévité sans trophée', () => {
    const pkg = makePkg('midfielder', 'p9-loyal')
    const state = mutate(pkg, {
      age: 36,
      seasonsCompleted: 18,
      flags: {
        ...pkg.snapshot.state.flags,
        maxClubTenure: 14,
        home_return: true,
        club_promise_kept: true,
      },
    }).snapshot.state
    const totals = {
      matches: 500,
      goals: 20,
      assists: 40,
      cleanSheets: 0,
      keySaves: 0,
      nationalCaps: 0,
      trophies: 0,
      distinctions: 1,
      majorInjuries: 0,
    }
    const { breakdown, score } = computeLegacy(state, totals, 70)
    expect(breakdown.fidelite).toBeGreaterThan(70)
    expect(breakdown.longevite).toBeGreaterThan(60)
    // Une carrière sans trophée reste honorable.
    expect(score).toBeGreaterThan(35)
  })

  it('récompense une grande carrière internationale', () => {
    const pkg = makePkg('attacker', 'p9-nat')
    const state = mutate(pkg, {
      flags: { ...pkg.snapshot.state.flags, national_regular: true },
    }).snapshot.state
    const totals = {
      matches: 300,
      goals: 90,
      assists: 40,
      cleanSheets: 0,
      keySaves: 0,
      nationalCaps: 60,
      trophies: 1,
      distinctions: 2,
      majorInjuries: 0,
    }
    const { breakdown } = computeLegacy(state, totals, 78)
    expect(breakdown.carriereInternationale).toBeGreaterThan(70)
  })

  it('le global ne dépend pas seulement des trophées', () => {
    const pkg = makePkg('midfielder', 'p9-notrophy')
    const base = pkg.snapshot.state
    const noTrophy = computeLegacy(
      mutate(pkg, {
        flags: { ...base.flags, maxClubTenure: 12, fan_favorite: true },
        resources: { ...base.resources, popularite: 88 },
        relationships: { ...base.relationships, fans: 85, teammates: 80 },
      }).snapshot.state,
      {
        matches: 420,
        goals: 30,
        assists: 60,
        cleanSheets: 0,
        keySaves: 0,
        nationalCaps: 20,
        trophies: 0,
        distinctions: 3,
        majorInjuries: 1,
      },
      72,
    )
    expect(noTrophy.score).toBeGreaterThan(45)
  })
})

describe('archétypes de fin', () => {
  it('associe un titre au parcours dominant', () => {
    const pkg = makePkg('midfielder', 'p9-arch')
    const loyalState = mutate(pkg, {
      flags: { ...pkg.snapshot.state.flags, maxClubTenure: 14, home_return: true },
    }).snapshot.state
    const totals = {
      matches: 500,
      goals: 10,
      assists: 30,
      cleanSheets: 0,
      keySaves: 0,
      nationalCaps: 0,
      trophies: 0,
      distinctions: 0,
      majorInjuries: 0,
    }
    const { breakdown } = computeLegacy(loyalState, totals, 65)
    const arch = pickArchetype(breakdown, loyalState, totals)
    expect(arch.title.length).toBeGreaterThan(3)
    expect(arch.tagline.length).toBeGreaterThan(5)
  })

  it('deux profils opposés produisent des titres différents', () => {
    const pkg = makePkg('attacker', 'p9-arch2')
    const st = pkg.snapshot.state
    const loyal = computeLegacy(
      mutate(pkg, { flags: { ...st.flags, maxClubTenure: 15 } }).snapshot.state,
      { matches: 400, goals: 20, assists: 10, cleanSheets: 0, keySaves: 0, nationalCaps: 0, trophies: 0, distinctions: 0, majorInjuries: 0 },
      60,
    )
    const nomad = mutate(pkg, {
      seasonTimeline: [
        { clubId: 'palais-fc' },
        { clubId: 'lumen-royals' },
        { clubId: 'cimes-fc' },
        { clubId: 'acier-club' },
        { clubId: 'union-maree' },
      ].map((c, i) => ({
        seasonIndex: i + 1,
        age: 20 + i,
        clubId: c.clubId,
        careerStage: 'progression' as const,
        matchStats: {
          matches: 30, starts: 25, minutes: 2400, goals: 10, assists: 5,
          cleanSheets: 0, keySaves: 0, averageRating: 7, yellowCards: 3,
          redCards: 0, injuryDays: 0, trophies: [],
        },
        progressionLabel: 'positive' as const,
        narrativeSummary: '',
        valueAfter: 1_000_000,
        reputationAfter: 60,
        recordedAt: '2026-01-01',
      })),
    }).snapshot.state
    const nomadLegacy = computeLegacy(nomad, {
      matches: 150, goals: 50, assists: 25, cleanSheets: 0, keySaves: 0,
      nationalCaps: 0, trophies: 0, distinctions: 0, majorInjuries: 0,
    }, 65)

    const a1 = pickArchetype(loyal.breakdown, pkg.snapshot.state, {
      matches: 400, goals: 20, assists: 10, cleanSheets: 0, keySaves: 0,
      nationalCaps: 0, trophies: 0, distinctions: 0, majorInjuries: 0,
    })
    const a2 = pickArchetype(nomadLegacy.breakdown, nomad, {
      matches: 150, goals: 50, assists: 25, cleanSheets: 0, keySaves: 0,
      nationalCaps: 0, trophies: 0, distinctions: 0, majorInjuries: 0,
    })
    expect(a1.id).not.toBe(a2.id)
  })
})

describe('bilan final complet + carte de partage', () => {
  it('agrège tout le parcours et produit une carte sans donnée perso', () => {
    let pkg = makePkg('attacker', 'p9-report')
    for (let i = 0; i < 4; i += 1) pkg = playSeason(pkg)
    // Force la fin pour tester le rapport.
    pkg = mutate(pkg, { phase: 'retired', careerStage: 'carriere_terminee' })

    const report = buildFinalReport(pkg)
    expect(report.displayName.length).toBeGreaterThan(2)
    expect(report.seasons).toBeGreaterThanOrEqual(4)
    expect(report.totals.matches).toBeGreaterThan(0)
    expect(report.clubs.length).toBeGreaterThanOrEqual(1)
    expect(report.legacyScore).toBeGreaterThanOrEqual(0)
    expect(report.legacyScore).toBeLessThanOrEqual(100)
    expect(Object.values(report.legacy).every((v) => v >= 0 && v <= 100)).toBe(
      true,
    )
    expect(report.archetype.title.length).toBeGreaterThan(3)
    expect(report.narrative).toContain(report.displayName)

    const card = buildShareCard(report)
    expect(card.archetypeTitle).toBe(report.archetype.title)
    expect(card.legacyScore).toBe(report.legacyScore)
    // Aucune clé « email », « owner » ou identifiant personnel.
    expect(Object.keys(card)).toEqual([
      'displayName',
      'countryLabel',
      'positionLabel',
      'retirementAge',
      'bestClubName',
      'trophies',
      'legacyScore',
      'archetypeTitle',
      'topTrophy',
      'awardsWon',
    ])
  })

  it('un gardien n’affiche pas de buts dans le bilan', () => {
    let pkg = makePkg('gk', 'p9-gk-report')
    for (let i = 0; i < 3; i += 1) pkg = playSeason(pkg)
    pkg = mutate(pkg, { phase: 'retired', careerStage: 'carriere_terminee' })
    const report = buildFinalReport(pkg)
    expect(report.totals.goals).toBe(0)
  })
})
