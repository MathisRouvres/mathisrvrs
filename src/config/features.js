/** Feature flags build-time (Vite). */

/**
 * Active la route `/carriere` et le mode carrière.
 * Opt-in explicite : uniquement si VITE_CAREER_GAME_ENABLED === 'true'.
 */
export const CAREER_GAME_ENABLED =
  import.meta.env.VITE_CAREER_GAME_ENABLED === 'true'

/**
 * Active la route `/monovomy` et le jeu MonoVomy.
 * Opt-in explicite : uniquement si VITE_MONOVOMY_ENABLED === 'true'.
 */
export const MONOVOMY_ENABLED =
  import.meta.env.VITE_MONOVOMY_ENABLED === 'true'

/**
 * Active la route `/spin` (ranges poker Spin & Go).
 * Opt-in explicite : uniquement si VITE_SPIN_ENABLED === 'true'.
 */
export const SPIN_ENABLED = import.meta.env.VITE_SPIN_ENABLED === 'true'

/** Configuration Supabase (mode en ligne MonoVomy, Étape 2). */
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
}

/** Le mode en ligne n'est disponible que si Supabase est configuré. */
export const SUPABASE_ENABLED = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey)
