import { describe, expect, it } from 'vitest'
import { createCareer } from '../index'
import { careerSavePackageSchema } from './schemas'
import { getCountryById } from '../../game-content/countries'

const INPUT = { countryId: 'cote-brumeuse', macroPosition: 'midfielder' } as const

describe('choix du genre de carrière', () => {
  it('défaut = carrière masculine, prénom masculin', () => {
    const pkg = createCareer({ ...INPUT, seed: 'g-default' })
    const country = getCountryById('cote-brumeuse')!
    expect(pkg.playerProfile.gender).toBe('male')
    expect(country.firstNames).toContain(pkg.playerProfile.firstName)
  })

  it('carrière féminine → prénom féminin', () => {
    const pkg = createCareer({ ...INPUT, gender: 'female', seed: 'g-fem' })
    const country = getCountryById('cote-brumeuse')!
    expect(pkg.playerProfile.gender).toBe('female')
    expect(country.firstNamesFemale).toContain(pkg.playerProfile.firstName)
  })

  it('déterministe : même seed + même genre → même prénom', () => {
    const a = createCareer({ ...INPUT, gender: 'female', seed: 'g-repro' })
    const b = createCareer({ ...INPUT, gender: 'female', seed: 'g-repro' })
    expect(a.playerProfile.firstName).toBe(b.playerProfile.firstName)
  })

  it('sauvegarde sans genre → « male » par défaut (rétrocompat)', () => {
    const pkg = createCareer({ ...INPUT, seed: 'g-old' })
    const profile = { ...pkg.playerProfile } as Record<string, unknown>
    delete profile.gender
    const parsed = careerSavePackageSchema.parse({
      ...pkg,
      playerProfile: profile,
    })
    expect(parsed.playerProfile.gender).toBe('male')
  })
})
