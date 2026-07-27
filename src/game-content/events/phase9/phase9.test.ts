import { describe, expect, it } from 'vitest'
import { phase9Dilemmas } from './index'
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

function p9Issues(): CatalogValidationIssue[] {
  return validateDilemmaCatalog(activeDilemmaCatalog, OPTS).filter((i) =>
    i.eventId?.startsWith('p9_'),
  )
}

/** Sérialise tous les effets d'un dilemme pour détecter les effets Phase 3. */
function effectTypes(): Set<string> {
  const types = new Set<string>()
  const walk = (effects: readonly unknown[]) => {
    for (const raw of effects) {
      const e = raw as { type?: string; onSuccess?: unknown[]; onFail?: unknown[]; effects?: unknown[] }
      if (e.type) types.add(e.type)
      if (e.onSuccess) walk(e.onSuccess)
      if (e.onFail) walk(e.onFail)
      if (e.effects) walk(e.effects)
    }
  }
  for (const d of phase9Dilemmas) {
    for (const c of d.choices) {
      walk(c.immediate)
      walk(c.hidden)
      for (const del of c.delayed) walk(del.effects)
    }
  }
  return types
}

describe('Phase 9 — lot économique & professionnel', () => {
  it('ajoute 80 à 120 dilemmes originaux', () => {
    expect(phase9Dilemmas.length).toBeGreaterThanOrEqual(80)
    expect(phase9Dilemmas.length).toBeLessThanOrEqual(120)
  })

  it('identifiants uniques, préfixe p9_', () => {
    const ids = phase9Dilemmas.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('p9_'))).toBe(true)
  })

  it('couvre les thèmes économiques demandés', () => {
    const cats = new Set(phase9Dilemmas.map((d) => d.category))
    for (const c of ['contract', 'transfer', 'agent', 'sponsors', 'money', 'lifestyle', 'career_end']) {
      expect(cats.has(c as never), `catégorie ${c} absente`).toBe(true)
    }
  })

  it('réutilise les systèmes économiques (effets Phase 3 + dette)', () => {
    const types = effectTypes()
    expect(types.has('signSponsor')).toBe(true)
    expect(types.has('endSponsor')).toBe(true)
    expect(types.has('makeInvestment')).toBe(true)
    expect(types.has('setAgent')).toBe(true)
    expect(types.has('narrativeDebt')).toBe(true)
  })

  it('ajoute des conséquences retardées', () => {
    const withDelayed = phase9Dilemmas.filter((d) =>
      d.choices.some((c) => c.delayed.length > 0),
    ).length
    expect(withDelayed).toBeGreaterThanOrEqual(40)
  })

  it('tous en emplacement 2 (carrière)', () => {
    const slot2 = new Set(['contract', 'transfer', 'agent', 'sponsors', 'money', 'lifestyle', 'career_end'])
    expect(phase9Dilemmas.every((d) => slot2.has(d.category))).toBe(true)
  })
})

describe('Phase 9 — contrôles qualité', () => {
  it('valide sans aucune erreur dans le catalogue actif', () => {
    const errors = validateDilemmaCatalog(activeDilemmaCatalog, OPTS).filter(
      (i) => i.severity === 'error',
    )
    expect(errors).toEqual([])
  })

  it('aucun choix dominant, tout-positif, tout-négatif ni doublon', () => {
    const bad = p9Issues().filter((i) =>
      ['dominant-choice', 'choice-all-positive', 'choice-all-negative', 'semantic-duplicate'].includes(
        i.code,
      ),
    )
    expect(bad).toEqual([])
  })

  it('aucune incohérence contractuelle ou financière', () => {
    const bad = p9Issues().filter((i) =>
      ['contract-incoherence', 'financial-incoherence'].includes(i.code),
    )
    expect(bad).toEqual([])
  })

  it('chaque choix influence au moins deux dimensions', () => {
    // ≥2 effets réels (delta/cash/flag/sponsor/invest/agent) par choix.
    for (const d of phase9Dilemmas) {
      for (const c of d.choices) {
        const count = c.immediate.length + c.hidden.length + c.delayed.length
        expect(count, `${d.id}:${c.id}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('majorité de dilemmes à deux choix, jamais plus de trois', () => {
    const two = phase9Dilemmas.filter((d) => d.choices.length === 2).length
    expect(two).toBeGreaterThan(phase9Dilemmas.length / 2)
    expect(phase9Dilemmas.every((d) => d.choices.length <= 3)).toBe(true)
  })
})

describe('Phase 9 — règle des deux dilemmes préservée', () => {
  it('une saison propose exactement deux dilemmes', () => {
    const pkg = createCareer({
      countryId: 'capitale-miroir',
      macroPosition: 'attacker',
      seed: 'p9-two-rule',
    })
    const d1 = getNextDilemma(pkg)!
    const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
    const d2 = getNextDilemma(r1.package)!
    const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
    expect(getNextDilemma(r2.package)).toBeNull()
  })
})
