import type {
  CareerState,
  Contract,
  LifestyleId,
  Wealth,
} from '../../types/career'
import type { SeasonMatchStats } from '../../types/season'
import { clampCash } from '../clamp'
import {
  INVESTMENT_YIELD_RATE,
  LIFESTYLE_PARAMS,
  LIFESTYLE_WAGE_THRESHOLDS,
  LOYALTY_MILESTONE_SEASONS,
  SELECTION_INCOME,
  WEEKS_PER_SEASON,
} from './constants'
import { normalizeContract } from './contract'

export interface AnnualIncome {
  salary: number
  bonuses: number
  selection: number
  trophyBonus: number
  sponsoring: number
  investmentIncome: number
  exceptional: number
  total: number
}

export interface AnnualExpenses {
  agentCommission: number
  housing: number
  lifestyle: number
  entourage: number
  family: number
  personalTrainer: number
  care: number
  communication: number
  investments: number
  exceptional: number
  total: number
}

export interface AnnualFinance {
  lifestyle: LifestyleId
  income: AnnualIncome
  expenses: AnnualExpenses
  /** Revenu net de la saison (= variation de patrimoine). */
  net: number
}

/** Niveau de vie dérivé du salaire hebdomadaire. */
export function deriveLifestyle(weeklyWage: number): LifestyleId {
  for (const [id, threshold] of LIFESTYLE_WAGE_THRESHOLDS) {
    if (weeklyWage < threshold) return id
  }
  return 'extravagant'
}

/** Somme de la valeur des investissements. */
function investmentsValue(state: CareerState): number {
  return state.finances.investments.reduce((acc, inv) => acc + inv.value, 0)
}

function nationalSelectionIncome(state: CareerState): number {
  if (state.flags.national_regular === true) return SELECTION_INCOME.regular
  if (state.flags.national_capped === true) return SELECTION_INCOME.capped
  return 0
}

/** Revenu commercial (sponsoring) dérivé de la notoriété. */
function sponsoringIncome(state: CareerState): number {
  const fame =
    state.resources.popularite * 0.55 + state.resources.reputationSportive * 0.45
  return Math.round(fame * fame * 10 * (1 + state.competitionLevel / 120))
}

export interface AnnualFinanceInput {
  /** État après simulation (âge/saison avancés). */
  state: CareerState
  /** Statistiques de la saison écoulée. */
  matchStats: SeasonMatchStats
  /** Salaire hebdomadaire effectivement perçu pendant la saison. */
  weeklyWageThisSeason: number
  /** Contrat actif pendant la saison (barèmes de primes). */
  contractThisSeason: Contract | null
  /** Ancienneté au club (bonus de fidélité). */
  clubTenure: number
}

/**
 * Calcule le bilan financier annuel — pur, déterministe, idempotent.
 * Ne modifie pas l'état ; `applyAnnualFinance` s'en charge.
 */
