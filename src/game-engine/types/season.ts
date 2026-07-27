export type CareerStageId =
  | 'creation'
  | 'centre_formation'
  | 'contrat_espoir'
  | 'debuts_professionnels'
  | 'progression'
  | 'apogee'
  | 'declin'
  | 'fin_contrat'
  | 'retraite'
  | 'carriere_terminee'

export const CAREER_STAGE_IDS = [
  'creation',
  'centre_formation',
  'contrat_espoir',
  'debuts_professionnels',
  'progression',
  'apogee',
  'declin',
  'fin_contrat',
  'retraite',
  'carriere_terminee',
] as const

export const CAREER_STAGE_LABELS: Record<CareerStageId, string> = {
  creation: 'Création',
  centre_formation: 'Centre de formation',
  contrat_espoir: 'Contrat espoir',
  debuts_professionnels: 'Débuts professionnels',
  progression: 'Progression',
  apogee: 'Apogée',
  declin: 'Déclin',
  fin_contrat: 'Fin de contrat',
  retraite: 'Retraite',
  carriere_terminee: 'Carrière terminée',
}

export type SeasonChapterId =
  | 'preseason'
  | 'first_half'
  | 'window'
  | 'second_half'
  | 'review'

export interface SeasonChapterDefinition {
  id: SeasonChapterId
  label: string
  /** Types de moments possibles dans le chapitre. */
  beatTypes: Array<
    | 'training'
    | 'narrative'
    | 'sport_sim'
    | 'match_moment'
    | 'delayed_consequence'
    | 'contract_relation'
  >
}

export interface SeasonBeatResult {
  chapterId: SeasonChapterId
  type: SeasonChapterDefinition['beatTypes'][number]
  title: string
  summary: string
}

export interface SeasonMatchStats {
  matches: number
  starts: number
  minutes: number
  goals: number
  assists: number
  cleanSheets: number
  /** Arrêts importants (gardien). */
  keySaves: number
  averageRating: number
  yellowCards: number
  redCards: number
  injuryDays: number
  trophies: string[]
}

export type CupRunStage =
  | 'aucune'
  | 'huitiemes'
  | 'quarts'
  | 'demi'
  | 'finale'
  | 'vainqueur'

/** Résultat de la saison du club (simulé, clubs fictifs). */
export interface ClubSeasonResult {
  clubId: string | null
  leagueRank: number
  leagueSize: number
  leagueLevel: number
  division: 1 | 2
  cupRun: CupRunStage
  continentalQualified: boolean
  trophies: string[]
  promoted: boolean
  relegated: boolean
  coachChanged: boolean
  /** Bilan chiffré (Phase 10) — optionnels (compat). */
  wins?: number
  draws?: number
  losses?: number
  goalsFor?: number
  goalsAgainst?: number
  unbeaten?: boolean
}

export type AutoTransferReason =
  | 'fin_contrat'
  | 'pret_impose'
  | 'relegation'
  | 'libere'
  | 'faillite'
  | 'consequence_choix'

/** Transfert automatique raconté dans le bilan (jamais un écran séparé). */
export interface AutoTransferResult {
  reason: AutoTransferReason
  fromClubId: string | null
  toClubId: string
  narrative: string
}

export interface SeasonSimulationResult {
  seasonIndex: number
  ageBefore: number
  ageAfter: number
  matchStats: SeasonMatchStats
  statsBefore: Record<string, number>
  statsAfter: Record<string, number>
  resourcesBefore: Record<string, number>
  resourcesAfter: Record<string, number>
  valueBefore: number
  valueAfter: number
  reputationBefore: number
  reputationAfter: number
  relationshipsAfter: {
    coach: number
    teammates: number
    family: number
    friends: number
    partner: number
    media: number
    fans: number
    sponsors: number
  }
  progressionLabel:
    | 'exceptionnelle'
    | 'forte'
    | 'positive'
    | 'stable'
    | 'regression'
    | 'blessure'
    | 'sans_temps_de_jeu'
  narrativeSummary: string
  beats: SeasonBeatResult[]
  careerStageBefore: CareerStageId
  careerStageAfter: CareerStageId
  longInjury: boolean
  rngFinalState: number
  /** Phase 6 — résultats club + synthèse bilan. */
  club: ClubSeasonResult
  keyEvent: string
  overallBefore: number
  overallAfter: number
  /** Renseigné par applySeason si un transfert automatique a eu lieu. */
  autoTransfer?: AutoTransferResult | null
  /** Phase 11 — distinctions individuelles de la saison (bilan). */
  distinctions?: DistinctionRecord[]
  /** Phase 12 — records établis/battus cette saison (bilan). */
  records?: RecordEntry[]
  /** Phase 14 — digest de progression prêt pour l'affichage (opaque ici). */
  progression?: unknown
}

