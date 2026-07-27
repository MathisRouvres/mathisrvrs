import { describe, expect, it } from 'vitest'
import {
  buildCareerLevelView,
  buildSeasonProgression,
  buildSkillChanges,
  buildTimelineCards,
  completeSeason,
  createCareer,
  deriveCareerLevel,
  getNextDilemma,
  resolveDilemmaChoice,
} from '../index'
import type { CareerSavePackage } from '../types'

const TRAJ = { id: 'reguliere', label: 'En progression' }

function baseInput(over: Partial<Parameters<typeof buildSeasonProgression>[0]> = {}) {
  const flat = (v: number) => ({
    technique: v, controle: v, passe: v, vision: v, tir: v, finition: v,
    dribble: v, vitesse: v, endurance: v, puissance: v, defense: v,
    placement: v, tactique: v, sangFroid: v, leadership: v,
  })
  return {
    statsBefore: flat(60),
    statsAfter: flat(60),
    positionId: 'st',
    reputationBefore: 40,
    reputationAfter: 40,
    statusBefore: 'rotation',
    statusAfter: 'rotation',
    salaryBefore: 10000,
    salaryAfter: 10000,
    palmares: [] as string[],
    trajectory: TRAJ,
    cause: {
      minutes: 2000,
      averageRating: 7.0,
      progressionLabel: 'positive' as const,
      positionSwitch: false,
      returningFromInjury: false,
    },
    ...over,
  }
}

describe('Phase 14 — paliers de carrière', () => {
  it('mappe le niveau au bon palier', () => {
    expect(deriveCareerLevel(40).id).toBe('centre')
    expect(deriveCareerLevel(60).id).toBe('titulaire')
    expect(deriveCareerLevel(77).id).toBe('star_champ')
    expect(deriveCareerLevel(92).id).toBe('legende')
  })

  it('détecte une montée de palier + progression vers le suivant', () => {
    const v = buildCareerLevelView(58, 63, TRAJ)
    expect(v.promoted).toBe(true)
    expect(v.previous?.id).toBe('rotation')
    expect(v.current.id).toBe('titulaire')
    expect(v.next?.id).toBe('important')
    expect(v.progressToNext).toBeGreaterThan(0)
    expect(v.progressToNext).toBeLessThan(1)
  })

  it('pas de montée quand le palier ne change pas', () => {
    const v = buildCareerLevelView(61, 63, TRAJ)
    expect(v.promoted).toBe(false)
    expect(v.previous).toBeNull()
  })
})

describe('Phase 14 — compétences modifiées', () => {
  it('liste les compétences changées, triées, avec cause', () => {
    const before = { finition: 70, tir: 68, defense: 50 }
    const after = { finition: 74, tir: 68, defense: 48 }
    const skills = buildSkillChanges(before, after, {
      minutes: 2100, averageRating: 7.1, progressionLabel: 'positive',
      positionSwitch: false, returningFromInjury: false,
    })
    expect(skills.map((s) => s.id)).toEqual(['finition', 'defense'])
    expect(skills[0]!.direction).toBe('up')
    expect(skills[0]!.cause).toBe('temps_de_jeu')
    expect(skills[1]!.direction).toBe('down')
    expect(skills[1]!.cause).toBe('declin_physique')
  })

  it('cause « nouveau rôle » prioritaire lors d’une reconversion', () => {
    const skills = buildSkillChanges({ passe: 60 }, { passe: 63 }, {
      minutes: 2000, averageRating: 7.0, progressionLabel: 'positive',
      positionSwitch: true, returningFromInjury: false,
    })
    expect(skills[0]!.cause).toBe('nouveau_role')
  })

  it('cause « saison exceptionnelle » sur très haute note', () => {
    const skills = buildSkillChanges({ tir: 60 }, { tir: 64 }, {
      minutes: 2000, averageRating: 7.8, progressionLabel: 'forte',
      positionSwitch: false, returningFromInjury: false,
    })
    expect(skills[0]!.cause).toBe('saison_exceptionnelle')
  })
})

describe('Phase 14 — digest de saison', () => {
  it('gain de niveau', () => {
    const flat = (v: number) => Object.fromEntries(
      ['technique','controle','passe','vision','tir','finition','dribble','vitesse','endurance','puissance','defense','placement','tactique','sangFroid','leadership'].map((k) => [k, v]),
    )
    const d = buildSeasonProgression(baseInput({ statsBefore: flat(60), statsAfter: flat(66) }))
    expect(d.niveau.delta).toBeGreaterThan(0)
    expect(d.skills.length).toBeGreaterThan(0)
  })

  it('perte de niveau', () => {
    const flat = (v: number) => Object.fromEntries(
      ['technique','controle','passe','vision','tir','finition','dribble','vitesse','endurance','puissance','defense','placement','tactique','sangFroid','leadership'].map((k) => [k, v]),
    )
    const d = buildSeasonProgression(baseInput({ statsBefore: flat(66), statsAfter: flat(62) }))
    expect(d.niveau.delta).toBeLessThan(0)
  })

  it('changement de statut détecté', () => {
    const d = buildSeasonProgression(baseInput({ statusBefore: 'rotation', statusAfter: 'starter' }))
    expect(d.status).toEqual({ before: 'rotation', after: 'starter' })
  })

  it('statut inchangé → pas de bloc statut', () => {
    const d = buildSeasonProgression(baseInput({ statusBefore: 'starter', statusAfter: 'starter' }))
    expect(d.status).toBeNull()
  })

  it('changement de salaire détecté', () => {
    const d = buildSeasonProgression(baseInput({ salaryBefore: 10000, salaryAfter: 25000 }))
    expect(d.salary).toEqual({ before: 10000, after: 25000 })
  })

  it('aucune récompense vs plusieurs récompenses', () => {
    expect(buildSeasonProgression(baseInput({ palmares: [] })).palmares).toEqual([])
    const many = buildSeasonProgression(baseInput({ palmares: ['Champion national', 'Coupe nationale'] }))
    expect(many.palmares).toHaveLength(2)
  })

  it('déterministe (fonction pure)', () => {
    const a = buildSeasonProgression(baseInput({ salaryAfter: 25000 }))
    const b = buildSeasonProgression(baseInput({ salaryAfter: 25000 }))
    expect(a).toEqual(b)
  })
})

describe('Phase 14 — cartes de timeline', () => {
  function play(pkg: CareerSavePackage): CareerSavePackage {
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    return completeSeason(r2.package).package
  }

  it('produit des cartes synthétiques (plus récentes d’abord)', () => {
    let pkg = createCareer({ countryId: 'capitale-miroir', macroPosition: 'attacker', seed: 'p14-tl' })
    for (let i = 0; i < 3; i += 1) pkg = play(pkg)
    const cards = buildTimelineCards(pkg.snapshot.state)
    expect(cards.length).toBe(3)
    expect(cards[0]!.seasonIndex).toBeGreaterThan(cards[cards.length - 1]!.seasonIndex)
    for (const c of cards) {
      expect(typeof c.level).toBe('number')
      expect(typeof c.clubName).toBe('string')
      expect(Array.isArray(c.trophies)).toBe(true)
    }
  })
})
