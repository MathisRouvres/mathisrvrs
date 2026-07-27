import type { SportStatId } from '../../game-engine/types'

export interface PlaystyleDefinition {
  id: string
  label: string
  blurb: string
  deltas: Partial<Record<SportStatId, number>>
}

export const playstyles: PlaystyleDefinition[] = [
  {
    id: 'architect',
    label: 'Architecte',
    blurb: 'Dictes le tempo, cherches la faille.',
    deltas: { vision: 4, passe: 4, technique: 2, vitesse: -2 },
  },
  {
    id: 'pressing',
    label: 'Presseur',
    blurb: 'Intensité constante, récupération haute.',
    deltas: { endurance: 5, defense: 3, puissance: 2, technique: -2 },
  },
  {
    id: 'duelist',
    label: 'Duelliste',
    blurb: 'Un-contre-un, verticalité.',
    deltas: { dribble: 5, vitesse: 3, tir: 2, placement: -2 },
  },
  {
    id: 'anchor',
    label: 'Pilier',
    blurb: 'Solidité, lectures, sobriété.',
    deltas: { placement: 4, defense: 3, sangFroid: 3, dribble: -3 },
  },
  {
    id: 'finisher',
    label: 'Finisseur',
    blurb: 'Dans la surface, tu existes.',
    deltas: { finition: 5, tir: 3, sangFroid: 2, passe: -2 },
  },
]

export function getPlaystyleById(id: string): PlaystyleDefinition | undefined {
  return playstyles.find((p) => p.id === id)
}
