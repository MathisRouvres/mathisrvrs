import type { Envelope, RoomChannel } from './transport'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

/**
 * Canal temps réel via Supabase Realtime (broadcast). Une room = un channel.
 * Nécessite `@supabase/supabase-js` (npm i) et les variables d’environnement
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Le SDK est importé dynamiquement
 * pour ne pas alourdir le bundle du mode local.
 */
export async function createSupabaseChannel(
  config: SupabaseConfig,
  roomCode: string,
  clientId: string,
): Promise<RoomChannel> {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(config.url, config.anonKey, {
    realtime: { params: { eventsPerSecond: 20 } },
  })
  const channel = client.channel(`monovomy:${roomCode}`, {
    config: { broadcast: { self: false } },
  })

  let handler: ((env: Envelope) => void) | null = null

  channel.on('broadcast', { event: 'env' }, (payload) => {
    const env = payload.payload as Envelope
    if (handler) handler(env)
  })

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve()
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(new Error(`Supabase channel: ${status}`))
      }
    })
  })

  return {
    clientId,
    publish(env) {
      void channel.send({ type: 'broadcast', event: 'env', payload: env })
    },
    subscribe(next) {
      handler = next
      return () => {
        handler = null
      }
    },
    close() {
      handler = null
      void client.removeChannel(channel)
    },
  }
}
