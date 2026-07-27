import { describe, expect, it } from 'vitest'
import {
  catalogStats,
  dilemmaCatalog,
  getCatalogValidationIssues,
  legacyFullDilemmaCatalog,
  validateDilemmaContent,
} from './index'
import {
  argentDilemmas,
  blessureDilemmas,
  chaineDilemmas,
  coachDilemmas,
  contratDilemmas,
  finDilemmas,
  mediaDilemmas,
  positionDilemmas,
  selectionDilemmas,
  sportDilemmas,
  vestiaireDilemmas,
} from './phase5'
import { EDITORIAL_LIMITS } from '../../game-engine/dilemmas/validateCatalog'

describe('catalogue Phase 5 — validation', () => {
  it('valide le catalogue actif sans erreur', () => {
    expect(() => validateDilemmaContent()).not.toThrow()
    const errors = getCatalogValidationIssues().filter(
      (i) => i.severity === 'error',
    )
    expect(errors).toEqual([])
  })

  it('respecte les contraintes éditoriales strictes', () => {
    for (const d of dilemmaCatalog) {
      expect(d.title.length).toBeLessThanOrEqual(
        EDITORIAL_LIMITS.titleMaxChars,
      )
      const words = d.body.trim().split(/\s+/).filter(Boolean).length
      expect(words).toBeLessThanOrEqual(EDITORIAL_LIMITS.bodyHardMaxWords)
      expect(d.choices.length).toBeGreaterThanOrEqual(2)
      expect(d.choices.length).toBeLessThanOrEqual(3)
      for (const c of d.choices) {
        expect(c.label.length).toBeLessThanOrEqual(
          EDITORIAL_LIMITS.choiceLabelMaxChars,
        )
      }
    }
  })
})

describe('catalogue Phase 5 — répartition minimale', () => {
  it('contient au moins 60 dilemmes originaux', () => {
    expect(dilemmaCatalog.length).toBeGreaterThanOrEqual(60)
  })

  it('respecte la répartition par thème', () => {
    expect(sportDilemmas.length).toBeGreaterThanOrEqual(12)
    expect(coachDilemmas.length).toBeGreaterThanOrEqual(8)
    expect(vestiaireDilemmas.length).toBeGreaterThanOrEqual(8)
    expect(contratDilemmas.length).toBeGreaterThanOrEqual(8)
    expect(blessureDilemmas.length).toBeGreaterThanOrEqual(6)
    expect(mediaDilemmas.length).toBeGreaterThanOrEqual(6)
    expect(selectionDilemmas.length).toBeGreaterThanOrEqual(4)
    expect(argentDilemmas.length).toBeGreaterThanOrEqual(4)
    expect(finDilemmas.length).toBeGreaterThanOrEqual(4)
  })

  it('couvre les quatre postes avec 12+ dilemmes spécifiques', () => {
    const stats = catalogStats()
    expect(stats.positionSpecific).toBeGreaterThanOrEqual(12)
    const byPos = (ids: string[]) =>
      positionDilemmas.filter((d) =>
        d.positions?.some((p) => ids.includes(p)),
      ).length
    expect(byPos(['gk'])).toBeGreaterThanOrEqual(4)
    expect(byPos(['cb', 'fb'])).toBeGreaterThanOrEqual(4)
    expect(byPos(['cdm', 'cm', 'cam'])).toBeGreaterThanOrEqual(4)
    expect(byPos(['winger', 'st'])).toBeGreaterThanOrEqual(4)
  })

  it('contient conséquences retardées, rares, liens passés, chaînes', () => {
    const stats = catalogStats()
    expect(stats.delayed).toBeGreaterThanOrEqual(8)
    expect(stats.rare).toBeGreaterThanOrEqual(5)
    expect(stats.pastChoiceLinked).toBeGreaterThanOrEqual(5)
    const chainStarts = chaineDilemmas.filter((d) =>
      d.id.endsWith('_start'),
    ).length
    expect(chainStarts).toBeGreaterThanOrEqual(4)
  })

  it('conserve les anciens catalogues sans destruction', () => {
    expect(legacyFullDilemmaCatalog.length).toBeGreaterThanOrEqual(40)
  })
})

