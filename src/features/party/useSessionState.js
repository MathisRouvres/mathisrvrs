import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { readGameState, writeGameField } from './session'
import { SessionContext } from './sessionContext'
import { RoomContext, useRoomPrefix, useRoomValue } from './room/hooks'

/** Même type que la valeur initiale (nombre, texte, booléen, tableau). */
function sameShape(saved, initial) {
  if (Array.isArray(initial)) return Array.isArray(saved) ? saved : undefined
  if (initial === null || typeof initial === 'object') return undefined
  return typeof saved === typeof initial ? saved : undefined
}

/** Clé partagée d'un champ de jeu dans la partie à plusieurs téléphones. */
export function roomKey(scope, field) {
  return `g/${scope.slug}/${scope.level}/${field}`
}

/** Valeur partagée validée comme une sauvegarde, sinon `fallback`. */
function readShared(parse, value, fallback) {
  if (value === undefined) return fallback
  // `live` : l'état vient d'un autre téléphone, pas d'un rechargement ; un
  // chrono en cours reste en cours.
  const parsed = parse(value, fallback, { live: true })
  return parsed === undefined ? fallback : parsed
}

/**
 * `useState` sauvegardé dans la session du navigateur. `parse(saved, initial)`
 * valide la valeur relue et renvoie `undefined` pour la refuser : on repart
 * alors de la valeur initiale. Hors `SessionScope`, simple `useState`.
 *
 * Dans une partie à plusieurs téléphones, la valeur est partagée : tous les
 * téléphones voient la même et chacun peut la changer. `{ shared: false }`
 * la garde propre à ce téléphone (camp choisi, écran caché…).
 */
export function useSessionState(field, initial, parse = sameShape, { shared = true } = {}) {
  const scope = useContext(SessionContext)
  const room = useContext(RoomContext)
  const key = room && scope && shared ? roomKey(scope, field) : null

  const [local, setLocal] = useState(() => {
    const init = typeof initial === 'function' ? initial() : initial
    if (!scope || key) return init
    const saved = readGameState(scope.slug, scope.level)
    if (!saved || !(field in saved)) return init
    const parsed = parse(saved[field], init)
    return parsed === undefined ? init : parsed
  })

  // Rien n'est écrit tant que rien n'a bougé : ouvrir un jeu sans y jouer ne
  // crée pas de « partie en cours ».
  const mountValue = useRef(local)
  const changed = useRef(false)
  useEffect(() => {
    if (!changed.current && local === mountValue.current) return
    changed.current = true
    if (scope && !key) writeGameField(scope.slug, scope.level, field, local)
  }, [scope, key, field, local])

  // Partie partagée : tant que la valeur manque, on propose la nôtre
  // (départagée de la même façon sur tous les téléphones).
  const raw = useRoomValue(room, key)
  useEffect(() => {
    if (key && room.get(key) === undefined) room.init(key, local)
  }, [room, key, local])

  const parseRef = useRef(parse)
  useEffect(() => {
    parseRef.current = parse
  })
  const setShared = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(readShared(parseRef.current, room.get(key), local)) : next
      room.set(key, resolved)
    },
    [room, key, local],
  )

  if (!key) return [local, setLocal]
  return [readShared(parse, raw, local), setShared]
}

/**
 * Réponses individuelles (votes, « j'ai vu mon rôle »…) dans une partie à
 * plusieurs téléphones : une valeur par joueur, sans conflit entre téléphones.
 * Renvoie `[réponses par prénom, répondre(valeur | null, prénom?)]` ; hors partie, `{}`.
 */
export function useSessionVotes(field, myName) {
  const scope = useContext(SessionContext)
  const room = useContext(RoomContext)
  const prefix = room && scope ? `${roomKey(scope, field)}/` : null
  const votes = useRoomPrefix(room, prefix)
  // `name` : répondre pour un joueur sans téléphone, depuis celui qu'on lui passe.
  const cast = useCallback(
    (value, name = myName) => {
      if (prefix && name) room.set(`${prefix}${name}`, value)
    },
    [room, prefix, myName],
  )
  return [votes, cast]
}

/* Validateurs courants, au format attendu par `parse`. */

/**
 * Valeur parmi une liste ; `remap` convertit un état transitoire (chrono en
 * cours…) relu après un rechargement. Venu d'un autre téléphone (`live`),
 * l'état transitoire est gardé tel quel.
 */
export const oneOf =
  (values, remap = {}) =>
  (saved, _initial, { live = false } = {}) => {
    if (typeof saved === 'string' && Object.hasOwn(remap, saved)) return live ? saved : remap[saved]
    return values.includes(saved) ? saved : undefined
  }

export const when = (test) => (saved) => (test(saved) ? saved : undefined)
