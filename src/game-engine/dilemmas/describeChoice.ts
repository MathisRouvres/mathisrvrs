import type { SportStatId, ResourceId, RelationshipId } from '../types/career'
import { SPORT_STAT_LABELS } from '../core/playerCreationTypes'
import type {
  ChoiceStance,
  DilemmaChoiceDefinition,
  DilemmaEffect,
} from './types'

/**
 * Description qualitative d'un choix pour la carte de décision (§8).
 *
 * Règles produit :
 * - jamais de probabilité ni de valeur exacte : uniquement un niveau 1–3 ;
 * - on montre le potentiel (gains/pertes possibles), pas le résultat garanti ;
 * - les effets cachés (traits) et les drapeaux ne sont PAS révélés (surprise) ;
 * - un skillCheck expose son `onSuccess` comme gain potentiel et son `onFail`
 *   comme risque potentiel — c'est littéralement le pari proposé.
 */

export type OutcomeLevel = 1 | 2 | 3

export interface ChoiceOutcome {
  /** Libellé lisible (ex. « Réputation », « Confiance du coach »). */
  label: string
  /** Intensité qualitative 1–3 (faible / modéré / élevé). */
  level: OutcomeLevel
}

export interface ChoiceDescription {
  stance: ChoiceStance
  strategyLabel: string
  /** Famille visuelle (couleur) — ambitieux/collectif/médiatique/prudent. */
  tone: 'ambitious' | 'collective' | 'media' | 'steady'
  /** Détail par stat — NON affiché (indication volontairement cachée). */
  rewards: ChoiceOutcome[]
  risks: ChoiceOutcome[]
  /**
   * Indication RELATIVE agrégée 0–4 (négligeable → très élevé). Seule
   * information montrée au joueur : l'ampleur globale, jamais le détail exact.
   */
  rewardLevel: number
  riskLevel: number
  riskPreview: string
}

/** Niveau global 0–4 à partir du cumul des ampleurs (coarse, volontairement flou). */
function aggregateLevel(levels: number[]): number {
  const sum = levels.reduce((acc, l) => acc + l, 0)
  if (sum <= 0) return 0
  if (sum <= 2) return 1
  if (sum <= 4) return 2
  if (sum <= 6) return 3
  return 4
}

export const STANCE_LABELS: Record<ChoiceStance, string> = {
  prudent: 'Prudent',
  ambitious: 'Ambitieux',
  loyal: 'Loyal',
  individualist: 'Individualiste',
  financial: 'Financier',
  emotional: 'Émotionnel',
  ethical: 'Éthique',
  high_risk: 'Haut risque',
  collective: 'Collectif',
  professional: 'Professionnel',
  media_savvy: 'Médiatique',
  resilient: 'Résilient',
}

const STANCE_TONES: Record<ChoiceStance, ChoiceDescription['tone']> = {
  prudent: 'steady',
  ambitious: 'ambitious',
  loyal: 'collective',
  individualist: 'media',
  financial: 'steady',
  emotional: 'media',
  ethical: 'collective',
  high_risk: 'ambitious',
  collective: 'collective',
  professional: 'steady',
  media_savvy: 'media',
  resilient: 'ambitious',
}

const RESOURCE_LABELS: Partial<Record<ResourceId, string>> = {
  forme: 'Forme',
  moral: 'Moral',
  fatigue: 'Fatigue',
  sante: 'Santé',
  confianceEntraineur: 'Confiance du coach',
  cohesionVestiaire: 'Cohésion du vestiaire',
  reputationSportive: 'Réputation',
  popularite: 'Visibilité médiatique',
  discipline: 'Discipline',
  bienEtre: 'Bien-être',
  financesPersonnelles: 'Finances',
}

