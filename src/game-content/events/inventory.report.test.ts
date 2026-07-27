import { describe, expect, it } from 'vitest'
import { buildCatalogInventory, formatCatalogInventory } from './index'

/**
 * Commande d'inventaire (Phase 4) : `npm run inventory`.
 * Produit automatiquement la répartition du catalogue. Sert aussi de test
 * d'invariants minimaux. Le rapport n'est imprimé que via la commande dédiée
 * (variable INVENTORY_REPORT) pour ne pas polluer la suite complète.
 */
describe('inventaire du catalogue', () => {
  it('produit un inventaire complet et cohérent', () => {
    const inv = buildCatalogInventory()
    expect(inv.total).toBeGreaterThan(0)
    expect(Object.keys(inv.byCategory).length).toBeGreaterThan(0)
    expect(Object.keys(inv.byAgeBucket).length).toBeGreaterThan(0)
    // L'inventaire ne doit jamais lister d'événement inaccessible.
    expect(inv.unreachableEvents).toEqual([])

    if (process.env.INVENTORY_REPORT) {
      process.stdout.write(`\n${formatCatalogInventory()}\n\n`)
    }
  })
})