/** Statut d'un club avant la saison (Phase 9). */
export type ClubStandingId =
  | 'grand_favori'
  | 'pretendant'
  | 'candidat_continental'
  | 'milieu'
  | 'candidat_maintien'
  | 'promu'
  | 'outsider'

/** Objectif collectif de saison, imposé (Phase 9). */
export type SeasonObjectiveId =
  | 'maintien'
  | 'milieu_tableau'
  | 'premiere_moitie'
  | 'qualification_continentale'
  | 'titre'
  | 'promotion'
  | 'parcours_coupe'
  | 'defense_titre'

/** Verdict de fin de saison vs objectif (Phase 9). */
export type ObjectiveResultId =
  | 'echec_important'
  | 'objectif_manque'
  | 'objectif_atteint'
  | 'objectif_depasse'
  | 'saison_historique'

export interface SeasonTimelineEntry {
  seasonIndex: number
  age: number
  clubId: string | null
  careerStage: CareerStageId
  matchStats: SeasonMatchStats
  progressionLabel: SeasonSimulationResult['progressionLabel']
  narrativeSummary: string
  valueAfter: number
  reputationAfter: number
  recordedAt: string
  /** Phase 6 — optionnels pour compat sauvegardes. */
  clubRank?: number
  keyEvent?: string
  /** Phase 9 — historique sportif enrichi (optionnels pour compat). */
  championshipId?: string | null
  division?: 1 | 2
  objective?: SeasonObjectiveId
  objectiveResult?: ObjectiveResultId
  promoted?: boolean
  relegated?: boolean
  continentalQualified?: boolean
  cupRun?: CupRunStage
  /** Importance historique du résultat (1–5). */
  historicImportance?: number
  /** Phase 10 — trophées & récompenses collectives (optionnels). */
  clubStanding?: ClubStandingId
  /** Ids de faits marquants (non-trophées). */
  achievements?: string[]
  /** Catégorie de contribution du joueur au(x) trophée(s) de la saison. */
  contributionTier?: string
  /** Phase 11 — distinctions individuelles par championnat (optionnel). */
  distinctions?: DistinctionRecord[]
  /** Phase 12 — records établis ou battus cette saison (optionnel). */
  records?: RecordEntry[]
  /** Phase 14 — niveau visible atteint en fin de saison (carte timeline). */
  level?: number
}

/** Statut de nomination pour une distinction individuelle (Phase 11). */
export type AwardStatus =
  | 'non_retenu'
  | 'nomme'
  | 'finaliste'
  | 'troisieme'
  | 'deuxieme'
  | 'vainqueur'

/** Statut dans l'équipe type de la saison (Phase 11). */
export type TeamOfSeasonStatus = 'absent' | 'elargi' | 'titulaire' | 'meilleur'

export type AwardPositionFamily = 'gk' | 'def' | 'mid' | 'att'

/** Portée d'une distinction (Phase 11 championnat → Phase 12 majeures). */
export type DistinctionTier =
  | 'championnat'
  | 'national'
  | 'continental'
  | 'international'
  | 'mondial'

/** Candidat à une distinction (joueur contrôlé ou concurrent synthétique). */
export interface AwardCandidate {
  name: string
  clubName: string
  family: AwardPositionFamily
  score: number
  result: AwardStatus
  isPlayer: boolean
}

/** Trace durable d'une distinction individuelle (historique Phase 11). */
export interface DistinctionRecord {
  awardId: string
  awardName: string
  championshipId: string | null
  competition: string
  seasonIndex: number
  age: number
  clubId: string | null
  positionFamily: AwardPositionFamily
  result: AwardStatus
  rank: number
  score: number
  prestige: number
  justification: string
  /** Podium (concurrents principaux, joueur inclus s'il y figure). */
  competitors: AwardCandidate[]
  /** Équipe type uniquement. */
  teamStatus?: TeamOfSeasonStatus
  /** Récompenses mensuelles : nombre agrégé sur la saison. */
  monthlyCount?: number
  /** Portée (Phase 12) — 'championnat' par défaut si absent. */
  tier?: DistinctionTier
}

// --------------------------------------------------------------------------
// Records (Phase 12)
// --------------------------------------------------------------------------

export type RecordScope =
  | 'personnel'
  | 'club'
  | 'championnat'
  | 'national'
  | 'continental'
  | 'mondial'

/** Niveau de rareté d'un record (du plus commun au plus rare). */
export type RecordRarity =
  | 'accomplissement'
  | 'record_club'
  | 'record_championnat'
  | 'record_national'
  | 'record_continental'
  | 'record_mondial'

/** Trace durable d'un record établi ou battu (données réelles uniquement). */
export interface RecordEntry {
  id: string
  label: string
  scope: RecordScope
  rarity: RecordRarity
  value: number
  seasonIndex: number
  age: number
  clubId: string | null
  championshipId: string | null
  context: string
}
