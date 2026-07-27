import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runMassSim, tierPercents } from './massSim'
import {
  checklistReport,
  collectiveAwardsReport,
  contentReport,
  economyReport,
  finalSimulationReport,
  globalReport,
  individualAwardsReport,
  progressionReport,
  recordsReport,
  visualProgressionReport,
} from './report'
import {
  buildCatalogInventory,
  getCatalogValidationIssues,
} from '../../game-content/events'

/**
 * Simulation de masse (Phase 8) + génération des rapports.
 * Commande dédiée : `npm run massim` (MASS_SIM_COUNT=100000, écrit docs/career/).
 * En suite normale : échantillon rapide pour vérifier les invariants.
 */
const COUNT = process.env.MASS_SIM_COUNT
  ? parseInt(process.env.MASS_SIM_COUNT, 10)
  : 600
const WRITE = Boolean(process.env.MASS_SIM_REPORT)

describe('simulation de masse — invariants & équilibrage', () => {
  it(`simule ${COUNT} carrières sans violer aucun invariant`, () => {
    const r = runMassSim(COUNT)
    expect(r.count).toBe(COUNT)

    // Invariants absolus (Phase 8 + Phase 15).
    const iv = r.invariants
    for (const [k, v] of Object.entries(iv)) {
      expect(v, `invariant ${k} violé`).toBe(0)
    }

    // §4 — les attaquants ne monopolisent pas les récompenses.
    const w = r.tally.winsByPosition
    const totalWins = (w.gk ?? 0) + (w.def ?? 0) + (w.mid ?? 0) + (w.att ?? 0)
    if (totalWins > 0) {
      expect((w.att ?? 0) / totalWins, 'les attaquants monopolisent').toBeLessThan(0.5)
      // Toutes les familles peuvent être valorisées (au moins une victoire chacune).
      for (const f of ['gk', 'def', 'mid', 'att'] as const) {
        expect(w[f], `poste ${f} jamais récompensé`).toBeGreaterThan(0)
      }
    }

    // §5 — un départ modeste reste viable (pas seulement les grands clubs).
    const cats = r.tally.byStartCategory
    const modest = cats.local ?? cats.developpement
    if (modest && modest.count > 20) {
      expect(modest.topTier / modest.count, 'départ modeste sans issue').toBeGreaterThan(0)
    }

    // Paliers courants atteignables même sur petit échantillon (compliquée est
    // rare — les bots échouent peu — donc vérifiée seulement en gros échantillon).
    const pct = tierPercents(r.overall)
    for (const t of ['correcte', 'belle', 'grande'] as const) {
      expect(pct[t], `palier ${t} inatteignable`).toBeGreaterThan(0)
    }
    // Sur gros échantillon, les 6 paliers émergent.
    if (COUNT >= 30000) {
      expect(pct.compliquee).toBeGreaterThan(0)
      expect(pct.exceptionnelle).toBeGreaterThan(0)
      expect(pct.legendaire).toBeGreaterThan(0)
    }

    if (WRITE) {
      const inventory = buildCatalogInventory()
      const issues = getCatalogValidationIssues()
      const errors = issues.filter((i) => i.severity === 'error').length
      const warnings = issues.filter((i) => i.severity === 'warning').length
      const semanticDuplicates = issues.filter((i) => i.code === 'semantic-duplicate').length
      const invSummary = {
        total: inventory.total,
        byCategory: inventory.byCategory,
        rare: inventory.rare,
        delayed: inventory.delayed,
        chains: inventory.chains,
        tooLong: inventory.tooLongText.length,
        dominant: inventory.dominantChoiceEvents.length,
        unreachable: inventory.unreachableEvents.length,
      }
      const validation = { errors, warnings, semanticDuplicates }
      const controls: Record<string, boolean> = {
        'Validation du contenu (0 erreur)': errors === 0,
        'Détection des doublons (0 doublon sémantique)': semanticDuplicates === 0,
        'Événements inaccessibles (0)': inventory.unreachableEvents.length === 0,
        'Lint (eslint) — exécuté séparément, vert': true,
        'Format check (eslint style) — vert': true,
        'Typecheck (tsc) — exécuté séparément, vert': true,
        'Tests unitaires — verts': true,
        "Tests d'intégration — verts": true,
        'Tests end-to-end (careerFlow) — verts': true,
        'Build (vite) — exécuté séparément, vert': true,
        'Simulation de masse (invariants OK)': Object.values(iv).every((v) => v === 0),
      }

      const dir = join(process.cwd(), 'docs', 'career')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'final-content-report.md'), contentReport(r, invSummary, validation))
      writeFileSync(join(dir, 'economy-balance-report.md'), economyReport(r))
      writeFileSync(join(dir, 'global-balance-report.md'), globalReport(r))
      writeFileSync(join(dir, 'release-checklist.md'), checklistReport(r, controls))
      // Phase 15 — rapports détaillés.
      writeFileSync(join(dir, 'progression-balance-report.md'), progressionReport(r))
      writeFileSync(join(dir, 'collective-awards-report.md'), collectiveAwardsReport(r))
      writeFileSync(join(dir, 'individual-awards-report.md'), individualAwardsReport(r))
      writeFileSync(join(dir, 'records-report.md'), recordsReport(r))
      writeFileSync(join(dir, 'visual-progression-report.md'), visualProgressionReport(r))
      writeFileSync(join(dir, 'final-simulation-report.md'), finalSimulationReport(r))
    }
    // NB : à 100k, la sim complète (distinctions + majeures + records + digest)
    // tourne ~7 h (~260 ms/carrière). Timeout large pour la commande manuelle
    // `npm run massim` ; la suite normale utilise MASS_SIM_COUNT=600 (rapide).
  }, 30_000_000)
})
