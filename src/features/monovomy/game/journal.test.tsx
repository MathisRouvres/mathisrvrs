import { describe, it, expect } from 'vitest'
import { logEntryForResult } from './journal'

const roll = { d1: 2, d2: 3, total: 5, isDouble: false }

describe('logEntryForResult', () => {
  it('loyer', () => {
    const e = logEntryForResult({ roll, outcome: { kind: 'pay_rent', name: 'X', toName: 'Léa', amount: 40 } }, 'Max')
    expect(e).toEqual({ icon: '💸', text: 'Max paie 40€ de loyer à Léa' })
  })
  it('propriété libre', () => {
    const e = logEntryForResult({ roll, outcome: { kind: 'buy_offer', name: 'Rue X', price: 60, spaceId: 'x' } }, 'Max')
    expect(e?.icon).toBe('🏠')
    expect(e?.text).toContain('Rue X')
  })
  it('prison', () => {
    expect(logEntryForResult({ roll, outcome: { kind: 'go_jail', name: '' } }, 'Max')?.icon).toBe('🚓')
  })
  it('cases sans intérêt → null', () => {
    expect(logEntryForResult({ roll, outcome: { kind: 'parking', name: '' } }, 'Max')).toBeNull()
    expect(logEntryForResult(null, 'Max')).toBeNull()
  })
})
