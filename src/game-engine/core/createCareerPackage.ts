import type {
  CareerRun,
  CareerSavePackage,
  GameMode,
  PlayerProfile,
} from '../types'
import {
  CONTENT_VERSION,
  ENGINE_VERSION,
  SAVE_SCHEMA_VERSION,
} from './constants'
import { createEmptyCareerState } from './createEmptyCareerState'
import { createId, createSeed, nowIso } from './ids'
import { careerSavePackageSchema } from './schemas'
import { listDefaultFoundingChoices } from './createPlayerCareer'

export interface CreateCareerInput {
  mode?: GameMode
  displayName?: string
  seed?: string
  ownerId?: string | null
  clubId?: string | null
}

/** Carrière technique minimale (rétrocompat atelier Phase 1). */
export function createCareerPackage(
  input: CreateCareerInput = {},
): CareerSavePackage {
  const seed = input.seed ?? createSeed()
  const mode = input.mode ?? 'express'
  const now = nowIso()
  const careerId = createId('career')
  const profileId = createId('profile')
  const clubId = input.clubId ?? 'academy-northwind'
  const displayName =
    (input.displayName ?? 'Joueur invité').trim() || 'Joueur invité'
  const parts = displayName.split(/\s+/)
  const firstName = parts[0] || 'Joueur'
  const lastName = parts.slice(1).join(' ') || 'Invité'

  const state = createEmptyCareerState({ seed, mode, clubId })

  const playerProfile: PlayerProfile = {
    id: profileId,
    firstName,
    lastName,
    nickname: null,
    displayName,
    originId: 'cote-brumeuse',
    countryId: 'cote-brumeuse',
    gender: 'male',
    birthYear: 2010,
    primaryPosition: 'cm',
    secondaryPosition: null,
    macroPosition: 'midfielder',
    strongFoot: 'right',
    heightCm: 178,
    playstyleId: 'architect',
    visualId: 'slate',
    difficulty: 'balanced',
    careerLength: 'standard',
    foundingChoices: listDefaultFoundingChoices(),
    preferredPositions: ['cm'],
    personalityTraits: [],
    hometownRegion: 'Côte Brumeuse',
    potentialStars: 3,
    recruiterBlurb: 'Coquille technique — profil non finalisé.',
    createdAt: now,
    creationMode: 'legacy',
  }

  const snapshot: CareerRun = {
    id: careerId,
    ownerId: input.ownerId ?? null,
    seed,
    engineVersion: ENGINE_VERSION,
    contentVersion: CONTENT_VERSION,
    mode,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    age: state.age,
    seasonIndex: state.seasonIndex,
    clubId: state.clubId,
    state,
    legacyScore: 0,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
  }

  const pkg: CareerSavePackage = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    snapshot,
    playerProfile,
    journal: {
      events: [],
      decisions: [],
      seasons: [
        {
          id: createId('season'),
          careerId,
          seasonIndex: state.seasonIndex,
          clubId: state.clubId,
          startedAt: now,
          endedAt: null,
          summary: { bootstrap: true },
        },
      ],
    },
  }

  return careerSavePackageSchema.parse(pkg) as CareerSavePackage
}

export function isCareerReadOnly(run: CareerRun): boolean {
  return run.status === 'finished' || run.status === 'abandoned'
}
