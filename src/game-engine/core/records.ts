import type { CareerState } from '../types/career'
import type {
  ClubSeasonResult,
  DistinctionRecord,
  RecordEntry,
  RecordRarity,
  RecordScope,
  SeasonMatchStats,
} from '../types/season'
import type { ChampionshipDefinition } from '../../game-content/championships'

/**
 * Records (Phase 12) — uniquement calculables depuis des données réelles
 * (`seasonTimeline`, finances, âge). Un record est rare : seuls les paliers
 * ≥ record_club sont « notables » (émis) ; les bests mineurs mettent à jour le
 * registre en silence pour éviter une notification chaque saison. Déterministe
 * (aucun rng — dérivé des faits de la saison).
 */

const RARITY_RANK: Record<RecordRarity, number> = {
  accomplissement: 0,
  record_club: 1,
  record_championnat: 2,
  record_national: 3,
  record_continental: 4,
  record_mondial: 5,
}

type Thresholds = Partial<Record<RecordRarity, number>>

/** Rareté d'une valeur « plus haut = mieux » selon des paliers décroissants. */
function rarityHigher(value: number, t: Thresholds): RecordRarity {
  const order: RecordRarity[] = [
    'record_mondial',
    'record_continental',
    'record_national',
    'record_championnat',
    'record_club',
  ]
  for (const r of order) {
    const min = t[r]
    if (min !== undefined && value >= min) return r
  }
  return 'accomplissement'
}

/** Rareté d'une valeur « plus bas = mieux » (âge : plus jeune = plus rare). */
function rarityLower(value: number, t: Thresholds): RecordRarity {
  const order: RecordRarity[] = [
    'record_mondial',
    'record_continental',
    'record_national',
    'record_championnat',
    'record_club',
  ]
  for (const r of order) {
    const max = t[r]
    if (max !== undefined && value <= max) return r
  }
  return 'accomplissement'
}

interface Candidate {
  id: string
  label: string
  scope: RecordScope
  value: number
  rarity: RecordRarity
  betterIsHigher: boolean
  context: string
}

export interface RecordsInput {
  matchStats: SeasonMatchStats
  club: ClubSeasonResult
  ageDuringSeason: number
  championship: ChampionshipDefinition
  valueBefore: number
  valueAfter: number
  weeklyWage: number
  /** Distinctions de la saison (toutes portées). */
  distinctions: DistinctionRecord[]
  /** Trophées collectifs de la saison. */
  collectiveTrophyCount: number
}

export interface SeasonRecordsResult {
  /** Records notables établis/battus cette saison (rareté ≥ record_club). */
  newRecords: RecordEntry[]
  /** Registre mis à jour (meilleurs détenus). */
  ledger: RecordEntry[]
}

/** Plus longue série de saisons consécutives avec ≥1 distinction (this incl.). */
function awardStreak(state: CareerState, hasDistinctionNow: boolean): number {
  let streak = hasDistinctionNow ? 1 : 0
  if (!hasDistinctionNow) return 0
  for (let i = state.seasonTimeline.length - 1; i >= 0; i -= 1) {
    const e = state.seasonTimeline[i]!
    if ((e.distinctions?.length ?? 0) > 0) streak += 1
    else break
  }
  return streak
}

