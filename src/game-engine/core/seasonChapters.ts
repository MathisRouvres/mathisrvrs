import type { GameMode } from '../types/career'
import type { SeasonChapterDefinition } from '../types/season'

/** Structure Standard d’une saison. */
export const STANDARD_SEASON_CHAPTERS: SeasonChapterDefinition[] = [
  {
    id: 'preseason',
    label: 'Pré-saison',
    beatTypes: ['training', 'contract_relation', 'narrative'],
  },
  {
    id: 'first_half',
    label: 'Première partie de saison',
    beatTypes: ['sport_sim', 'match_moment', 'narrative', 'training'],
  },
  {
    id: 'window',
    label: 'Mercato / trêve',
    beatTypes: ['contract_relation', 'delayed_consequence', 'narrative'],
  },
  {
    id: 'second_half',
    label: 'Deuxième partie de saison',
    beatTypes: ['sport_sim', 'match_moment', 'training', 'narrative'],
  },
  {
    id: 'review',
    label: 'Bilan de fin de saison',
    beatTypes: ['contract_relation', 'delayed_consequence', 'narrative'],
  },
]

export function chaptersForMode(mode: GameMode): SeasonChapterDefinition[] {
  if (mode === 'express') {
    return [
      {
        id: 'review',
        label: 'Saison condensée',
        beatTypes: ['sport_sim', 'narrative', 'contract_relation'],
      },
    ]
  }
  if (mode === 'immersion') {
    return [
      ...STANDARD_SEASON_CHAPTERS.slice(0, 2),
      {
        id: 'first_half',
        label: 'Moment de match additionnel',
        beatTypes: ['match_moment', 'narrative'],
      },
      ...STANDARD_SEASON_CHAPTERS.slice(2),
    ]
  }
  return STANDARD_SEASON_CHAPTERS
}
