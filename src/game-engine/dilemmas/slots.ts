import type { CareerState, PlayerProfile } from '../types/career'
import type { DilemmaCategory, DilemmaDefinition } from './types'
import { isDilemmaEligible } from './eligibility'

/**
 * Emplacements annuels — deux dilemmes par saison.
 * Slot 1 : priorité au sportif (terrain, entraînement, coach, vestiaire, blessure).
 * Slot 2 : priorité à la carrière (contrat, transfert, agent, médias, finances, sélection).
 */
export type SeasonSlot = 1 | 2

export const SLOT1_CATEGORIES: readonly DilemmaCategory[] = [
  'match',
  'training',
  'coach',
  'teammates',
  'rivalry',
  'injury',
  'mental',
]

export const SLOT2_CATEGORIES: readonly DilemmaCategory[] = [
  'contract',
  'transfer',
  'agent',
  'media',
  'fans',
  'sponsors',
  'money',
  'national_team',
  'family',
  'lifestyle',
  'career_end',
]

/** Multiplicateur appliqué au poids quand la catégorie correspond au slot. */
const SLOT_AFFINITY_BOOST = 4
/** Multiplicateur hors-slot — jamais 0 : le total doit toujours rester à deux. */
const OFF_SLOT_FACTOR = 0.35

/** Thèmes de fin de carrière (tags) favorisés à partir de 31 ans. */
const LATE_CAREER_TAGS = [
  'prolongation',
  'contrat',
  'reconversion',
  'repositionnement',
  'poste',
  'transmission',
  'mentor',
  'retour',
  'formation',
  'retraite',
  'fin_carriere',
  'fin_alternative',
  'selection',
  'chronique',
  'statut',
  'declin',
]

const LATE_CAREER_CATEGORIES: readonly DilemmaCategory[] = [
  'career_end',
  'contract',
  'national_team',
]

/**
 * Boost croissant des dilemmes de fin de carrière avec l’âge (31 → 39).
 * ×1 à 30 ans et moins, jusqu’à ~×3.4 à 39 ans.
 */
function lateCareerFactor(event: DilemmaDefinition, age: number): number {
  if (age < 31) return 1
  const ramp = 1 + (age - 30) * 0.28
  const themed =
    LATE_CAREER_CATEGORIES.includes(event.category) ||
    event.tags.some((t) => LATE_CAREER_TAGS.includes(t))
  return themed ? ramp : 1
}

export function slotForCategory(category: DilemmaCategory): SeasonSlot | null {
  if (SLOT1_CATEGORIES.includes(category)) return 1
  if (SLOT2_CATEGORIES.includes(category)) return 2
  return null
}

function isSeverelyInjured(state: CareerState): boolean {
  return (
    state.resources.sante < 30 ||
    state.injuryWeeksRemaining > 6 ||
    state.flags.grave_injury_risk === true ||
    state.flags.injury_grave === true
  )
}

function hasRecentSigning(state: CareerState): boolean {
  const last = state.flags.lastSigningSeason
  return typeof last === 'number' && state.seasonIndex - last < 2
}

function hasCareerCrisis(state: CareerState): boolean {
  return (
    state.flags.career_crisis === true ||
    state.flags.grave_injury_risk === true ||
    state.resources.sante <= 20
  )
}

/**
 * Garde-fous contextuels — empêchent les contradictions narratives
 * quelles que soient les conditions écrites dans le contenu.
 */
export function passesContextGuards(
  event: DilemmaDefinition,
  state: CareerState,
): boolean {
  // Jamais deux fois le même événement d’affilée.
  if (state.flags.lastDilemmaId === event.id) return false

  // Pas de proposition de transfert juste après une signature.
  if (event.category === 'transfer' && hasRecentSigning(state)) return false

  // Pas de convocation internationale en cas de blessure grave.
  if (event.category === 'national_team' && isSeverelyInjured(state)) {
    return false
  }

  // Pas de dilemme de retraite jeune sans contexte exceptionnel.
  if (
    event.category === 'career_end' &&
    state.age < 30 &&
    !hasCareerCrisis(state)
  ) {
    return false
  }

  // Pas de finale si le club ne joue aucune compétition relevée.
  if (event.tags.includes('finale') && state.competitionLevel < 45) {
    return false
  }

  return true
}

export interface SlotPickRng {
  weightedPick: <T>(items: readonly T[], weights: readonly number[]) => T
}

/**
 * Tirage pondéré par emplacement : les catégories du slot sont favorisées,
 * les autres restent possibles pour garantir toujours deux dilemmes/saison.
 */
export function pickDilemmaForSlot(
  catalog: DilemmaDefinition[],
  state: CareerState,
  profile: PlayerProfile,
  rng: SlotPickRng,
  slot: SeasonSlot,
): DilemmaDefinition | null {
  const eligible = catalog.filter(
    (e) =>
      isDilemmaEligible(e, state, profile) && passesContextGuards(e, state),
  )
  if (eligible.length === 0) return null

  const rarityBonus = { common: 1, uncommon: 0.7, rare: 0.35, legendary: 0.12 }
  const weights = eligible.map((e) => {
    const base =
      e.weight * (rarityBonus[e.rarity] ?? 1) * lateCareerFactor(e, state.age)
    const eventSlot = slotForCategory(e.category)
    if (eventSlot === slot) return base * SLOT_AFFINITY_BOOST
    if (eventSlot === null) return base
    return base * OFF_SLOT_FACTOR
  })
  return rng.weightedPick(eligible, weights)
}
