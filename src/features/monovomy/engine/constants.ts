/** Constantes de règles MonoVomy — Étape 0 (cadrage). */

export const DIFFICULTY_IDS = ['facile', 'inter', 'difficile', 'hardcore'] as const
export type DifficultyId = (typeof DIFFICULTY_IDS)[number]

/** Multiplicateur de gorgées appliqué à chaque événement (voir GDD §6). */
export const DIFFICULTY_MULTIPLIER: Record<DifficultyId, number> = {
  facile: 1,
  inter: 2,
  difficile: 3,
  hardcore: 4,
}

export const DIFFICULTY_LABELS: Record<DifficultyId, string> = {
  facile: 'Facile',
  inter: 'Intermédiaire',
  difficile: 'Difficile',
  hardcore: 'Hardcore',
}

export const DURATION_MINUTES = [30, 60, 90] as const
export type DurationMinutes = (typeof DURATION_MINUTES)[number]

/** Règles de faillite au choix de l’hôte (voir GDD §8). */
export const BANKRUPTCY_RULES = ['none', 'classic', 'last_hunt'] as const
export type BankruptcyRule = (typeof BANKRUPTCY_RULES)[number]

/** Mode de boisson choisi par chaque joueur (voir GDD §6). */
export const DRINK_MODES = ['alcohol', 'soft'] as const
export type DrinkMode = (typeof DRINK_MODES)[number]

/** Économie de base — valeurs provisoires, à équilibrer par simulation. */
export const STARTING_CASH = 1500
export const SALARY_PER_LAP = 200
/**
 * @deprecated Le moteur ne suppose plus une taille de plateau fixe.
 * Utiliser `boardSize(map)` (`content/maps/navigation`). Conservé comme
 * référence historique du plateau classique.
 */
export const BOARD_SIZE = 40
export const PLAYER_MIN = 3
export const PLAYER_MAX = 8

/** Faillite : capital de relance (preset « none ») et pénalité de gorgées. */
export const RESCUE_CAPITAL = 300
export const BANKRUPTCY_PENALTY_SIPS = 5

/** Prison (voir GDD §3). Réelle depuis la Phase 5. */
export const JAIL_MAX_TURNS = 3
export const JAIL_BAIL = 50
/** Gorgées de base « pour payer sa caution » (× multiplicateur du niveau). */
export const JAIL_BAIL_SIPS = 1

/** Timer de tour : durées proposées (secondes). `null` = illimité. */
export const TURN_SECONDS_OPTIONS = [20, 30, 45, null] as const
export type TurnSecondsOption = (typeof TURN_SECONDS_OPTIONS)[number]
/** Alerte visuelle sur les N dernières secondes du tour. */
export const TURN_ALERT_SECONDS = 5

/** Équité de départ : compensation d’ordre (voir Phase 5). */
export const DEFAULT_COMPENSATION_STEP = 20

/** Raison de fin de partie. */
export const END_REASONS = ['timer', 'last_standing', 'host'] as const
export type EndReason = (typeof END_REASONS)[number]

/** Directeur d’ambiance (Phase 8). Niveaux d’intensité, du plus calme au plus chaud. */
export const PARTY_INTENSITIES = ['warmup', 'party', 'chaos', 'finale'] as const
export type PartyIntensity = (typeof PARTY_INTENSITIES)[number]

/** Seuils de score (0..1+) pour le passage de niveau (voir ambiance.ts). */
export const INTENSITY_THRESHOLDS = { party: 0.32, chaos: 0.6, finale: 0.85 } as const
/** Fraction de temps écoulé forçant la finale. */
export const FINALE_PROGRESS = 0.85
/** Bonus de score par difficulté (l’ambiance monte plus vite en hardcore). */
export const INTENSITY_DIFFICULTY_BONUS: Record<DifficultyId, number> = {
  facile: 0,
  inter: 0.05,
  difficile: 0.1,
  hardcore: 0.15,
}

/** Modération : intervalle mini entre deux rappels d’hydratation (ms). */
export const HYDRATION_INTERVAL_MS = 8 * 60_000
/** Séquence de sanctions symboliques déclenchant un rappel. */
export const SANCTION_STREAK_REMINDER = 6

/** Marché Noir (Phase 12). Taux de change de la maison : 1 gorgée = 50 €. */
export const SIPS_TO_CASH = 50
/** Cartes de marché détenues simultanément par un joueur. */
export const MARKET_MAX_CARDS = 3
/** Cartes proposées à la vente en permanence sur la case Marché Noir. */
export const MARKET_STOCK_SIZE = 3
/** Gorgées maximum transférées par une Procuration. */
export const PROXY_MAX_SIPS = 4
/** Gorgées maximum encaissées par un Bâillon avant qu'il ne tombe. */
export const GAG_MAX_SIPS = 5
/** Annonces de marché conservées dans l'état (les plus récentes). */
export const MARKET_LOG_MAX = 8

/** Négociation / échanges (Phase 7). */
export const TRADE_TTL_MS = 20_000
/** Nombre max d’offres conservées dans l’état (les plus récentes). */
export const TRADE_MAX_KEPT = 24
/** Valeur indicative d’un jeton « sortie de prison » pour l’estimation d’équilibre. */
export const JAIL_CARD_TRADE_VALUE = 50
/** Seuil (€) au-delà duquel un échange est jugé avantageux / risqué (indicatif). */
export const TRADE_BALANCE_THRESHOLD = 60
