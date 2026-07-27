import type { CareerRun, CareerState, PlayerProfile } from './career'

/** Événement de carrière (journal append-only). */
export interface CareerEventRecord {
  id: string
  careerId: string
  eventDefinitionId: string | null
  type: string
  seasonIndex: number
  createdAt: string
  payload: Record<string, unknown>
  /** Une fois true, plus aucune décision ne peut être ajoutée pour cet event. */
  resolved: boolean
  resolutionDecisionId: string | null
}

/** Décision immuable une fois écrite. */
export interface CareerDecisionRecord {
  id: string
  careerId: string
  eventId: string
  choiceId: string
  seasonIndex: number
  createdAt: string
  /** Snapshot avant application. */
  stateBefore: CareerState
  /** Snapshot après application. */
  stateAfter: CareerState
  meta: Record<string, unknown>
}

export interface CareerSeasonRecord {
  id: string
  careerId: string
  seasonIndex: number
  clubId: string | null
  startedAt: string
  endedAt: string | null
  summary: Record<string, unknown>
}

export interface UserAchievementRecord {
  id: string
  ownerKey: string
  achievementId: string
  unlockedAt: string
  meta: Record<string, unknown>
}

export interface UserUnlockRecord {
  id: string
  ownerKey: string
  unlockId: string
  unlockedAt: string
}

/**
 * Paquet de sauvegarde hybride :
 * - snapshot = état courant (career_runs + player_profiles)
 * - journal append-only = events / decisions / seasons
 */
export interface CareerSavePackage {
  schemaVersion: number
  snapshot: CareerRun
  playerProfile: PlayerProfile
  journal: {
    events: CareerEventRecord[]
    decisions: CareerDecisionRecord[]
    seasons: CareerSeasonRecord[]
  }
}

export interface CareerIndexEntry {
  id: string
  displayName: string
  mode: CareerRun['mode']
  status: CareerRun['status']
  ownerId: string | null
  updatedAt: string
  seasonIndex: number
  age: number
  legacyScore: number
  readOnly: boolean
  /** Sauvegarde non migrable — consultation limitée. */
  legacy?: boolean
  legacyReason?: string
}

export interface LocalCareerDatabase {
  schemaVersion: number
  /** Index rapide (career_runs summaries). */
  runs: CareerIndexEntry[]
  packages: Record<string, CareerSavePackage>
  achievements: UserAchievementRecord[]
  unlocks: UserUnlockRecord[]
  /** File d’attache invité → compte (futur). */
  pendingAccountLinks: Array<{
    careerId: string
    createdAt: string
  }>
}
