export interface VisualIdentity {
  id: string
  label: string
  /** Teinte CSS pour la carte joueur (fictionnelle). */
  accent: string
  pattern: 'solid' | 'stripe' | 'fade'
}

export const visuals: VisualIdentity[] = [
  { id: 'slate', label: 'Ardoise', accent: '#64748b', pattern: 'solid' },
  { id: 'tide', label: 'Marée', accent: '#0ea5e9', pattern: 'fade' },
  { id: 'ember', label: 'Braise', accent: '#f97316', pattern: 'stripe' },
  { id: 'moss', label: 'Mousse', accent: '#22c55e', pattern: 'solid' },
  { id: 'violet-dusk', label: 'Crépuscule', accent: '#8b5cf6', pattern: 'fade' },
]

export function getVisualById(id: string): VisualIdentity | undefined {
  return visuals.find((v) => v.id === id)
}
