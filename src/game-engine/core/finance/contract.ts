import type {
  CareerState,
  Contract,
  ClubStatusId,
} from '../../types/career'
import { SPORT_STAT_IDS } from '../constants'
import { clamp } from '../clamp'
import { getAgentProfile } from '../../../game-content/agents'
import {
  DEFAULT_AGENT_COMMISSION,
  WEEKS_PER_SEASON,
} from './constants'
import { computeContractWage, type WageFactors } from './salary'

/** Événements de contrat pouvant survenir à la clôture d'une saison. */
export type ContractEventReason =
  | 'first_pro'
  | 'extension'
  | 'renegotiation'
  | 'transfer'

/** Niveau global (moyenne des stats visibles) — évite d'importer visibleStats. */
function overallLevel(state: CareerState): number {
  const sum = SPORT_STAT_IDS.reduce((acc, id) => acc + state.stats[id], 0)
  return Math.round(sum / SPORT_STAT_IDS.length)
}

function nationalTier(state: CareerState): WageFactors['nationalTier'] {
  if (state.flags.national_regular === true) return 'regular'
  if (state.flags.national_capped === true) return 'capped'
  return 'none'
}

/**
 * Construit les facteurs de salaire depuis l'état — uniquement des données déjà
 * présentes dans le moteur (âge, poste, niveau, potentiel, réputation, statut,
 * prestige club, championnat, sélection, agent, fragilité, concurrence).
 */
export function wageFactorsFromState(
  state: CareerState,
  opts: { leagueLevel?: number; competition?: number } = {},
): WageFactors {
  return {
    age: state.age,
    level: overallLevel(state),
    potentiel: state.hiddenTraits.potentiel,
    reputation: state.resources.reputationSportive,
    clubStatus: state.clubStatus,
    clubPrestige: state.competitionLevel,
    leagueLevel: opts.leagueLevel ?? state.competitionLevel,
    nationalTier: nationalTier(state),
    agentQuality: state.npcs.agent.relation,
    fragility: state.hiddenTraits.fragilitePhysique,
    competition: opts.competition ?? 0.3,
  }
}

/** Primes par défaut, dérivées du salaire hebdomadaire. */
export function defaultBonuses(weeklyWage: number): {
  appearanceBonus: number
  startBonus: number
  performanceBonus: number
  trophyBonus: number
  loyaltyBonus: number
} {
  return {
    appearanceBonus: Math.round(weeklyWage * 0.1),
    startBonus: Math.round(weeklyWage * 0.15),
    performanceBonus: Math.round(weeklyWage * 4),
    trophyBonus: Math.round(weeklyWage * 8),
    loyaltyBonus: Math.round(weeklyWage * 12),
  }
}

/**
 * Comble les champs optionnels d'un contrat partiel (compat sauvegardes
 * antérieures et littéraux de test) avec des défauts cohérents.
 */
export function normalizeContract(
  contract: Contract,
  clubId: string | null,
  seasonIndex: number,
): Required<Contract> {
  const weeklyWage = Math.max(0, contract.weeklyWage)
  const bonuses = defaultBonuses(weeklyWage)
  const durationSeasons = Math.max(
    1,
    Math.round(contract.weeksRemaining / WEEKS_PER_SEASON),
  )
  const start = contract.startSeason ?? seasonIndex
  return {
    weeksRemaining: Math.max(0, Math.round(contract.weeksRemaining)),
    weeklyWage,
    clubId: contract.clubId ?? clubId,
    startSeason: start,
    endSeason: contract.endSeason ?? start + durationSeasons,
    signingBonus: contract.signingBonus ?? 0,
    promisedStatus: contract.promisedStatus ?? 'rotation',
    appearanceBonus: contract.appearanceBonus ?? bonuses.appearanceBonus,
    startBonus: contract.startBonus ?? bonuses.startBonus,
    performanceBonus: contract.performanceBonus ?? bonuses.performanceBonus,
    trophyBonus: contract.trophyBonus ?? bonuses.trophyBonus,
    loyaltyBonus: contract.loyaltyBonus ?? bonuses.loyaltyBonus,
    releaseClause: contract.releaseClause ?? null,
    optionYear: contract.optionYear ?? false,
    agentCommissionRate: contract.agentCommissionRate ?? DEFAULT_AGENT_COMMISSION,
    narrativePromises: contract.narrativePromises ?? [],
  }
}

/**
 * Commission agent effective : base du profil (Phase 3), légèrement réduite par
 * une bonne relation. Bornée pour rester réaliste.
 */
function agentCommissionRate(state: CareerState): number {
  const profile = getAgentProfile(state.agentId)
  const relation = state.npcs.agent.relation
  return clamp(profile.commissionRate - (relation / 100) * 0.01, 0.03, 0.15)
}

/**
 * Signe un contrat complet et cohérent : salaire calculé, primes, clauses,
 * périodes valides. Garantit un unique contrat actif (remplace l'existant).
 */
