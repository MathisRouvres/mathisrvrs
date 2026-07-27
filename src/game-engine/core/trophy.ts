import type { CareerState } from '../types/career'
import type {
  ClubSeasonResult,
  ClubStandingId,
  SeasonMatchStats,
  SeasonObjectiveId,
  SeasonTimelineEntry,
} from '../types/season'
import { createRng } from '../random/createRng'
import { clamp } from './clamp'

/**
 * Trophées et récompenses collectives (Phase 10). Résultats automatiques,
 * jamais un dilemme. Réutilise les données Phase 9 (championnat, statut,
 * classement, coupe). Fonctions pures ; les trophées « bonus » (finale de coupe,
 * continental, sélection) utilisent un rng dédié (flux principal inchangé).
 */

// --------------------------------------------------------------------------
// Métadonnées de trophées
// --------------------------------------------------------------------------

export type CelebrationLevel =
  | 'mineur'
  | 'national'
  | 'majeur'
  | 'continental'
  | 'international'

export interface TrophyMeta {
  label: string
  official: boolean
  celebration: CelebrationLevel
  /** Prestige de la récompense (0–100). */
  prestige: number
}

/** Libellés fictifs cohérents avec l'univers (Phase 9/10). */
export const T = {
  championNational: 'Champion national',
  championD2: 'Champion de division 2',
  montee: 'Montée en division supérieure',
  coupeNationale: 'Coupe nationale',
  coupeFinaliste: 'Finaliste de la coupe nationale',
  supercoupe: 'Supercoupe',
  ligueContinentale: 'Vainqueur de la Ligue continentale',
  coupeContinentale: 'Vainqueur de la Coupe continentale',
  finalisteContinental: 'Finaliste continental',
  championContinentalNations: 'Champion continental des nations',
  championMondeNations: 'Champion du monde des nations',
  finalisteNations: 'Finaliste du tournoi des nations',
} as const

const TROPHY_META: Record<string, TrophyMeta> = {
  [T.championNational]: { label: T.championNational, official: true, celebration: 'majeur', prestige: 64 },
  [T.championD2]: { label: T.championD2, official: true, celebration: 'national', prestige: 34 },
  [T.montee]: { label: T.montee, official: true, celebration: 'national', prestige: 46 },
  [T.coupeNationale]: { label: T.coupeNationale, official: true, celebration: 'national', prestige: 52 },
  [T.coupeFinaliste]: { label: T.coupeFinaliste, official: true, celebration: 'mineur', prestige: 40 },
  [T.supercoupe]: { label: T.supercoupe, official: true, celebration: 'mineur', prestige: 42 },
  [T.ligueContinentale]: { label: T.ligueContinentale, official: true, celebration: 'continental', prestige: 84 },
  [T.coupeContinentale]: { label: T.coupeContinentale, official: true, celebration: 'continental', prestige: 68 },
  [T.finalisteContinental]: { label: T.finalisteContinental, official: true, celebration: 'majeur', prestige: 60 },
  [T.championContinentalNations]: { label: T.championContinentalNations, official: true, celebration: 'international', prestige: 88 },
  [T.championMondeNations]: { label: T.championMondeNations, official: true, celebration: 'international', prestige: 96 },
  [T.finalisteNations]: { label: T.finalisteNations, official: true, celebration: 'continental', prestige: 70 },
}

export function trophyMeta(label: string): TrophyMeta {
  return (
    TROPHY_META[label] ?? {
      label,
      official: false,
      celebration: 'mineur',
      prestige: 45,
    }
  )
}

/** Niveau de célébration le plus élevé d'une liste de trophées. */
const CELEBRATION_RANK: Record<CelebrationLevel, number> = {
  mineur: 0,
  national: 1,
  majeur: 2,
  continental: 3,
  international: 4,
}
export function topCelebration(trophies: string[]): CelebrationLevel | null {
  let best: CelebrationLevel | null = null
  for (const t of trophies) {
    const c = trophyMeta(t).celebration
    if (!best || CELEBRATION_RANK[c] > CELEBRATION_RANK[best]) best = c
  }
  return best
}