export function computeAnnualFinance(input: AnnualFinanceInput): AnnualFinance {
  const { state, matchStats } = input
  const wage = Math.max(0, input.weeklyWageThisSeason)
  const salary = Math.round(wage * WEEKS_PER_SEASON)

  const contract = input.contractThisSeason
    ? normalizeContract(input.contractThisSeason, state.clubId, state.seasonIndex)
    : null

  // --- Revenus ---
  let matchBonuses = 0
  let trophyBonus = 0
  if (contract && wage > 0) {
    matchBonuses =
      contract.appearanceBonus * matchStats.matches +
      contract.startBonus * matchStats.starts +
      (matchStats.averageRating >= 7.2 ? contract.performanceBonus : 0)
    // Bonus de fidélité aux paliers d'ancienneté (une fois par palier).
    if (
      input.clubTenure > 0 &&
      input.clubTenure % LOYALTY_MILESTONE_SEASONS === 0
    ) {
      matchBonuses += contract.loyaltyBonus
    }
    trophyBonus = matchStats.trophies.length * contract.trophyBonus
  }

  const selection = nationalSelectionIncome(state)
  // Sponsoring = notoriété générique + contrats de sponsors actifs (Phase 3).
  const sponsorshipPay = state.sponsorships.reduce(
    (acc, s) => acc + Math.max(0, s.annualPay),
    0,
  )
  const sponsoring = sponsoringIncome(state) + sponsorshipPay
  const investmentIncome = Math.round(
    investmentsValue(state) * INVESTMENT_YIELD_RATE,
  )

  const income: AnnualIncome = {
    salary,
    bonuses: matchBonuses,
    selection,
    trophyBonus,
    sponsoring,
    investmentIncome,
    exceptional: 0,
    total:
      salary +
      matchBonuses +
      selection +
      trophyBonus +
      sponsoring +
      investmentIncome,
  }

  // --- Dépenses ---
  const lifestyle = deriveLifestyle(wage)
  const params = LIFESTYLE_PARAMS[lifestyle]
  // Commission agent sur les revenus footballistiques (hors commercial/placement).
  const commissionRate = contract?.agentCommissionRate ?? 0
  const agentCommission = Math.max(
    0,
    Math.round((salary + matchBonuses + trophyBonus) * commissionRate),
  )
  // Coût de vie discrétionnaire, plafonné par la capacité réelle à payer
  // (évite toute faillite mécanique d'un joueur à faibles revenus).
  const earnings = income.total - investmentIncome
  const rawLiving = params.base + params.rate * Math.max(0, earnings)
  const affordabilityCap =
    earnings * 0.85 + Math.max(0, state.finances.cash) * 0.05
  const living = Math.max(0, Math.min(rawLiving, affordabilityCap))

  const housing = Math.round(living * 0.33)
  const lifestyleSpend = Math.round(living * 0.18)
  const entourage = Math.round(living * 0.15)
  const family = Math.round(living * 0.13)
  const personalTrainer = Math.round(living * 0.12)
  const communication = Math.round(living * 0.09)
  // Soins : fonction des jours de blessure.
  const care = Math.round(
    matchStats.injuryDays * (120 + wage * 0.02),
  )

  const expenses: AnnualExpenses = {
    agentCommission,
    housing,
    lifestyle: lifestyleSpend,
    entourage,
    family,
    personalTrainer,
    care,
    communication,
    investments: 0,
    exceptional: 0,
    total:
      agentCommission +
      housing +
      lifestyleSpend +
      entourage +
      family +
      personalTrainer +
      care +
      communication,
  }

  return {
    lifestyle,
    income,
    expenses,
    net: income.total - expenses.total,
  }
}

/**
 * Applique le bilan annuel à l'état : cash, patrimoine cumulatif, niveau de vie.
 * Patrimoine : précédent + revenus - dépenses (+ rendements inclus dans revenus).
 */
export function applyAnnualFinance(
  state: CareerState,
  af: AnnualFinance,
): CareerState {
  const cashAfter = clampCash(state.finances.cash + af.net)
  const invValue = investmentsValue(state)
  const wealthCurrent = cashAfter + invValue
  const prev: Wealth = state.wealth

  const wealth: Wealth = {
    current: wealthCurrent,
    max: Math.max(prev.max, wealthCurrent),
    cumulativeIncome: prev.cumulativeIncome + af.income.total,
    bestWeeklyWage: Math.max(
      prev.bestWeeklyWage,
      state.contract?.weeklyWage ?? 0,
    ),
    cumulativeCommercial: prev.cumulativeCommercial + af.income.sponsoring,
    investmentGains: prev.investmentGains + af.income.investmentIncome,
    financialLosses: prev.financialLosses,
    cumulativeExpenses: prev.cumulativeExpenses + af.expenses.total,
    lastAnnualDelta: wealthCurrent - prev.current,
  }

  return {
    ...state,
    lifestyle: af.lifestyle,
    finances: {
      ...state.finances,
      cash: cashAfter,
    },
    wealth,
  }
}

/**
 * Vieillit les contrats de sponsoring d'une saison : décompte et expiration.
 * À appeler APRÈS le bilan annuel (le sponsor paie la saison en cours).
 */
export function ageSponsorships(state: CareerState): CareerState {
  if (state.sponsorships.length === 0) return state
  const next = state.sponsorships
    .map((s) => ({ ...s, seasonsRemaining: s.seasonsRemaining - 1 }))
    .filter((s) => s.seasonsRemaining > 0)
  if (next.length === state.sponsorships.length) {
    return { ...state, sponsorships: next }
  }
  return {
    ...state,
    sponsorships: next,
    flags: { ...state.flags, sponsor_active: next.length > 0 },
  }
}

/** Patrimoine par défaut à la création (dérivé du cash de départ). */
export function initialWealth(cash: number, weeklyWage = 0): Wealth {
  const current = clampCash(cash)
  return {
    current,
    max: current,
    cumulativeIncome: 0,
    bestWeeklyWage: Math.max(0, Math.round(weeklyWage)),
    cumulativeCommercial: 0,
    investmentGains: 0,
    financialLosses: 0,
    cumulativeExpenses: 0,
    lastAnnualDelta: 0,
  }
}
