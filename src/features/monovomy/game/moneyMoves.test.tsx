import { describe, it, expect } from 'vitest'
// @ts-expect-error — module JS sans déclaration de types (comme le reste de game/).
import { moneyMoves } from './moneyMoves'

/**
 * Ces mouvements servent à ré-afficher les soldes d'AVANT paiement pendant que
 * le dé roule. S'ils divergent de ce que fait le moteur, l'argent affiché saute
 * au moment de la révélation : c'est le seul risque de cette mécanique.
 */
describe('moneyMoves — argent affiché pendant le lancer', () => {
  const rent = {
    passedStart: false,
    salary: 0,
    outcome: { kind: 'pay_rent', name: 'Rue', toPlayerId: 'p2', toName: 'B', amount: 220, sips: 1 },
  }

  it('loyer : le payeur perd, le propriétaire encaisse, somme nulle', () => {
    const m = moneyMoves(rent, 'p1')
    expect(m).toEqual({ p1: -220, p2: 220 })
    expect(Object.values(m).reduce((a, b) => a + b, 0)).toBe(0)
  })

  it('taxe : seul le joueur courant est débité', () => {
    const m = moneyMoves({ outcome: { kind: 'tax', name: 'Note', amount: 100, sips: 1 } }, 'p1')
    expect(m).toEqual({ p1: -100 })
  })

  it('salaire de Départ : crédité au joueur courant', () => {
    const m = moneyMoves({ passedStart: true, salary: 200, outcome: { kind: 'nothing', name: '—' } }, 'p1')
    expect(m).toEqual({ p1: 200 })
  })

  it('cumule le salaire et le loyer du même tour', () => {
    const m = moneyMoves({ ...rent, passedStart: true, salary: 200 }, 'p1')
    expect(m).toEqual({ p1: -20, p2: 220 })
  })

  it('loyer de 0 € (propriété hypothéquée) : aucun mouvement', () => {
    const m = moneyMoves({ ...rent, outcome: { ...rent.outcome, amount: 0 } }, 'p1')
    expect(m).toEqual({})
  })

  it('cases sans argent : rien à rejouer', () => {
    expect(moneyMoves({ outcome: { kind: 'parking', name: 'Bar' } }, 'p1')).toEqual({})
    expect(moneyMoves({ outcome: { kind: 'draw_card', cardId: 'x' } }, 'p1')).toEqual({})
    expect(moneyMoves({ outcome: { kind: 'market', name: 'Marché', offers: [] } }, 'p1')).toEqual({})
  })

  it('résultat absent : objet vide, jamais d’exception', () => {
    expect(moneyMoves(null, 'p1')).toEqual({})
    expect(moneyMoves({ outcome: null }, 'p1')).toEqual({})
  })
})
