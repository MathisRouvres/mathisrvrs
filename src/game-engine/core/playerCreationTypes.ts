import type {
  CareerLengthId,
  DifficultyId,
  GenderId,
  HiddenTraitId,
  ResourceId,
  SportStatId,
  StrongFootId,
} from '../types/career'
import {
  CAREER_LENGTHS,
  DIFFICULTIES,
  SPORT_STAT_IDS,
  STRONG_FEET,
} from './constants'

export interface PlayerCreationDraft {
  firstName: string
  lastName: string
  nickname?: string | null
  originId: string
  /** Genre de la carrière (défaut « male »). */
  gender?: GenderId
  birthYear: number
  primaryPosition: string
  secondaryPosition?: string | null
  strongFoot: StrongFootId
  heightCm: number
  playstyleId: string
  visualId: string
  difficulty: DifficultyId
  careerLength: CareerLengthId
  /** categoryId → optionId */
  foundingChoices: Record<string, string>
  mode?: 'express' | 'standard' | 'immersion'
  seed?: string
  ownerId?: string | null
  clubId?: string | null
}

export interface PlayerSummaryCard {
  displayName: string
  positionLabel: string
  originLabel: string
  age: number
  heightCm: number
  strongFoot: StrongFootId
  playstyleLabel: string
  visualId: string
  difficulty: DifficultyId
  careerLength: CareerLengthId
  potentialStars: number
  recruiterBlurb: string
  strengths: string[]
  weaknesses: string[]
  foundingLabels: string[]
  topVisibleStats: Array<{ id: SportStatId; label: string; value: number }>
}

export const SPORT_STAT_LABELS: Record<SportStatId, string> = {
  technique: 'Technique',
  controle: 'Contrôle',
  passe: 'Passe',
  vision: 'Vision',
  tir: 'Tir',
  finition: 'Finition',
  dribble: 'Dribble',
  vitesse: 'Vitesse',
  endurance: 'Endurance',
  puissance: 'Puissance',
  defense: 'Défense',
  placement: 'Placement',
  tactique: 'Tactique',
  sangFroid: 'Sang-froid',
  leadership: 'Leadership',
}

export const RESOURCE_LABELS: Record<ResourceId, string> = {
  forme: 'Forme',
  moral: 'Moral',
  fatigue: 'Fatigue',
  sante: 'Santé',
  confianceEntraineur: 'Confiance entraîneur',
  cohesionVestiaire: 'Cohésion vestiaire',
  reputationSportive: 'Réputation sportive',
  popularite: 'Popularité',
  discipline: 'Discipline',
  bienEtre: 'Bien-être',
  financesPersonnelles: 'Finances personnelles',
}

export function assertDraftBasics(draft: PlayerCreationDraft): void {
  if (!draft.firstName?.trim() || !draft.lastName?.trim()) {
    throw new Error('Prénom et nom sont obligatoires.')
  }
  if (draft.birthYear < 2004 || draft.birthYear > 2010) {
    throw new Error('Année de naissance hors plage académie (2004–2010).')
  }
  if (draft.heightCm < 160 || draft.heightCm > 205) {
    throw new Error('Taille hors limites (160–205 cm).')
  }
  if (!(STRONG_FEET as readonly string[]).includes(draft.strongFoot)) {
    throw new Error('Pied fort invalide.')
  }
  if (!(DIFFICULTIES as readonly string[]).includes(draft.difficulty)) {
    throw new Error('Difficulté invalide.')
  }
  if (!(CAREER_LENGTHS as readonly string[]).includes(draft.careerLength)) {
    throw new Error('Durée de carrière invalide.')
  }
  if (
    draft.secondaryPosition &&
    draft.secondaryPosition === draft.primaryPosition
  ) {
    throw new Error('Le poste secondaire doit différer du poste principal.')
  }
}

export function emptySportStats(base = 42): Record<SportStatId, number> {
  const stats = {} as Record<SportStatId, number>
  for (const id of SPORT_STAT_IDS) {
    stats[id] = base
  }
  return stats
}

export function emptyResources(): Record<ResourceId, number> {
  return {
    forme: 62,
    moral: 58,
    fatigue: 22,
    sante: 72,
    confianceEntraineur: 48,
    cohesionVestiaire: 50,
    reputationSportive: 18,
    popularite: 12,
    discipline: 55,
    bienEtre: 60,
    financesPersonnelles: 40,
  }
}

export function emptyHiddenTraits(): Record<HiddenTraitId, number> {
  return {
    potentiel: 55,
    professionnalisme: 50,
    constance: 50,
    fragilitePhysique: 40,
    grandsMatchs: 45,
    adaptabilite: 50,
    ambition: 55,
    loyaute: 55,
    resistancePression: 50,
  }
}
