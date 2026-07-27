/**
 * Aides d'affichage pures (couleurs, libellés, icônes). Aucune logique de
 * moteur : uniquement de la présentation dérivée de données déjà validées.
 */

/** Hash déterministe simple (djb2) → entier positif. */
function hashString(input) {
  let hash = 5381
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return hash >>> 0
}

/** Numéro de maillot fictif stable (1–30) dérivé du nom. */
export function squadNumber(name) {
  return (hashString(name || 'joueur') % 30) + 1
}

/** Teinte de club fictive stable (dégradé de la carte héros). */
const CLUB_ACCENTS = [
  '#2b7a55',
  '#1f6f8b',
  '#8a5a2b',
  '#6d4d8f',
  '#2f6f4f',
  '#b0602f',
]

export function clubAccent(key) {
  const idx = hashString(key || 'club') % CLUB_ACCENTS.length
  return CLUB_ACCENTS[idx]
}

/** Delta signé lisible (« +3 », « -2 », « stable »). */
export function deltaText(n) {
  if (!n) return 'stable'
  return n > 0 ? `+${n}` : `${n}`
}

export function deltaTone(n) {
  if (!n) return 'flat'
  return n > 0 ? 'up' : 'down'
}

/** Qualification contextuelle de la santé (§4). */
export function healthQualifier(v) {
  if (v >= 85) return 'Excellente'
  if (v >= 70) return 'Bonne'
  if (v >= 50) return 'Correcte'
  if (v >= 30) return 'Fragile'
  return 'Critique'
}

/** Qualification de la réputation (§4). */
export function reputationQualifier(v) {
  if (v >= 82) return 'Star mondiale'
  if (v >= 68) return 'Renommée internationale'
  if (v >= 52) return 'Connu nationalement'
  if (v >= 32) return 'Connu localement'
  if (v >= 16) return 'Encore discret'
  return 'Inconnu'
}

/** Qualification du niveau (§4). */
export function levelQualifier(v) {
  if (v >= 85) return 'Classe mondiale'
  if (v >= 72) return 'Haut niveau'
  if (v >= 58) return 'Solide'
  if (v >= 44) return 'En développement'
  return 'Prometteur'
}

/** Fraction 0–1 pour l'anneau « âge » (fenêtre 16 → 40). */
export function ageRingFraction(age) {
  return Math.max(0, Math.min(1, (age - 15) / 24))
}

/** Couleur d'anneau selon la santé (rouge si critique). */
export function healthRingColor(v) {
  if (v >= 55) return 'var(--cg-lime)'
  if (v >= 30) return 'var(--cg-signal)'
  return 'var(--cg-danger)'
}

/** Catégorie de dilemme → libellé + icône. */
const CATEGORY_META = {
  training: { label: 'Entraînement', icon: '🏋️' },
  match: { label: 'Pression sportive', icon: '⚽' },
  coach: { label: 'Relation coach', icon: '📋' },
  teammates: { label: 'Vestiaire', icon: '🤝' },
  rivalry: { label: 'Rivalité', icon: '⚔️' },
  transfer: { label: 'Mercato', icon: '✈️' },
  contract: { label: 'Contrat', icon: '📝' },
  agent: { label: 'Agent', icon: '💼' },
  media: { label: 'Médias', icon: '🎤' },
  fans: { label: 'Public', icon: '📣' },
  sponsors: { label: 'Sponsors', icon: '🤝' },
  family: { label: 'Vie privée', icon: '🏠' },
  lifestyle: { label: 'Hygiène de vie', icon: '🌙' },
  injury: { label: 'Blessure', icon: '🩹' },
  mental: { label: 'Mental', icon: '🧠' },
  money: { label: 'Argent', icon: '💰' },
  national_team: { label: 'Sélection', icon: '🏴' },
  career_end: { label: 'Fin de carrière', icon: '🎬' },
  narrative_chain: { label: 'Tournant', icon: '🔀' },
}

export function categoryMeta(category) {
  return CATEGORY_META[category] ?? { label: 'Décision', icon: '🎯' }
}

/** Icône de trajectoire (§11). */
const TRAJECTORY_ICONS = {
  debut: '🌱',
  rapide: '🚀',
  reguliere: '📈',
  stable: '➖',
  sommet: '⭐',
  difficile: '⚠️',
  declin: '📉',
}

