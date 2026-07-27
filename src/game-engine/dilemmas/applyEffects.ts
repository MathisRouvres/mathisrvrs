import type { CareerState, PlayerProfile } from '../types/career'
import type { SeededRng } from '../random/createRng'
import {
  clampCash,
  clampHidden,
  clampRelation,
  clampResource,
  clampStat,
} from '../core/clamp'
import { createId } from '../core/ids'
import type { DilemmaEffect, DilemmaResolutionLog } from './types'
import {
  HIDDEN_TRAIT_IDS,
  RESOURCE_IDS,
  SPORT_STAT_IDS,
} from '../core/constants'

export interface EffectContext {
  state: CareerState
  profile: PlayerProfile
  rng: SeededRng
  log: string[]
  skillChecks: DilemmaResolutionLog['skillChecks']
}

function readPoolValue(
  state: CareerState,
  pool: 'stat' | 'resource' | 'hidden',
  id: string,
): number {
  if (pool === 'stat' && (SPORT_STAT_IDS as readonly string[]).includes(id)) {
    return state.stats[id as keyof typeof state.stats]
  }
  if (pool === 'resource' && (RESOURCE_IDS as readonly string[]).includes(id)) {
    return state.resources[id as keyof typeof state.resources]
  }
  if (pool === 'hidden' && (HIDDEN_TRAIT_IDS as readonly string[]).includes(id)) {
    return state.hiddenTraits[id as keyof typeof state.hiddenTraits]
  }
  throw new Error(`Cible de test inconnue: ${pool}.${id}`)
}

