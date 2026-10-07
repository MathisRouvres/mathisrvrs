/**
 * État partagé d'une partie à plusieurs téléphones : un dictionnaire de
 * registres « dernière écriture gagnante » (LWW). Chaque valeur porte un
 * horodatage de Lamport départagé par l'identifiant du téléphone : deux
 * téléphones qui reçoivent les mêmes écritures, dans n'importe quel ordre,
 * aboutissent au même état. Pas d'hôte : la partie survit au départ de
 * n'importe qui.
 *
 * Les données reçues viennent des autres téléphones : elles sont validées ici
 * (forme, tailles) puis de nouveau par chaque jeu (`parse` de useSessionState).
 */
import { MAX_NAME_LENGTH, isGuessWhoCode, normalizeCode, randomCode } from '../engine'
import { PARTY_BASE_PATH } from '../paths'

/** [horloge de Lamport, identifiant du téléphone]. Horloge 0 = valeur initiale proposée. */
export type Stamp = [number, string]

export interface Entry {
  v: unknown
  s: Stamp
}

export type Doc = Record<string, Entry>

export const MAX_KEY_LENGTH = 160
/** Au-delà, un message est ignoré : une partie réelle reste très en dessous. */
export const MAX_PAYLOAD_CHARS = 200_000
const MAX_CLIENT_ID_LENGTH = 40

/** Codes de 4 caractères sans I, O, 0 ni 1, comme Qui est-ce ?. */
export const newRoomCode = randomCode
export const normalizeRoomCode = normalizeCode
export const isRoomCode = isGuessWhoCode

/** Lien d'invitation : ouvre l'accueil des jeux avec le code prérempli. */
export function inviteLink(origin: string, code: string): string {
  return `${origin}${PARTY_BASE_PATH}?room=${code}`
}

export function randomClientId(rng: () => number = Math.random): string {
  return Array.from({ length: 12 }, () => Math.floor(rng() * 36).toString(36)).join('')
}

export function isClientId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_CLIENT_ID_LENGTH && /^[a-z0-9]+$/.test(value)
}

/** `a` l'emporte sur `b` (horloge, puis identifiant à égalité). */
export function newer(a: Stamp, b: Stamp): boolean {
  return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])
}

function isStamp(value: unknown): value is Stamp {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isSafeInteger(value[0]) &&
    value[0] >= 0 &&
    isClientId(value[1])
  )
}

function isEntry(value: unknown): value is Entry {
  return !!value && typeof value === 'object' && 'v' in value && isStamp((value as Entry).s)
}

/** Entrées reçues d'un autre téléphone, réduites à celles qui ont une forme valide. */
export function sanitizeEntries(raw: unknown): Doc {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Doc = {}
  for (const [key, entry] of Object.entries(raw)) {
    if (key.length > MAX_KEY_LENGTH || key === '__proto__' || !isEntry(entry)) continue
    out[key] = { v: entry.v, s: [entry.s[0], entry.s[1]] }
  }
  return out
}

/**
 * Fusionne `incoming` dans `doc` (sans le muter). Renvoie le nouveau document,
 * les clés modifiées et la plus grande horloge vue.
 */
export function mergeDoc(doc: Doc, incoming: Doc): { doc: Doc; changed: string[]; clock: number } {
  let next = doc
  const changed: string[] = []
  let clock = 0
  for (const [key, entry] of Object.entries(incoming)) {
    clock = Math.max(clock, entry.s[0])
    const current = doc[key]
    if (current && !newer(entry.s, current.s)) continue
    if (next === doc) next = { ...doc }
    next[key] = entry
    changed.push(key)
  }
  return { doc: next, changed, clock }
}

/* ------------------------------------------------------------------ */
/* Membres et joueurs                                                  */
/* ------------------------------------------------------------------ */

export const MEMBER_PREFIX = 'm/'
export const GUESTS_KEY = 'meta/guests'
export const ROUTE_KEY = 'meta/route'
export const LEVEL_KEY = 'meta/level'

export interface MemberInfo {
  name: string
  /** Heure d'arrivée (horloge du téléphone) : ordre stable des joueurs. */
  at: number
  /** Connecté sans jouer (meneur du Loup-Garou, retiré de la liste…). */
  spectator?: boolean
}

export interface Member extends MemberInfo {
  id: string
}

export function cleanName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH) : ''
}

function isMemberInfo(value: unknown): value is MemberInfo {
  if (!value || typeof value !== 'object') return false
  const v = value as MemberInfo
  return cleanName(v.name).length > 0 && Number.isFinite(v.at)
}

/** Téléphones inscrits (ceux qui ont quitté la partie sont exclus), par ordre d'arrivée. */
export function membersOf(doc: Doc): Member[] {
  const out: Member[] = []
  for (const [key, entry] of Object.entries(doc)) {
    if (!key.startsWith(MEMBER_PREFIX) || !isMemberInfo(entry.v)) continue
    out.push({
      id: key.slice(MEMBER_PREFIX.length),
      name: cleanName(entry.v.name),
      at: entry.v.at,
      spectator: entry.v.spectator === true,
    })
  }
  return out.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1))
}

/** Joueurs sans téléphone, ajoutés à la main. */
export function guestsOf(doc: Doc): string[] {
  const raw = doc[GUESTS_KEY]?.v
  return Array.isArray(raw) ? raw.map(cleanName).filter(Boolean) : []
}

/**
 * Liste des joueurs commune à tous les téléphones : les membres puis les
 * invités, sans doublon de prénom (un second « Léa » devient « Léa 2 »).
 */
export function playersOf(
  members: readonly Member[],
  guests: readonly string[],
  max: number,
): { players: string[]; names: Record<string, string> } {
  const taken = new Set<string>()
  const names: Record<string, string> = {}
  const unique = (name: string) => {
    let candidate = name
    for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${name.slice(0, MAX_NAME_LENGTH - 3)} ${n}`
    taken.add(candidate.toLowerCase())
    return candidate
  }
  const players: string[] = []
  for (const m of members) {
    const name = unique(m.name)
    names[m.id] = name
    if (!m.spectator) players.push(name)
  }
  for (const g of guests) players.push(unique(g))
  return { players: players.slice(0, max), names }
}
