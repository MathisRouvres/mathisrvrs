import type { CareerSavePackage, CareerState } from '../types'
import { createId, nowIso } from '../core/ids'
import { isCareerReadOnly } from '../core/createCareerPackage'
import { careerStateSchema } from '../core/schemas'

export class EventResolutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EventResolutionError'
  }
}

const inFlightResolutions = new Set<string>()

function resolutionKey(careerId: string, eventId: string): string {
  return `${careerId}::${eventId}`
}

/**
 * Enregistre une décision append-only avec état avant/après.
 * Interdit les doubles résolutions (y compris simultanées).
 */
export function appendDecisionResolution(
  pkg: CareerSavePackage,
  input: {
    eventId: string
    choiceId: string
    nextState: CareerState
    meta?: Record<string, unknown>
  },
): CareerSavePackage {
  if (isCareerReadOnly(pkg.snapshot)) {
    throw new EventResolutionError('Carrière en lecture seule.')
  }

  const key = resolutionKey(pkg.snapshot.id, input.eventId)
  if (inFlightResolutions.has(key)) {
    throw new EventResolutionError(
      'Une résolution est déjà en cours pour cet événement.',
    )
  }

  inFlightResolutions.add(key)

  try {
    const event = pkg.journal.events.find((e) => e.id === input.eventId)
    if (!event) {
      throw new EventResolutionError('Événement introuvable dans le journal.')
    }
    if (event.resolved || event.resolutionDecisionId) {
      throw new EventResolutionError('Cet événement est déjà résolu.')
    }

    const alreadyDecided = pkg.journal.decisions.some(
      (d) => d.eventId === input.eventId,
    )
    if (alreadyDecided) {
      throw new EventResolutionError(
        'Une décision existe déjà pour cet événement (append-only).',
      )
    }

    const stateBefore = structuredClone(pkg.snapshot.state)
    const stateAfter = careerStateSchema.parse(input.nextState) as CareerState

    const decisionId = createId('decision')
    const createdAt = nowIso()

    const decision = {
      id: decisionId,
      careerId: pkg.snapshot.id,
      eventId: input.eventId,
      choiceId: input.choiceId,
      seasonIndex: pkg.snapshot.seasonIndex,
      createdAt,
      stateBefore,
      stateAfter,
      meta: input.meta ?? {},
    }

    const nextEvents = pkg.journal.events.map((e) =>
      e.id === input.eventId
        ? {
            ...e,
            resolved: true,
            resolutionDecisionId: decisionId,
          }
        : e,
    )

    // Les décisions précédentes ne sont jamais mutées : on append seulement.
    const nextDecisions = [...pkg.journal.decisions, decision]

    return {
      ...pkg,
      snapshot: {
        ...pkg.snapshot,
        state: stateAfter,
        age: stateAfter.age,
        seasonIndex: stateAfter.seasonIndex,
        clubId: stateAfter.clubId,
        updatedAt: createdAt,
      },
      journal: {
        ...pkg.journal,
        events: nextEvents,
        decisions: nextDecisions,
      },
    } as CareerSavePackage
  } finally {
    inFlightResolutions.delete(key)
  }
}

export function markCareerFinished(
  pkg: CareerSavePackage,
  legacyScore = pkg.snapshot.legacyScore,
): CareerSavePackage {
  if (isCareerReadOnly(pkg.snapshot)) {
    return pkg
  }
  const updatedAt = nowIso()
  return {
    ...pkg,
    snapshot: {
      ...pkg.snapshot,
      status: 'finished',
      legacyScore,
      updatedAt,
      state: {
        ...pkg.snapshot.state,
        phase: 'retired',
      },
    },
  }
}