export function computeSeasonRecords(
  state: CareerState,
  input: RecordsInput,
): SeasonRecordsResult {
  const { matchStats: m, club, championship } = input
  const clubId = state.clubId ?? null
  const clubKey = clubId ?? 'sans-club'
  const seasonScore = Math.round(
    m.goals * 3 + m.assists * 2 + (m.averageRating - 6) * 18 + m.minutes / 60,
  )
  const wonSeasonAward = input.distinctions.some(
    (d) =>
      d.result === 'vainqueur' &&
      (d.awardId === 'joueur_saison' || d.awardId === 'nat_joueur' || d.awardId === 'monde_joueur'),
  )
  const streak = awardStreak(state, input.distinctions.length > 0)

  const candidates: Candidate[] = []
  const push = (c: Candidate) => candidates.push(c)

  // --- Records personnels ---
  push({ id: 'perso_saison', label: 'Meilleure saison', scope: 'personnel', value: seasonScore, betterIsHigher: true, rarity: rarityHigher(seasonScore, { record_mondial: 150, record_continental: 125, record_national: 105, record_championnat: 85, record_club: 60 }), context: `Note ${m.averageRating.toFixed(1)}, ${m.goals}B/${m.assists}P.` })
  push({ id: 'perso_buts', label: 'Meilleur total de buts', scope: 'personnel', value: m.goals, betterIsHigher: true, rarity: rarityHigher(m.goals, { record_mondial: 30, record_continental: 25, record_national: 20, record_championnat: 16, record_club: 12 }), context: `${m.goals} buts en ${m.matches} matchs.` })
  push({ id: 'perso_passes', label: 'Meilleur total de passes', scope: 'personnel', value: m.assists, betterIsHigher: true, rarity: rarityHigher(m.assists, { record_mondial: 18, record_continental: 15, record_national: 12, record_championnat: 9, record_club: 6 }), context: `${m.assists} passes décisives.` })
  push({ id: 'perso_cs', label: 'Meilleur total de clean sheets', scope: 'personnel', value: m.cleanSheets, betterIsHigher: true, rarity: rarityHigher(m.cleanSheets, { record_mondial: 20, record_continental: 17, record_national: 14, record_championnat: 11, record_club: 8 }), context: `${m.cleanSheets} clean sheets.` })
  push({ id: 'perso_note', label: 'Meilleure note moyenne', scope: 'personnel', value: Math.round(m.averageRating * 100), betterIsHigher: true, rarity: rarityHigher(m.averageRating, { record_mondial: 8.0, record_continental: 7.8, record_national: 7.6, record_championnat: 7.4, record_club: 7.2 }), context: `Note moyenne ${m.averageRating.toFixed(2)}.` })
  // Records financiers/monotones : notables uniquement aux paliers élevés
  // (le salaire/la valeur montent chaque saison → éviter une alerte systématique).
  push({ id: 'perso_salaire', label: 'Plus gros salaire', scope: 'personnel', value: Math.round(input.weeklyWage), betterIsHigher: true, rarity: rarityHigher(input.weeklyWage, { record_mondial: 400000, record_continental: 250000, record_national: 120000 }), context: `${Math.round(input.weeklyWage)} / semaine.` })
  const progression = Math.max(0, Math.round(input.valueAfter - input.valueBefore))
  push({ id: 'perso_progression', label: 'Plus forte progression annuelle', scope: 'personnel', value: progression, betterIsHigher: true, rarity: rarityHigher(progression, { record_mondial: 8000000, record_continental: 4000000, record_national: 2000000, record_championnat: 800000 }), context: `+${progression} de valeur estimée.` })

  // --- Records du club (portée = ce club) ---
  push({ id: `club_buteur:${clubKey}`, label: 'Meilleur buteur du club sur une saison', scope: 'club', value: m.goals, betterIsHigher: true, rarity: m.goals >= 16 ? 'record_championnat' : m.goals >= 10 ? 'record_club' : 'accomplissement', context: `${m.goals} buts pour ${championship.name}.` })
  push({ id: `club_cs:${clubKey}`, label: 'Plus de clean sheets pour le club', scope: 'club', value: m.cleanSheets, betterIsHigher: true, rarity: m.cleanSheets >= 14 ? 'record_championnat' : m.cleanSheets >= 8 ? 'record_club' : 'accomplissement', context: `${m.cleanSheets} clean sheets.` })
  push({ id: `club_recompenses:${clubKey}`, label: 'Plus de récompenses pour le club', scope: 'club', value: input.distinctions.length, betterIsHigher: true, rarity: input.distinctions.length >= 3 ? 'record_championnat' : input.distinctions.length >= 2 ? 'record_club' : 'accomplissement', context: `${input.distinctions.length} distinction(s) sur la saison.` })
  push({ id: `club_transfert:${clubKey}`, label: 'Plus grosse valeur au club', scope: 'club', value: Math.round(input.valueAfter), betterIsHigher: true, rarity: rarityHigher(input.valueAfter, { record_mondial: 40000000, record_continental: 20000000, record_national: 8000000 }), context: `Valeur estimée ${Math.round(input.valueAfter)}.` })
  if (m.goals > 0) {
    push({ id: `club_jeune_buteur:${clubKey}`, label: 'Plus jeune buteur du club', scope: 'club', value: input.ageDuringSeason, betterIsHigher: false, rarity: rarityLower(input.ageDuringSeason, { record_national: 17, record_championnat: 18, record_club: 20 }), context: `Buteur à ${input.ageDuringSeason} ans.` })
  }
  if (m.starts > 0) {
    push({ id: `club_jeune_titulaire:${clubKey}`, label: 'Plus jeune titulaire du club', scope: 'club', value: input.ageDuringSeason, betterIsHigher: false, rarity: rarityLower(input.ageDuringSeason, { record_national: 16, record_championnat: 17, record_club: 19 }), context: `Titulaire à ${input.ageDuringSeason} ans.` })
  }

  // --- Records de championnat ---
  if (club.unbeaten) {
    push({ id: `champ_invaincu:${championship.id}`, label: 'Saison de championnat sans défaite', scope: 'championnat', value: 1, betterIsHigher: true, rarity: 'record_championnat', context: `${championship.name} : aucune défaite.` })
  }
  if (streak >= 3) {
    push({ id: 'champ_serie', label: 'Série de récompenses', scope: 'championnat', value: streak, betterIsHigher: true, rarity: streak >= 6 ? 'record_national' : streak >= 4 ? 'record_championnat' : 'record_club', context: `${streak} saisons consécutives récompensées.` })
  }
  if (wonSeasonAward) {
    push({ id: 'champ_jeune_joueur_saison', label: 'Plus jeune lauréat majeur', scope: 'championnat', value: input.ageDuringSeason, betterIsHigher: false, rarity: rarityLower(input.ageDuringSeason, { record_national: 19, record_championnat: 21, record_club: 23 }), context: `Lauréat majeur à ${input.ageDuringSeason} ans.` })
    push({ id: 'champ_vieux_joueur_saison', label: 'Plus vieux lauréat majeur', scope: 'championnat', value: input.ageDuringSeason, betterIsHigher: true, rarity: input.ageDuringSeason >= 35 ? 'record_national' : 'record_championnat', context: `Lauréat majeur à ${input.ageDuringSeason} ans.` })
  }

  // --- Comparaison au registre + émission des records notables ---
  const ledgerMap = new Map<string, RecordEntry>()
  for (const r of state.records ?? []) ledgerMap.set(r.id, r)
  const newRecords: RecordEntry[] = []

  for (const c of candidates) {
    const held = ledgerMap.get(c.id)
    const beats = !held
      ? true
      : c.betterIsHigher
        ? c.value > held.value
        : c.value < held.value
    if (!beats) continue
    const entry: RecordEntry = {
      id: c.id,
      label: c.label,
      scope: c.scope,
      rarity: c.rarity,
      value: c.value,
      seasonIndex: state.seasonIndex,
      age: input.ageDuringSeason,
      clubId,
      championshipId: championship.id,
      context: c.context,
    }
    ledgerMap.set(c.id, entry)
    // Notable seulement si rareté ≥ record_club (évite le spam d'accomplissements).
    if (RARITY_RANK[c.rarity] >= RARITY_RANK.record_club) newRecords.push(entry)
  }

  return { newRecords, ledger: [...ledgerMap.values()] }
}

