import { describe, expect, it, beforeEach } from 'vitest'
import { LocalCareerStore } from './localCareerStore'
import {
  appendDecisionResolution,
  createId,
  getNextDilemma,
  nowIso,
  resolveDilemmaChoice,
} from '../../../game-engine'

class MemoryStorage {
  private data = new Map<string, string>()
  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
}

describe('LocalCareerStore', () => {
  let store: LocalCareerStore

  beforeEach(() => {
    store = new LocalCareerStore(new MemoryStorage())
  })

  it('crée, sauvegarde, reprend et supprime une carrière', async () => {
    const created = await store.createCareer({
      displayName: 'Testeur',
      mode: 'express',
    })
    expect(created.snapshot.id).toBeTruthy()
    expect(store.listCareers()).toHaveLength(1)

    const resumed = store.getCareer(created.snapshot.id)
    expect(resumed?.playerProfile.displayName).toBe('Testeur')
    expect(resumed?.snapshot.seed).toBe(created.snapshot.seed)

    await store.deleteCareer(created.snapshot.id)
    expect(store.listCareers()).toHaveLength(0)
    expect(store.getCareer(created.snapshot.id)).toBeNull()
  })

  it('refuse de muter une décision déjà enregistrée', async () => {
    const created = await store.createCareer({ displayName: 'Immutable' })
    const eventId = createId('event')
    const withEvent = {
      ...created,
      journal: {
        ...created.journal,
        events: [
          {
            id: eventId,
            careerId: created.snapshot.id,
            eventDefinitionId: null,
            type: 'technical_probe',
            seasonIndex: 1,
            createdAt: nowIso(),
            payload: {},
            resolved: false,
            resolutionDecisionId: null,
          },
        ],
      },
    }

    const resolved = appendDecisionResolution(withEvent, {
      eventId,
      choiceId: 'ok',
      nextState: {
        ...withEvent.snapshot.state,
        phase: 'playing',
      },
    })
    await store.saveCareer(resolved)

    const tampered = structuredClone(resolved)
    const firstDecision = tampered.journal.decisions[0]
    if (!firstDecision) throw new Error('missing decision')
    firstDecision.choiceId = 'hacked'

    await expect(store.saveCareer(tampered)).rejects.toThrow(/append-only/)
  })

  it('refuse d’écrire une carrière terminée', async () => {
    const created = await store.createCareer({ displayName: 'Finie' })
    const finished = {
      ...created,
      snapshot: {
        ...created.snapshot,
        status: 'finished' as const,
        state: { ...created.snapshot.state, phase: 'retired' as const },
      },
    }
    await store.saveCareer(finished)

    const again = {
      ...finished,
      snapshot: {
        ...finished.snapshot,
        legacyScore: 99,
      },
    }
    await expect(store.saveCareer(again)).rejects.toThrow(/lecture seule/)
  })

  it('parcours express : création, dilemme, rechargement au même endroit', async () => {
    const created = await store.createExpressCareer({
      countryId: 'baie-lumen',
      macroPosition: 'attacker',
      seed: 'store-express-1',
    })
    expect(created.snapshot.state.seasonLoopPhase).toBe('awaiting_dilemma_1')

    const dilemma = getNextDilemma(created)
    expect(dilemma).not.toBeNull()
    const { package: resolved } = resolveDilemmaChoice(
      created,
      dilemma!,
      dilemma!.choices[0]!.id,
    )
    await store.saveCareer(resolved)

    // Rechargement simulé : relecture depuis le stockage.
    const reloaded = store.getCareer(created.snapshot.id)
    expect(reloaded?.snapshot.state.dilemmasResolvedThisSeason).toBe(1)
    expect(reloaded?.snapshot.state.seasonLoopPhase).toBe('awaiting_dilemma_2')
    // Même seed → même deuxième dilemme proposé après rechargement.
    expect(getNextDilemma(reloaded!)?.id).toBe(getNextDilemma(resolved)?.id)
  })
})
