export interface OriginDefinition {
  id: string
  label: string
  region: string
  blurb: string
}

/** Origines réelles — ids inchangés (voir countries/clubs). */
export const origins: OriginDefinition[] = [
  {
    id: 'cote-brumeuse',
    label: 'France',
    region: 'Europe de l’Ouest',
    blurb: 'Centres de formation réputés, culture du travail.',
  },
  {
    id: 'baie-lumen',
    label: 'Espagne',
    region: 'Péninsule Ibérique',
    blurb: 'École technique, jeu de position, exigence du résultat.',
  },
  {
    id: 'hauts-plateaux',
    label: 'Allemagne',
    region: 'Europe centrale',
    blurb: 'Intensité athlétique, rigueur, stades bouillants.',
  },
  {
    id: 'archipel-sel',
    label: 'Portugal',
    region: 'Péninsule Ibérique',
    blurb: 'Tremplin des jeunes talents, jeu rapide.',
  },
  {
    id: 'capitale-miroir',
    label: 'Angleterre',
    region: 'Îles Britanniques',
    blurb: 'Rythme fou, concurrence féroce, projecteurs mondiaux.',
  },
  {
    id: 'vallee-cendre',
    label: 'Italie',
    region: 'Europe du Sud',
    blurb: 'Culture tactique, art défensif, intensité du calcio.',
  },
]

export function getOriginById(id: string): OriginDefinition | undefined {
  return origins.find((o) => o.id === id)
}