// --------------------------------------------------------------------------
// Contribution du joueur
// --------------------------------------------------------------------------

export type ContributionTier =
  | 'participation_limitee'
  | 'rotation'
  | 'titulaire_regulier'
  | 'joueur_important'
  | 'joueur_decisif'
  | 'leader_du_titre'
  | 'heros'

export const CONTRIBUTION_LABELS: Record<ContributionTier, string> = {
  participation_limitee: 'Participation limitée',
  rotation: 'Membre de la rotation',
  titulaire_regulier: 'Titulaire régulier',
  joueur_important: 'Joueur important',
  joueur_decisif: 'Joueur décisif',
  leader_du_titre: 'Leader du titre',
  heros: 'Héros de la compétition',
}

export interface Contribution {
  tier: ContributionTier
  /** Score 0–1. */
  score: number
}

/** Contribution du joueur, dérivée des données réellement disponibles. */
export function computeContribution(m: SeasonMatchStats): Contribution {
  const matchesF = clamp(m.matches / 34, 0, 1)
  const minutesF = clamp(m.minutes / 2600, 0, 1)
  const startsF = clamp(m.starts / 30, 0, 1)
  const ratingF = clamp((m.averageRating - 6.0) / 1.6, 0, 1)
  const injuryPenalty = clamp(m.injuryDays / 200, 0, 0.2)
  const score = clamp(
    matchesF * 0.32 + minutesF * 0.26 + startsF * 0.22 + ratingF * 0.2 - injuryPenalty,
    0,
    1,
  )
  let tier: ContributionTier = 'participation_limitee'
  if (score >= 0.92) tier = 'heros'
  else if (score >= 0.82) tier = 'leader_du_titre'
  else if (score >= 0.7) tier = 'joueur_decisif'
  else if (score >= 0.55) tier = 'joueur_important'
  else if (score >= 0.38) tier = 'titulaire_regulier'
  else if (score >= 0.18) tier = 'rotation'
  return { tier, score }
}

// --------------------------------------------------------------------------
// Valeur d'un trophée
// --------------------------------------------------------------------------

const UNEXPECTED_BY_STANDING: Record<ClubStandingId, number> = {
  grand_favori: 0.85,
  pretendant: 1.0,
  candidat_continental: 1.15,
  milieu: 1.35,
  candidat_maintien: 1.6,
  promu: 1.5,
  outsider: 1.7,
}

/**
 * Valeur d'un trophée (0–100) : prestige de l'épreuve, difficulté du
 * championnat, statut initial du club (inattendu = plus fort), contribution.
 */
export function computeTrophyValue(input: {
  trophyPrestige: number
  championshipDifficulty: number
  clubStanding: ClubStandingId
  contribution: number
}): number {
  const prestigePart = input.trophyPrestige * 0.55 + input.championshipDifficulty * 0.2
  const contributionFactor = 0.45 + input.contribution * 0.55
  const unexpected = UNEXPECTED_BY_STANDING[input.clubStanding]
  return Math.round(clamp(prestigePart * contributionFactor * unexpected * 0.9, 0, 100))
}

// --------------------------------------------------------------------------
// Accomplissements collectifs (non-trophées)
// --------------------------------------------------------------------------

export const ACHIEVEMENT_LABELS: Record<string, string> = {
  maintien_inattendu: 'Maintien inattendu',
  promotion_surprise: 'Promotion surprise',
  qualif_continentale_historique: 'Qualification continentale historique',
  meilleure_position_histoire: "Meilleure position de l'histoire du club",
  finale_inattendue: 'Finale inattendue',
  demi_historique: 'Demi-finale historique',
  meilleure_attaque: 'Meilleure attaque',
  meilleure_defense: 'Meilleure défense',
  saison_invaincue: 'Saison sans défaite',
  titre_outsider: 'Titre remporté avec un outsider',
  maintien_dernier_souffle: 'Maintien lors de la dernière journée',
}

