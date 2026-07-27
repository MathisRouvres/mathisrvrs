import type { CompetitionDefinition } from '../../game-engine/types'

/** Compétitions fictives. */
export const competitions: CompetitionDefinition[] = [
  {
    id: 'liga-aether',
    name: 'Ligue Æther',
    tier: 1,
    region: 'Continent Nord',
  },
  {
    id: 'coupe-miroirs',
    name: 'Coupe des Miroirs',
    tier: 1,
    region: 'International',
  },
  {
    id: 'championnat-jeunes-brume',
    name: 'Championnat Jeunes de la Brume',
    tier: 4,
    region: 'Côte Brumeuse',
  },
]

export function getCompetitionById(
  id: string,
): CompetitionDefinition | undefined {
  return competitions.find((c) => c.id === id)
}
