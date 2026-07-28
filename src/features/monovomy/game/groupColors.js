/**
 * Couleur de chaque groupe de propriétés. Module sans dépendance : partagé par la
 * texture 3D des cases et par les titres de propriété en HTML (qui ne doivent
 * surtout pas tirer three.js dans le bundle principal).
 */
export const GROUP_COLORS = {
  brun: '#c07a3a',
  cyan: '#22c1c3',
  rose: '#ec4899',
  orange: '#f97316',
  rouge: '#ef4444',
  jaune: '#f5b21a',
  vert: '#22c55e',
  bleu: '#3b82f6',
}

/** Libellé lisible d'un groupe (affiché sur les titres de propriété). */
export const GROUP_LABEL = {
  brun: 'Brun', cyan: 'Cyan', rose: 'Rose', orange: 'Orange',
  rouge: 'Rouge', jaune: 'Jaune', vert: 'Vert', bleu: 'Bleu',
}
