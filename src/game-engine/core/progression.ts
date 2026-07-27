import type { CareerState, SportStatId } from '../types/career'
import type { SeasonSimulationResult } from '../types/season'
import { SPORT_STAT_LABELS } from './playerCreationTypes'
import { clamp } from './clamp'
import { positionOverall } from './positionCurves'
import { trophyMeta } from './trophy'
import { getClubById } from '../../game-content/clubs'

/**
 * Digest de progression (Phase 14) — données PRÊTES pour l'affichage. Toute la
 * dérivation vit ici (moteur pur) ; les composants ne font que formater/animer,
 * sans aucune logique métier. Ne révèle aucune conséquence cachée ni formule.
 */

// --------------------------------------------------------------------------
// Paliers de carrière (§4)
// --------------------------------------------------------------------------

export interface CareerLevelTier {
  id: string
  label: string
  rank: number
  /** Niveau minimal d'entrée dans le palier. */
  min: number
}

/** Échelle de 10 paliers, dérivée du niveau (courbe Phase 13). */
export const CAREER_LEVELS: CareerLevelTier[] = [
  { rank: 0, id: 'centre', label: 'Joueur du centre', min: 0 },
  { rank: 1, id: 'jeune_pro', label: 'Jeune professionnel', min: 46 },
  { rank: 2, id: 'rotation', label: 'Joueur de rotation', min: 54 },
  { rank: 3, id: 'titulaire', label: 'Titulaire', min: 60 },
  { rank: 4, id: 'important', label: 'Joueur important', min: 66 },
  { rank: 5, id: 'cadre', label: 'Cadre', min: 72 },
  { rank: 6, id: 'star_champ', label: 'Star du championnat', min: 77 },
  { rank: 7, id: 'international', label: 'International', min: 82 },
  { rank: 8, id: 'star_mondiale', label: 'Star mondiale', min: 87 },
  { rank: 9, id: 'legende', label: 'Légende', min: 92 },
]

export function deriveCareerLevel(niveau: number): CareerLevelTier {
  let tier = CAREER_LEVELS[0]!
  for (const t of CAREER_LEVELS) if (niveau >= t.min) tier = t
  return tier
}

export interface CareerLevelView {
  previous: CareerLevelTier | null
  current: CareerLevelTier
  next: CareerLevelTier | null
  /** Avancement vers le prochain palier (0–1). */
  progressToNext: number
  /** A-t-on changé de palier cette saison ? */
  promoted: boolean
  trajectory: { id: string; label: string }
}

export function buildCareerLevelView(
  niveauBefore: number,
  niveauAfter: number,
  trajectory: { id: string; label: string },
): CareerLevelView {
  const current = deriveCareerLevel(niveauAfter)
  const prevTier = deriveCareerLevel(niveauBefore)
  const next = CAREER_LEVELS[current.rank + 1] ?? null
  const span = next ? next.min - current.min : 1
  const progressToNext = next
    ? clamp((niveauAfter - current.min) / Math.max(1, span), 0, 1)
    : 1
  return {
    previous: prevTier.rank !== current.rank ? prevTier : null,
    current,
    next,
    progressToNext,
    promoted: current.rank > prevTier.rank,
    trajectory,
  }
}

// --------------------------------------------------------------------------
// Compétences modifiées (§6)
// --------------------------------------------------------------------------

export type SkillCause =
  | 'temps_de_jeu'
  | 'saison_exceptionnelle'
  | 'retour_blessure'
  | 'nouveau_role'
  | 'entrainement'
  | 'declin_physique'

export const SKILL_CAUSE_LABELS: Record<SkillCause, string> = {
  temps_de_jeu: 'Temps de jeu régulier',
  saison_exceptionnelle: 'Saison exceptionnelle',
  retour_blessure: 'Retour de blessure',
  nouveau_role: 'Nouveau rôle tactique',
  entrainement: 'Travail à l’entraînement',
  declin_physique: 'Déclin physique',
}

export interface SkillChange {
  id: SportStatId
  label: string
  before: number
  after: number
  delta: number
  direction: 'up' | 'down'
  cause: SkillCause
}

export interface SkillCauseContext {
  minutes: number
  averageRating: number
  progressionLabel: SeasonSimulationResult['progressionLabel']
  positionSwitch: boolean
  returningFromInjury: boolean
}

function positiveCause(ctx: SkillCauseContext): SkillCause {
  if (ctx.positionSwitch) return 'nouveau_role'
  if (ctx.progressionLabel === 'exceptionnelle' || ctx.averageRating >= 7.6)
    return 'saison_exceptionnelle'
  if (ctx.returningFromInjury) return 'retour_blessure'
  if (ctx.minutes >= 1800) return 'temps_de_jeu'
  return 'entrainement'
}

