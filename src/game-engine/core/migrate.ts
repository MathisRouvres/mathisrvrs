import type { CareerSavePackage } from '../types'
import { SAVE_SCHEMA_VERSION } from './constants'
import { assertSaveSchemaVersion, careerSavePackageSchema } from './schemas'
import {
  emptyHiddenTraits,
  emptyResources,
  emptySportStats,
} from './playerCreationTypes'
import { clampStat } from './clamp'
import { patchStateToV4 } from './visibleStats'
import { createNpcs } from './npcs'
import { deriveLifestyle, initialWealth } from './finance'
import { getClubById } from '../../game-content/clubs'
import { getChampionshipByCountry } from '../../game-content/championships'

type Migrator = (raw: Record<string, unknown>) => Record<string, unknown>

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function macroFromRole(role: string): string {
  if (role === 'gk') return 'gk'
  if (role === 'cb' || role === 'fb') return 'defender'
  if (role === 'winger' || role === 'st') return 'attacker'
  return 'midfielder'
}

/** Phase 1 → Phase 2 : stats étendues, resources, hiddenTraits, profil enrichi. */
function migrateV1toV2(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  const state = asRecord(snapshot.state)
  const oldStats = asRecord(state.stats)
  const profile = asRecord(raw.playerProfile)

  const stats = emptySportStats(40)
  stats.technique = clampStat(num(oldStats.technique, 42))
  stats.vision = clampStat(num(oldStats.vision, 42))
  stats.defense = clampStat(num(oldStats.defending, 42))
  stats.finition = clampStat(num(oldStats.finishing, 42))
  stats.leadership = clampStat(num(oldStats.leadership, 42))
  const ath = num(oldStats.athleticism, 42)
  stats.vitesse = clampStat(ath)
  stats.endurance = clampStat(ath)
  stats.puissance = clampStat(ath - 2)
  const mental = num(oldStats.matchMentality, 42)
  stats.sangFroid = clampStat(mental)
  stats.tactique = clampStat(mental - 2)
  stats.controle = clampStat(num(oldStats.technique, 40))
  stats.passe = clampStat(num(oldStats.vision, 40))
  stats.tir = clampStat(num(oldStats.finishing, 38))
  stats.dribble = clampStat(ath - 4)
  stats.placement = clampStat(num(oldStats.defending, 40))

  const resources = emptyResources()
  resources.forme = Math.min(100, Math.max(0, Math.round(num(oldStats.form, 55))))
  resources.moral = Math.min(100, Math.max(0, Math.round(num(oldStats.morale, 55))))
  resources.fatigue = Math.min(
    100,
    Math.max(0, Math.round(num(oldStats.fatigue, 20))),
  )

  const displayName = String(profile.displayName ?? 'Joueur invité')
  const parts = displayName.split(/\s+/)
  const firstName = parts[0] || 'Joueur'
  const lastName = parts.slice(1).join(' ') || 'Invité'

  const nextProfile = {
    id: profile.id ?? 'profile_migrated',
    firstName,
    lastName,
    nickname: null,
    displayName,
    originId: 'cote-brumeuse',
    birthYear: 2010,
    primaryPosition: Array.isArray(profile.preferredPositions)
      ? String(profile.preferredPositions[0] ?? 'cm')
      : 'cm',
    secondaryPosition: null,
    strongFoot: 'right',
    heightCm: 178,
    playstyleId: 'architect',
    visualId: 'slate',
    difficulty: 'balanced',
    careerLength: 'standard',
    foundingChoices: {},
    preferredPositions: Array.isArray(profile.preferredPositions)
      ? profile.preferredPositions
      : ['cm'],
    personalityTraits: Array.isArray(profile.personalityTraits)
      ? profile.personalityTraits
      : [],
    hometownRegion: String(profile.hometownRegion ?? 'Côte Brumeuse'),
    potentialStars: 3,
    recruiterBlurb:
      'Dossier migré depuis une sauvegarde antérieure — lecture incomplète.',
    createdAt: String(profile.createdAt ?? new Date().toISOString()),
  }

  if (nextProfile.primaryPosition === 'meneur') {
    nextProfile.primaryPosition = 'cm'
    nextProfile.preferredPositions = ['cm']
  }

  return {
    ...raw,
    schemaVersion: 2,
    playerProfile: nextProfile,
    snapshot: {
      ...snapshot,
      saveSchemaVersion: 2,
      state: {
        ...state,
        stats,
        resources,
        hiddenTraits: emptyHiddenTraits(),
        maxSeasons: num(state.maxSeasons, 15),
      },
    },
  }
}

