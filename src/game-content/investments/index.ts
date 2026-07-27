/**
 * Investissements narratifs simples (Phase 3). Jamais d'argent réel ; aucune
 * mécanique de pari, casino ou loot box : coût fixe, échéance connue, issue
 * résolue par les effets retardés du dilemme (rendement ou perte).
 */
export interface InvestmentDefinition {
  id: string
  label: string
  sector: string
  /** Coût à l'engagement. */
  cost: number
  /** Durée avant échéance (saisons). */
  durationSeasons: number
  /** Risque 0 (sûr) → 1 (spéculatif) : probabilité d'échec. */
  risk: number
  /** Rendement potentiel à l'échéance (fraction du coût). */
  potentialReturn: number
  /** Effet réputationnel possible (0 = neutre). */
  reputationEffect: number
  narrative: string
}

export const investmentCatalog: InvestmentDefinition[] = [
  {
    id: 'epargne_securisee',
    label: 'Épargne sécurisée',
    sector: 'epargne',
    cost: 20_000,
    durationSeasons: 2,
    risk: 0.02,
    potentialReturn: 0.15,
    reputationEffect: 0,
    narrative: 'Un placement prudent, faible rendement mais sans surprise.',
  },
  {
    id: 'immobilier',
    label: 'Bien immobilier',
    sector: 'immobilier',
    cost: 90_000,
    durationSeasons: 4,
    risk: 0.15,
    potentialReturn: 0.45,
    reputationEffect: 0,
    narrative: 'Une pierre solide qui prend de la valeur avec le temps.',
  },
  {
    id: 'entreprise_locale',
    label: 'Entreprise locale',
    sector: 'entreprise',
    cost: 50_000,
    durationSeasons: 3,
    risk: 0.35,
    potentialReturn: 0.6,
    reputationEffect: 3,
    narrative: 'Soutenir un commerce du coin — utile à l’image locale.',
  },
  {
    id: 'restauration',
    label: 'Restaurant',
    sector: 'restauration',
    cost: 60_000,
    durationSeasons: 3,
    risk: 0.45,
    potentialReturn: 0.7,
    reputationEffect: 2,
    narrative: 'Un restaurant à ton nom : visible, mais capricieux.',
  },
  {
    id: 'technologie',
    label: 'Start-up tech',
    sector: 'technologie',
    cost: 40_000,
    durationSeasons: 3,
    risk: 0.6,
    potentialReturn: 1.2,
    reputationEffect: 0,
    narrative: 'Une jeune pousse prometteuse — gros gain ou gros échec.',
  },
  {
    id: 'centre_sportif',
    label: 'Centre sportif',
    sector: 'sport',
    cost: 120_000,
    durationSeasons: 4,
    risk: 0.3,
    potentialReturn: 0.8,
    reputationEffect: 5,
    narrative: 'Un complexe sportif qui construit ton héritage local.',
  },
  {
    id: 'club_amateur',
    label: 'Club amateur',
    sector: 'sport',
    cost: 70_000,
    durationSeasons: 4,
    risk: 0.5,
    potentialReturn: 0.5,
    reputationEffect: 6,
    narrative: 'Reprendre le club de tes débuts — le cœur plus que le portefeuille.',
  },
  {
    id: 'projet_familial',
    label: 'Projet familial',
    sector: 'famille',
    cost: 30_000,
    durationSeasons: 2,
    risk: 0.4,
    potentialReturn: 0.3,
    reputationEffect: 0,
    narrative: 'Aider un proche à lancer son affaire.',
  },
  {
    id: 'projet_speculatif',
    label: 'Projet spéculatif',
    sector: 'speculatif',
    cost: 45_000,
    durationSeasons: 2,
    risk: 0.8,
    potentialReturn: 1.6,
    reputationEffect: 0,
    narrative: 'Un pari risqué au rendement alléchant — souvent un mirage.',
  },
]

const byId = new Map<string, InvestmentDefinition>(
  investmentCatalog.map((i) => [i.id, i]),
)

export function getInvestmentById(id: string): InvestmentDefinition | undefined {
  return byId.get(id)
}

export function listInvestments(): InvestmentDefinition[] {
  return investmentCatalog
}
