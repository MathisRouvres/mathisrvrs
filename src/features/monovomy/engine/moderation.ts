import type { PartyIntensity } from './constants'
import { HYDRATION_INTERVAL_MS, SANCTION_STREAK_REMINDER } from './constants'

/**
 * Modération & hydratation (Phase 8) — rappels intelligents, jamais imposés.
 *
 * Fonction PURE : décide s’il faut afficher un rappel selon le temps écoulé, une
 * séquence de sanctions symboliques, le passage au niveau Chaos, ou l’approche de
 * la finale. L’UI se charge de ne jamais interrompre une transaction critique.
 */

export type ReminderKind = 'hydration' | 'streak' | 'chaos' | 'pre_finale'

export interface ReminderContext {
  now: number
  lastReminderAt: number
  sanctionStreak: number
  prevIntensity: PartyIntensity
  intensity: PartyIntensity
}

export interface Reminder {
  kind: ReminderKind
  text: string
}

const TEXT: Record<ReminderKind, string> = {
  hydration: '💧 Pense à boire un verre d’eau — hydrate-toi entre les tours.',
  streak: '💧 Belle série ! Un verre d’eau et on repart, à consommer avec modération.',
  chaos: '🔥 Ça chauffe (niveau Chaos) — hydrate-toi, bois avec modération, le mode soft reste dispo.',
  pre_finale: '🏁 Bientôt la finale — un verre d’eau, et rappelle-toi : le mode soft est toujours possible.',
}

/** Retourne le rappel à afficher (priorité aux transitions), ou `null`. */
export function evaluateReminder(ctx: ReminderContext): Reminder | null {
  if (ctx.prevIntensity !== 'chaos' && ctx.intensity === 'chaos') return { kind: 'chaos', text: TEXT.chaos }
  if (ctx.prevIntensity !== 'finale' && ctx.intensity === 'finale') return { kind: 'pre_finale', text: TEXT.pre_finale }
  if (ctx.sanctionStreak >= SANCTION_STREAK_REMINDER) return { kind: 'streak', text: TEXT.streak }
  if (ctx.now - ctx.lastReminderAt >= HYDRATION_INTERVAL_MS) return { kind: 'hydration', text: TEXT.hydration }
  return null
}
