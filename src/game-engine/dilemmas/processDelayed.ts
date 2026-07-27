import type { CareerSavePackage } from '../types'
import { createRng } from '../random/createRng'
import { nowIso } from '../core/ids'
import { careerSavePackageSchema } from '../core/schemas'
import { applyDilemmaEffects, type EffectContext } from './applyEffects'
import type { DilemmaEffect } from './types'

/**
 * Applique les effets retardés dus à la saison courante.
 */
export function processDueDilemmaEffects(
  pkg: CareerSavePackage,
): CareerSavePackage {
  const state = structuredClone(pkg.snapshot.state)
  const due = state.pendingEffects.filter(
    (p) => p.triggerSeason <= state.seasonIndex,
  )
  const remaining = state.pendingEffects.filter(
    (p) => p.triggerSeason > state.seasonIndex,
  )

  if (due.length === 0) return pkg

  const rng = createRng(`${state.seed}:delayed:${state.seasonIndex}`)
  const ctx: EffectContext = {
    state,
    profile: pkg.playerProfile,
    rng,
    log: [],
    skillChecks: [],
  }

  let nextState = state
  for (const item of due) {
    const kind = item.payload.kind
    if (kind === 'dilemma_delayed' && typeof item.payload.effectsJson === 'string') {
      const effects = JSON.parse(item.payload.effectsJson) as DilemmaEffect[]
      ctx.state = nextState
      nextState = applyDilemmaEffects(ctx, effects, 'delayed')
    }
    if (kind === 'queued_event' && typeof item.payload.eventId === 'string') {
      // Marque l’événement à proposer — la résolution reste un choix joueur
      nextState = {
        ...nextState,
        flags: {
          ...nextState.flags,
          queuedDilemmaId: item.payload.eventId,
        },
      }
    }
    if (kind === 'narrative_debt_due' && typeof item.payload.debtId === 'string') {
      const debtId = item.payload.debtId
      nextState = {
        ...nextState,
        flags: {
          ...nextState.flags,
          [`debt_due:${debtId}`]: true,
        },
        resources: {
          ...nextState.resources,
          moral: Math.max(0, nextState.resources.moral - 4),
        },
      }
    }
  }

  nextState = {
    ...nextState,
    pendingEffects: remaining,
    rngState: rng.getState(),
  }

  return careerSavePackageSchema.parse({
    ...pkg,
    snapshot: {
      ...pkg.snapshot,
      updatedAt: nowIso(),
      state: nextState,
    },
  }) as CareerSavePackage
}