const RELATION_LABELS: Partial<Record<RelationshipId, string>> = {
  coach: 'Relation avec le coach',
  teammates: 'Vestiaire',
  family: 'Proches',
  friends: 'Amis',
  partner: 'Vie privée',
  media: 'Médias',
  fans: 'Public',
  sponsors: 'Sponsors',
}

function labelForTarget(effect: Extract<DilemmaEffect, { type: 'delta' }>): string | null {
  const t = effect.target
  switch (t.kind) {
    case 'stat':
      return SPORT_STAT_LABELS[t.id as SportStatId] ?? null
    case 'resource':
      return RESOURCE_LABELS[t.id] ?? null
    case 'relation':
      return RELATION_LABELS[t.id] ?? null
    case 'cash':
      return 'Argent'
    // 'hidden' (traits) et 'flag' : jamais révélés.
    default:
      return null
  }
}

function levelFromMagnitude(target: string, magnitude: number): OutcomeLevel {
  // Le cash est sur une autre échelle — on le ramène en niveaux « ressenti ».
  const m = target === 'cash' ? magnitude / 1000 : magnitude
  if (m >= 8) return 3
  if (m >= 4) return 2
  return 1
}

/** Ajoute un résultat à la liste en fusionnant par libellé (niveau max). */
function push(list: Map<string, OutcomeLevel>, label: string, level: OutcomeLevel): void {
  const prev = list.get(label)
  if (prev === undefined || level > prev) list.set(label, level)
}

/**
 * Parcourt un effet (récursivement pour skillCheck/chance) et range chaque
 * variation dans « rewards » (positif) ou « risks » (négatif).
 */
function collect(
  effect: DilemmaEffect,
  rewards: Map<string, OutcomeLevel>,
  risks: Map<string, OutcomeLevel>,
): void {
  switch (effect.type) {
    case 'delta': {
      const label = labelForTarget(effect)
      if (!label || effect.delta === 0) return
      const targetKind = effect.target.kind
      const level = levelFromMagnitude(targetKind, Math.abs(effect.delta))
      // Ressources « inversées » : une hausse est un désavantage (fatigue).
      const inverted =
        effect.target.kind === 'resource' && effect.target.id === 'fatigue'
      const positive = inverted ? effect.delta < 0 : effect.delta > 0
      if (positive) push(rewards, label, level)
      else push(risks, label, level)
      return
    }
    case 'skillCheck': {
      // Le pari : les deux branches sont des issues possibles, rangées par
      // signe (gain positif → récompense, perte négative → risque).
      for (const e of effect.onSuccess) collect(e, rewards, risks)
      for (const e of effect.onFail) collect(e, rewards, risks)
      return
    }
    case 'chance': {
      for (const e of effect.effects) collect(e, rewards, risks)
      return
    }
    default:
      // setFlag / removeFlag / narrativeDebt / queueEvent : non révélés.
      return
  }
}

function toSortedList(map: Map<string, OutcomeLevel>, max = 3): ChoiceOutcome[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([label, level]) => ({ label, level }))
}

/**
 * Construit la description qualitative d'un choix (gains/risques potentiels).
 * Seuls les effets `immediate` sont considérés — les conséquences retardées ou
 * cachées restent une surprise.
 */
export function describeChoiceOutcomes(
  choice: DilemmaChoiceDefinition,
): ChoiceDescription {
  const rewards = new Map<string, OutcomeLevel>()
  const risks = new Map<string, OutcomeLevel>()
  for (const effect of choice.immediate) collect(effect, rewards, risks)

  const rewardList = toSortedList(rewards)
  const riskList = toSortedList(risks)

  return {
    stance: choice.stance,
    strategyLabel: STANCE_LABELS[choice.stance] ?? choice.stance,
    tone: STANCE_TONES[choice.stance] ?? 'steady',
    rewards: rewardList,
    risks: riskList,
    rewardLevel: aggregateLevel([...rewards.values()]),
    riskLevel: aggregateLevel([...risks.values()]),
    riskPreview: choice.riskPreview,
  }
}