/** Phase 2 → Phase 3 : étapes de carrière, valeur, timeline. */
function migrateV2toV3(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  const state = asRecord(snapshot.state)
  return {
    ...raw,
    schemaVersion: 3,
    snapshot: {
      ...snapshot,
      saveSchemaVersion: 3,
      state: {
        ...state,
        careerStage: state.careerStage ?? 'centre_formation',
        estimatedValue: num(state.estimatedValue, 250_000),
        injuryWeeksRemaining: num(state.injuryWeeksRemaining, 0),
        clubInfrastructure: num(state.clubInfrastructure, 45),
        competitionLevel: num(state.competitionLevel, 40),
        seasonTimeline: Array.isArray(state.seasonTimeline)
          ? state.seasonTimeline
          : [],
      },
    },
  }
}

/** Phase 3 → Phase 4 bis : boucle 2 dilemmes / saison, pays, stats express. */
function migrateV3toV4(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  const state = asRecord(snapshot.state)
  const profile = asRecord(raw.playerProfile)
  const journal = asRecord(raw.journal)

  const preciseRole = String(profile.primaryPosition ?? 'cm')
  const countryId = String(
    profile.countryId ?? profile.originId ?? 'cote-brumeuse',
  )
  const macroPosition = String(
    profile.macroPosition ?? macroFromRole(preciseRole),
  )

  const patchedState = patchStateToV4(state, {
    countryId,
    macroPosition,
    preciseRole,
  })
  patchedState.flags = {
    ...asRecord(state.flags),
    legacyCreation: true,
    migratedToExpress: true,
  }

  const nextProfile = {
    ...profile,
    countryId,
    macroPosition,
    creationMode: profile.creationMode === 'express' ? 'express' : 'legacy',
    originId: String(profile.originId ?? countryId),
  }

  const decisions = Array.isArray(journal.decisions) ? journal.decisions : []
  const patchedDecisions = decisions.map((d) => {
    const rec = asRecord(d)
    return {
      ...rec,
      stateBefore: patchStateToV4(asRecord(rec.stateBefore), {
        countryId,
        macroPosition,
        preciseRole,
      }),
      stateAfter: patchStateToV4(asRecord(rec.stateAfter), {
        countryId,
        macroPosition,
        preciseRole,
      }),
    }
  })

  return {
    ...raw,
    schemaVersion: 4,
    playerProfile: nextProfile,
    journal: {
      ...journal,
      decisions: patchedDecisions,
    },
    snapshot: {
      ...snapshot,
      saveSchemaVersion: 4,
      mode: 'express',
      state: patchedState,
    },
  }
}

/** Phase 4 bis → Phase 7 : personnages récurrents générés depuis la seed. */
function migrateV4toV5(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  const state = asRecord(snapshot.state)
  const journal = asRecord(raw.journal)

  const seed = String(state.seed ?? snapshot.seed ?? 'legacy-seed')
  const npcs = createNpcs({
    seed,
    countryId: String(state.countryId ?? 'cote-brumeuse'),
    preciseRole: String(state.preciseRole ?? 'cm'),
    age: num(state.age, 16),
  })

  const withNpcs = (s: Record<string, unknown>): Record<string, unknown> => ({
    ...s,
    npcs: s.npcs ?? npcs,
  })

  const decisions = Array.isArray(journal.decisions) ? journal.decisions : []
  const patchedDecisions = decisions.map((d) => {
    const rec = asRecord(d)
    return {
      ...rec,
      stateBefore: withNpcs(asRecord(rec.stateBefore)),
      stateAfter: withNpcs(asRecord(rec.stateAfter)),
    }
  })

  return {
    ...raw,
    schemaVersion: 5,
    journal: {
      ...journal,
      decisions: patchedDecisions,
    },
    snapshot: {
      ...snapshot,
      saveSchemaVersion: 5,
      state: withNpcs(state),
    },
  }
}

