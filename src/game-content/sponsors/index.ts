import type { CareerState, SponsorSectorId } from '../../game-engine/types/career'
import { SPONSOR_SECTORS } from '../../game-engine/core/constants'
import { getAgentProfile } from '../agents'

export type { SponsorSectorId }
export const sponsorSectors = SPONSOR_SECTORS

export const SPONSOR_SECTOR_LABELS: Record<SponsorSectorId, string> = {
  equipement: 'Équipement',
  technologie: 'Technologie',
  automobile: 'Automobile',
  mode: 'Mode',
  alimentation: 'Alimentation',
  media: 'Média',
  sport: 'Sport',
  application: 'Application',
  marque_locale: 'Marque locale',
  association: 'Association',
}

/** Axe d'image requis par un sponsor (compatibilité). */
export type SponsorImageTag =
  | 'clean'
  | 'family'
  | 'ethical'
  | 'tech'
  | 'luxury'
  | 'street'
  | 'local'

export interface SponsorRequirements {
  minReputation?: number
  minLevel?: number
  requiresSelection?: boolean
  minClubLevel?: number
}

/** Sponsor fictif au catalogue (aucune marque réelle). */
export interface SponsorDefinition {
  id: string
  name: string
  sector: SponsorSectorId
  prestige: number
  imageTag: SponsorImageTag
  baseAnnualPay: number
  durationSeasons: number
  /** Exclusivité sectorielle : un seul contrat exclusif par secteur. */
  exclusive: boolean
  reputationRisk: number
  requirements: SponsorRequirements
}

export const sponsorCatalog: SponsorDefinition[] = [
  {
    id: 'volt_athletic',
    name: 'Volt Athletic',
    sector: 'equipement',
    prestige: 82,
    imageTag: 'clean',
    baseAnnualPay: 90_000,
    durationSeasons: 3,
    exclusive: true,
    reputationRisk: 10,
    requirements: { minReputation: 55, minLevel: 55 },
  },
  {
    id: 'kryos_gear',
    name: 'Kryos Gear',
    sector: 'equipement',
    prestige: 48,
    imageTag: 'street',
    baseAnnualPay: 28_000,
    durationSeasons: 2,
    exclusive: true,
    reputationRisk: 18,
    requirements: { minReputation: 25 },
  },
  {
    id: 'nexora',
    name: 'Nexora',
    sector: 'technologie',
    prestige: 74,
    imageTag: 'tech',
    baseAnnualPay: 60_000,
    durationSeasons: 2,
    exclusive: false,
    reputationRisk: 12,
    requirements: { minReputation: 45 },
  },
  {
    id: 'veridian_motors',
    name: 'Veridian Motors',
    sector: 'automobile',
    prestige: 88,
    imageTag: 'luxury',
    baseAnnualPay: 120_000,
    durationSeasons: 3,
    exclusive: true,
    reputationRisk: 22,
    requirements: { minReputation: 68, minLevel: 62 },
  },
  {
    id: 'atelier_neuf',
    name: 'Atelier Neuf',
    sector: 'mode',
    prestige: 70,
    imageTag: 'luxury',
    baseAnnualPay: 55_000,
    durationSeasons: 2,
    exclusive: false,
    reputationRisk: 20,
    requirements: { minReputation: 58 },
  },
  {
    id: 'verde_nutrition',
    name: 'Verde Nutrition',
    sector: 'alimentation',
    prestige: 52,
    imageTag: 'family',
    baseAnnualPay: 30_000,
    durationSeasons: 3,
    exclusive: false,
    reputationRisk: 8,
    requirements: { minReputation: 30 },
  },
  {
    id: 'kanal_prime',
    name: 'Kanal Prime',
    sector: 'media',
    prestige: 66,
    imageTag: 'clean',
    baseAnnualPay: 45_000,
    durationSeasons: 2,
    exclusive: false,
    reputationRisk: 28,
    requirements: { minReputation: 50, requiresSelection: false },
  },
  {
    id: 'procore',
    name: 'ProCore',
    sector: 'sport',
    prestige: 60,
    imageTag: 'clean',
    baseAnnualPay: 40_000,
    durationSeasons: 3,
    exclusive: false,
    reputationRisk: 10,
    requirements: { minReputation: 40 },
  },
  {
    id: 'tapmind',
    name: 'Tapmind',
    sector: 'application',
    prestige: 44,
    imageTag: 'tech',
    baseAnnualPay: 22_000,
    durationSeasons: 2,
    exclusive: false,
    reputationRisk: 24,
    requirements: { minReputation: 28 },
  },
  {
    id: 'brume_co',
    name: 'Brume & Co',
    sector: 'marque_locale',
    prestige: 30,
    imageTag: 'local',
    baseAnnualPay: 12_000,
    durationSeasons: 2,
    exclusive: false,
    reputationRisk: 6,
    requirements: {},
  },
  {
    id: 'fondation_elan',
    name: 'Fondation Élan',
    sector: 'association',
    prestige: 40,
    imageTag: 'ethical',
    baseAnnualPay: 8_000,
    durationSeasons: 3,
    exclusive: false,
    reputationRisk: 4,
    requirements: {},
  },
]