export function trajectoryIcon(id) {
  return TRAJECTORY_ICONS[id] ?? '📈'
}

const VISIBLE_DELTA_LABELS = {
  niveau: 'Niveau',
  forme: 'Forme',
  sante: 'Santé',
  mental: 'Mental',
  reputation: 'Réputation',
  confianceCoach: 'Confiance coach',
  discipline: 'Discipline',
  argent: 'Argent',
}

/** Variation visible formatée (« Niveau +2 », « Argent -1 000 € »). */
export function formatVisibleDelta(id, delta) {
  const value =
    id === 'argent'
      ? `${delta > 0 ? '+' : '-'}${new Intl.NumberFormat('fr-FR').format(Math.abs(delta))} €`
      : `${delta > 0 ? '+' : ''}${delta}`
  return `${VISIBLE_DELTA_LABELS[id] ?? id} ${value}`
}

const MONEY_FORMAT = new Intl.NumberFormat('fr-FR')

/** Montant compact en euros (« 1,2 M€ », « 340 k€ »). */
export function formatMoney(value) {
  const n = Math.round(Number(value) || 0)
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} M€`
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1_000)} k€`
  return `${sign}${MONEY_FORMAT.format(abs)} €`
}

/** Salaire hebdomadaire formaté. */
export function formatWage(weeklyWage) {
  const n = Math.round(Number(weeklyWage) || 0)
  if (n <= 0) return 'Non professionnel'
  return `${formatMoney(n)}/sem.`
}

/** Variation financière annuelle signée (« +340 k€ »). */
export function formatAnnualDelta(delta) {
  const n = Math.round(Number(delta) || 0)
  return `${n > 0 ? '+' : ''}${formatMoney(n)}`
}

/** Durée de contrat lisible (« 2 saisons », « dernière année »). */
export function formatContractRemaining(seasonsRemaining) {
  if (seasonsRemaining == null) return 'Sans contrat'
  if (seasonsRemaining <= 0) return 'Contrat expiré'
  if (seasonsRemaining === 1) return 'Dernière année'
  return `${seasonsRemaining} saisons`
}

/** Libellés de statut au club (présentation). */
const CLUB_STATUS_LABELS = {
  academy: 'Centre de formation',
  bench: 'Banc',
  rotation: 'Rotation',
  starter: 'Titulaire',
  key_player: 'Joueur clé',
}

export function clubStatusLabel(id) {
  return CLUB_STATUS_LABELS[id] ?? id
}

const LIFESTYLE_LABELS = {
  modeste: 'Modeste',
  confortable: 'Confortable',
  luxueux: 'Luxueux',
  extravagant: 'Extravagant',
}

export function lifestyleLabel(id) {
  return LIFESTYLE_LABELS[id] ?? 'Modeste'
}

/** Rang de progression d'un palier de carrière (montée seulement). */
const STAGE_RANK = {
  creation: 0,
  centre_formation: 1,
  contrat_espoir: 2,
  debuts_professionnels: 3,
  progression: 4,
  apogee: 5,
  declin: 3,
  fin_contrat: 2,
  retraite: 1,
  carriere_terminee: 0,
}

const STAGE_MILESTONES = {
  contrat_espoir: {
    icon: '✍️',
    title: 'Premier contrat espoir',
    text: 'Le club croit en toi : ton premier vrai contrat est signé.',
  },
  debuts_professionnels: {
    icon: '⚽',
    title: 'Tu passes pro',
    text: 'Tu t’installes peu à peu dans le groupe professionnel.',
  },
  progression: {
    icon: '📈',
    title: 'Tu montes en puissance',
    text: 'Ton nom commence à circuler dans le championnat.',
  },
  apogee: {
    icon: '⭐',
    title: 'Au sommet de ton art',
    text: 'Tu entres dans les meilleures années de ta carrière.',
  },
}

/**
 * Palier franchi (§9) — renvoie une présentation spéciale uniquement lors d'une
 * vraie montée vers un palier notable, sinon null (rare et valorisé).
 */
export function stageMilestone(beforeStage, afterStage) {
  if (!afterStage || beforeStage === afterStage) return null
  const before = STAGE_RANK[beforeStage] ?? 0
  const after = STAGE_RANK[afterStage] ?? 0
  if (after <= before) return null
  return STAGE_MILESTONES[afterStage] ?? null
}