/**
 * Phase 5 → Phase 6 : salaires, contrats enrichis, patrimoine (Phase 2).
 * Ajoute `lifestyle` + `wealth` avec des valeurs par défaut cohérentes dérivées
 * du cash existant et du salaire courant. Aucune donnée supprimée ; les anciens
 * contrats restent valides (nouveaux champs optionnels comblés au calcul).
 */
function migrateV5toV6(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  const state = asRecord(snapshot.state)
  const journal = asRecord(raw.journal)

  const withFinance = (s: Record<string, unknown>): Record<string, unknown> => {
    if (s.lifestyle !== undefined && s.wealth !== undefined) return s
    const finances = asRecord(s.finances)
    const cash = num(finances.cash, 0)
    const contract = asRecord(s.contract)
    const weeklyWage = num(contract.weeklyWage, 0)
    return {
      ...s,
      lifestyle: s.lifestyle ?? deriveLifestyle(weeklyWage),
      wealth: s.wealth ?? initialWealth(cash, weeklyWage),
    }
  }

  const decisions = Array.isArray(journal.decisions) ? journal.decisions : []
  const patchedDecisions = decisions.map((d) => {
    const rec = asRecord(d)
    return {
      ...rec,
      stateBefore: withFinance(asRecord(rec.stateBefore)),
      stateAfter: withFinance(asRecord(rec.stateAfter)),
    }
  })

  return {
    ...raw,
    schemaVersion: 6,
    journal: {
      ...journal,
      decisions: patchedDecisions,
    },
    snapshot: {
      ...snapshot,
      saveSchemaVersion: 6,
      state: withFinance(state),
    },
  }
}

/**
 * Phase 6 → Phase 7 : agents, sponsors, investissements (Phase 3).
 * Ajoute `sponsorships: []` et un profil d'agent par défaut (`agentId`).
 * `finances.investments` (déjà présent) sert de support aux investissements.
 * Aucune donnée supprimée ; anciens champs conservés.
 */
function migrateV6toV7(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  const state = asRecord(snapshot.state)
  const journal = asRecord(raw.journal)

  const withAgentsSponsors = (
    s: Record<string, unknown>,
  ): Record<string, unknown> => ({
    ...s,
    sponsorships: Array.isArray(s.sponsorships) ? s.sponsorships : [],
    agentId:
      typeof s.agentId === 'string' && s.agentId.length > 0
        ? s.agentId
        : 'loyal',
  })

  const decisions = Array.isArray(journal.decisions) ? journal.decisions : []
  const patchedDecisions = decisions.map((d) => {
    const rec = asRecord(d)
    return {
      ...rec,
      stateBefore: withAgentsSponsors(asRecord(rec.stateBefore)),
      stateAfter: withAgentsSponsors(asRecord(rec.stateAfter)),
    }
  })

  return {
    ...raw,
    schemaVersion: 7,
    journal: {
      ...journal,
      decisions: patchedDecisions,
    },
    snapshot: {
      ...snapshot,
      saveSchemaVersion: 7,
      state: withAgentsSponsors(state),
    },
  }
}

/**
 * Phase 7 → Phase 8 : historique sportif enrichi (Phase 9 utilisateur).
 * Rétro-remplit `championshipId` sur les entrées de timeline existantes depuis
 * le club. Les autres champs (objectif, verdict…) restent optionnels : les
 * anciennes carrières ne les avaient pas. Aucune donnée supprimée.
 */
