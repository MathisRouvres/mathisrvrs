import type { Snapshot } from './session'
import type { SupabaseConfig } from './supabaseTransport'

/**
 * Persistance des snapshots (Phase 9) — permet de recharger la page sans perdre
 * la partie et de récupérer le dernier snapshot confirmé lors d’une migration.
 * Abstraction : implémentation mémoire (dev/tests) ou Supabase (prod).
 */
export interface SnapshotStore {
  save(roomCode: string, snapshot: Snapshot): Promise<void>
  load(roomCode: string): Promise<Snapshot | null>
}

/** Store en mémoire (tests / repli). Non partagé entre appareils. */
export function createMemorySnapshotStore(): SnapshotStore {
  const map = new Map<string, Snapshot>()
  return {
    async save(roomCode, snapshot) {
      map.set(roomCode, snapshot)
    },
    async load(roomCode) {
      return map.get(roomCode) ?? null
    },
  }
}

/**
 * Store Supabase (best-effort). Table `mv_snapshots(room_code text pk,
 * snapshot jsonb, host_epoch int, snapshot_version int, updated_at timestamptz)`.
 * Le SDK est importé dynamiquement ; toute erreur réseau est absorbée (le jeu
 * reste jouable via le canal Realtime même si la persistance échoue).
 */
export function createSupabaseSnapshotStore(config: SupabaseConfig): SnapshotStore {
  // Typage volontairement souple : le SDK est optionnel et importé dynamiquement.
  let clientPromise: Promise<{ from: (t: string) => any }> | null = null
  const getClient = async () => {
    if (!clientPromise) {
      clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(config.url, config.anonKey) as unknown as { from: (t: string) => any },
      )
    }
    return clientPromise
  }

  return {
    async save(roomCode, snapshot) {
      try {
        const client = await getClient()
        await client.from('mv_snapshots').upsert({
          room_code: roomCode,
          snapshot,
          host_epoch: snapshot.hostEpoch,
          snapshot_version: snapshot.snapshotVersion,
          updated_at: new Date(snapshot.updatedAt).toISOString(),
        })
      } catch {
        // best-effort : la persistance ne doit jamais bloquer la partie
      }
    },
    async load(roomCode) {
      try {
        const client = await getClient()
        const { data } = await client.from('mv_snapshots').select('snapshot').eq('room_code', roomCode).maybeSingle()
        return (data?.snapshot as Snapshot | undefined) ?? null
      } catch {
        return null
      }
    },
  }
}
