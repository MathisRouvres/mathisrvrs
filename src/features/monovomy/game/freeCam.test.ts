import { describe, expect, it, beforeEach, vi } from 'vitest'

/**
 * Caméra libre : préférence locale, jamais transmise à la partie. Ce qui compte
 * ici, c'est qu'elle survive au rechargement, qu'elle prévienne les vues ouvertes
 * (bouton du plateau et ligne des réglages doivent rester d'accord) et qu'elle
 * reste silencieuse si le stockage est refusé — navigation privée, cookies bloqués.
 */
type Store = Record<string, string>

function installEnv(store: Store, broken = false) {
  const listeners: Record<string, ((e: CustomEvent) => void)[]> = {}
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => {
        if (broken) throw new Error('stockage refusé')
        return k in store ? store[k] : null
      },
      setItem: (k: string, v: string) => {
        if (broken) throw new Error('stockage refusé')
        store[k] = v
      },
    },
    window: {
      addEventListener: (t: string, fn: (e: CustomEvent) => void) => {
        (listeners[t] ??= []).push(fn)
      },
      removeEventListener: () => {},
      dispatchEvent: (e: CustomEvent) => {
        for (const fn of listeners[e.type] ?? []) fn(e)
        return true
      },
    },
    CustomEvent: class {
      type: string
      detail: unknown
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type
        this.detail = init?.detail
      }
    },
  })
  return listeners
}

async function load() {
  vi.resetModules()
  return import('./freeCam.js')
}

describe('freeCam', () => {
  let store: Store

  beforeEach(() => {
    store = {}
  })

  it('est désactivée par défaut — la mise en scène reste la norme', async () => {
    installEnv(store)
    const { readFreeCam } = await load()
    expect(readFreeCam()).toBe(false)
  })

  it('persiste le choix entre deux chargements', async () => {
    installEnv(store)
    const { setFreeCam } = await load()
    setFreeCam(true)
    expect(store.mv_freecam).toBe('1')

    installEnv(store)
    const rechargé = await load()
    expect(rechargé.readFreeCam()).toBe(true)

    rechargé.setFreeCam(false)
    expect(rechargé.readFreeCam()).toBe(false)
  })

  it('prévient les vues déjà ouvertes', async () => {
    const listeners = installEnv(store)
    const { setFreeCam } = await load()
    const vues: boolean[] = []
    ;(globalThis.window as unknown as Window).addEventListener(
      'mv-freecam-change',
      ((e: CustomEvent) => vues.push(Boolean(e.detail))) as EventListener,
    )
    setFreeCam(true)
    setFreeCam(false)
    expect(vues).toEqual([true, false])
    expect(listeners['mv-freecam-change']).toHaveLength(1)
  })

  it('reste silencieuse si le stockage est refusé', async () => {
    installEnv(store, true)
    const { readFreeCam, setFreeCam } = await load()
    expect(readFreeCam()).toBe(false)
    expect(() => setFreeCam(true)).not.toThrow()
  })
})