export function buildContract(
  state: CareerState,
  opts: {
    reason: ContractEventReason
    clubId: string | null
    seasonIndex: number
    durationSeasons?: number
    promisedStatus?: ClubStatusId
    leagueLevel?: number
    competition?: number
    estimatedValue?: number
  },
): Contract {
  // L'agent influence la négociation (concurrence perçue par le club).
  const agent = getAgentProfile(state.agentId)
  const factors = wageFactorsFromState(state, {
    leagueLevel: opts.leagueLevel,
    competition: clamp((opts.competition ?? 0.3) + agent.wageInfluence, 0, 1),
  })
  const { weeklyWage, tier } = computeContractWage(factors)
  const bonuses = defaultBonuses(weeklyWage)
  const duration = Math.max(1, opts.durationSeasons ?? 3)
  const start = opts.seasonIndex
  const value = opts.estimatedValue ?? state.estimatedValue

  // Clause libératoire seulement pour les joueurs déjà cotés.
  const releaseClause =
    tier === 'centre' || tier === 'jeune_pro'
      ? null
      : Math.round(value * (tier === 'star_mondiale' ? 4 : 3))

  // Prime à la signature : plus forte à un transfert / gros contrat.
  const signingMul = opts.reason === 'transfer' ? 3 : opts.reason === 'first_pro' ? 0.5 : 1.5
  const signingBonus = Math.round(weeklyWage * signingMul)

  return {
    weeksRemaining: duration * WEEKS_PER_SEASON,
    weeklyWage,
    clubId: opts.clubId,
    startSeason: start,
    endSeason: start + duration,
    signingBonus,
    promisedStatus: opts.promisedStatus ?? state.clubStatus,
    appearanceBonus: bonuses.appearanceBonus,
    startBonus: bonuses.startBonus,
    performanceBonus: bonuses.performanceBonus,
    trophyBonus: bonuses.trophyBonus,
    loyaltyBonus: bonuses.loyaltyBonus,
    releaseClause,
    optionYear: opts.reason !== 'first_pro',
    agentCommissionRate: agentCommissionRate(state),
    narrativePromises: [],
  }
}

export interface ContractResolution {
  contract: Contract
  reason: ContractEventReason
  /** Prime à verser immédiatement au cash (une seule fois). */
  signingBonus: number
  narrative: string
}

/**
 * Décide de l'évolution du contrat à la clôture d'une saison (hors transfert,
 * géré séparément). Le salaire n'évolue qu'à un événement réel : premier contrat
 * pro, prolongation en fin de contrat, renégociation après montée en statut.
 * Retourne null si aucun changement (le salaire reste stable — jamais de hausse
 * automatique annuelle).
 */
export function resolveContractForSeason(
  state: CareerState,
  opts: {
    seasonIndex: number
    leagueLevel?: number
    renegotiationRoll?: number
  },
): ContractResolution | null {
  const seasonIndex = opts.seasonIndex
  const contract = state.contract
  const wage = contract?.weeklyWage ?? 0
  const isPro = state.clubStatus !== 'academy' && state.age >= 17

  // 1. Premier contrat professionnel : sortie du centre / salaire nul.
  if (isPro && wage <= 0) {
    const built = buildContract(state, {
      reason: 'first_pro',
      clubId: state.clubId,
      seasonIndex,
      durationSeasons: 3,
      leagueLevel: opts.leagueLevel,
      competition: 0.2,
    })
    return {
      contract: built,
      reason: 'first_pro',
      signingBonus: built.signingBonus ?? 0,
      narrative: 'Premier contrat professionnel signé.',
    }
  }

  // 2. Fin de contrat sans départ : prolongation.
  if (contract && contract.weeksRemaining <= 0) {
    const built = buildContract(state, {
      reason: 'extension',
      clubId: state.clubId,
      seasonIndex,
      durationSeasons: 3,
      leagueLevel: opts.leagueLevel,
      competition: 0.4,
    })
    return {
      contract: built,
      reason: 'extension',
      signingBonus: built.signingBonus ?? 0,
      narrative: 'Contrat prolongé aux nouvelles conditions.',
    }
  }

  // 3. Renégociation après changement de statut — pas systématique.
  if (contract && (state.clubStatus === 'starter' || state.clubStatus === 'key_player')) {
    const marketWage = computeContractWage(
      wageFactorsFromState(state, {
        leagueLevel: opts.leagueLevel,
        competition: 0.5,
      }),
    ).weeklyWage
    const roll = opts.renegotiationRoll ?? 0
    if (marketWage > wage * 1.4 && roll >= 0.5) {
      const built = buildContract(state, {
        reason: 'renegotiation',
        clubId: state.clubId,
        seasonIndex,
        durationSeasons: Math.max(
          2,
          Math.round(contract.weeksRemaining / WEEKS_PER_SEASON) + 1,
        ),
        leagueLevel: opts.leagueLevel,
        competition: 0.5,
      })
      return {
        contract: built,
        reason: 'renegotiation',
        signingBonus: built.signingBonus ?? 0,
        narrative: 'Salaire renégocié après une montée en statut.',
      }
    }
  }

  return null
}
