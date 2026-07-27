import type { CareerState, PlayerProfile } from '../types/career'
import type { DilemmaCondition, DilemmaDefinition } from './types'

function lastSeasonMinutes(state: CareerState): number {
  const last = state.seasonTimeline[state.seasonTimeline.length - 1]
  return last?.matchStats.minutes ?? 0
}

export function evaluateCondition(
  condition: DilemmaCondition,
  state: CareerState,
  profile: PlayerProfile,
): boolean {
  switch (condition.type) {
    case 'minAge':
      return state.age >= condition.value
    case 'maxAge':
      return state.age <= condition.value
    case 'hasFlag': {
      const value = state.flags[condition.key]
      if (condition.equals === undefined) return value !== undefined && value !== false
      return value === condition.equals
    }
    case 'missingFlag':
      return state.flags[condition.key] === undefined
    case 'minResource':
      return state.resources[condition.id] >= condition.value
    case 'maxResource':
      return state.resources[condition.id] <= condition.value
    case 'minStat':
      return state.stats[condition.id] >= condition.value
    case 'minHidden':
      return state.hiddenTraits[condition.id] >= condition.value
    case 'minRelation':
      return state.relationships[condition.id] >= condition.value
    case 'careerStage':
      return condition.stages.includes(state.careerStage)
    case 'position':
      return (
        condition.ids.includes(profile.primaryPosition) ||
        (profile.secondaryPosition != null &&
          condition.ids.includes(profile.secondaryPosition))
      )
    case 'minMinutesLastSeason':
      return lastSeasonMinutes(state) >= condition.value
    case 'maxMinutesLastSeason':
      return lastSeasonMinutes(state) <= condition.value
    case 'hasDebt':
      return state.flags[`debt:${condition.debtId}`] !== undefined
    case 'missingDebt':
      return state.flags[`debt:${condition.debtId}`] === undefined
    case 'country':
      return condition.ids.includes(state.countryId)
    case 'minRivalRelation':
      return state.npcs.rival.relation >= condition.value
    case 'maxRivalRelation':
      return state.npcs.rival.relation <= condition.value
    case 'minNpcRelation':
      return state.npcs[condition.npc].relation >= condition.value
    case 'maxNpcRelation':
      return state.npcs[condition.npc].relation <= condition.value
    default:
      return false
  }
}

export function isDilemmaEligible(
  event: DilemmaDefinition,
  state: CareerState,
  profile: PlayerProfile,
): boolean {
  if (state.age < event.ageMin || state.age > event.ageMax) return false
  if (
    event.expiresAtSeason != null &&
    state.seasonIndex > event.expiresAtSeason
  ) {
    return false
  }
  if (event.positions && event.positions.length > 0) {
    const ok =
      event.positions.includes(profile.primaryPosition) ||
      (profile.secondaryPosition != null &&
        event.positions.includes(profile.secondaryPosition))
    if (!ok) return false
  }
  if (event.careerStages && event.careerStages.length > 0) {
    if (!event.careerStages.includes(state.careerStage)) return false
  }
  if (event.unique && state.flags[`seen:${event.id}`]) return false

  const lastSeen = state.flags[`cooldown:${event.id}`]
  if (
    typeof lastSeen === 'number' &&
    state.seasonIndex - lastSeen < event.cooldownSeasons
  ) {
    return false
  }

  for (const pre of event.prerequisites) {
    if (!evaluateCondition(pre, state, profile)) return false
  }
  for (const ex of event.exclusions) {
    if (evaluateCondition(ex, state, profile)) return false
  }
  return true
}

export function pickDilemma(
  catalog: DilemmaDefinition[],
  state: CareerState,
  profile: PlayerProfile,
  rng: { weightedPick: <T>(items: readonly T[], weights: readonly number[]) => T },
): DilemmaDefinition | null {
  const eligible = catalog.filter((e) => isDilemmaEligible(e, state, profile))
  if (eligible.length === 0) return null
  const rarityBonus = { common: 1, uncommon: 0.7, rare: 0.35, legendary: 0.12 }
  const weights = eligible.map(
    (e) => e.weight * (rarityBonus[e.rarity] ?? 1),
  )
  return rng.weightedPick(eligible, weights)
}