// --------------------------------------------------------------------------
// Records de carrière (bilan de retraite)
// --------------------------------------------------------------------------

export interface CareerRecords {
  titles: number
  awards: number
  longevity: number
  clubs: number
  revenue: number
  selections: number
  /** Meilleur total sur une saison, par famille de poste jouée. */
  bestByPosition: Record<string, number>
  /** Records encore détenus (registre final). */
  held: RecordEntry[]
  /** Record le plus rare détenu. */
  rarest: RecordEntry | null
}

export function buildCareerRecords(state: CareerState): CareerRecords {
  const timeline = state.seasonTimeline
  let titles = 0
  let awards = 0
  const clubs = new Set<string>()
  const bestByPosition: Record<string, number> = {}
  for (const e of timeline) {
    for (const t of e.matchStats.trophies) {
      if (t.includes('Champion') || t.includes('Coupe') || t.includes('Vainqueur')) {
        titles += 1
      }
    }
    awards += (e.distinctions ?? []).filter((d) => d.result === 'vainqueur').length
    if (e.clubId) clubs.add(e.clubId)
    const key = e.matchStats.goals >= e.matchStats.cleanSheets ? 'offensif' : 'defensif'
    bestByPosition[key] = Math.max(bestByPosition[key] ?? 0, e.matchStats.goals + e.matchStats.assists + e.matchStats.cleanSheets)
  }
  const selections =
    typeof state.flags.nationalCaps === 'number' ? state.flags.nationalCaps : 0
  const held = state.records ?? []
  const rarest =
    held.length > 0
      ? held.reduce((best, r) =>
          RARITY_RANK[r.rarity] > RARITY_RANK[best.rarity] ? r : best,
        )
      : null
  return {
    titles,
    awards,
    longevity: state.seasonsCompleted,
    clubs: clubs.size,
    revenue: Math.round(state.wealth.cumulativeIncome),
    selections,
    bestByPosition,
    held,
    rarest,
  }
}