const byId = new Map<string, SponsorDefinition>(
  sponsorCatalog.map((s) => [s.id, s]),
)

export function getSponsorById(id: string): SponsorDefinition | undefined {
  return byId.get(id)
}

/** Niveau global (moyenne visible approx) sans dépendre du moteur. */
function stateLevel(state: CareerState): number {
  const rep = state.resources.reputationSportive
  return Math.round((rep + state.competitionLevel) / 2)
}

/**
 * Compatibilité d'un sponsor : exclusivité sectorielle, image (comportement /
 * scandales), et exigences (réputation, niveau, sélection, club).
 */
export function isSponsorshipCompatible(
  state: CareerState,
  def: SponsorDefinition,
): { ok: boolean; reason?: string } {
  // Exclusivité : un seul contrat exclusif par secteur.
  if (
    def.exclusive &&
    state.sponsorships.some((s) => s.exclusive && s.sector === def.sector)
  ) {
    return { ok: false, reason: `secteur ${def.sector} déjà exclusif` }
  }
  // Secteur banni par une décision passée.
  if (state.flags[`sponsor_ban:${def.sector}`] === true) {
    return { ok: false, reason: `secteur ${def.sector} banni` }
  }
  // Image : les marques « clean/family » refusent un joueur indiscipliné/scandaleux.
  const scandal =
    state.flags.media_crisis === true || state.flags.scandal === true
  if ((def.imageTag === 'clean' || def.imageTag === 'family') && scandal) {
    return { ok: false, reason: 'image incompatible (scandale)' }
  }
  if (def.imageTag === 'family' && state.resources.discipline < 35) {
    return { ok: false, reason: 'discipline insuffisante' }
  }
  if (def.imageTag === 'ethical' && state.flags.risky_investment === true) {
    return { ok: false, reason: 'image éthique incompatible' }
  }
  // Exigences chiffrées.
  const req = def.requirements
  if (req.minReputation && state.resources.reputationSportive < req.minReputation) {
    return { ok: false, reason: 'réputation insuffisante' }
  }
  if (req.minLevel && stateLevel(state) < req.minLevel) {
    return { ok: false, reason: 'niveau insuffisant' }
  }
  if (req.minClubLevel && state.competitionLevel < req.minClubLevel) {
    return { ok: false, reason: 'club insuffisant' }
  }
  if (
    req.requiresSelection &&
    !(state.flags.national_capped === true || state.flags.national_regular === true)
  ) {
    return { ok: false, reason: 'sélection requise' }
  }
  return { ok: true }
}

/** Rémunération annuelle réelle d'une offre (agent + notoriété modulent). */
export function sponsorAnnualPay(
  state: CareerState,
  def: SponsorDefinition,
): number {
  const agent = getAgentProfile(state.agentId)
  const fame = 0.8 + state.resources.reputationSportive / 200
  const prestigeFactor = 0.7 + def.prestige / 150
  return Math.max(
    0,
    Math.round(def.baseAnnualPay * prestigeFactor * fame * agent.sponsorInfluence),
  )
}

/** Offres de sponsors compatibles, triées par rémunération décroissante. */
export function generateSponsorOffers(
  state: CareerState,
): Array<{ def: SponsorDefinition; annualPay: number }> {
  return sponsorCatalog
    .filter((def) => isSponsorshipCompatible(state, def).ok)
    .map((def) => ({ def, annualPay: sponsorAnnualPay(state, def) }))
    .sort((a, b) => b.annualPay - a.annualPay)
}
