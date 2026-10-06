import { useContext, useEffect, useRef, useState } from 'react'
import { readGameState, writeGameField } from './session'
import { SessionContext } from './sessionContext'

/** Même type que la valeur initiale (nombre, texte, booléen, tableau). */
function sameShape(saved, initial) {
  if (Array.isArray(initial)) return Array.isArray(saved) ? saved : undefined
  if (initial === null || typeof initial === 'object') return undefined
  return typeof saved === typeof initial ? saved : undefined
}

/**
 * `useState` sauvegardé dans la session du navigateur. `parse(saved, initial)`
 * valide la valeur relue et renvoie `undefined` pour la refuser : on repart
 * alors de la valeur initiale. Hors `SessionScope`, simple `useState`.
 */
export function useSessionState(field, initial, parse = sameShape) {
  const scope = useContext(SessionContext)
  const [value, setValue] = useState(() => {
    const init = typeof initial === 'function' ? initial() : initial
    if (!scope) return init
    const saved = readGameState(scope.slug, scope.level)
    if (!saved || !(field in saved)) return init
    const parsed = parse(saved[field], init)
    return parsed === undefined ? init : parsed
  })

  // Rien n'est écrit tant que rien n'a bougé : ouvrir un jeu sans y jouer ne
  // crée pas de « partie en cours ».
  const mountValue = useRef(value)
  const changed = useRef(false)
  useEffect(() => {
    if (!changed.current && value === mountValue.current) return
    changed.current = true
    if (scope) writeGameField(scope.slug, scope.level, field, value)
  }, [scope, field, value])

  return [value, setValue]
}

/* Validateurs courants, au format attendu par `parse`. */

/** Valeur parmi une liste ; `remap` convertit un état transitoire (chrono en cours…). */
export const oneOf = (values, remap = {}) => (saved) =>
  typeof saved === 'string' && Object.hasOwn(remap, saved) ? remap[saved] : values.includes(saved) ? saved : undefined

export const when = (test) => (saved) => (test(saved) ? saved : undefined)
