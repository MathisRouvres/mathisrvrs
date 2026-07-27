import type { CareerStageId, RecordEntry, SeasonTimelineEntry } from './season'

export type { CareerStageId, RecordEntry, SeasonTimelineEntry }

export type GameMode = 'express' | 'standard' | 'immersion'
export type CareerStatus = 'active' | 'paused' | 'finished' | 'abandoned'

export type DifficultyId = 'story' | 'balanced' | 'demanding'
export type CareerLengthId = 'short' | 'standard' | 'long'
export type StrongFootId = 'left' | 'right' | 'both'
/** Genre de la carrière (défaut masculine). */
export type GenderId = 'male' | 'female'

/** Stats sportives visibles (1–99). */
export type SportStatId =
  | 'technique'
  | 'controle'
  | 'passe'
  | 'vision'
  | 'tir'
  | 'finition'
  | 'dribble'
  | 'vitesse'
  | 'endurance'
  | 'puissance'
  | 'defense'
  | 'placement'
  | 'tactique'
  | 'sangFroid'
  | 'leadership'

/** Ressources de carrière visibles (bornées). */
export type ResourceId =
  | 'forme'
  | 'moral'
  | 'fatigue'
  | 'sante'
  | 'confianceEntraineur'
  | 'cohesionVestiaire'
  | 'reputationSportive'
  | 'popularite'
  | 'discipline'
  | 'bienEtre'
  | 'financesPersonnelles'

/** Traits cachés (jamais affichés comme valeurs exactes). */
export type HiddenTraitId =
  | 'potentiel'
  | 'professionnalisme'
  | 'constance'
  | 'fragilitePhysique'
  | 'grandsMatchs'
  | 'adaptabilite'
  | 'ambition'
  | 'loyaute'
  | 'resistancePression'

/** @deprecated Alias Phase 1 — préférer SportStatId + ResourceId. */
export type StatId = SportStatId | ResourceId

export type RelationshipId =
  | 'coach'
  | 'teammates'
  | 'family'
  | 'friends'
  | 'partner'
  | 'media'
  | 'fans'
  | 'sponsors'

export interface PlayerProfile {
  id: string
  firstName: string
  lastName: string
  nickname: string | null
  displayName: string
  originId: string
  /** Pays de départ (Phase 4 bis). */
  countryId: string
  /** Genre de la carrière (défaut « male » sur anciennes sauvegardes). */
  gender: GenderId
  birthYear: number
  primaryPosition: string
  secondaryPosition: string | null
  /** Poste macro UI : gk | defender | midfielder | attacker */
  macroPosition: string
  strongFoot: StrongFootId
  heightCm: number
  playstyleId: string
  visualId: string
  difficulty: DifficultyId
  careerLength: CareerLengthId
  foundingChoices: Record<string, string>
  preferredPositions: string[]
  personalityTraits: string[]
  hometownRegion: string
  potentialStars: number
  recruiterBlurb: string
  createdAt: string
  /** express = parcours narratif rapide ; legacy = anciennes créations. */
  creationMode: 'express' | 'legacy'
}

export type ClubStatusId =
  | 'academy'
  | 'bench'
  | 'rotation'
  | 'starter'
  | 'key_player'

export type SeasonLoopPhaseId =
  | 'awaiting_dilemma_1'
  | 'awaiting_dilemma_2'
  | 'ready_for_bilan'
  | 'showing_bilan'

export type DilemmasResolvedThisSeason = 0 | 1 | 2

export interface VisibleCareerStats {
  niveau: number
  forme: number
  sante: number
  mental: number
  reputation: number
  confianceCoach: number
  discipline: number
  /** Argent (cash), hors échelle 0–100. */
  argent: number
}

export interface Finances {
  cash: number
  weeklyWage: number
  investments: Array<{ id: string; label: string; value: number }>
}

/** Niveaux de vie (pilotent les dépenses — Phase 2). */
export type LifestyleId = 'modeste' | 'confortable' | 'luxueux' | 'extravagant'

/**
 * Contrat de club (Phase 2).
 * `weeksRemaining` + `weeklyWage` restent le cœur historique (décompte + salaire).
 * Les autres champs enrichissent le modèle : primes, clauses, promesses. Ils sont
 * optionnels pour rester compatibles avec les sauvegardes/contrats partiels
 * antérieurs — `normalizeContract` comble les défauts avant tout calcul.
 */
export interface Contract {
  /** Décompte hebdomadaire restant (source de vérité de l'expiration). */
  weeksRemaining: number
  /** Salaire hebdomadaire de base. */
  weeklyWage: number
  /** Club signataire (redondant avec state.clubId, sécurise la clôture). */
  clubId?: string | null
  /** Saison de signature. */
  startSeason?: number
  /** Saison de fin théorique. */
  endSeason?: number
  /** Prime à la signature (versée une fois, à la signature). */
  signingBonus?: number
  /** Statut promis à la signature. */
  promisedStatus?: ClubStatusId
  /** Prime de match (par apparition). */
  appearanceBonus?: number
  /** Prime de titularisation (par titularisation). */
  startBonus?: number
  /** Prime de performance (note élevée sur la saison). */
  performanceBonus?: number
  /** Prime de trophée (par trophée remporté). */
  trophyBonus?: number
  /** Bonus de fidélité (versé aux paliers d'ancienneté). */
  loyaltyBonus?: number
  /** Clause libératoire (null = aucune). */
  releaseClause?: number | null
  /** Année optionnelle activable. */
  optionYear?: boolean
  /** Commission de l'agent (fraction du salaire annuel, 0–0.15). */
  agentCommissionRate?: number
  /** Promesses narratives attachées au contrat. */
  narrativePromises?: string[]
}