function migrateV7toV8(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  const state = asRecord(snapshot.state)

  const backfillTimeline = (
    s: Record<string, unknown>,
  ): Record<string, unknown> => {
    const timeline = Array.isArray(s.seasonTimeline) ? s.seasonTimeline : []
    const patched = timeline.map((e) => {
      const rec = asRecord(e)
      if (rec.championshipId !== undefined) return rec
      const club = typeof rec.clubId === 'string' ? getClubById(rec.clubId) : undefined
      const champ = club ? getChampionshipByCountry(club.countryId) : undefined
      return { ...rec, championshipId: champ?.id ?? null }
    })
    return { ...s, seasonTimeline: patched }
  }

  return {
    ...raw,
    schemaVersion: 8,
    snapshot: {
      ...snapshot,
      saveSchemaVersion: 8,
      state: backfillTimeline(state),
    },
  }
}

/**
 * v8 → v9 (Phase 10) — trophées & récompenses collectives. Les nouveaux champs
 * de timeline (clubStanding/achievements/contributionTier) sont optionnels et
 * dérivés à la volée : aucun back-fill nécessaire, on estampille la version.
 */
function migrateV8toV9(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  return {
    ...raw,
    schemaVersion: 9,
    snapshot: { ...snapshot, saveSchemaVersion: 9 },
  }
}

/**
 * v9 → v10 (Phase 11) — distinctions individuelles par championnat. Le champ
 * `distinctions` de timeline est optionnel et dérivé à la volée : pas de
 * back-fill, on estampille la version.
 */
function migrateV9toV10(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  return {
    ...raw,
    schemaVersion: 10,
    snapshot: { ...snapshot, saveSchemaVersion: 10 },
  }
}

/**
 * v10 → v11 (Phase 12) — distinctions majeures & records. Champs optionnels
 * (timeline.records, state.records, distinction.tier) dérivés à la volée : pas
 * de back-fill, on estampille la version.
 */
function migrateV10toV11(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  return {
    ...raw,
    schemaVersion: 11,
    snapshot: { ...snapshot, saveSchemaVersion: 11 },
  }
}

/**
 * v11 → v12 (Phase 14) — valorisation visuelle. Ajout d'un champ optionnel
 * `level` sur les entrées de timeline (niveau de fin de saison). Non
 * reconstituable pour les anciennes saisons → pas de back-fill, on estampille.
 */
function migrateV11toV12(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot = asRecord(raw.snapshot)
  return {
    ...raw,
    schemaVersion: 12,
    snapshot: { ...snapshot, saveSchemaVersion: 12 },
  }
}

const migrations: Record<number, Migrator> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
  3: migrateV3toV4,
  4: migrateV4toV5,
  5: migrateV5toV6,
  6: migrateV6toV7,
  7: migrateV7toV8,
  8: migrateV8toV9,
  9: migrateV9toV10,
  10: migrateV10toV11,
  11: migrateV11toV12,
}

function readSchemaVersion(raw: unknown): number {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Sauvegarde invalide : objet attendu.')
  }
  const data = raw as Record<string, unknown>
  const version = data.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error('Sauvegarde invalide : schemaVersion manquant.')
  }
  return version
}

export type MigrateResult =
  | { ok: true; package: CareerSavePackage }
  | { ok: false; reason: string; raw: unknown }

export function tryMigrateCareerSave(raw: unknown): MigrateResult {
  try {
    return { ok: true, package: migrateCareerSave(raw) }
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Migration impossible',
      raw,
    }
  }
}

export function migrateCareerSave(raw: unknown): CareerSavePackage {
  let version = readSchemaVersion(raw)
  assertSaveSchemaVersion(version)

  let current = raw as Record<string, unknown>

  while (version < SAVE_SCHEMA_VERSION) {
    const migrate = migrations[version]
    if (!migrate) {
      throw new Error(`Migration manquante pour le schéma v${version}.`)
    }
    current = migrate(current)
    version += 1
    current.schemaVersion = version
  }

  const parsed = careerSavePackageSchema.parse(current)
  return parsed as CareerSavePackage
}
