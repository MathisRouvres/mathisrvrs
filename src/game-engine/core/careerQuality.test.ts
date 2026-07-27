import { describe, expect, it } from 'vitest'
import type { CareerState, SportStatId } from '../types/career'
import {
  deriveAttributes,
  deriveCareerTier,
  deriveTrajectory,
  listCareerTiers,
  potentialLabelFromStars,
} from './careerQuality'
import { SPORT_STAT_IDS } from './constants'

function statsRecord(fill: Partial<Record<SportStatId, number>> = {}): Record<
  SportStatId,
  number
> {
  const base = Object.fromEntries(
    SPORT_STAT_IDS.map((id) => [id, 40]),
  ) as Record<SportStatId, number>
  return { ...base, ...fill }
}

/** État minimal suffisant pour deriveTrajectory (lecture seule). */
function fakeState(partial: Partial<CareerState>): CareerState {
  return {
    seasonTimeline: [],
    flags: {},
    careerStage: 'progression',
    ...partial,
  } as unknown as CareerState
}

describe('potentialLabelFromStars — jamais la valeur cachée exacte', () => {
  it('mappe les étoiles vers un libellé qualitatif incertain', () => {
    expect(potentialLabelFromStars(5)).toBe('Potentiel d’élite')
    expect(potentialLabelFromStars(4)).toBe('Grand espoir')
    expect(potentialLabelFromStars(1)).toBe('Potentiel encore incertain')
    // Aucun libellé ne contient un nombre à deux chiffres (valeur cachée).
    for (let s = 1; s <= 5; s += 1) {
      expect(potentialLabelFromStars(s)).not.toMatch(/\d{2}/)
    }
  })
})

describe('deriveTrajectory', () => {
  it('affiche « Début de carrière » sans saison jouée', () => {
    expect(deriveTrajectory(fakeState({})).id).toBe('debut')
  })

  it('reflète la dernière progression simulée', () => {
    const state = fakeState({
      seasonTimeline: [
        { progressionLabel: 'positive', reputationAfter: 30 },
      ] as unknown as CareerState['seasonTimeline'],
    })
    expect(deriveTrajectory(state).label).toBe('En progression')
  })

  it('signale le très haut niveau au sommet', () => {
    const state = fakeState({
      flags: { peakLevel: 82 },
      seasonTimeline: [
        { progressionLabel: 'forte', reputationAfter: 80 },
      ] as unknown as CareerState['seasonTimeline'],
    })
    expect(deriveTrajectory(state).id).toBe('sommet')
  })

  it('détecte le déclin via le palier', () => {
    expect(deriveTrajectory(fakeState({ careerStage: 'declin' })).id).toBe(
      'declin',
    )
  })
})

describe('deriveCareerTier — 6 paliers émergents', () => {
  it('classe des scores croissants dans des paliers croissants', () => {
    // Seuils recalibrés Phase 15 (post-fix buts) sur la distribution émergente.
    expect(deriveCareerTier(10, 40).id).toBe('compliquee')
    expect(deriveCareerTier(40, 68).id).toBe('correcte')
    expect(deriveCareerTier(42, 73).id).toBe('belle')
    expect(deriveCareerTier(48, 77).id).toBe('grande')
    expect(deriveCareerTier(56, 81).id).toBe('exceptionnelle')
    expect(deriveCareerTier(64, 84).id).toBe('legendaire')
  })

  it('exige aussi le niveau pour les paliers hauts (une carrière légendaire est rare)', () => {
    // Score élevé mais niveau modeste → plafonné (le niveau est une porte).
    expect(deriveCareerTier(90, 55).id).toBe('correcte')
    expect(deriveCareerTier(90, 73).id).toBe('belle')
    expect(listCareerTiers()).toHaveLength(6)
  })
})

describe('deriveAttributes — piloté par le poste', () => {
  it('renvoie 6 attributs, le plus pondéré en tête (buteur → finition)', () => {
    const attrs = deriveAttributes('st', statsRecord({ finition: 77 }))
    expect(attrs).toHaveLength(6)
    expect(attrs[0]!.id).toBe('finition')
    expect(attrs[0]!.value).toBe(77)
    expect(attrs[0]!.label).toBe('Finition')
  })

  it('varie selon le poste (gardien → placement en tête)', () => {
    const attrs = deriveAttributes('gk', statsRecord())
    expect(attrs[0]!.id).toBe('placement')
  })

  it('est déterministe', () => {
    const a = deriveAttributes('cm', statsRecord())
    const b = deriveAttributes('cm', statsRecord())
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id))
  })
})
