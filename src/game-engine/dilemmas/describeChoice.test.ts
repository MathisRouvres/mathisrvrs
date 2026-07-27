import { describe, expect, it } from 'vitest'
import { describeChoiceOutcomes } from './describeChoice'
import type { DilemmaChoiceDefinition } from './types'

function baseChoice(
  partial: Partial<DilemmaChoiceDefinition>,
): DilemmaChoiceDefinition {
  return {
    id: 'c',
    label: 'Choix',
    stance: 'ambitious',
    riskPreview: 'Aperçu.',
    immediate: [],
    delayed: [],
    hidden: [],
    ...partial,
  }
}

describe('describeChoiceOutcomes', () => {
  it('sépare gains et risques à partir des deltas immédiats', () => {
    const choice = baseChoice({
      immediate: [
        { type: 'delta', target: { kind: 'resource', id: 'reputationSportive' }, delta: 8 },
        { type: 'delta', target: { kind: 'resource', id: 'sante' }, delta: -6 },
      ],
    })
    const d = describeChoiceOutcomes(choice)
    expect(d.rewards.map((r) => r.label)).toContain('Réputation')
    expect(d.risks.map((r) => r.label)).toContain('Santé')
    // Indication relative agrégée bornée 0–4 (détail masqué côté UI).
    expect(d.rewardLevel).toBeGreaterThanOrEqual(1)
    expect(d.rewardLevel).toBeLessThanOrEqual(4)
    expect(d.riskLevel).toBeGreaterThanOrEqual(1)
    expect(d.riskLevel).toBeLessThanOrEqual(4)
  })

  it('classe une hausse de fatigue comme un risque (ressource inversée)', () => {
    const choice = baseChoice({
      immediate: [
        { type: 'delta', target: { kind: 'resource', id: 'fatigue' }, delta: 8 },
      ],
    })
    const d = describeChoiceOutcomes(choice)
    expect(d.risks.map((r) => r.label)).toContain('Fatigue')
    expect(d.rewards).toHaveLength(0)
  })

  it('traite un skillCheck comme un pari (succès=gain, échec=risque)', () => {
    const choice = baseChoice({
      immediate: [
        {
          type: 'skillCheck',
          pool: 'stat',
          id: 'sangFroid',
          difficulty: 48,
          onSuccess: [
            { type: 'delta', target: { kind: 'resource', id: 'reputationSportive' }, delta: 8 },
          ],
          onFail: [
            { type: 'delta', target: { kind: 'resource', id: 'moral' }, delta: -8 },
          ],
        },
      ],
    })
    const d = describeChoiceOutcomes(choice)
    expect(d.rewards.some((r) => r.label === 'Réputation')).toBe(true)
    expect(d.risks.some((r) => r.label === 'Moral')).toBe(true)
  })

  it('ne révèle jamais les traits cachés ni les drapeaux', () => {
    const choice = baseChoice({
      immediate: [
        { type: 'delta', target: { kind: 'hidden', id: 'ambition' }, delta: 5 },
        { type: 'setFlag', key: 'derby_hero', value: true },
        { type: 'delta', target: { kind: 'resource', id: 'moral' }, delta: 5 },
      ],
    })
    const d = describeChoiceOutcomes(choice)
    const labels = [...d.rewards, ...d.risks].map((o) => o.label)
    expect(labels).toEqual(['Moral'])
  })

  it('exprime un niveau 1–3, jamais une valeur exacte', () => {
    const choice = baseChoice({
      immediate: [
        { type: 'delta', target: { kind: 'resource', id: 'reputationSportive' }, delta: 12 },
        { type: 'delta', target: { kind: 'relation', id: 'fans' }, delta: 2 },
      ],
    })
    const d = describeChoiceOutcomes(choice)
    for (const o of [...d.rewards, ...d.risks]) {
      expect(o.level).toBeGreaterThanOrEqual(1)
      expect(o.level).toBeLessThanOrEqual(3)
    }
    // Le delta le plus fort a un niveau supérieur.
    const rep = d.rewards.find((r) => r.label === 'Réputation')
    const fans = d.rewards.find((r) => r.label === 'Public')
    expect((rep?.level ?? 0) > (fans?.level ?? 0)).toBe(true)
  })

  it('limite à 3 gains et 3 risques et fournit un label de stratégie', () => {
    const choice = baseChoice({
      stance: 'collective',
      immediate: [
        { type: 'delta', target: { kind: 'resource', id: 'reputationSportive' }, delta: 5 },
        { type: 'delta', target: { kind: 'resource', id: 'moral' }, delta: 5 },
        { type: 'delta', target: { kind: 'resource', id: 'forme' }, delta: 5 },
        { type: 'delta', target: { kind: 'resource', id: 'discipline' }, delta: 5 },
      ],
    })
    const d = describeChoiceOutcomes(choice)
    expect(d.rewards.length).toBeLessThanOrEqual(3)
    expect(d.strategyLabel).toBe('Collectif')
    expect(d.tone).toBe('collective')
  })
})
