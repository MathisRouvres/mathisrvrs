import { describe, expect, it } from 'vitest'
import {
  completeSeason,
  createCareer,
  getNextDilemma,
  resolveDilemmaChoice,
} from '../../../game-engine'
import { careerSavePackageSchema } from '../../../game-engine/core/schemas'
import {
  applyDilemmaEffects,
  isDilemmaEligible,
  processDueDilemmaEffects,
} from '../../../game-engine/dilemmas'
import type { DilemmaEffect } from '../../../game-engine/dilemmas'
import { createRng } from '../../../game-engine/random/createRng'
import { getDilemmaById } from '../index'
import type { CareerSavePackage } from '../../../game-engine/types'
import type { CareerState } from '../../../game-engine/types/career'

function makePkg(seed: string): CareerSavePackage {
  return createCareer({ countryId: 'capitale-miroir', macroPosition: 'attacker', seed })
}

/** Force la résolution d'un dilemme donné (n'utilise pas le tirage aléatoire). */
function resolveGiven(pkg: CareerSavePackage, id: string, choiceId: string): CareerSavePackage {
  const d = getDilemmaById(id)!
  return resolveDilemmaChoice(pkg, d, choiceId).package
}

function withFlags(pkg: CareerSavePackage, flags: Record<string, boolean | number | string>): CareerSavePackage {
  return {
    ...pkg,
    snapshot: {
      ...pkg.snapshot,
      state: { ...pkg.snapshot.state, flags: { ...pkg.snapshot.state.flags, ...flags } },
    },
  }
}

const PROFILE = makePkg('p10-profile').playerProfile

function applyFx(state: CareerState, effects: DilemmaEffect[]): CareerState {
  const ctx = {
    state: structuredClone(state),
    profile: PROFILE,
    rng: createRng('p10-rng'),
    log: [] as string[],
    skillChecks: [] as Array<{ id: string; passed: boolean }>,
  }
  return applyDilemmaEffects(ctx, effects, 'immediate')
}

