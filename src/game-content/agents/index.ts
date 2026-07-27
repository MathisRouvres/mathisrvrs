import type { NpcPersonality } from '../../game-engine/types/career'
import { AGENT_PROFILE_IDS } from '../../game-engine/core/constants'

export type AgentProfileId = (typeof AGENT_PROFILE_IDS)[number]

/**
 * Profil d'agent (Phase 3). Chaque profil influence offres, salaires,
 * commissions, transferts, sponsors, relations club et pression médiatique.
 * Un agent n'agit pas toujours dans l'intérêt parfait du joueur : `narrativeRisks`
 * + `loyalty` faible traduisent ce décalage.
 */
export interface AgentProfile {
  id: AgentProfileId
  label: string
  /** Personnalité PNJ associée (réutilise le système existant). */
  personality: NpcPersonality
  /** Commission de base (fraction des revenus contractuels). */
  commissionRate: number
  /** Poussée sur la négociation salariale (ajoutée à la concurrence, -0.1..+0.3). */
  wageInfluence: number
  /** Multiplicateur sur la rémunération/prestige des sponsors (0.8..1.4). */
  sponsorInfluence: number
  /** Propension à provoquer des transferts (0..1). */
  transferInfluence: number
  /** Pression médiatique induite (0..1). */
  mediaPressure: number
  /** Loyauté envers le joueur (0..100). */
  loyalty: number
  /** Influence dans le milieu (0..100). */
  influence: number
  advantages: string[]
  drawbacks: string[]
  objectives: string[]
  narrativeRisks: string[]
}

export const agentProfiles: AgentProfile[] = [
  {
    id: 'prudent',
    label: 'Agent prudent',
    personality: 'paternel',
    commissionRate: 0.05,
    wageInfluence: -0.05,
    sponsorInfluence: 0.9,
    transferInfluence: 0.15,
    mediaPressure: 0.15,
    loyalty: 78,
    influence: 45,
    advantages: ['Contrats sûrs', 'Peu de risques', 'Commission basse'],
    drawbacks: ['Salaires sous le marché', 'Rate les gros coups'],
    objectives: ['Stabilité', 'Longévité'],
    narrativeRisks: ['Occasion manquée d’un grand club'],
  },
  {
    id: 'agressif',
    label: 'Agent agressif',
    personality: 'exigeant',
    commissionRate: 0.1,
    wageInfluence: 0.25,
    sponsorInfluence: 1.1,
    transferInfluence: 0.55,
    mediaPressure: 0.45,
    loyalty: 42,
    influence: 70,
    advantages: ['Salaires maximisés', 'Négociateur redouté'],
    drawbacks: ['Commission élevée', 'Tensions avec les clubs'],
    objectives: ['Maximiser les gains', 'Transferts fréquents'],
    narrativeRisks: ['Relation club dégradée', 'Départ forcé mal vécu'],
  },
  {
    id: 'loyal',
    label: 'Agent loyal',
    personality: 'loyal',
    commissionRate: 0.05,
    wageInfluence: 0.05,
    sponsorInfluence: 1.0,
    transferInfluence: 0.2,
    mediaPressure: 0.2,
    loyalty: 90,
    influence: 50,
    advantages: ['Intérêt du joueur d’abord', 'Confiance durable'],
    drawbacks: ['Réseau limité', 'Peu de flair spéculatif'],
    objectives: ['Servir le joueur', 'Contrats équilibrés'],
    narrativeRisks: ['Manque d’ambition sur les sommets'],
  },
  {
    id: 'connecte',
    label: 'Agent connecté',
    personality: 'calculateur',
    commissionRate: 0.08,
    wageInfluence: 0.15,
    sponsorInfluence: 1.25,
    transferInfluence: 0.45,
    mediaPressure: 0.35,
    loyalty: 55,
    influence: 88,
    advantages: ['Réseau clubs immense', 'Ouvre des portes', 'Bons sponsors'],
    drawbacks: ['Commission moyenne-haute', 'Beaucoup de dossiers en parallèle'],
    objectives: ['Placer au meilleur club', 'Étendre le réseau'],
    narrativeRisks: ['Joueur relégué au second plan du portefeuille'],
  },
  {
    id: 'mediatique',
    label: 'Agent médiatique',
    personality: 'ambitieux',
    commissionRate: 0.09,
    wageInfluence: 0.12,
    sponsorInfluence: 1.4,
    transferInfluence: 0.35,
    mediaPressure: 0.8,
    loyalty: 48,
    influence: 82,
    advantages: ['Sponsors premium', 'Notoriété dopée'],
    drawbacks: ['Forte exposition', 'Vie privée exposée'],
    objectives: ['Construire une marque', 'Maximiser le commercial'],
    narrativeRisks: ['Tempête médiatique', 'Image écornée par un scandale'],
  },
  {
    id: 'opportuniste',
    label: 'Agent opportuniste',
    personality: 'cynique',
    commissionRate: 0.11,
    wageInfluence: 0.2,
    sponsorInfluence: 1.15,
    transferInfluence: 0.6,
    mediaPressure: 0.5,
    loyalty: 30,
    influence: 66,
    advantages: ['Saisit chaque occasion', 'Gros salaires ponctuels'],
    drawbacks: ['Commission la plus élevée', 'Loyauté faible'],
    objectives: ['Sa propre marge', 'Transferts lucratifs'],
    narrativeRisks: ['Conflit d’intérêts', 'Deal contre l’intérêt du joueur'],
  },
  {
    id: 'specialiste_jeunes',
    label: 'Spécialiste des jeunes',
    personality: 'idealiste',
    commissionRate: 0.06,
    wageInfluence: 0.08,
    sponsorInfluence: 1.05,
    transferInfluence: 0.3,
    mediaPressure: 0.25,
    loyalty: 72,
    influence: 58,
    advantages: ['Excellent pour percer jeune', 'Temps de jeu garanti'],
    drawbacks: ['Moins pertinent en fin de carrière'],
    objectives: ['Développer le talent', 'Trouver le bon club formateur'],
    narrativeRisks: ['Départ précipité pour tester plus grand'],
  },
  {
    id: 'specialiste_fins',
    label: 'Spécialiste des fins de carrière',
    personality: 'calculateur',
    commissionRate: 0.07,
    wageInfluence: 0.1,
    sponsorInfluence: 1.1,
    transferInfluence: 0.4,
    mediaPressure: 0.3,
    loyalty: 68,
    influence: 60,
    advantages: ['Derniers gros contrats', 'Reconversion préparée'],
    drawbacks: ['Peu utile aux débuts', 'Vise le court terme'],
    objectives: ['Optimiser les dernières saisons', 'Sécuriser l’après-carrière'],
    narrativeRisks: ['Pousse à un dernier transfert hasardeux'],
  },
]

const byId = new Map<string, AgentProfile>(agentProfiles.map((a) => [a.id, a]))

export const DEFAULT_AGENT_PROFILE_ID: AgentProfileId = 'loyal'

/** Profil d'agent par id — retombe sur « loyal » si inconnu/absent. */
export function getAgentProfile(id: string | null | undefined): AgentProfile {
  return (id && byId.get(id)) || byId.get(DEFAULT_AGENT_PROFILE_ID)!
}

export function listAgentProfiles(): AgentProfile[] {
  return agentProfiles
}
