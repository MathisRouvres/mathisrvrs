import { createGameRng } from './rng'

/**
 * Mode soft (Phase 8) — alternative NON alcoolisée à toute sanction.
 *
 * Fonction PURE et déterministe (PRNG seedé) : tous les clients dérivent la même
 * alternative sans état ni horloge locale. On évite la répétition en décalant la
 * catégorie si elle égale la précédente (`avoid`).
 */

export const SOFT_CATEGORIES = [
  'mini_defi',
  'action_sociale',
  'mime',
  'verite_legere',
  'penalite_symbolique',
  'contrainte_temp',
] as const
export type SoftCategory = (typeof SOFT_CATEGORIES)[number]

export const SOFT_CATEGORY_LABEL: Record<SoftCategory, string> = {
  mini_defi: 'Mini-défi',
  action_sociale: 'Action sociale',
  mime: 'Mime',
  verite_legere: 'Vérité légère',
  penalite_symbolique: 'Point de pénalité',
  contrainte_temp: 'Contrainte temporaire',
}

const TEMPLATES: Record<SoftCategory, string[]> = {
  mini_defi: ['Fais 5 pompes.', 'Tiens en équilibre sur un pied 15 s.', 'Récite l’alphabet à l’envers.'],
  action_sociale: ['Fais un compliment sincère à ton voisin.', 'Trinque à l’eau avec toute la table.', 'Propose un toast en 10 s.'],
  mime: ['Mime un animal, la table devine.', 'Mime ton métier 15 s.', 'Mime la dernière carte jouée.'],
  verite_legere: ['Dis un plaisir coupable.', 'Raconte une anecdote gênante soft.', 'Nomme ta chanson honteuse préférée.'],
  penalite_symbolique: ['Prends 1 point de pénalité symbolique.', 'Perds ton prochain bonus de compliment.', 'Note −1 sur l’ardoise soft.'],
  contrainte_temp: ['Interdit de rire jusqu’à ton prochain tour.', 'Parle en chuchotant un tour.', 'Garde une main derrière le dos un tour.'],
}

export interface SoftAlternative {
  category: SoftCategory
  text: string
}

/**
 * Choisit une alternative soft déterministe pour une clé donnée (ex.
 * `playerId:turnStep:outcome`). `avoid` = catégorie précédente à éviter.
 */
export function softAlternative(seed: string | number, key: string, avoid?: SoftCategory): SoftAlternative {
  const rng = createGameRng(`${seed}:${key}`)
  let idx = rng.randomInt(0, SOFT_CATEGORIES.length - 1)
  const avoidIdx = avoid ? SOFT_CATEGORIES.indexOf(avoid) : -1
  if (idx === avoidIdx) idx = (idx + 1) % SOFT_CATEGORIES.length
  const category = SOFT_CATEGORIES[idx] as SoftCategory
  const list = TEMPLATES[category]
  const text = list[rng.randomInt(0, list.length - 1)] as string
  return { category, text }
}
