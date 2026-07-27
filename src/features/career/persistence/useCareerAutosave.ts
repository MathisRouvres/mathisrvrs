import { useEffect, useRef } from 'react'
import type { CareerSavePackage } from '../../../game-engine'
import { isCareerReadOnly } from '../../../game-engine'
import type { LocalCareerStore } from './localCareerStore'

const DEFAULT_DELAY_MS = 1200

/**
 * Autosave debounced d’un paquet de carrière.
 * Ignore les carrières lecture seule.
 */
export function useCareerAutosave(
  store: LocalCareerStore,
  pkg: CareerSavePackage | null,
  options?: {
    delayMs?: number
    enabled?: boolean
    onSaved?: (pkg: CareerSavePackage) => void
    onError?: (error: Error) => void
  },
): void {
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS
  const enabled = options?.enabled ?? true
  const onSavedRef = useRef(options?.onSaved)
  const onErrorRef = useRef(options?.onError)
  onSavedRef.current = options?.onSaved
  onErrorRef.current = options?.onError

  useEffect(() => {
    if (!enabled || !pkg || isCareerReadOnly(pkg.snapshot)) return undefined

    const timer = window.setTimeout(() => {
      store
        .saveCareer(pkg)
        .then((saved) => onSavedRef.current?.(saved))
        .catch((err: unknown) => {
          onErrorRef.current?.(
            err instanceof Error ? err : new Error('Échec autosave'),
          )
        })
    }, delayMs)

    return () => window.clearTimeout(timer)
  }, [store, pkg, delayMs, enabled])

  useEffect(() => {
    if (!enabled || !pkg || isCareerReadOnly(pkg.snapshot)) return undefined

    const flush = () => {
      try {
        void store.saveCareer(pkg)
      } catch {
        // best-effort on unload
      }
    }

    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [store, pkg, enabled])
}
