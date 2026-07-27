import {
  SAVE_SCHEMA_VERSION,
  STORAGE_ROOT_KEY,
  createCareerPackage,
  createCareer,
  createPlayerCareerPackage,
  isCareerReadOnly,
  migrateCareerSave,
  tryMigrateCareerSave,
  nowIso,
  type CareerIndexEntry,
  type CareerSavePackage,
  type CreateCareerInput,
  type ExpressCareerInput,
  type LocalCareerDatabase,
  type PlayerCreationDraft,
  type UserAchievementRecord,
  type UserUnlockRecord,
} from '../../../game-engine'

function emptyDatabase(): LocalCareerDatabase {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    runs: [],
    packages: {},
    achievements: [],
    unlocks: [],
    pendingAccountLinks: [],
  }
}

function toIndexEntry(
  pkg: CareerSavePackage,
  extras: Partial<CareerIndexEntry> = {},
): CareerIndexEntry {
  return {
    id: pkg.snapshot.id,
    displayName: pkg.playerProfile.displayName,
    mode: pkg.snapshot.mode,
    status: pkg.snapshot.status,
    ownerId: pkg.snapshot.ownerId,
    updatedAt: pkg.snapshot.updatedAt,
    seasonIndex: pkg.snapshot.seasonIndex,
    age: pkg.snapshot.age,
    legacyScore: pkg.snapshot.legacyScore,
    readOnly: isCareerReadOnly(pkg.snapshot),
    ...extras,
  }
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * Store local hybride :
 * - snapshot dans packages[id].snapshot (career_runs + player_profiles)
 * - journal append-only (career_events / decisions / seasons)
 * - achievements / unlocks
 *
 * Les écritures multi-champs passent par `withTransaction` (tout-ou-rien mémoire → 1 write).
 */
export class LocalCareerStore {
  private readonly storage: StorageLike
  private readonly key: string
  private writeChain: Promise<void> = Promise.resolve()

  constructor(storage: StorageLike = localStorage, key = STORAGE_ROOT_KEY) {
    this.storage = storage
    this.key = key
  }

  private readDb(): LocalCareerDatabase {
    const raw = this.storage.getItem(this.key)
    if (!raw) return emptyDatabase()
    try {
      const parsed = JSON.parse(raw) as LocalCareerDatabase
      if (!parsed || typeof parsed !== 'object') return emptyDatabase()
      return {
        ...emptyDatabase(),
        ...parsed,
        packages: parsed.packages ?? {},
        runs: parsed.runs ?? [],
        achievements: parsed.achievements ?? [],
        unlocks: parsed.unlocks ?? [],
        pendingAccountLinks: parsed.pendingAccountLinks ?? [],
      }
    } catch {
      throw new Error('Base locale corrompue : impossible de lire les carrières.')
    }
  }

  private writeDb(db: LocalCareerDatabase): void {
    this.storage.setItem(this.key, JSON.stringify(db))
  }

  /**
   * Sérialise les transactions pour éviter les courses
   * (ex. autosave + save manuel + résolution).
   */
  async withTransaction<T>(
    fn: (db: LocalCareerDatabase) => T | Promise<T>,
  ): Promise<T> {
    const run = this.writeChain.then(async () => {
      const db = this.readDb()
      const draft: LocalCareerDatabase = structuredClone(db)
      const result = await fn(draft)
      this.writeDb(draft)
      return result
    })

    this.writeChain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  listCareers(): CareerIndexEntry[] {
    const db = this.readDb()
    const entries: CareerIndexEntry[] = []
    for (const run of db.runs) {
      const raw = db.packages[run.id]
      if (!raw) {
        entries.push({ ...run, legacy: true, legacyReason: 'Paquet manquant' })
        continue
      }
      const result = tryMigrateCareerSave(raw)
      if (result.ok) {
        entries.push(toIndexEntry(result.package))
      } else {
        entries.push({
          ...run,
          legacy: true,
          legacyReason: result.reason,
          readOnly: true,
        })
      }
    }
    return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  getCareer(id: string): CareerSavePackage | null {
    const db = this.readDb()
    const raw = db.packages[id]
    if (!raw) return null
    const result = tryMigrateCareerSave(raw)
    if (!result.ok) return null
    return result.package
  }

  /** Indique si une sauvegarde est classée legacy (non migrable). */
  getLegacyReason(id: string): string | null {
    const db = this.readDb()
    const raw = db.packages[id]
    if (!raw) return 'Introuvable'
    const result = tryMigrateCareerSave(raw)
    return result.ok ? null : result.reason
  }

  async createCareer(input: CreateCareerInput = {}): Promise<CareerSavePackage> {
    return this.withTransaction((db) => {
      const pkg = createCareerPackage(input)
      db.packages[pkg.snapshot.id] = pkg
      db.runs = [
        toIndexEntry(pkg),
        ...db.runs.filter((r) => r.id !== pkg.snapshot.id),
      ]
      return pkg
    })
  }

  /** Nouvelle API Phase 4 bis — pays + poste. */
  async createExpressCareer(
    input: ExpressCareerInput,
  ): Promise<CareerSavePackage> {
    return this.withTransaction((db) => {
      const pkg = createCareer(input)
      db.packages[pkg.snapshot.id] = pkg
      db.runs = [
        toIndexEntry(pkg),
        ...db.runs.filter((r) => r.id !== pkg.snapshot.id),
      ]
      return pkg
    })
  }

  async createPlayerCareer(
    draft: PlayerCreationDraft,
  ): Promise<CareerSavePackage> {
    return this.withTransaction((db) => {
      const pkg = createPlayerCareerPackage(draft)
      db.packages[pkg.snapshot.id] = pkg
      db.runs = [
        toIndexEntry(pkg),
        ...db.runs.filter((r) => r.id !== pkg.snapshot.id),
      ]
      return pkg
    })
  }

  async saveCareer(pkg: CareerSavePackage): Promise<CareerSavePackage> {
    return this.withTransaction((db) => {
      const migrated = migrateCareerSave(pkg)
      const existing = db.packages[migrated.snapshot.id]
      if (existing && isCareerReadOnly(existing.snapshot)) {
        throw new Error('Impossible de modifier une carrière terminée (lecture seule).')
      }
      if (isCareerReadOnly(migrated.snapshot) === false && existing) {
        // Garantit l’append-only des décisions déjà persistées.
        const prevDecisions = existing.journal.decisions
        const nextDecisions = migrated.journal.decisions
        for (let i = 0; i < prevDecisions.length; i += 1) {
          const prev = prevDecisions[i]
          const next = nextDecisions[i]
          if (!prev) break
          if (!next || next.id !== prev.id) {
            throw new Error(
              'Violation append-only : une décision passée a été altérée ou réordonnée.',
            )
          }
          if (JSON.stringify(next) !== JSON.stringify(prev)) {
            throw new Error(
              'Violation append-only : une décision enregistrée ne peut pas être modifiée.',
            )
          }
        }
      }

      const stamped: CareerSavePackage = {
        ...migrated,
        snapshot: {
          ...migrated.snapshot,
          updatedAt: nowIso(),
        },
      }
      db.packages[stamped.snapshot.id] = stamped
      db.runs = [
        toIndexEntry(stamped),
        ...db.runs.filter((r) => r.id !== stamped.snapshot.id),
      ]
      return stamped
    })
  }

  async deleteCareer(id: string): Promise<void> {
    await this.withTransaction((db) => {
      delete db.packages[id]
      db.runs = db.runs.filter((r) => r.id !== id)
      db.pendingAccountLinks = db.pendingAccountLinks.filter(
        (l) => l.careerId !== id,
      )
    })
  }

  async queueAccountLink(careerId: string): Promise<void> {
    await this.withTransaction((db) => {
      if (!db.packages[careerId]) {
        throw new Error('Carrière introuvable.')
      }
      if (db.pendingAccountLinks.some((l) => l.careerId === careerId)) return
      db.pendingAccountLinks.push({
        careerId,
        createdAt: nowIso(),
      })
    })
  }

  /**
   * Rattache une carrière invitée à un propriétaire.
   * (Auth réelle = phases futures ; API prête côté store.)
   */
  async attachOwner(careerId: string, ownerId: string): Promise<CareerSavePackage> {
    return this.withTransaction((db) => {
      const pkg = db.packages[careerId]
      if (!pkg) throw new Error('Carrière introuvable.')
      const migrated = migrateCareerSave(pkg)
      if (migrated.snapshot.ownerId && migrated.snapshot.ownerId !== ownerId) {
        throw new Error('Cette carrière appartient déjà à un autre compte.')
      }
      const next: CareerSavePackage = {
        ...migrated,
        snapshot: {
          ...migrated.snapshot,
          ownerId,
          updatedAt: nowIso(),
          state: {
            ...migrated.snapshot.state,
            flags: {
              ...migrated.snapshot.state.flags,
              guest: false,
            },
          },
        },
      }
      db.packages[careerId] = next
      db.runs = [
        toIndexEntry(next),
        ...db.runs.filter((r) => r.id !== careerId),
      ]
      db.pendingAccountLinks = db.pendingAccountLinks.filter(
        (l) => l.careerId !== careerId,
      )
      return next
    })
  }

  listAchievements(ownerKey: string): UserAchievementRecord[] {
    return this.readDb().achievements.filter((a) => a.ownerKey === ownerKey)
  }

  listUnlocks(ownerKey: string): UserUnlockRecord[] {
    return this.readDb().unlocks.filter((u) => u.ownerKey === ownerKey)
  }
}

let defaultStore: LocalCareerStore | null = null

export function getLocalCareerStore(): LocalCareerStore {
  if (!defaultStore) {
    defaultStore = new LocalCareerStore()
  }
  return defaultStore
}

/** Test helper */
export function resetLocalCareerStoreForTests(): void {
  defaultStore = null
}
