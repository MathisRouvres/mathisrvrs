import { describe, expect, it } from 'vitest'
import type { CareerState, SportStatId } from '../types/career'
import { developPositionSkills } from './expressCareer'
import { SPORT_STAT_IDS } from './constants'

function statsAll(value: number): Record<SportStatId, number> {
  return Object.fromEntries(
    SPORT_STAT_IDS.map((id) => [id, value]),
  ) as Record<SportStatId, number>
}

function state(partial: {
  potentiel: number
  role: string
  statValue: number
  coach: number
  moral: number
  forme: number
}): CareerState {
  return {
    seed: 'dev-seed',
    seasonIndex: 3,
    totalDilemmasResolved: 4,
    preciseRole: partial.role,
    hiddenTraits: { potentiel: partial.potentiel },
    resources: {
      confianceEntraineur: partial.coach,
      moral: partial.moral,
      forme: partial.forme,
    },
    stats: statsAll(partial.statValue),
  } as unknown as CareerState
}

const KEY_STATS_ST: SportStatId[] = ['finition', 'tir', 'placement', 'puissance']

describe('developPositionSkills — les dilemmes améliorent les compétences', () => {
  it('un choix ambitieux et positif fait progresser au moins une compétence-clé du poste', () => {
    const before = state({ potentiel: 82, role: 'st', statValue: 50, coach: 50, moral: 50, forme: 50 })
    // Décision positive : coach/moral/forme en hausse.
    const after = state({ potentiel: 82, role: 'st', statValue: 50, coach: 62, moral: 60, forme: 58 })
    const result = developPositionSkills(after, before, { stance: 'ambitious' })
    const gained = KEY_STATS_ST.some((id) => result[id] > 50)
    expect(gained).toBe(true)
    // Seules des compétences-clés du poste progressent (jamais négatif).
    for (const id of SPORT_STAT_IDS) expect(result[id]).toBeGreaterThanOrEqual(50)
  })

  it('respecte le plafond de potentiel (la légende reste rare)', () => {
    // Potentiel modeste → plafond bas ; compétences déjà au plafond.
    const potentiel = 30
    const ceiling = Math.min(99, 42 + potentiel * 0.55) // 58.5
    const before = state({ potentiel, role: 'st', statValue: 58, coach: 50, moral: 50, forme: 50 })
    const after = state({ potentiel, role: 'st', statValue: 58, coach: 70, moral: 70, forme: 70 })
    const result = developPositionSkills(after, before, { stance: 'ambitious' })
    // Marge quasi nulle au plafond : pas d'envolée au-delà de ~+1.
    for (const id of SPORT_STAT_IDS) {
      expect(result[id]).toBeLessThanOrEqual(Math.ceil(ceiling) + 1)
    }
  })

  it('est déterministe', () => {
    const before = state({ potentiel: 70, role: 'cm', statValue: 55, coach: 50, moral: 50, forme: 50 })
    const after = state({ potentiel: 70, role: 'cm', statValue: 55, coach: 60, moral: 55, forme: 55 })
    const a = developPositionSkills(after, before, { stance: 'professional' })
    const b = developPositionSkills(after, before, { stance: 'professional' })
    expect(a).toEqual(b)
  })

  it('un choix médiocre développe peu ou pas', () => {
    const before = state({ potentiel: 70, role: 'st', statValue: 50, coach: 60, moral: 60, forme: 60 })
    // Décision qui dégrade le climat (coach/moral en baisse).
    const after = state({ potentiel: 70, role: 'st', statValue: 50, coach: 44, moral: 46, forme: 52 })
    const result = developPositionSkills(after, before, { stance: 'prudent' })
    const totalGain = SPORT_STAT_IDS.reduce((s, id) => s + (result[id] - 50), 0)
    expect(totalGain).toBeLessThanOrEqual(2)
  })
})
