import { describe, expect, it } from 'vitest'
import {
  completeSeason,
  createCareer,
  deriveClubStanding,
  deriveSeasonObjective,
  evaluateSeasonObjective,
  getNextDilemma,
  migrateCareerSave,
  objectiveOutcomeEffects,
  resolveDilemmaChoice,
  SAVE_SCHEMA_VERSION,
} from '../index'
import { careerSavePackageSchema } from './schemas'
import {
  championships,
  competitionHierarchy,
  deriveChampionshipCategory,
  getChampionshipByCountry,
} from '../../game-content'
import type { CareerSavePackage } from '../types'
import type { ClubSeasonResult } from '../types/season'

function clubResult(over: Partial<ClubSeasonResult> = {}): ClubSeasonResult {
  return {
    clubId: 'x',
    leagueRank: 8,
    leagueSize: 16,
    leagueLevel: 60,
    division: 1,
    cupRun: 'aucune',
    continentalQualified: false,
    trophies: [],
    promoted: false,
    relegated: false,
    coachChanged: false,
    ...over,
  }
}

function playSeason(pkg: CareerSavePackage): CareerSavePackage {
  const d1 = getNextDilemma(pkg)!
  const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
  const d2 = getNextDilemma(r1.package)!
  const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
  return completeSeason(r2.package).package
}

describe('championnats — identité & prestige', () => {
  it('chaque championnat a un nom fictif, un prestige et une catégorie', () => {
    expect(championships.length).toBeGreaterThanOrEqual(6)
    for (const c of championships) {
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.prestige).toBeGreaterThan(0)
      expect(c.rewards.length).toBeGreaterThan(0)
      expect(c.reputationCoef).toBeGreaterThan(0)
    }
  })

  it('le prestige classe le championnat (local → élite)', () => {
    expect(deriveChampionshipCategory(42)).toBe('local')
    expect(deriveChampionshipCategory(48)).toBe('developpement')
    expect(deriveChampionshipCategory(58)).toBe('competitif')
    expect(deriveChampionshipCategory(64)).toBe('majeur')
    expect(deriveChampionshipCategory(72)).toBe('elite')
    // Angleterre (leagueLevel 70) est le championnat le plus prestigieux.
    expect(getChampionshipByCountry('capitale-miroir')!.category).toBe('elite')
  })
})

describe('hiérarchie des compétitions', () => {
  it('classe du plus modeste au sommet mondial', () => {
    const h = competitionHierarchy()
    const ranks = h.map((c) => c.hierarchyRank)
    expect([...ranks]).toEqual([...ranks].sort((a, b) => a - b))
    expect(h[0]!.type).toBe('division_inferieure')
    expect(h[h.length - 1]!.type).toBe('international_mondial')
    // Une épreuve continentale principale vaut plus qu'un championnat national.
    const nat = h.find((c) => c.type === 'national')!
    const cont = h.find((c) => c.type === 'continental_principal')!
    expect(cont.hierarchyRank).toBeGreaterThan(nat.hierarchyRank)
  })
})

describe('statut du club avant la saison', () => {
  it('grand favori quand la force dépasse largement le championnat', () => {
    expect(deriveClubStanding(90, 70, 1)).toBe('grand_favori')
  })
  it('outsider quand la force est très inférieure', () => {
    expect(deriveClubStanding(50, 70, 1)).toBe('outsider')
  })
  it('promu prioritaire quand la carrière vient de monter', () => {
    expect(deriveClubStanding(60, 60, 1, true)).toBe('promu')
    // Club faible de 2e division → outsider ; club fort de D2 → promu (favori à la montée).
    expect(deriveClubStanding(40, 60, 2)).toBe('outsider')
    expect(deriveClubStanding(55, 60, 2)).toBe('promu')
  })
})

describe('objectifs de saison (auto)', () => {
  it('titre pour le grand favori, maintien pour le candidat au maintien', () => {
    expect(deriveSeasonObjective('grand_favori', 1, false, 70)).toBe('titre')
    expect(deriveSeasonObjective('candidat_maintien', 1, false, 60)).toBe('maintien')
    expect(deriveSeasonObjective('outsider', 1, false, 60)).toBe('maintien')
  })
  it('qualification continentale pour un prétendant en championnat coté', () => {
    expect(deriveSeasonObjective('candidat_continental', 1, false, 62)).toBe(
      'qualification_continentale',
    )
  })
  it('promotion en division inférieure, défense du titre pour un champion', () => {
    expect(deriveSeasonObjective('milieu', 2, false, 60)).toBe('promotion')
    expect(deriveSeasonObjective('grand_favori', 1, true, 70)).toBe('defense_titre')
  })
})

