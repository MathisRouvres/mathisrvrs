/** Lecture du dernier snapshot pokstats du club : public/poker-club.php (clé en en-tête). */

import type { ClubSnapshot } from './club'

export interface SnapshotResponse {
  snapshot: ClubSnapshot | null
  importedAt?: string
}

export type PokerErrorKind = 'invalid-key' | 'not-configured' | 'network'

export class PokerError extends Error {
  readonly kind: PokerErrorKind

  constructor(kind: PokerErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

const ENDPOINT = '/poker-club.php'

export async function fetchSnapshot(key: string, signal?: AbortSignal): Promise<SnapshotResponse> {
  let response: Response
  try {
    response = await fetch(`${ENDPOINT}?action=snapshot`, { headers: { 'X-Club-Key': key }, signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new PokerError('network', 'Serveur injoignable.')
  }

  const body = (await response.json().catch(() => null)) as (SnapshotResponse & { error?: string; message?: string }) | null
  if (response.ok && body && 'snapshot' in body) return body
  if (response.status === 403) throw new PokerError('invalid-key', 'Clé incorrecte.')
  if (body?.error === 'not-configured') throw new PokerError('not-configured', body.message ?? 'Pas encore configuré.')
  throw new PokerError('network', body?.message ?? `Le serveur a répondu ${response.status}.`)
}
