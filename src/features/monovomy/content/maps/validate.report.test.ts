import { describe, it, expect } from 'vitest'
import { formatValidationReport, validateAllBoardMaps } from './validate'

/**
 * Validateur de contenu des maps (`npm run mv:validate-content`).
 * Chaque map enregistrée doit passer toutes les vérifications structurelles.
 */
describe('mv:validate-content — maps', () => {
  const reports = validateAllBoardMaps()

  it('affiche un rapport par map', () => {
    // eslint-disable-next-line no-console
    console.log(`\n${formatValidationReport(reports)}\n`)
    expect(reports.length).toBeGreaterThan(0)
  })

  for (const report of reports) {
    it(`${report.mapId} ne présente aucune erreur`, () => {
      expect(report.errors).toEqual([])
    })
  }
})