describe('Phase 10 — mémoire & conséquences long terme', () => {
  it('flag permanent : un choix pose un flag qui persiste dans le temps', () => {
    const pkg = resolveGiven(makePkg('perm'), 'p10_chain_sponsor_start', 'signer')
    expect(pkg.snapshot.state.flags.controversial_sponsor).toBe(true)
    // Survit au round-trip de sauvegarde et à l'avancée du temps.
    const reloaded = careerSavePackageSchema.parse(JSON.parse(JSON.stringify(pkg))) as CareerSavePackage
    expect(reloaded.snapshot.state.flags.controversial_sponsor).toBe(true)
  })

  it('flag temporaire : queuedDilemmaId posé par le moteur est consommé', () => {
    const primed = withFlags(makePkg('temp'), { queuedDilemmaId: 'p10_chain_record_ep2' })
    const ep2 = getDilemmaById('p10_chain_record_ep2')!
    const after = resolveDilemmaChoice(primed, ep2, 'acharner').package
    expect(after.snapshot.state.flags.queuedDilemmaId).toBeUndefined()
  })

  it('relation : un choix modifie une relation durablement', () => {
    const base = makePkg('rel').snapshot.state
    const after = applyFx(base, [{ type: 'delta', target: { kind: 'relation', id: 'teammates' }, delta: 6 }])
    expect(after.relationships.teammates).toBe(base.relationships.teammates + 6)
  })

  it('conséquence différée : un ancien choix rend éligible l’épisode suivant', () => {
    const ep2 = getDilemmaById('p10_chain_sponsor_ep2')!
    const before = makePkg('conseq')
    // Sans le passé, l'épisode n'est pas atteignable.
    expect(isDilemmaEligible(ep2, before.snapshot.state, before.playerProfile)).toBe(false)
    // Après le choix fondateur, la mémoire l'ouvre.
    const after = resolveGiven({ ...before, snapshot: { ...before.snapshot, state: { ...before.snapshot.state, age: 24 } } }, 'p10_chain_sponsor_start', 'signer')
    expect(isDilemmaEligible(ep2, after.snapshot.state, after.playerProfile)).toBe(true)
  })

  it('branche alternative : deux choix ouvrent deux épisodes distincts', () => {
    const acharner = resolveGiven(makePkg('branchA'), 'p10_chain_record_ep2', 'acharner')
    const collectif = resolveGiven(makePkg('branchB'), 'p10_chain_record_ep2', 'collectif')
    expect(acharner.snapshot.state.flags.record_pushed).toBe(true)
    expect(acharner.snapshot.state.flags.record_teamfirst).toBeUndefined()
    expect(collectif.snapshot.state.flags.record_teamfirst).toBe(true)
    expect(collectif.snapshot.state.flags.record_pushed).toBeUndefined()
    const gloire = getDilemmaById('p10_chain_record_ep3_gloire')!
    const sacrifice = getDilemmaById('p10_chain_record_ep3_sacrifice')!
    // Chaque branche n'ouvre que son propre dénouement.
    expect(isDilemmaEligible(gloire, withFlags(acharner, {}).snapshot.state, PROFILE)).toBe(true)
    expect(isDilemmaEligible(sacrifice, acharner.snapshot.state, PROFILE)).toBe(false)
  })

  it('chaîne terminée : l’épisode final pose son flag d’héritage', () => {
    const primed = withFlags(makePkg('chain-done'), {
      'seen:p10_chain_protege_ep2': true,
      mentoring_prodigy: true,
      protege_pushed: true,
    })
    const ep3 = getDilemmaById('p10_chain_protege_ep3_heritage')!
    const done = resolveDilemmaChoice(primed, ep3, 'relais').package
    expect(done.snapshot.state.flags.mentor_legacy).toBe(true)
    expect(done.snapshot.state.flags.fan_favorite).toBe(true)
  })

  it('chaîne abandonnée : refuser au départ bloque la suite', () => {
    const pkg = resolveGiven(makePkg('abandon'), 'p10_chain_sponsor_start', 'refuser')
    expect(pkg.snapshot.state.flags.controversial_sponsor).toBeUndefined()
    const ep2 = getDilemmaById('p10_chain_sponsor_ep2')!
    // L'épisode suivant exige le flag fondateur : la chaîne est bien morte.
    expect(isDilemmaEligible(ep2, pkg.snapshot.state, pkg.playerProfile)).toBe(false)
  })

  it('sauvegarde & rechargement : flags et effets en file préservés', () => {
    const pkg = resolveGiven(makePkg('save'), 'p10_chain_record_start', 'embrasser')
    const roundTrip = careerSavePackageSchema.parse(JSON.parse(JSON.stringify(pkg))) as CareerSavePackage
    expect(roundTrip.snapshot.state.flags.record_chase).toBe(true)
    expect(roundTrip.snapshot.state.pendingEffects).toEqual(pkg.snapshot.state.pendingEffects)
  })

  it('non-application en double : un effet retardé ne s’applique qu’une fois', () => {
    const base = makePkg('no-double')
    const state: CareerState = {
      ...base.snapshot.state,
      finances: { ...base.snapshot.state.finances, cash: 50000 },
      pendingEffects: [
        {
          id: 'test-delay',
          sourceEventId: null,
          triggerSeason: base.snapshot.state.seasonIndex,
          payload: {
            kind: 'dilemma_delayed',
            eventId: 'x',
            choiceId: 'y',
            label: 'l',
            effectsJson: JSON.stringify([{ type: 'delta', target: { kind: 'cash' }, delta: -10000 }]),
          },
        },
      ],
    }
    const pkg = { ...base, snapshot: { ...base.snapshot, state } }
    const once = processDueDilemmaEffects(pkg)
    expect(once.snapshot.state.finances.cash).toBe(40000)
    expect(once.snapshot.state.pendingEffects.length).toBe(0)
    const twice = processDueDilemmaEffects(once)
    expect(twice.snapshot.state.finances.cash).toBe(40000)
  })

  it('conséquence annulée par la retraite : plus aucun dilemme enchaîné', () => {
    let pkg = resolveGiven(makePkg('retire'), 'p10_chain_record_start', 'embrasser')
    pkg = {
      ...pkg,
      snapshot: {
        ...pkg.snapshot,
        status: 'finished',
        state: { ...pkg.snapshot.state, phase: 'retired', careerStage: 'carriere_terminee' },
      },
    }
    expect(getNextDilemma(pkg)).toBeNull()
  })
})

describe('Phase 10 — relation de personnage influence l’éligibilité', () => {
  it('le documentaire dépend de la relation au journaliste', () => {
    const base = makePkg('npc-elig')
    const docu = getDilemmaById('p10_chain_docu_start')!
    const friendly: CareerState = {
      ...base.snapshot.state,
      age: 25,
      npcs: { ...base.snapshot.state.npcs, journalist: { ...base.snapshot.state.npcs.journalist, relation: 55 } },
    }
    const hostile: CareerState = {
      ...friendly,
      npcs: { ...friendly.npcs, journalist: { ...friendly.npcs.journalist, relation: 20 } },
    }
    expect(isDilemmaEligible(docu, friendly, base.playerProfile)).toBe(true)
    expect(isDilemmaEligible(docu, hostile, base.playerProfile)).toBe(false)
  })
})