/**
 * Patrimoine cumulatif (Phase 2).
 * `current` = patrimoine net courant ; les autres champs sont des maxima /
 * cumuls conservés pour le bilan de carrière et l'affichage.
 */
export interface Wealth {
  /** Patrimoine actuel (net). */
  current: number
  /** Patrimoine maximal atteint. */
  max: number
  /** Revenus cumulés (salaires + primes + commercial + placements). */
  cumulativeIncome: number
  /** Meilleur salaire hebdomadaire signé. */
  bestWeeklyWage: number
  /** Revenus commerciaux cumulés (sponsoring). */
  cumulativeCommercial: number
  /** Gains d'investissements cumulés. */
  investmentGains: number
  /** Pertes financières cumulées. */
  financialLosses: number
  /** Dépenses cumulées. */
  cumulativeExpenses: number
  /** Variation de patrimoine de la dernière saison (affichage). */
  lastAnnualDelta: number
}

export interface Relationships {
  coach: number
  teammates: number
  family: number
  friends: number
  partner: number
  media: number
  fans: number
  sponsors: number
}

/** Secteurs de sponsors fictifs (Phase 3). */
export type SponsorSectorId =
  | 'equipement'
  | 'technologie'
  | 'automobile'
  | 'mode'
  | 'alimentation'
  | 'media'
  | 'sport'
  | 'application'
  | 'marque_locale'
  | 'association'

/**
 * Contrat de sponsoring actif (Phase 3). Identité fictive uniquement.
 * `annualPay` alimente le bilan annuel ; `seasonsRemaining` gère l'expiration.
 */
export interface Sponsorship {
  /** Id d'instance unique. */
  id: string
  /** Id du sponsor au catalogue. */
  sponsorId: string
  /** Nom fictif affiché. */
  name: string
  sector: SponsorSectorId
  /** Prestige de la marque (1–99). */
  prestige: number
  /** Rémunération annuelle. */
  annualPay: number
  /** Saisons restantes (expiration à 0). */
  seasonsRemaining: number
  /** Axe d'image requis (compatibilité). */
  imageTag: string
  /** Risque réputationnel (0–100). */
  reputationRisk: number
  /** Saison de signature. */
  signedSeason: number
  /** Exclusivité sectorielle (empêche un 2e contrat du même secteur). */
  exclusive: boolean
}

export interface TimedEffect {
  id: string
  sourceEventId: string | null
  triggerSeason: number
  payload: Record<string, unknown>
}

/** Personnages récurrents générés depuis la seed (Phase 7). */
export type NpcId = 'coach' | 'teammate' | 'rival' | 'agent' | 'journalist'

export type NpcPersonality =
  | 'exigeant'
  | 'paternel'
  | 'calculateur'
  | 'loyal'
  | 'impulsif'
  | 'ambitieux'
  | 'cynique'
  | 'idealiste'

export interface NpcState {
  id: NpcId
  firstName: string
  lastName: string
  displayName: string
  personality: NpcPersonality
  /** Relation avec le joueur, 0–100. */
  relation: number
  /** Objectif narratif courant. */
  goal: string
  /** Mémoire propre du personnage (interactions marquantes). */
  memory: Record<string, boolean | number | string>
}

/** Rival généré au début de carrière — carrière simulée en parallèle. */
export interface RivalState extends NpcState {
  id: 'rival'
  age: number
  positionId: string
  level: number
  clubId: string | null
  reputation: number
  trophies: number
}

export interface CareerNpcs {
  coach: NpcState
  teammate: NpcState
  rival: RivalState
  agent: NpcState
  journalist: NpcState
}

export interface CareerState {
  seed: string
  mode: GameMode
  seasonIndex: number
  chapterId: string | null
  phase: 'setup' | 'playing' | 'retired'
  careerStage: CareerStageId
  age: number
  clubId: string | null
  contract: Contract | null
  agentId: string | null
  stats: Record<SportStatId, number>
  resources: Record<ResourceId, number>
  hiddenTraits: Record<HiddenTraitId, number>
  flags: Record<string, boolean | number | string>
  pendingEffects: TimedEffect[]
  finances: Finances
  /** Niveau de vie (pilote les dépenses — Phase 2). */
  lifestyle: LifestyleId
  /** Patrimoine cumulatif (Phase 2). */
  wealth: Wealth
  /** Contrats de sponsoring actifs (Phase 3). */
  sponsorships: Sponsorship[]
  relationships: Relationships
  maxSeasons: number
  estimatedValue: number
  injuryWeeksRemaining: number
  clubInfrastructure: number
  competitionLevel: number
  seasonTimeline: SeasonTimelineEntry[]
  rngState: number
  /** Phase 4 bis — boucle narrative. */
  countryId: string
  macroPosition: string
  preciseRole: string
  clubStatus: ClubStatusId
  dilemmasResolvedThisSeason: DilemmasResolvedThisSeason
  seasonsCompleted: number
  totalDilemmasResolved: number
  seasonLoopPhase: SeasonLoopPhaseId
  /** Score d’héritage provisoire (affiné en fin de carrière). */
  provisionalLegacyScore: number
  /** Personnages récurrents (Phase 7). */
  npcs: CareerNpcs
  /** Registre des records détenus (Phase 12) — optionnel (compat sauvegardes). */
  records?: RecordEntry[]
}

export interface CareerRun {
  id: string
  ownerId: string | null
  seed: string
  engineVersion: string
  contentVersion: string
  mode: GameMode
  status: CareerStatus
  createdAt: string
  updatedAt: string
  age: number
  seasonIndex: number
  clubId: string | null
  state: CareerState
  legacyScore: number
  saveSchemaVersion: number
}
