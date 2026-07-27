import { describe, it, expect } from 'vitest'
import { selectMainAction } from './mainAction'

describe('selectMainAction', () => {
  it('attente quand ce n’est pas mon tour', () => {
    const a = selectMainAction({ phase: 'awaiting_roll', canAct: false, activeName: 'Léa' })
    expect(a.waiting).toBe(true)
    expect(a.label).toContain('Léa')
  })
  it('lancer le dé', () => {
    expect(selectMainAction({ phase: 'awaiting_roll', canAct: true }).key).toBe('roll')
  })
  it('acheter sur une propriété libre', () => {
    expect(selectMainAction({ phase: 'awaiting_purchase', canAct: true }).key).toBe('buy')
  })
  it('sortie de cuve', () => {
    expect(selectMainAction({ phase: 'awaiting_jail', canAct: true }).key).toBe('jail')
  })
  it('résoudre une carte', () => {
    expect(selectMainAction({ phase: 'awaiting_card', canAct: true }).key).toBe('card')
  })
  it('répondre à une offre', () => {
    expect(selectMainAction({ phase: 'awaiting_trade', canAct: true }).key).toBe('trade')
  })
  it('terminer le tour par défaut', () => {
    expect(selectMainAction({ phase: 'turn_cleanup', canAct: true }).key).toBe('next')
  })
  it('partie terminée prime sur tout', () => {
    expect(selectMainAction({ phase: 'awaiting_roll', canAct: true, finished: true }).key).toBe('finished')
  })
})
