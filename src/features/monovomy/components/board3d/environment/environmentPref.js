import { useCallback, useEffect, useState } from 'react'
import { BOARD_ENVIRONMENTS, DEFAULT_ENVIRONMENT_ID, isEnvironmentId } from './environmentPresets'

/**
 * Décor du plateau — préférence de CONFORT, propre à l'appareil, comme la caméra
 * libre dont ce module est le miroir.
 *
 * Elle n'entre PAS dans l'état déterministe : le moteur, le PRNG et le réseau
 * ne la voient jamais. Deux joueurs d'une même partie peuvent regarder deux
 * décors différents, la partie reste identique bit pour bit.
 *
 * Le jour où l'hôte choisira le décor depuis le lobby, il suffira de passer
 * `environmentId` en prop à <MvBoard3D> : la préférence locale ne sert alors
 * plus que de repli. C'est pourquoi la lecture est déjà exposée séparément du
 * hook.
 */
const KEY = 'mv_env'
const EVENT = 'mv-env-change'

/** Identifiant courant, toujours valide (repli sur le club privé). */
export function readEnvironmentId() {
  try {
    const raw = localStorage.getItem(KEY)
    return isEnvironmentId(raw) ? raw : DEFAULT_ENVIRONMENT_ID
  } catch {
    return DEFAULT_ENVIRONMENT_ID
  }
}

export function setEnvironmentId(id) {
  const next = isEnvironmentId(id) ? id : DEFAULT_ENVIRONMENT_ID
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  }
  return next
}

/** Passe au décor suivant dans l'ordre de `BOARD_ENVIRONMENTS`. */
export function cycleEnvironmentId() {
  const current = readEnvironmentId()
  const i = BOARD_ENVIRONMENTS.findIndex((p) => p.id === current)
  const next = BOARD_ENVIRONMENTS[(i + 1) % BOARD_ENVIRONMENTS.length]
  return setEnvironmentId(next.id)
}

/** Hook réactif : le plateau et la ligne des réglages restent d'accord. */
export function useEnvironmentId() {
  const [id, setId] = useState(readEnvironmentId)

  useEffect(() => {
    const onChange = (e) => setId(isEnvironmentId(e.detail) ? e.detail : DEFAULT_ENVIRONMENT_ID)
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const cycle = useCallback(() => cycleEnvironmentId(), [])
  const select = useCallback((next) => setEnvironmentId(next), [])
  return { id, cycle, select }
}
