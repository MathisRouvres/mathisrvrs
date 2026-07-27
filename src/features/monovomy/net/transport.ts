import type { ClientMessage, ServerMessage } from './protocol'

/** Enveloppe transportée sur le canal partagé de la room. */
export type Envelope =
  | { kind: 'client'; from: string; msg: ClientMessage }
  | { kind: 'server'; from: string; msg: ServerMessage }

/**
 * Canal d’une room : tout le monde publie et s’abonne au même flux.
 * Implémenté par le loopback (tests/dev) et par Supabase Realtime (prod).
 */
export interface RoomChannel {
  readonly clientId: string
  publish(env: Envelope): void
  subscribe(handler: (env: Envelope) => void): () => void
  close(): void
}

/** Hub en mémoire simulant plusieurs pairs (tests, sans réseau). */
export function createLoopbackHub() {
  const handlers = new Map<string, (env: Envelope) => void>()

  function connect(clientId: string): RoomChannel {
    return {
      clientId,
      publish(env) {
        for (const [id, handler] of handlers) {
          if (id !== clientId) handler(env)
        }
      },
      subscribe(handler) {
        handlers.set(clientId, handler)
        return () => {
          if (handlers.get(clientId) === handler) handlers.delete(clientId)
        }
      },
      close() {
        handlers.delete(clientId)
      },
    }
  }

  return { connect }
}
