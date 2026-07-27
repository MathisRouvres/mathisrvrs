import type { CareerSavePackage } from '../types'
import { createRng } from '../random/createRng'
import { createId, nowIso } from '../core/ids'
import { careerSavePackageSchema } from '../core/schemas'
import { applyDilemmaEffects, type EffectContext } from './applyEffects'
import type { DilemmaDefinition, DilemmaResolutionLog } from './types'
import type { DilemmaEffect } from './types'

export function resolveDilemmaChoice(
  pkg: CareerSavePackage,
  event: DilemmaDefinition,
  choiceId: string,
  options?: { seedSalt?: string },
): { package: CareerSavePackage; log: DilemmaResolutionLog } {
  const choice = event.choices.find((c) => c.id === choiceId)
  if (!choice) throw new Error(`Choix inconnu: ${choiceId}`)

  const rng = createRng(
    `${pkg.snapshot.state.seed}:dilemma:${event.id}:${choiceId}:${options?.seedSalt ?? pkg.snapshot.state.seasonIndex}`,
  )

  const logLines: string[] = []
  const skillChecks: DilemmaResolutionLog['skillChecks'] = []
  const ctx: EffectContext = {
    state: structuredClone(pkg.snapshot.state),
    profile: pkg.playerProfile,
    rng,
    log: logLines,
    skillChecks,
  }

  let state = applyDilemmaEffects(ctx, choice.immediate as DilemmaEffect[], 'immediate')
  ctx.state = state
  const immediateLog = [...logLines]
  logLines.length = 0

  state = applyDilemmaEffects(ctx, choice.hidden as DilemmaEffect[], 'hidden')
  ctx.state = state
  const hiddenLog = [...logLines]
  logLines.length = 0

  let queuedDelayed = 0
  for (const delayed of choice.delayed) {
    state = {
      ...state,
      pendingEffects: [
        ...state.pendingEffects,
        {
          id: createId('delay'),
          sourceEventId: event.id,
          triggerSeason: state.seasonIndex + delayed.seasonOffset,
          payload: {
            kind: 'dilemma_delayed',
            eventId: event.id,
            choiceId,
            label: choice.label,
            effectsJson: JSON.stringify(delayed.effects),
          },
        },
      ],
    }
    queuedDelayed += 1
  }

  // nextEventIds → queue next season
  for (const nextId of choice.nextEventIds ?? []) {
    state = {
      ...state,
      pendingEffects: [
        ...state.pendingEffects,
        {
          id: createId('chain'),
          sourceEventId: event.id,
          triggerSeason: state.seasonIndex,
          payload: { kind: 'queued_event', eventId: nextId },
        },
      ],
    }
  }

  const flags = {
    ...state.flags,
    [`seen:${event.id}`]: true,
    [`cooldown:${event.id}`]: state.seasonIndex,
    lastDilemmaId: event.id,
    lastDilemmaChoice: choiceId,
  }
  if (flags.queuedDilemmaId === event.id) {
    delete flags.queuedDilemmaId
  }

  // Signature détectée → horodatage saison, utilisé par les garde-fous
  // (pas de proposition de transfert juste après une signature).
  const SIGNING_FLAGS = [
    'transfer_accepted',
    'contract_signed',
    'contract_extended',
  ] as const
  for (const key of SIGNING_FLAGS) {
    if (flags[key] === true && pkg.snapshot.state.flags[key] !== true) {
      flags.lastSigningSeason = state.seasonIndex
    }
  }

  state = {
    ...state,
    flags,
    rngState: rng.getState(),
  }

  const now = nowIso()
  const eventRecord = {
    id: createId('event'),
    careerId: pkg.snapshot.id,
    eventDefinitionId: event.id,
    type: `dilemma:${event.category}`,
    seasonIndex: state.seasonIndex,
    createdAt: now,
    payload: {
      title: event.title,
      body: event.body,
      choiceId,
      choiceLabel: choice.label,
      stance: choice.stance,
      riskPreview: choice.riskPreview,
    },
    resolved: true,
    resolutionDecisionId: null,
  }

  const nextPkg = careerSavePackageSchema.parse({
    ...pkg,
    snapshot: {
      ...pkg.snapshot,
      updatedAt: now,
      age: state.age,
      seasonIndex: state.seasonIndex,
      clubId: state.clubId,
      state,
    },
    journal: {
      ...pkg.journal,
      events: [...pkg.journal.events, eventRecord],
    },
  }) as CareerSavePackage

  return {
    package: nextPkg,
    log: {
      eventId: event.id,
      choiceId,
      appliedImmediate: immediateLog,
      appliedHidden: hiddenLog,
      queuedDelayed,
      skillChecks,
      narrative: `${event.title} → ${choice.label}. ${choice.riskPreview}`,
    },
  }
}
