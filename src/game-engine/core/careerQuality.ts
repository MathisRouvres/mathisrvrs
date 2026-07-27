import type { CareerState, SportStatId } from '../types/career'
import type { SeasonSimulationResult } from '../types/season'
import { getPositionById } from '../../game-content/positions'
import { SPORT_STAT_LABELS } from './playerCreationTypes'

/**
 * Dérivations UI read-only — libellés qualitatifs, trajectoire, paliers,
 * attributs par poste. Aucune logique déterministe du moteur ici : uniquement
 * de la lecture d'état déjà calculé, pour que les composants restent « bêtes »
 * (§15). Ne révèle jamais une valeur cachée exacte (§4).
 */

export type TrajectoryId =
  | 'debut'
  | 'rapide'
  | 'reguliere'
  | 'stable'
  | 'sommet'
  | 'difficile'
  | 'declin'

export interface Trajectory {
  id: TrajectoryId
  label: string
}

/** Étiquette d'incertitude du potentiel — jamais la valeur cachée (§4). */
export function potentialLabelFromStars(stars: number): string {
  if (stars >= 5) return 'Potentiel d’élite'
  if (stars >= 4) return 'Grand espoir'
  if (stars >= 3) return 'Bel espoir'
  if (stars >= 2) return 'Profil prometteur'
  return 'Potentiel encore incertain'
}

const PROGRESSION_TO_TRAJECTORY: Record<
  SeasonSimulationResult['progressionLabel'],
  Trajectory
> = {
  exceptionnelle: { id: 'rapide', label: 'Progression fulgurante' },
  forte: { id: 'rapide', label: 'En forte progression' },
  positive: { id: 'reguliere', label: 'En progression' },
  stable: { id: 'stable', label: 'Trajectoire stable' },
  regression: { id: 'difficile', label: 'Période difficile' },
  blessure: { id: 'difficile', label: 'Ralenti par les blessures' },
  sans_temps_de_jeu: { id: 'difficile', label: 'En manque de temps de jeu' },
}

/**
 * Trajectoire lisible sans explication (§11), dérivée de la dernière saison
 * simulée, du palier et du meilleur niveau atteint.
 */
export function deriveTrajectory(state: CareerState): Trajectory {
  const timeline = state.seasonTimeline
  const peak =
    typeof state.flags.peakLevel === 'number' ? state.flags.peakLevel : 0

  if (state.careerStage === 'declin' || state.careerStage === 'fin_contrat') {
    return { id: 'declin', label: 'Déclin progressif' }
  }
  if (timeline.length === 0) {
    return { id: 'debut', label: 'Début de carrière' }
  }

  const last = timeline[timeline.length - 1]!
  const base = PROGRESSION_TO_TRAJECTORY[last.progressionLabel] ?? {
    id: 'stable' as const,
    label: 'Trajectoire stable',
  }

  // Sommet : très haut niveau atteint et saison au moins correcte.
  if (
    peak >= 78 &&
    (last.progressionLabel === 'exceptionnelle' ||
      last.progressionLabel === 'forte' ||
      last.progressionLabel === 'positive' ||
      last.progressionLabel === 'stable')
  ) {
    return { id: 'sommet', label: 'Proche du très haut niveau' }
  }
  return base
}

export type CareerTierId =
  | 'compliquee'
  | 'correcte'
  | 'belle'
  | 'grande'
  | 'exceptionnelle'
  | 'legendaire'

export interface CareerTier {
  id: CareerTierId
  label: string
  /** Rang 1–6 pour l'affichage d'une échelle. */
  rank: number
}

const CAREER_TIERS: CareerTier[] = [
  { id: 'compliquee', label: 'Carrière compliquée', rank: 1 },
  { id: 'correcte', label: 'Carrière professionnelle correcte', rank: 2 },
  { id: 'belle', label: 'Belle carrière', rank: 3 },
  { id: 'grande', label: 'Grande carrière', rank: 4 },
  { id: 'exceptionnelle', label: 'Carrière exceptionnelle', rank: 5 },
  { id: 'legendaire', label: 'Carrière légendaire', rank: 6 },
]

/**
 * Palier de réussite final (§10), émergent : dérivé du score d'héritage et du
 * meilleur niveau atteint. Utilisé au bilan de carrière, pas en cours de jeu
 * (où l'on préfère la trajectoire — §11).
 *
 * Seuils recalibrés (Phase 13) sur la NOUVELLE courbe de niveau pondérée par le
 * poste (le plateau ~65 est corrigé). Repères §3 : belle 68–78, grande 76–85,
 * exceptionnelle 83–91, légendaire 89–96. Le niveau reste une porte secondaire
 * (un fort héritage sans niveau élevé plafonne « belle »). Les issues par
 * carrière ne sont pas modifiées — seule la frontière de libellé l'est.
 */
export function deriveCareerTier(legacyScore: number, peakLevel = 0): CareerTier {
  // Seuils calibrés (Phase 15) sur la distribution émergente de la simulation de
  // masse (pic ≈ 45–84, dense 65–78). Le niveau pilote, l'héritage (qui intègre
  // trophées, distinctions, international, longévité) est une porte secondaire.
  if (peakLevel >= 83 && legacyScore >= 62) return CAREER_TIERS[5]!
  if (peakLevel >= 80 && legacyScore >= 54) return CAREER_TIERS[4]!
  if (peakLevel >= 77 && legacyScore >= 46) return CAREER_TIERS[3]!
  if (peakLevel >= 72 && legacyScore >= 40) return CAREER_TIERS[2]!
  if (peakLevel >= 67 || legacyScore >= 50) return CAREER_TIERS[1]!
  return CAREER_TIERS[0]!
}

export function listCareerTiers(): CareerTier[] {
  return CAREER_TIERS
}

export interface AttributeView {
  id: SportStatId
  label: string
  value: number
}

/**
 * ~6 attributs pertinents pour le poste précis (§5), pilotés par la donnée
 * (`evalWeights`), pas par une liste codée en dur. Ordre déterministe.
 */
export function deriveAttributes(
  preciseRole: string,
  stats: Record<SportStatId, number>,
  count = 6,
): AttributeView[] {
  const position = getPositionById(preciseRole)
  const weights = position?.evalWeights ?? {}
  const ids = (Object.keys(stats) as SportStatId[]).slice()
  ids.sort((a, b) => {
    const wa = weights[a] ?? 0
    const wb = weights[b] ?? 0
    if (wb !== wa) return wb - wa
    return 0 // ordre stable : conserve l'ordre d'insertion (SPORT_STAT_IDS)
  })
  return ids.slice(0, count).map((id) => ({
    id,
    label: SPORT_STAT_LABELS[id] ?? id,
    value: stats[id],
  }))
}
