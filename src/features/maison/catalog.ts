/**
 * Catégories des tâches maison et idées prêtes à ajouter (« Idées » de la fenêtre Nouvelle tâche).
 * Les identifiants de catégorie sont aussi validés par `public/maison-api.php` (CATEGORIES).
 */
import type { Repeat } from './recurrence'

export interface Category {
  id: string
  label: string
  emoji: string
}

export const CATEGORIES: Category[] = [
  { id: 'menage', label: 'Ménage', emoji: '🧽' },
  { id: 'cuisine', label: 'Cuisine', emoji: '🍳' },
  { id: 'linge', label: 'Linge', emoji: '🧺' },
  { id: 'courses', label: 'Courses', emoji: '🛒' },
  { id: 'dechets', label: 'Déchets', emoji: '🗑️' },
  { id: 'exterieur', label: 'Extérieur', emoji: '🌿' },
  { id: 'animaux', label: 'Animaux', emoji: '🐾' },
  { id: 'admin', label: 'Papiers', emoji: '📄' },
  { id: 'entretien', label: 'Entretien', emoji: '🔧' },
  { id: 'autre', label: 'Autre', emoji: '📌' },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function categoryOf(id: string): Category {
  return BY_ID.get(id) ?? BY_ID.get('autre')!
}

export interface Suggestion {
  title: string
  category: string
  repeat: Repeat
  every: number
  /** Jours ISO proposés pour une tâche hebdomadaire (vide = jour de la date de début). */
  weekdays: number[]
  duration: number | null
}

const s = (
  title: string,
  category: string,
  repeat: Repeat,
  every = 1,
  weekdays: number[] = [],
  duration: number | null = null,
): Suggestion => ({ title, category, repeat, every, weekdays, duration })

/** Tâches courantes d'un foyer, avec un rythme raisonnable par défaut (modifiable avant l'ajout). */
export const SUGGESTIONS: Suggestion[] = [
  s('Vaisselle / lave-vaisselle', 'cuisine', 'daily', 1, [], 15),
  s('Préparer le repas du soir', 'cuisine', 'daily', 1, [], 45),
  s('Nettoyer le plan de travail', 'cuisine', 'daily', 1, [], 5),
  s('Vider le frigo des restes', 'cuisine', 'weekly', 1, [7], 10),
  s('Nettoyer le frigo', 'cuisine', 'monthly', 1, [], 30),
  s('Nettoyer le four et les plaques', 'cuisine', 'monthly', 1, [], 30),
  s('Détartrer la bouilloire / cafetière', 'cuisine', 'monthly', 2, [], 15),
  s('Passer l’aspirateur', 'menage', 'weekly', 1, [3, 6], 30),
  s('Laver les sols', 'menage', 'weekly', 1, [6], 30),
  s('Nettoyer la salle de bain', 'menage', 'weekly', 1, [6], 30),
  s('Nettoyer les toilettes', 'menage', 'weekly', 1, [3, 7], 10),
  s('Faire la poussière', 'menage', 'weekly', 2, [6], 20),
  s('Laver les vitres', 'menage', 'monthly', 2, [], 60),
  s('Lessive', 'linge', 'weekly', 1, [2, 6], 10),
  s('Étendre / plier le linge', 'linge', 'weekly', 1, [2, 6], 20),
  s('Changer les draps', 'linge', 'weekly', 2, [7], 20),
  s('Laver les serviettes', 'linge', 'weekly', 1, [4], 10),
  s('Repassage', 'linge', 'weekly', 1, [7], 30),
  s('Faire les courses', 'courses', 'weekly', 1, [6], 60),
  s('Planifier les repas de la semaine', 'courses', 'weekly', 1, [7], 15),
  s('Sortir les poubelles', 'dechets', 'weekly', 1, [1, 4], 5),
  s('Sortir le tri / recyclage', 'dechets', 'weekly', 1, [3], 5),
  s('Descendre le verre', 'dechets', 'weekly', 2, [6], 10),
  s('Arroser les plantes', 'exterieur', 'weekly', 1, [3, 7], 10),
  s('Tondre la pelouse', 'exterieur', 'weekly', 2, [6], 45),
  s('Balayer le balcon / la terrasse', 'exterieur', 'weekly', 2, [6], 15),
  s('Nourrir les animaux', 'animaux', 'daily', 1, [], 5),
  s('Changer la litière', 'animaux', 'weekly', 1, [3, 7], 10),
  s('Promener le chien', 'animaux', 'daily', 1, [], 30),
  s('Payer le loyer', 'admin', 'monthly', 1, [], 5),
  s('Trier le courrier et les papiers', 'admin', 'weekly', 1, [7], 15),
  s('Relever les compteurs', 'admin', 'monthly', 1, [], 5),
  s('Changer le filtre de la hotte', 'entretien', 'monthly', 3, [], 15),
  s('Nettoyer le filtre du lave-linge', 'entretien', 'monthly', 2, [], 15),
  s('Vérifier le détecteur de fumée', 'entretien', 'monthly', 6, [], 5),
  s('Dégivrer le congélateur', 'entretien', 'yearly', 1, [], 60),
]

/** Couleurs proposées pour une personne (assez foncées pour une initiale blanche en gras). */
export const PERSON_COLORS: Array<{ value: string; name: string }> = [
  { value: '#0284c7', name: 'Bleu' },
  { value: '#7c3aed', name: 'Violet' },
  { value: '#ea580c', name: 'Orange' },
  { value: '#059669', name: 'Vert' },
  { value: '#db2777', name: 'Rose' },
  { value: '#ca8a04', name: 'Jaune' },
  { value: '#4f46e5', name: 'Indigo' },
  { value: '#0d9488', name: 'Turquoise' },
  { value: '#dc2626', name: 'Rouge' },
  { value: '#65a30d', name: 'Vert clair' },
]