describe('catalogue Phase 7 — profondeur narrative', () => {
  it('bibliothèque à 120+ dilemmes, 20+ rares, 25+ postes', () => {
    const s = catalogStats()
    expect(s.total).toBeGreaterThanOrEqual(120)
    expect(s.rare).toBeGreaterThanOrEqual(20)
    expect(s.positionSpecific).toBeGreaterThanOrEqual(25)
  })

  it('15+ âge, 15+ personnages, 10+ fins alternatives, événements pays', () => {
    const s = catalogStats()
    expect(s.ageLinked).toBeGreaterThanOrEqual(15)
    expect(s.npcLinked).toBeGreaterThanOrEqual(15)
    expect(s.endChanging).toBeGreaterThanOrEqual(10)
    expect(s.countryLinked).toBeGreaterThanOrEqual(6)
    expect(s.withEchoes).toBeGreaterThanOrEqual(30)
  })

  it('12 chaînes narratives de 3 à 6 événements', () => {
    const groups = new Map<string, number>()
    for (const d of dilemmaCatalog) {
      if (!d.id.startsWith('p7_chain_')) continue
      const key = d.id.split('_')[2] ?? d.id
      groups.set(key, (groups.get(key) ?? 0) + 1)
    }
    expect(groups.size).toBeGreaterThanOrEqual(12)
    for (const [key, count] of groups) {
      expect(count, `chaîne ${key}`).toBeGreaterThanOrEqual(3)
      expect(count, `chaîne ${key}`).toBeLessThanOrEqual(6)
    }
  })

  it('équilibrage : chaque profil de décision a des coûts et des gains', () => {
    const collectDeltas = (effects: unknown[]): number[] => {
      const out: number[] = []
      for (const raw of effects) {
        const e = raw as {
          type: string
          delta?: number
          onSuccess?: unknown[]
          onFail?: unknown[]
          effects?: unknown[]
        }
        if (e.type === 'delta' && typeof e.delta === 'number') out.push(e.delta)
        if (e.type === 'skillCheck') {
          out.push(...collectDeltas(e.onSuccess ?? []))
          out.push(...collectDeltas(e.onFail ?? []))
        }
        if (e.type === 'chance') out.push(...collectDeltas(e.effects ?? []))
      }
      return out
    }

    const byStance = new Map<string, { pos: number; neg: number; uses: number }>()
    for (const d of dilemmaCatalog) {
      for (const c of d.choices) {
        const entry = byStance.get(c.stance) ?? { pos: 0, neg: 0, uses: 0 }
        entry.uses += 1
        const deltas = collectDeltas(c.immediate)
        if (deltas.some((v) => v > 0)) entry.pos += 1
        if (deltas.some((v) => v < 0)) entry.neg += 1
        byStance.set(c.stance, entry)
      }
    }

    // Profils viables : ambitieux, loyal, prudent, individualiste, collectif,
    // professionnel, médiatique, financier, résilient — tous utilisés.
    for (const stance of [
      'ambitious',
      'loyal',
      'prudent',
      'individualist',
      'collective',
      'professional',
      'media_savvy',
      'financial',
      'resilient',
    ]) {
      const entry = byStance.get(stance)
      expect(entry, `stance ${stance} absente du catalogue`).toBeDefined()
      expect(entry!.uses).toBeGreaterThanOrEqual(3)
      // Aucun profil « gratuit » ni « toujours perdant ».
      expect(entry!.pos, `stance ${stance} sans gain`).toBeGreaterThan(0)
      expect(entry!.neg, `stance ${stance} sans coût`).toBeGreaterThan(0)
    }
  })
})
