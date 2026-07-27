import type { DilemmaDefinition } from '../../game-engine/dilemmas'
import type { EventDefinition } from '../../game-engine/types'
import {
  assertValidDilemmaCatalog,
  buildDilemmaInventory,
  formatDilemmaInventory,
  validateDilemmaCatalog,
  type ValidateOptions,
} from '../../game-engine/dilemmas'
import { positions } from '../positions'
import { expressDilemmas } from './express'
import { commonDilemmas } from './common'
import { roleSpecificDilemmas } from './roleSpecific'
import { rareDilemmas } from './rare'
import { chainDilemmas } from './chains'
import { activeDilemmaCatalog } from './active'
import { phase5Dilemmas } from './phase5'
import { phase7Dilemmas } from './phase7'

/** Catalogue actif Phases 5+7 — 180+ dilemmes + secours. */
export const dilemmaCatalog: DilemmaDefinition[] = activeDilemmaCatalog

export { phase5Dilemmas, phase7Dilemmas, activeDilemmaCatalog }

/** Catalogue massif Phase 4 (conservé, hors parcours actif). */
export const legacyFullDilemmaCatalog: DilemmaDefinition[] = [
  ...commonDilemmas,
  ...roleSpecificDilemmas,
  ...rareDilemmas,
  ...chainDilemmas,
]

/** Postes connus — injectés au validateur pour détecter les postes inconnus. */
const KNOWN_POSITION_IDS: ReadonlySet<string> = new Set(positions.map((p) => p.id))

const VALIDATE_OPTS: ValidateOptions = { knownPositionIds: KNOWN_POSITION_IDS }

let validated = false

export function validateDilemmaContent(): void {
  if (validated) return
  assertValidDilemmaCatalog(dilemmaCatalog, VALIDATE_OPTS)
  validated = true
}

export function getValidatedCatalog(): DilemmaDefinition[] {
  validateDilemmaContent()
  return dilemmaCatalog
}

/** Inventaire du catalogue actif (Phase 4). */
export function buildCatalogInventory() {
  return buildDilemmaInventory(dilemmaCatalog, VALIDATE_OPTS)
}

/** Rapport d'inventaire formaté (Phase 4). */
export function formatCatalogInventory(): string {
  return formatDilemmaInventory(buildCatalogInventory())
}

export const dilemmaCatalogById = new Map<string, DilemmaDefinition>(
  dilemmaCatalog.map((d) => [d.id, d]),
)

export function getDilemmaById(id: string): DilemmaDefinition | undefined {
  return (
    dilemmaCatalogById.get(id) ??
    expressDilemmas.find((d) => d.id === id) ??
    legacyFullDilemmaCatalog.find((d) => d.id === id)
  )
}

export const events: EventDefinition[] = dilemmaCatalog.map((d) => ({
  id: d.id,
  title: d.title,
  body: d.body,
  weight: d.weight,
  tags: d.tags,
  choices: d.choices.map((c) => ({
    id: c.id,
    label: c.label,
    effects: Object.fromEntries(
      c.immediate
        .filter(
          (e): e is Extract<typeof e, { type: 'delta' }> =>
            e.type === 'delta' && e.target.kind === 'resource',
        )
        .map((e) => [(e.target as { id: string }).id, e.delta]),
    ),
  })),
}))

export function getEventById(id: string): EventDefinition | undefined {
  return events.find((event) => event.id === id)
}

function hasDelayedConsequence(d: DilemmaDefinition): boolean {
  return d.choices.some(
    (c) =>
      c.delayed.length > 0 ||
      c.immediate.some(
        (e) => e.type === 'queueEvent' || e.type === 'narrativeDebt',
      ),
  )
}

function isPastChoiceLinked(d: DilemmaDefinition): boolean {
  return d.prerequisites.some(
    (p) => p.type === 'hasFlag' && !p.key.startsWith('seen:'),
  )
}

export function catalogStats() {
  const byCategory: Record<string, number> = {}
  for (const d of dilemmaCatalog) {
    byCategory[d.category] = (byCategory[d.category] ?? 0) + 1
  }
  return {
    total: dilemmaCatalog.length,
    byCategory,
    rare: dilemmaCatalog.filter(
      (d) => d.rarity === 'rare' || d.rarity === 'legendary',
    ).length,
    chains: dilemmaCatalog.filter((d) =>
      d.choices.some((c) => (c.nextEventIds?.length ?? 0) > 0),
    ).length,
    positionSpecific: dilemmaCatalog.filter(
      (d) => (d.positions?.length ?? 0) > 0,
    ).length,
    gk: dilemmaCatalog.filter((d) => d.positions?.includes('gk') ?? false)
      .length,
    delayed: dilemmaCatalog.filter(hasDelayedConsequence).length,
    pastChoiceLinked: dilemmaCatalog.filter(isPastChoiceLinked).length,
    endCareer: dilemmaCatalog.filter((d) => d.category === 'career_end')
      .length,
    ageLinked: dilemmaCatalog.filter((d) => d.tags.includes('age')).length,
    npcLinked: dilemmaCatalog.filter((d) => d.tags.includes('npc')).length,
    countryLinked: dilemmaCatalog.filter((d) => d.tags.includes('pays'))
      .length,
    endChanging: dilemmaCatalog.filter(
      (d) =>
        d.tags.includes('fin_alternative') || d.category === 'career_end',
    ).length,
    withEchoes: dilemmaCatalog.filter((d) => (d.echoes?.length ?? 0) > 0)
      .length,
    byTag: Object.fromEntries(
      dilemmaCatalog.flatMap((d) => d.tags.map((t) => [t, 1])),
    ) as Record<string, number>,
    legacyFullTotal: legacyFullDilemmaCatalog.length,
  }
}

export function getCatalogValidationIssues() {
  return validateDilemmaCatalog(dilemmaCatalog, VALIDATE_OPTS)
}

export { expressDilemmas }
