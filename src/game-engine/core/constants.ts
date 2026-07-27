/** Versions figées du moteur / contenu / schéma de sauvegarde. */

export const ENGINE_VERSION = '1.11.0'
export const CONTENT_VERSION = '1.11.0'
/** Version du format de persistance locale (migrations). */
export const SAVE_SCHEMA_VERSION = 12

export const STAT_MIN = 1
export const STAT_MAX = 99
export const RELATION_MIN = 0
export const RELATION_MAX = 100
export const RESOURCE_MIN = 0
export const RESOURCE_MAX = 100
export const HIDDEN_MIN = 1
export const HIDDEN_MAX = 99

export const DEFAULT_START_AGE = 16
export const DEFAULT_START_SEASON = 1
/** Année de référence calendrier fictionnel pour dériver l’âge. */
export const SEASON_CALENDAR_YEAR = 2026

export const GAME_MODES = ['express', 'standard', 'immersion'] as const
export const CAREER_STATUSES = [
  'active',
  'paused',
  'finished',
  'abandoned',
] as const

export const DIFFICULTIES = ['story', 'balanced', 'demanding'] as const
export const CAREER_LENGTHS = ['short', 'standard', 'long'] as const
export const STRONG_FEET = ['left', 'right', 'both'] as const

export const CLUB_STATUSES = [
  'academy',
  'bench',
  'rotation',
  'starter',
  'key_player',
] as const

/** Niveaux de vie (Phase 2) — pilotent les dépenses. */
export const LIFESTYLE_IDS = [
  'modeste',
  'confortable',
  'luxueux',
  'extravagant',
] as const

/** Secteurs de sponsors fictifs (Phase 3). */
export const SPONSOR_SECTORS = [
  'equipement',
  'technologie',
  'automobile',
  'mode',
  'alimentation',
  'media',
  'sport',
  'application',
  'marque_locale',
  'association',
] as const

/** Profils d'agent (Phase 3). */
export const AGENT_PROFILE_IDS = [
  'prudent',
  'agressif',
  'loyal',
  'connecte',
  'mediatique',
  'opportuniste',
  'specialiste_jeunes',
  'specialiste_fins',
] as const

export const SEASON_LOOP_PHASES = [
  'awaiting_dilemma_1',
  'awaiting_dilemma_2',
  'ready_for_bilan',
  'showing_bilan',
] as const

export const MACRO_POSITION_IDS = [
  'gk',
  'defender',
  'midfielder',
  'attacker',
] as const

export const DILEMMAS_PER_SEASON = 2

export const CAREER_STAGES = [
  'creation',
  'centre_formation',
  'contrat_espoir',
  'debuts_professionnels',
  'progression',
  'apogee',
  'declin',
  'fin_contrat',
  'retraite',
  'carriere_terminee',
] as const

export const PROGRESSION_LABELS = [
  'exceptionnelle',
  'forte',
  'positive',
  'stable',
  'regression',
  'blessure',
  'sans_temps_de_jeu',
] as const

export const CAREER_LENGTH_SEASONS: Record<
  (typeof CAREER_LENGTHS)[number],
  number
> = {
  short: 10,
  standard: 15,
  long: 20,
}

export const STORAGE_ROOT_KEY = 'mathisrvrs.career.v1'

export const SPORT_STAT_IDS = [
  'technique',
  'controle',
  'passe',
  'vision',
  'tir',
  'finition',
  'dribble',
  'vitesse',
  'endurance',
  'puissance',
  'defense',
  'placement',
  'tactique',
  'sangFroid',
  'leadership',
] as const

export const RESOURCE_IDS = [
  'forme',
  'moral',
  'fatigue',
  'sante',
  'confianceEntraineur',
  'cohesionVestiaire',
  'reputationSportive',
  'popularite',
  'discipline',
  'bienEtre',
  'financesPersonnelles',
] as const

export const HIDDEN_TRAIT_IDS = [
  'potentiel',
  'professionnalisme',
  'constance',
  'fragilitePhysique',
  'grandsMatchs',
  'adaptabilite',
  'ambition',
  'loyaute',
  'resistancePression',
] as const

/** Stats UI express (0–100 sauf argent). */
export const VISIBLE_STAT_IDS = [
  'niveau',
  'forme',
  'sante',
  'mental',
  'reputation',
  'confianceCoach',
  'discipline',
  'argent',
] as const