/** Compétences réellement modifiées (affichées arrondies), triées par ampleur. */
export function buildSkillChanges(
  statsBefore: Record<string, number>,
  statsAfter: Record<string, number>,
  ctx: SkillCauseContext,
  limit = 5,
): SkillChange[] {
  const up = positiveCause(ctx)
  const changes: SkillChange[] = []
  for (const id of Object.keys(statsAfter) as SportStatId[]) {
    const before = Math.round(statsBefore[id] ?? 0)
    const after = Math.round(statsAfter[id] ?? 0)
    const delta = after - before
    if (delta === 0) continue
    changes.push({
      id,
      label: SPORT_STAT_LABELS[id] ?? id,
      before,
      after,
      delta,
      direction: delta > 0 ? 'up' : 'down',
      cause: delta > 0 ? up : 'declin_physique',
    })
  }
  changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return changes.slice(0, limit)
}

// --------------------------------------------------------------------------
// Digest complet de la saison (§3)
// --------------------------------------------------------------------------

export interface SeasonProgressionInput {
  statsBefore: Record<string, number>
  statsAfter: Record<string, number>
  positionId: string
  reputationBefore: number
  reputationAfter: number
  statusBefore: string | null
  statusAfter: string | null
  salaryBefore: number
  salaryAfter: number
  /** Trophées collectifs officiels gagnés cette saison (libellés). */
  palmares: string[]
  trajectory: { id: string; label: string }
  cause: SkillCauseContext
}

export interface SeasonProgression {
  niveau: { before: number; after: number; delta: number }
  reputation: { before: number; after: number; delta: number }
  status: { before: string; after: string } | null
  salary: { before: number; after: number } | null
  skills: SkillChange[]
  level: CareerLevelView
  palmares: string[]
}

export function buildSeasonProgression(
  input: SeasonProgressionInput,
): SeasonProgression {
  const niveauBefore = Math.round(positionOverall(input.statsBefore, input.positionId))
  const niveauAfter = Math.round(positionOverall(input.statsAfter, input.positionId))
  const repBefore = Math.round(input.reputationBefore)
  const repAfter = Math.round(input.reputationAfter)
  return {
    niveau: { before: niveauBefore, after: niveauAfter, delta: niveauAfter - niveauBefore },
    reputation: { before: repBefore, after: repAfter, delta: repAfter - repBefore },
    status:
      input.statusBefore && input.statusAfter && input.statusBefore !== input.statusAfter
        ? { before: input.statusBefore, after: input.statusAfter }
        : null,
    salary:
      Math.round(input.salaryBefore) !== Math.round(input.salaryAfter)
        ? { before: Math.round(input.salaryBefore), after: Math.round(input.salaryAfter) }
        : null,
    skills: buildSkillChanges(input.statsBefore, input.statsAfter, input.cause),
    level: buildCareerLevelView(niveauBefore, niveauAfter, input.trajectory),
    palmares: input.palmares,
  }
}

// --------------------------------------------------------------------------
// Cartes de timeline (§8) — synthèse par saison, prête à afficher
// --------------------------------------------------------------------------

export interface TimelineCard {
  seasonIndex: number
  age: number
  clubName: string
  clubId: string | null
  level: number | null
  rank: number | null
  leagueSize: number | null
  division: 1 | 2 | null
  /** Trophées collectifs officiels (libellés courts). */
  trophies: string[]
  /** Distinctions individuelles remportées. */
  awards: number
  /** Records notables établis. */
  records: number
  keyEvent: string | null
}

/** Cartes synthétiques de la timeline (plus récentes d'abord). */
export function buildTimelineCards(state: CareerState): TimelineCard[] {
  return state.seasonTimeline
    .map((e): TimelineCard => ({
      seasonIndex: e.seasonIndex,
      age: e.age,
      clubName: getClubById(e.clubId ?? '')?.name ?? 'Sans club',
      clubId: e.clubId,
      level: typeof e.level === 'number' ? e.level : null,
      rank: typeof e.clubRank === 'number' ? e.clubRank : null,
      leagueSize: null,
      division: e.division ?? null,
      trophies: e.matchStats.trophies.filter((t) => trophyMeta(t).official),
      awards: (e.distinctions ?? []).filter((d) => d.result === 'vainqueur').length,
      records: (e.records ?? []).length,
      keyEvent: e.keyEvent ?? null,
    }))
    .reverse()
}
