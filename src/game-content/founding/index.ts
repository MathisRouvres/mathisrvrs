import type {
  HiddenTraitId,
  ResourceId,
  SportStatId,
} from '../../game-engine/types'

export interface FoundingOption {
  id: string
  label: string
  summary: string
  pros: string[]
  cons: string[]
  sportDeltas?: Partial<Record<SportStatId, number>>
  resourceDeltas?: Partial<Record<ResourceId, number>>
  hiddenDeltas?: Partial<Record<HiddenTraitId, number>>
  cashDelta?: number
  traits?: string[]
}

export interface FoundingCategory {
  id: string
  title: string
  prompt: string
  options: FoundingOption[]
}

/**
 * Six choix fondateurs — aucun option n’est dominante sur tous les axes.
 */
export const foundingCategories: FoundingCategory[] = [
  {
    id: 'social_origin',
    title: 'Origine sociale',
    prompt: 'D’où viens-tu vraiment ?',
    options: [
      {
        id: 'modest',
        label: 'Foyer modeste',
        summary: 'Peu de moyens, beaucoup de grit.',
        pros: ['Discipline élevée', 'Résistance à la pression'],
        cons: ['Finances serrées', 'Moins de réseau'],
        resourceDeltas: { discipline: 8, financesPersonnelles: -12, bienEtre: -4 },
        hiddenDeltas: { resistancePression: 6, ambition: 4, professionnalisme: 3 },
        cashDelta: -200,
        traits: ['endurant'],
      },
      {
        id: 'stable',
        label: 'Foyer stable',
        summary: 'Soutien régulier, trajectoire classique.',
        pros: ['Équilibre', 'Bien-être'],
        cons: ['Moins de feu intérieur', 'Ambition moyenne'],
        resourceDeltas: { bienEtre: 8, discipline: 2, financesPersonnelles: 4 },
        hiddenDeltas: { constance: 5, ambition: -2, loyaute: 3 },
        cashDelta: 100,
        traits: ['equilibre'],
      },
      {
        id: 'privileged',
        label: 'Foyer aisé',
        summary: 'Accès facilité, attentes élevées.',
        pros: ['Moyens', 'Opportunités'],
        cons: ['Pression familiale', 'Discipline variable'],
        resourceDeltas: { financesPersonnelles: 14, discipline: -6, popularite: 4 },
        hiddenDeltas: { ambition: 5, resistancePression: -4, professionnalisme: -2 },
        cashDelta: 400,
        traits: ['expose'],
      },
    ],
  },
  {
    id: 'football_path',
    title: 'Formation footballistique',
    prompt: 'Comment as-tu appris le jeu ?',
    options: [
      {
        id: 'street',
        label: 'Terrain vague',
        summary: 'Du béton, des duels, de l’instinct.',
        pros: ['Dribble', 'Créativité'],
        cons: ['Tactique brute', 'Discipline collective'],
        sportDeltas: { dribble: 6, technique: 4, tactique: -4, placement: -3 },
        hiddenDeltas: { adaptabilite: 5, professionnalisme: -3 },
        traits: ['instinctif'],
      },
      {
        id: 'academy',
        label: 'Centre structuré',
        summary: 'Méthode, vidéo, standards élevés.',
        pros: ['Tactique', 'Professionnalisme'],
        cons: ['Moins de folie', 'Fatigue de structure'],
        sportDeltas: { tactique: 6, placement: 4, dribble: -3, vision: 2 },
        hiddenDeltas: { professionnalisme: 6, adaptabilite: -2 },
        resourceDeltas: { discipline: 4 },
        traits: ['cadre'],
      },
      {
        id: 'hybrid',
        label: 'Parcours hybride',
        summary: 'Un peu des deux mondes.',
        pros: ['Polyvalence'],
        cons: ['Aucun pic marqué'],
        sportDeltas: { technique: 2, tactique: 2, dribble: 2 },
        hiddenDeltas: { adaptabilite: 4, constance: 2 },
        traits: ['hybride'],
      },
    ],
  },
  {
    id: 'personality',
    title: 'Personnalité',
    prompt: 'Comment te décrivent tes proches ?',
    options: [
      {
        id: 'quiet',
        label: 'Discret',
        summary: 'Observe, digère, agit.',
        pros: ['Sang-froid', 'Loyauté'],
        cons: ['Leadership discret', 'Visibilité'],
        sportDeltas: { sangFroid: 5, leadership: -4 },
        resourceDeltas: { popularite: -6 },
        hiddenDeltas: { loyaute: 6, grandsMatchs: 2 },
        traits: ['discret'],
      },
      {
        id: 'spark',
        label: 'Étincelle',
        summary: 'Charisme, phrases qui portent.',
        pros: ['Leadership', 'Popularité'],
        cons: ['Ego', 'Exposition médiatique'],
        sportDeltas: { leadership: 6, sangFroid: -3 },
        resourceDeltas: { popularite: 8, cohesionVestiaire: 2 },
        hiddenDeltas: { ambition: 4, loyaute: -3, constance: -2 },
        traits: ['charismatique'],
      },
      {
        id: 'competitor',
        label: 'Compétiteur',
        summary: 'Gagner n’est pas optionnel.',
        pros: ['Ambition', 'Grands matchs'],
        cons: ['Tension vestiaire', 'Bien-être'],
        sportDeltas: { sangFroid: 2 },
        resourceDeltas: { cohesionVestiaire: -4, bienEtre: -3, moral: 3 },
        hiddenDeltas: { ambition: 7, grandsMatchs: 5, fragilitePhysique: 2 },
        traits: ['competiteur'],
      },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Hygiène de vie',
    prompt: 'Hors du terrain, tu es…',
    options: [
      {
        id: 'ascetic',
        label: 'Rigoureux',
        summary: 'Sommeil, nutrition, routines.',
        pros: ['Santé', 'Discipline'],
        cons: ['Moins de réseau social', 'Rigidité'],
        resourceDeltas: { sante: 8, discipline: 6, bienEtre: 2, fatigue: -4 },
        hiddenDeltas: { fragilitePhysique: -6, professionnalisme: 4 },
        sportDeltas: { endurance: 3 },
        traits: ['rigoureux'],
      },
      {
        id: 'balanced_life',
        label: 'Équilibré',
        summary: 'Sérieux sans se priver de tout.',
        pros: ['Stabilité'],
        cons: ['Pics limités'],
        resourceDeltas: { sante: 3, bienEtre: 5, discipline: 2 },
        hiddenDeltas: { constance: 4 },
        traits: ['pose'],
      },
      {
        id: 'nightlife',
        label: 'Noctambule',
        summary: 'La ville appelle parfois.',
        pros: ['Popularité', 'Relâchement social'],
        cons: ['Fatigue', 'Risque santé'],
        resourceDeltas: {
          popularite: 6,
          fatigue: 8,
          sante: -6,
          discipline: -5,
          bienEtre: 2,
        },
        hiddenDeltas: { fragilitePhysique: 5, professionnalisme: -5 },
        traits: ['noctambule'],
      },
    ],
  },
  {
    id: 'family_circle',
    title: 'Entourage familial',
    prompt: 'Qui veille sur toi ?',
    options: [
      {
        id: 'close_family',
        label: 'Famille très présente',
        summary: 'Soutien permanent, avis nombreux.',
        pros: ['Moral', 'Loyauté'],
        cons: ['Pression affective', 'Indépendance'],
        resourceDeltas: { moral: 6, bienEtre: 4 },
        hiddenDeltas: { loyaute: 5, ambition: -2 },
        traits: ['ancre'],
      },
      {
        id: 'distant_family',
        label: 'Famille à distance',
        summary: 'Tu gères presque seul.',
        pros: ['Autonomie', 'Adaptabilité'],
        cons: ['Soutien émotionnel faible'],
        resourceDeltas: { moral: -3, bienEtre: -2 },
        hiddenDeltas: { adaptabilite: 6, loyaute: -2, resistancePression: 3 },
        traits: ['autonome'],
      },
      {
        id: 'mentor_family',
        label: 'Mentor familial sportif',
        summary: 'Un proche a déjà vécu le haut niveau.',
        pros: ['Conseils', 'Professionnalisme'],
        cons: ['Comparaisons', 'Ambition forcée'],
        resourceDeltas: { confianceEntraineur: 3, discipline: 3 },
        hiddenDeltas: { professionnalisme: 5, ambition: 3, resistancePression: -2 },
        traits: ['herite'],
      },
    ],
  },
  {
    id: 'priority',
    title: 'Priorité études / football',
    prompt: 'Que mets-tu devant ?',
    options: [
      {
        id: 'football_first',
        label: 'Football d’abord',
        summary: 'Tout pour percer.',
        pros: ['Progression sport', 'Ambition'],
        cons: ['Filet de sécurité faible', 'Stress'],
        sportDeltas: { technique: 3, endurance: 2 },
        resourceDeltas: { bienEtre: -3 },
        hiddenDeltas: { ambition: 6, adaptabilite: -2 },
        traits: ['focalise'],
      },
      {
        id: 'studies_first',
        label: 'Études d’abord',
        summary: 'Le ballon, mais un plan B.',
        pros: ['Bien-être mental', 'Perspective'],
        cons: ['Moins d’heures techniques'],
        sportDeltas: { technique: -3, vision: 2 },
        resourceDeltas: { bienEtre: 6, discipline: 3 },
        hiddenDeltas: { ambition: -3, professionnalisme: 2, adaptabilite: 3 },
        traits: ['prudent'],
      },
      {
        id: 'dual_track',
        label: 'Double projet',
        summary: 'Tu jongles — coûteux mais riche.',
        pros: ['Polyvalence de vie'],
        cons: ['Fatigue chronique légère'],
        sportDeltas: { tactique: 2 },
        resourceDeltas: { fatigue: 5, bienEtre: 2, discipline: 2 },
        hiddenDeltas: { constance: 3, adaptabilite: 4, fragilitePhysique: 2 },
        traits: ['double_projet'],
      },
    ],
  },
]

export function getFoundingCategory(id: string): FoundingCategory | undefined {
  return foundingCategories.find((c) => c.id === id)
}

export function getFoundingOption(
  categoryId: string,
  optionId: string,
): FoundingOption | undefined {
  return getFoundingCategory(categoryId)?.options.find((o) => o.id === optionId)
}