function bestPriorRank(prior: SeasonTimelineEntry[], clubId: string | null): number {
  let best = Infinity
  for (const e of prior) {
    if (e.clubId === clubId && typeof e.clubRank === 'number') {
      best = Math.min(best, e.clubRank)
    }
  }
  return best
}

const LOW_STANDINGS: ClubStandingId[] = ['candidat_maintien', 'outsider', 'promu', 'milieu']

/** Faits marquants dérivés du résultat du club (données disponibles). */
export function collectAchievements(
  club: ClubSeasonResult,
  standing: ClubStandingId,
  objective: SeasonObjectiveId,
  priorTimeline: SeasonTimelineEntry[],
  clubId: string | null,
): string[] {
  const out: string[] = []
  const size = club.leagueSize
  const low = LOW_STANDINGS.includes(standing)

  if (objective === 'maintien' && !club.relegated && standing !== 'milieu') {
    if (club.leagueRank <= Math.ceil(size * 0.45)) out.push('maintien_inattendu')
  }
  if (club.division === 1 && standing === 'promu' && !club.relegated) {
    // Déjà couvert par maintien_inattendu si applicable — évite le doublon.
  }
  if (club.promoted && (standing === 'outsider' || standing === 'promu')) {
    out.push('promotion_surprise')
  }
  if (club.continentalQualified && low) out.push('qualif_continentale_historique')

  const prevBest = bestPriorRank(priorTimeline, clubId)
  if (priorTimeline.length >= 2 && club.leagueRank < prevBest) {
    out.push('meilleure_position_histoire')
  }
  if (club.cupRun === 'finale' && low) out.push('finale_inattendue')
  if (club.cupRun === 'demi' && low) out.push('demi_historique')

  if (typeof club.goalsFor === 'number' && club.goalsFor >= 66) out.push('meilleure_attaque')
  if (typeof club.goalsAgainst === 'number' && club.goalsAgainst <= 26) out.push('meilleure_defense')
  if (club.unbeaten === true) out.push('saison_invaincue')

  if (club.trophies.includes(T.championNational) && low) out.push('titre_outsider')
  if (!club.relegated && club.leagueRank >= size - 2 && club.division === 1) {
    out.push('maintien_dernier_souffle')
  }
  return [...new Set(out)]
}

// --------------------------------------------------------------------------
// Trophées « bonus » déterministes (finale de coupe, continental, sélection)
// --------------------------------------------------------------------------

/**
 * Trophées non produits par la simulation de club/championnat : finale de coupe,
 * épreuves continentales de club, titres de sélection. Rng dédié (seed:trophy)
 * pour ne pas perturber le flux de la saison.
 */
export function generateBonusTrophies(
  state: CareerState,
  club: ClubSeasonResult,
): string[] {
  const rng = createRng(`${state.seed}:trophy:${state.seasonIndex}`)
  const out: string[] = []

  // Montée en division supérieure (le champion de D2 est déjà distingué).
  if (club.promoted && !club.trophies.includes(T.championD2)) out.push(T.montee)

  // Finale de coupe perdue (le vainqueur est déjà un trophée officiel).
  if (club.cupRun === 'finale') out.push(T.coupeFinaliste)

  // Épreuve continentale de club : le club y entre s'il s'était qualifié.
  if (state.flags.continental_entrant === true) {
    const strength = clamp((state.competitionLevel - 60) / 40, 0, 1)
    const isPrimary = state.competitionLevel >= 72
    if (rng.chance(0.1 + strength * 0.3)) {
      out.push(isPrimary ? T.ligueContinentale : T.coupeContinentale)
    } else if (rng.chance(0.12 + strength * 0.25)) {
      out.push(T.finalisteContinental)
    }
  }

  // Titres de sélection (tournois continentaux/mondiaux, années déterministes).
  const national =
    state.flags.national_regular === true || state.flags.national_capped === true
  if (national) {
    const rep = state.resources.reputationSportive
    if (state.seasonIndex % 2 === 0) {
      if (rng.chance(clamp((rep - 60) / 130, 0.02, 0.3))) {
        out.push(T.championContinentalNations)
      } else if (rng.chance(clamp((rep - 52) / 160, 0.02, 0.25))) {
        out.push(T.finalisteNations)
      }
    }
    if (state.seasonIndex % 4 === 0) {
      if (rng.chance(clamp((rep - 70) / 170, 0.015, 0.2))) {
        out.push(T.championMondeNations)
      }
    }
  }
  return out
}