describe('évaluation de fin de saison', () => {
  it('objectif dépassé : milieu de tableau qui finit sur le podium', () => {
    expect(
      evaluateSeasonObjective('milieu_tableau', clubResult({ leagueRank: 3 }), 'milieu'),
    ).toBe('objectif_depasse')
  })
  it('saison historique : titre en étant candidat au maintien', () => {
    expect(
      evaluateSeasonObjective(
        'maintien',
        clubResult({ leagueRank: 1, trophies: ['Champion national'] }),
        'candidat_maintien',
      ),
    ).toBe('saison_historique')
    // Outsider dans le top 4 = historique.
    expect(
      evaluateSeasonObjective('maintien', clubResult({ leagueRank: 4 }), 'outsider'),
    ).toBe('saison_historique')
  })
  it('promotion réussie → objectif atteint/dépassé', () => {
    expect(
      evaluateSeasonObjective(
        'promotion',
        clubResult({ division: 2, promoted: true, leagueRank: 1 }),
        'promu',
      ),
    ).toBe('objectif_depasse')
  })
  it('relégation avec un objectif de maintien → échec important', () => {
    expect(
      evaluateSeasonObjective(
        'maintien',
        clubResult({ leagueRank: 15, relegated: true }),
        'candidat_maintien',
      ),
    ).toBe('echec_important')
  })
  it('qualification continentale atteinte', () => {
    expect(
      evaluateSeasonObjective(
        'qualification_continentale',
        clubResult({ leagueRank: 3, continentalQualified: true }),
        'candidat_continental',
      ),
    ).toBe('objectif_atteint')
  })
  it('le prestige du championnat pondère la réputation gagnée', () => {
    const modest = objectiveOutcomeEffects('saison_historique', 0.9)
    const elite = objectiveOutcomeEffects('saison_historique', 1.4)
    expect(elite.reputation).toBeGreaterThan(modest.reputation)
    expect(elite.historicImportance).toBe(5)
  })
})

describe('historique sportif — sauvegarde & déterminisme', () => {
  it('la timeline enregistre championnat, objectif et verdict', () => {
    const pkg = playSeason(
      createCareer({ countryId: 'capitale-miroir', macroPosition: 'attacker', seed: 'p9-hist' }),
    )
    const entry = pkg.snapshot.state.seasonTimeline.at(-1)!
    expect(entry.championshipId).toBe('champ-capitale-miroir')
    expect(entry.objective).toBeTruthy()
    expect(entry.objectiveResult).toBeTruthy()
    expect(typeof entry.division).toBe('number')
    expect(entry.historicImportance).toBeGreaterThanOrEqual(1)
    // Round-trip de sauvegarde : champs préservés.
    const reloaded = careerSavePackageSchema.parse(
      JSON.parse(JSON.stringify(pkg)),
    ) as CareerSavePackage
    expect(reloaded.snapshot.state.seasonTimeline.at(-1)!.objective).toBe(entry.objective)
  })

  it('même seed → même objectif et même verdict', () => {
    const a = playSeason(createCareer({ countryId: 'baie-lumen', macroPosition: 'midfielder', seed: 'p9-repro' }))
    const b = playSeason(createCareer({ countryId: 'baie-lumen', macroPosition: 'midfielder', seed: 'p9-repro' }))
    const ea = a.snapshot.state.seasonTimeline.at(-1)!
    const eb = b.snapshot.state.seasonTimeline.at(-1)!
    expect(ea.objective).toBe(eb.objective)
    expect(ea.objectiveResult).toBe(eb.objectiveResult)
  })
})

describe('migration d’une ancienne carrière (v7 → v8)', () => {
  it('rétro-remplit championshipId sur la timeline, conserve la carrière', () => {
    const played = playSeason(
      createCareer({ countryId: 'cote-brumeuse', macroPosition: 'defender', seed: 'p9-mig' }),
    )
    // Simule une sauvegarde v7 : timeline sans championshipId.
    const state = {
      ...played.snapshot.state,
      seasonTimeline: played.snapshot.state.seasonTimeline.map((e) => {
        const { championshipId: _drop, ...rest } = e
        return rest
      }),
    } as Record<string, unknown>
    const rawV7 = {
      ...played,
      schemaVersion: 7,
      snapshot: { ...played.snapshot, saveSchemaVersion: 7, state },
    }
    const migrated = migrateCareerSave(rawV7)
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    const entry = migrated.snapshot.state.seasonTimeline.at(-1)!
    expect(entry.championshipId).toBe('champ-cote-brumeuse')
    expect(migrated.snapshot.state.seed).toBe(played.snapshot.state.seed)
  })
})
