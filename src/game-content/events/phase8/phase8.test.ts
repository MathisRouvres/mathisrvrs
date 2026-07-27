import { describe, expect, it } from 'vitest'
import { phase8Dilemmas } from './index'
import { activeDilemmaCatalog } from '../active'
import {
  validateDilemmaCatalog,
  type CatalogValidationIssue,
} from '../../../game-engine/dilemmas'
import { positions } from '../../positions'
import {
  createCareer,
  getNextDilemma,
  resolveDilemmaChoice,
} from '../../../game-engine'

const OPTS = { knownPositionIds: new Set(positions.map((p) => p.id)) }

function p8Issues(): CatalogValidationIssue[] {
  return validateDilemmaCatalog(activeDilemmaCatalog, OPTS).filter((i) =>
    i.eventId?.startsWith('p8_'),
  )
}

describe('Phase 8 — lot sportif & humain', () => {
  it('ajoute 80 à 120 dilemmes originaux', () => {
    expect(phase8Dilemmas.length).toBeGreaterThanOrEqual(80)
    expect(phase8Dilemmas.length).toBeLessThanOrEqual(120)
  })

  it('identifiants uniques, préfixe p8_', () => {
    const ids = phase8Dilemmas.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('p8_'))).toBe(true)
  })

  it('couvre les thèmes demandés', () => {
    const cats = new Set(phase8Dilemmas.map((d) => d.category))
    for (const c of ['match', 'coach', 'teammates', 'rivalry', 'injury', 'media', 'fans', 'national_team']) {
      expect(cats.has(c as never), `catégorie ${c} absente`).toBe(true)
    }
  })

  it('inclut les 10 scénarios originaux', () => {
    const ids = new Set(phase8Dilemmas.map((d) => d.id))
    for (const id of [
      'p8_inj_biometrie',
      'p8_orig_algorithme',
      'p8_vest_documentaire',
      'p8_media_fuite_conversation',
      'p8_media_video_virale',
      'p8_media_compte_usurpe',
      'p8_conc_rival_meme_club',
      'p8_conc_proprio_recrue',
      'p8_vest_jeune_copie',
      'p8_media_staff_taupe',
    ]) {
      expect(ids.has(id), `scénario ${id} manquant`).toBe(true)
    }
  })

  it('propose des événements spécifiques à chaque poste', () => {
    const byPos = (ids: string[]) =>
      phase8Dilemmas.filter((d) => d.positions?.some((p) => ids.includes(p))).length
    expect(byPos(['gk'])).toBeGreaterThanOrEqual(3)
    expect(byPos(['cb', 'fb'])).toBeGreaterThanOrEqual(3)
    expect(byPos(['cdm', 'cm', 'cam'])).toBeGreaterThanOrEqual(3)
    expect(byPos(['winger', 'st'])).toBeGreaterThanOrEqual(3)
  })

  it('contient au moins 5 événements rares', () => {
    const rares = phase8Dilemmas.filter(
      (d) => d.rarity === 'rare' || d.rarity === 'legendary',
    ).length
    expect(rares).toBeGreaterThanOrEqual(5)
  })
})

describe('Phase 8 — contrôles qualité', () => {
  it('valide sans aucune erreur dans le catalogue actif', () => {
    const errors = validateDilemmaCatalog(activeDilemmaCatalog, OPTS).filter(
      (i) => i.severity === 'error',
    )
    expect(errors).toEqual([])
  })

  it('aucun doublon sémantique introduit par le lot', () => {
    expect(p8Issues().filter((i) => i.code === 'semantic-duplicate')).toEqual([])
  })

  it('aucun choix dominant ni tout-positif/tout-négatif', () => {
    const bad = p8Issues().filter((i) =>
      ['dominant-choice', 'choice-all-positive', 'choice-all-negative'].includes(
        i.code,
      ),
    )
    expect(bad).toEqual([])
  })

  it('chaque choix porte bénéfice, coût et incertitude (aucun sans effet)', () => {
    const noEffect = p8Issues().filter(
      (i) => i.code === 'choice-no-effect' || i.code === 'choice-no-uncertainty',
    )
    expect(noEffect).toEqual([])
  })

  it('chaque dilemme reste en deux ou trois choix, majorité à deux', () => {
    const twoChoice = phase8Dilemmas.filter((d) => d.choices.length === 2).length
    expect(twoChoice).toBeGreaterThan(phase8Dilemmas.length / 2)
    expect(phase8Dilemmas.every((d) => d.choices.length <= 3)).toBe(true)
  })
})

describe('Phase 8 — règle des deux dilemmes préservée', () => {
  it('une saison propose exactement deux dilemmes', () => {
    const pkg = createCareer({
      countryId: 'capitale-miroir',
      macroPosition: 'midfielder',
      seed: 'p8-two-rule',
    })
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    expect(getNextDilemma(r2.package)).toBeNull()
  })
})
