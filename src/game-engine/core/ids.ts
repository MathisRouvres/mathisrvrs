/** Identifiants stables côté client (pas de crypto secret). */

export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  const rand = Math.floor(Math.random() * 1e9).toString(36)
  const time = Date.now().toString(36)
  return `${prefix}_${time}_${rand}`
}

export function createSeed(): string {
  return createId('seed')
}

export function nowIso(): string {
  return new Date().toISOString()
}