// --------------------------------------------------------------------------
// Impact carrière (modéré — jamais de gros bonus de niveau)
// --------------------------------------------------------------------------

export interface TrophyImpact {
  reputation: number
  popularite: number
  confiance: number
  /** Flags à poser (héritage / sélection). */
  flags: string[]
}

/** Impact carrière cumulé des trophées d'une saison, pondéré par la contribution. */
export function seasonTrophyImpact(
  trophies: string[],
  contribution: number,
  championshipDifficulty: number,
  clubStanding: ClubStandingId,
): TrophyImpact {
  let reputation = 0
  let popularite = 0
  let confiance = 0
  const flags = new Set<string>()
  for (const label of trophies) {
    const meta = trophyMeta(label)
    if (!meta.official) continue
    const value = computeTrophyValue({
      trophyPrestige: meta.prestige,
      championshipDifficulty,
      clubStanding,
      contribution,
    })
    const cf = 0.4 + contribution * 0.6
    reputation += value * 0.06 * cf
    popularite += value * 0.05 * cf
    confiance += value * 0.04
    if (meta.celebration === 'international') flags.add('won_international')
    if (meta.celebration === 'continental') flags.add('won_continental')
    if (meta.celebration === 'majeur') flags.add('won_major')
  }
  return {
    // Bonus modérés et bornés (le trophée ouvre des portes, ne dope pas le niveau).
    reputation: Math.min(14, Math.round(reputation)),
    popularite: Math.min(12, Math.round(popularite)),
    confiance: Math.min(10, Math.round(confiance)),
    flags: [...flags],
  }
}

// --------------------------------------------------------------------------
// Palmarès structuré (dérivé de la timeline)
// --------------------------------------------------------------------------

export interface PalmaresEntry {
  seasonIndex: number
  age: number
  clubId: string | null
  competition: string
  result: string
  official: boolean
  prestige: number
  celebration: CelebrationLevel
  contribution: ContributionTier | null
  clubStanding: ClubStandingId | null
  faitMarquant: string | null
}

/** Palmarès complet, exploitable partout (bilan, timeline, fiche, retraite, partage). */
export function buildPalmares(state: CareerState): PalmaresEntry[] {
  const out: PalmaresEntry[] = []
  for (const e of state.seasonTimeline) {
    const contribution =
      (e.contributionTier as ContributionTier | undefined) ?? null
    const standing = (e.clubStanding as ClubStandingId | undefined) ?? null
    for (const label of e.matchStats.trophies) {
      const meta = trophyMeta(label)
      if (!meta.official) continue
      out.push({
        seasonIndex: e.seasonIndex,
        age: e.age,
        clubId: e.clubId,
        competition: meta.label,
        result: meta.label,
        official: true,
        prestige: meta.prestige,
        celebration: meta.celebration,
        contribution,
        clubStanding: standing,
        faitMarquant: null,
      })
    }
    for (const ach of e.achievements ?? []) {
      out.push({
        seasonIndex: e.seasonIndex,
        age: e.age,
        clubId: e.clubId,
        competition: ACHIEVEMENT_LABELS[ach] ?? ach,
        result: ACHIEVEMENT_LABELS[ach] ?? ach,
        official: false,
        prestige: 0,
        celebration: 'mineur',
        contribution,
        clubStanding: standing,
        faitMarquant: ACHIEVEMENT_LABELS[ach] ?? ach,
      })
    }
  }
  return out
}
