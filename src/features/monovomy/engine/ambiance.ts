import type { BoardTheme } from '../content/schema'
import type { GameState } from './types'
import type { PartyIntensity } from './constants'
import {
  FINALE_PROGRESS,
  INTENSITY_DIFFICULTY_BONUS,
  INTENSITY_THRESHOLDS,
  PARTY_INTENSITIES,
} from './constants'
import { cloneState } from './clone'
import { netWorth } from './scoring'

/**
 * Directeur d’ambiance (Phase 8).
 *
 * L’intensité est une valeur AUTORITATIVE stockée dans l’état : l’hôte la recalcule
 * (source unique) puis la diffuse — jamais une horloge locale non synchronisée.
 * `computeIntensity` est pure et déterministe pour un `now` donné ; l’intensité
 * ne fait que MONTER (cliquet), pour une progression visible et sans flip-flop.
 */

export function intensityRank(level: PartyIntensity): number {
  return PARTY_INTENSITIES.indexOf(level)
}

/** Une carte de niveau `cardIntensity` est-elle éligible à l’intensité courante ? */
export function cardAllowedAtIntensity(cardIntensity: PartyIntensity | undefined, current: PartyIntensity): boolean {
  const ci = cardIntensity ? intensityRank(cardIntensity) : 0
  return ci <= intensityRank(current)
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Score d’ambiance (0..~1.15) combinant temps, tours, écart de patrimoine, cartes, difficulté. */
export function intensityScore(state: GameState, board: BoardTheme, now: number): { score: number; progress: number } {
  const alive = state.players.filter((p) => !p.eliminated)
  const progress =
    state.endsAt > state.startedAt && state.startedAt > 0
      ? clamp01((now - state.startedAt) / (state.endsAt - state.startedAt))
      : clamp01(state.turn / 20)

  const turnScore = clamp01(state.turn / 15)
  const cardScore = clamp01(state.cardsPlayed / 25)
  const worths = alive.map((p) => netWorth(state, board, p.id))
  const max = worths.length ? Math.max(...worths) : 0
  const min = worths.length ? Math.min(...worths) : 0
  const gapScore = max > 0 ? clamp01((max - min) / max) : 0
  const diffBonus = INTENSITY_DIFFICULTY_BONUS[state.config.difficulty] ?? 0

  const score = 0.45 * progress + 0.25 * turnScore + 0.15 * cardScore + 0.1 * gapScore + diffBonus
  return { score, progress }
}

/** Niveau d’ambiance cible (déterministe) — ne dépend que de l’état + `now`. */
export function computeIntensity(state: GameState, board: BoardTheme, now: number): PartyIntensity {
  const alive = state.players.filter((p) => !p.eliminated)
  const { score, progress } = intensityScore(state, board, now)
  const nearEnd = progress >= FINALE_PROGRESS
  const fewLeft = state.players.length >= 3 && alive.length <= 2
  if (nearEnd || fewLeft || score >= INTENSITY_THRESHOLDS.finale) return 'finale'
  if (score >= INTENSITY_THRESHOLDS.chaos) return 'chaos'
  if (score >= INTENSITY_THRESHOLDS.party) return 'party'
  return 'warmup'
}

/** Applique le cliquet : l’intensité monte vers la cible, ne redescend jamais. */
export function advanceIntensity(state: GameState, board: BoardTheme, now: number): { state: GameState; changed: boolean } {
  const target = computeIntensity(state, board, now)
  if (intensityRank(target) <= intensityRank(state.partyIntensity)) {
    return { state, changed: false }
  }
  const next = cloneState(state)
  next.partyIntensity = target
  return { state: next, changed: true }
}

// ── Règles temporaires ──────────────────────────────────────────────────────

export interface RuleDuration {
  kind: 'turn' | 'table' | 'minutes'
  value: number
}

/** Définition de règle (structurellement compatible avec `content` TemporaryRule). */
export interface RuleDef {
  id: string
  name: string
  description: string
  duration: RuleDuration
  scope: string
  groupId?: string
  stackingPolicy: 'replace' | 'stack' | 'ignore'
  softVariant: string
}

/** Règle active en jeu : définition + comptabilité d’expiration. */
export interface ActiveRule extends RuleDef {
  activatedStep: number
  /** Étape (`turnStep`) d’expiration pour les durées turn/table ; -1 si non applicable. */
  expiresAtStep: number
  /** Timestamp d’expiration (ms) pour les durées minutes ; 0 sinon. */
  expiresAt: number
}

/**
 * Active une règle temporaire selon sa politique de cumul.
 *  - `replace` : retire toute règle de même id avant d’ajouter.
 *  - `ignore`  : ne fait rien si une règle de même id est déjà active.
 *  - `stack`   : ajoute sans condition.
 */
export function activateRule(state: GameState, def: RuleDef, now: number): { state: GameState; rule: ActiveRule | null } {
  const exists = state.activeRules.some((r) => r.id === def.id)
  if (def.stackingPolicy === 'ignore' && exists) return { state, rule: null }

  const next = cloneState(state)
  if (def.stackingPolicy === 'replace') {
    next.activeRules = next.activeRules.filter((r) => r.id !== def.id)
  }
  const aliveCount = Math.max(1, next.players.filter((p) => !p.eliminated).length)
  let expiresAtStep = -1
  let expiresAt = 0
  if (def.duration.kind === 'turn') expiresAtStep = next.turnStep + def.duration.value
  else if (def.duration.kind === 'table') expiresAtStep = next.turnStep + def.duration.value * aliveCount
  else expiresAt = now + def.duration.value * 60_000

  const rule: ActiveRule = { ...def, activatedStep: next.turnStep, expiresAtStep, expiresAt }
  next.activeRules = [...next.activeRules, rule]
  return { state: next, rule }
}

function ruleExpired(rule: ActiveRule, turnStep: number, now: number): boolean {
  if (rule.expiresAt > 0 && now >= rule.expiresAt) return true
  if (rule.expiresAtStep >= 0 && turnStep >= rule.expiresAtStep) return true
  return false
}

/** Retire les règles échues (tick de l’hôte). */
export function expireRules(state: GameState, now: number): { state: GameState; changed: boolean } {
  const changed = state.activeRules.some((r) => ruleExpired(r, state.turnStep, now))
  if (!changed) return { state, changed: false }
  const next = cloneState(state)
  next.activeRules = next.activeRules.filter((r) => !ruleExpired(r, next.turnStep, now))
  return { state: next, changed: true }
}

/** Tours/étapes restants pour une règle (affichage HUD). -1 pour une durée en minutes. */
export function ruleStepsLeft(rule: ActiveRule, turnStep: number): number {
  return rule.expiresAtStep >= 0 ? Math.max(0, rule.expiresAtStep - turnStep) : -1
}