export function applyDilemmaEffects(
  ctx: EffectContext,
  effects: DilemmaEffect[],
  visibility: 'immediate' | 'hidden' | 'delayed',
): CareerState {
  let state = ctx.state

  for (const effect of effects) {
    switch (effect.type) {
      case 'delta': {
        const { target, delta } = effect
        if (target.kind === 'stat') {
          const before = state.stats[target.id]
          const after = clampStat(before + delta)
          state = {
            ...state,
            stats: { ...state.stats, [target.id]: after },
          }
          ctx.log.push(`${visibility}:stat.${target.id} ${before}→${after}`)
        } else if (target.kind === 'resource') {
          const before = state.resources[target.id]
          const after = clampResource(before + delta)
          state = {
            ...state,
            resources: { ...state.resources, [target.id]: after },
          }
          ctx.log.push(`${visibility}:resource.${target.id} ${before}→${after}`)
        } else if (target.kind === 'hidden') {
          const before = state.hiddenTraits[target.id]
          const after = clampHidden(before + delta)
          state = {
            ...state,
            hiddenTraits: { ...state.hiddenTraits, [target.id]: after },
          }
          ctx.log.push(`${visibility}:hidden.${target.id}`)
        } else if (target.kind === 'relation') {
          const before = state.relationships[target.id]
          const after = clampRelation(before + delta)
          state = {
            ...state,
            relationships: { ...state.relationships, [target.id]: after },
          }
          // Miroir coach <-> confianceEntraineur
          if (target.id === 'coach') {
            state = {
              ...state,
              resources: {
                ...state.resources,
                confianceEntraineur: clampResource(after),
              },
            }
          }
          ctx.log.push(`${visibility}:relation.${target.id} ${before}→${after}`)
        } else if (target.kind === 'cash') {
          const before = state.finances.cash
          const after = clampCash(before + delta)
          state = {
            ...state,
            finances: { ...state.finances, cash: after },
            resources: {
              ...state.resources,
              financesPersonnelles: clampResource(
                state.resources.financesPersonnelles + Math.round(delta / 50),
              ),
            },
          }
          ctx.log.push(`${visibility}:cash ${before}→${after}`)
        }
        break
      }
      case 'setFlag': {
        state = {
          ...state,
          flags: {
            ...state.flags,
            [effect.key]: effect.value,
            // Horodatage : permet les échos « {years} saisons plus tôt ».
            [`flagSeason:${effect.key}`]: state.seasonIndex,
          },
        }
        ctx.log.push(`${visibility}:flag ${effect.key}=${String(effect.value)}`)
        break
      }
      case 'removeFlag': {
        const flags = { ...state.flags }
        delete flags[effect.key]
        state = { ...state, flags }
        ctx.log.push(`${visibility}:flag remove ${effect.key}`)
        break
      }
      case 'narrativeDebt': {
        const due = state.seasonIndex + effect.dueSeasonOffset
        state = {
          ...state,
          flags: {
            ...state.flags,
            [`debt:${effect.debtId}`]: due,
            [`debt_label:${effect.debtId}`]: effect.label,
          },
          pendingEffects: [
            ...state.pendingEffects,
            {
              id: createId('debt'),
              sourceEventId: null,
              triggerSeason: due,
              payload: {
                kind: 'narrative_debt_due',
                debtId: effect.debtId,
                label: effect.label,
              },
            },
          ],
        }
        ctx.log.push(`${visibility}:debt ${effect.debtId} @S${due}`)
        break
      }
      case 'queueEvent': {
        const trigger =
          state.seasonIndex + (effect.seasonOffset ?? 0)
        state = {
          ...state,
          pendingEffects: [
            ...state.pendingEffects,
            {
              id: createId('queue'),
              sourceEventId: effect.eventId,
              triggerSeason: trigger,
              payload: {
                kind: 'queued_event',
                eventId: effect.eventId,
              },
            },
          ],
        }
        ctx.log.push(`${visibility}:queue ${effect.eventId} @S${trigger}`)
        break
      }
      case 'skillCheck': {
        const value = readPoolValue(state, effect.pool, effect.id)
        const roll = ctx.rng.randomInt(1, 100)
        const passed = value + ctx.rng.randomInt(-8, 8) >= effect.difficulty
        ctx.skillChecks.push({ id: `${effect.pool}.${effect.id}`, passed })
        ctx.log.push(
          `${visibility}:check ${effect.pool}.${effect.id} roll=${roll} => ${passed ? 'ok' : 'fail'}`,
        )
        state = applyDilemmaEffects(
          { ...ctx, state },
          passed ? effect.onSuccess : effect.onFail,
          visibility,
        )
        break
      }
      case 'chance': {
        if (ctx.rng.chance(effect.probability)) {
          state = applyDilemmaEffects(
            { ...ctx, state },
            effect.effects,
            visibility,
          )
        } else {
          ctx.log.push(`${visibility}:chance miss (${effect.probability})`)
        }
        break
      }
      case 'setAgent': {
        // Changement d'agent : nouveau profil, relation repart neutre.
        state = {
          ...state,
          agentId: effect.agentId,
          flags: { ...state.flags, agent_profile: effect.agentId, agent_changed: true },
          npcs: {
            ...state.npcs,
            agent: { ...state.npcs.agent, relation: clampRelation(50) },
          },
        }
        ctx.log.push(`${visibility}:agent → ${effect.agentId}`)
        break
      }
      case 'signSponsor': {
        const o = effect.sponsor
        // Incompatibilité : pas deux contrats exclusifs du même secteur, ni un
        // secteur banni par une décision passée.
        const sectorConflict =
          o.exclusive &&
          state.sponsorships.some((s) => s.exclusive && s.sector === o.sector)
        const banned = state.flags[`sponsor_ban:${o.sector}`] === true
        if (sectorConflict || banned) {
          ctx.log.push(`${visibility}:sponsor refusé (incompatible ${o.sector})`)
          break
        }
        const sponsorship = {
          id: createId('spon'),
          sponsorId: o.sponsorId,
          name: o.name,
          sector: o.sector,
          prestige: o.prestige,
          annualPay: Math.max(0, Math.round(o.annualPay)),
          seasonsRemaining: o.durationSeasons,
          imageTag: o.imageTag,
          reputationRisk: o.reputationRisk,
          signedSeason: state.seasonIndex,
          exclusive: o.exclusive,
        }
        state = {
          ...state,
          sponsorships: [...state.sponsorships, sponsorship],
          flags: { ...state.flags, sponsor_active: true },
          relationships: {
            ...state.relationships,
            sponsors: clampRelation(
              state.relationships.sponsors + Math.round(o.prestige / 6),
            ),
          },
        }
        ctx.log.push(`${visibility}:sponsor + ${o.name} (${o.annualPay}/an)`)
        break
      }
      case 'endSponsor': {
        const target = effect.sponsorId
        const remaining = target
          ? state.sponsorships.filter((s) => s.sponsorId !== target)
          : state.sponsorships.slice(0, -1)
        const removed = state.sponsorships.length - remaining.length
        const hit = effect.reputationHit ?? 0
        state = {
          ...state,
          sponsorships: remaining,
          flags: {
            ...state.flags,
            sponsor_active: remaining.length > 0,
            sponsor_broken: removed > 0 ? true : state.flags.sponsor_broken ?? false,
          },
          resources: {
            ...state.resources,
            reputationSportive: clampResource(
              state.resources.reputationSportive - hit,
            ),
          },
          relationships: {
            ...state.relationships,
            sponsors: clampRelation(state.relationships.sponsors - hit),
          },
        }
        ctx.log.push(`${visibility}:sponsor rompu (-${removed}, rep -${hit})`)
        break
      }
      case 'makeInvestment': {
        const inv = effect.investment
        // Application unique : jamais deux fois le même investissement.
        if (state.flags[`invested:${inv.investmentId}`] === true) {
          ctx.log.push(`${visibility}:invest déjà réalisé (${inv.investmentId})`)
          break
        }
        const cost = Math.max(0, Math.round(inv.cost))
        state = {
          ...state,
          finances: {
            ...state.finances,
            cash: clampCash(state.finances.cash - cost),
            investments: [
              ...state.finances.investments,
              { id: createId('inv'), label: inv.label, value: cost },
            ],
          },
          flags: {
            ...state.flags,
            [`invested:${inv.investmentId}`]: true,
            investment_active: true,
          },
        }
        ctx.log.push(`${visibility}:invest ${inv.label} (-${cost})`)
        break
      }
      default:
        break
    }
    ctx.state = state
  }

  return state
}
