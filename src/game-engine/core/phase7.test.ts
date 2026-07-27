import { describe, expect, it } from 'vitest'
import {
  SAVE_SCHEMA_VERSION,
  completeSeason,
  createCareer,
  createNpcs,
  getNextDilemma,
  getPastEcho,
  interpolateDilemma,
  interpolateNpcText,
  migrateCareerSave,
  resolveDilemmaChoice,
  simulateRivalSeason,
} from '../index'
import { resolveDilemmaChoice as resolveEngine } from '../dilemmas/resolveChoice'
import { evaluateCondition } from '../dilemmas/eligibility'
import type { CareerSavePackage } from '../types'
import type { DilemmaDefinition } from '../dilemmas/types'

function makePkg(seed: string): CareerSavePackage {
  return createCareer({
    countryId: 'baie-lumen',
    macroPosition: 'attacker',
    seed,
  })
}

function playSeason(pkg: CareerSavePackage): CareerSavePackage {
  const d1 = getNextDilemma(pkg)!
  const r1 = resolveDilemmaChoice(pkg, d1, d1.choices[0]!.id)
  const d2 = getNextDilemma(r1.package)!
  const r2 = resolveDilemmaChoice(r1.package, d2, d2.choices[0]!.id)
  return completeSeason(r2.package).package
}

function sampleDilemma(
  overrides: Partial<DilemmaDefinition> = {},
): DilemmaDefinition {
  return {
    id: 'p7_test_event',
    version: 1,
    title: 'Face à {rival}',
    body: 'Ton duel contre {rival} et les mots de {coach} résonnent encore dans le couloir du stade avant le coup d’envoi décisif.',
    category: 'rivalry',
    tags: [],
    rarity: 'common',
    weight: 10,
    ageMin: 14,
    ageMax: 55,
    positions: null,
    careerStages: null,
    prerequisites: [],
    exclusions: [],
    cooldownSeasons: 2,
    unique: false,
    expiresAtSeason: null,
    followUpEventIds: [],
    echoes: [
      {
        flag: 'coach_feud',
        text: '{years} saisons plus tôt, tu avais défié {coach} devant le groupe.',
      },
    ],
    choices: [
      {
        id: 'a',
        label: 'Défier {rival} devant la presse',
        stance: 'media_savvy',
        riskPreview: 'Duel assumé.',
        immediate: [
          { type: 'delta', target: { kind: 'resource', id: 'popularite' }, delta: 3 },
        ],
        delayed: [],
        hidden: [],
      },
      {
        id: 'b',
        label: 'Laisser parler le terrain',
        stance: 'professional',
        riskPreview: 'Sobriété.',
        immediate: [
          { type: 'delta', target: { kind: 'resource', id: 'discipline' }, delta: 2 },
        ],
        delayed: [],
        hidden: [],
      },
    ],
    ...overrides,
  }
}

describe('personnages récurrents', () => {
  it('génère 5 personnages déterministes depuis la seed', () => {
    const a = createNpcs({ seed: 's1', countryId: 'cote-brumeuse', preciseRole: 'st', age: 16 })
    const b = createNpcs({ seed: 's1', countryId: 'cote-brumeuse', preciseRole: 'st', age: 16 })
    expect(a).toEqual(b)
    expect(a.coach.displayName.length).toBeGreaterThan(2)
    expect(a.teammate.personality).toBeTruthy()
    expect(a.agent.goal.length).toBeGreaterThan(3)
    expect(a.journalist.relation).toBeGreaterThanOrEqual(0)
  })

  it('le rival partage âge approximatif et poste', () => {
    const npcs = createNpcs({ seed: 's2', countryId: 'vallee-cendre', preciseRole: 'winger', age: 17 })
    expect(Math.abs(npcs.rival.age - 17)).toBeLessThanOrEqual(1)
    expect(npcs.rival.positionId).toBe('winger')
    expect(npcs.rival.clubId).toBeTruthy()
  })

  it('la carrière du rival évolue en parallèle, déterministe', () => {
    const npcs = createNpcs({ seed: 's3', countryId: 'baie-lumen', preciseRole: 'cm', age: 16 })
    const a = simulateRivalSeason(npcs.rival, 's3', 1, 30)
    const b = simulateRivalSeason(npcs.rival, 's3', 1, 30)
    expect(a).toEqual(b)
    expect(a.rival.age).toBe(npcs.rival.age + 1)
    expect(a.rival.level).toBeGreaterThanOrEqual(25)
    expect(a.rival.level).toBeLessThanOrEqual(94)
  })

  it('le rival vieillit à chaque saison de la boucle express', () => {
    const pkg = makePkg('p7-rival-loop')
    const rivalAgeBefore = pkg.snapshot.state.npcs.rival.age
    const next = playSeason(pkg)
    expect(next.snapshot.state.npcs.rival.age).toBe(rivalAgeBefore + 1)
  })
})

describe('interpolation PNJ', () => {
  it('remplace les jetons par les identités générées', () => {
    const npcs = createNpcs({ seed: 's4', countryId: 'hauts-plateaux', preciseRole: 'gk', age: 16 })
    const text = interpolateNpcText('{rival} contre {coach} chez {club_rival}', npcs)
    expect(text).not.toContain('{rival}')
    expect(text).not.toContain('{coach}')
    expect(text).not.toContain('{club_rival}')
    expect(text).toContain(npcs.rival.displayName)
  })

  it('interpole titre, corps et intitulés du dilemme', () => {
    const npcs = createNpcs({ seed: 's5', countryId: 'archipel-sel', preciseRole: 'cb', age: 16 })
    const out = interpolateDilemma(sampleDilemma(), npcs)
    expect(out.title).not.toContain('{rival}')
    expect(out.body).not.toContain('{coach}')
    expect(out.choices[0]!.label).not.toContain('{rival}')
  })
})

describe('échos du passé', () => {
  it('renvoie null sans flag, la mention avec flag + calcul {years}', () => {
    const pkg = makePkg('p7-echo')
    const dilemma = sampleDilemma()
    expect(getPastEcho(dilemma, pkg.snapshot.state)).toBeNull()

    const flagged = {
      ...pkg.snapshot.state,
      seasonIndex: 5,
      flags: {
        ...pkg.snapshot.state.flags,
        coach_feud: true,
        'flagSeason:coach_feud': 2,
      },
    }
    const echo = getPastEcho(dilemma, flagged)
    expect(echo).not.toBeNull()
    expect(echo).toContain('3 saisons plus tôt')
    expect(echo).not.toContain('{coach}')
  })

  it('setFlag horodate automatiquement la saison (flagSeason)', () => {
    const pkg = makePkg('p7-stamp')
    const event = sampleDilemma({
      id: 'p7_stamp_event',
      choices: [
        {
          id: 'set',
          label: 'Poser le flag',
          stance: 'prudent',
          riskPreview: 'Test.',
          immediate: [{ type: 'setFlag', key: 'coach_feud', value: true }],
          delayed: [],
          hidden: [],
        },
        {
          id: 'other',
          label: 'Autre voie',
          stance: 'ambitious',
          riskPreview: 'Test.',
          immediate: [
            { type: 'delta', target: { kind: 'resource', id: 'moral' }, delta: 1 },
          ],
          delayed: [],
          hidden: [],
        },
      ],
    })
    const { package: next } = resolveEngine(pkg, event, 'set')
    expect(next.snapshot.state.flags.coach_feud).toBe(true)
    expect(next.snapshot.state.flags['flagSeason:coach_feud']).toBe(
      pkg.snapshot.state.seasonIndex,
    )
  })
})

describe('conditions Phase 7', () => {
  it('country et relations rival', () => {
    const pkg = makePkg('p7-cond')
    const state = pkg.snapshot.state
    expect(
      evaluateCondition(
        { type: 'country', ids: ['baie-lumen'] },
        state,
        pkg.playerProfile,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        { type: 'country', ids: ['vallee-cendre'] },
        state,
        pkg.playerProfile,
      ),
    ).toBe(false)
    const rel = state.npcs.rival.relation
    expect(
      evaluateCondition(
        { type: 'minRivalRelation', value: rel },
        state,
        pkg.playerProfile,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        { type: 'maxRivalRelation', value: rel - 1 },
        state,
        pkg.playerProfile,
      ),
    ).toBe(false)
  })
})

describe('migration v4 → v5', () => {
  it('ajoute les personnages aux sauvegardes v4, déterministe depuis la seed', () => {
    const modern = makePkg('p7-migrate')
    const state = { ...modern.snapshot.state } as Record<string, unknown>
    delete state.npcs
    const rawV4 = {
      ...modern,
      schemaVersion: 4,
      snapshot: {
        ...modern.snapshot,
        saveSchemaVersion: 4,
        state,
      },
    }
    const migrated = migrateCareerSave(rawV4)
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.snapshot.state.npcs.rival.positionId).toBe(
      modern.snapshot.state.preciseRole,
    )
    const again = migrateCareerSave(rawV4)
    expect(again.snapshot.state.npcs).toEqual(migrated.snapshot.state.npcs)
  })
})

describe('héritage sans trophée majeur', () => {
  it('fidélité et relations font grimper le score, saison après saison', () => {
    let pkg = makePkg('p7-legacy')
    const scores: number[] = [pkg.snapshot.state.provisionalLegacyScore]
    for (let i = 0; i < 3; i += 1) {
      pkg = playSeason(pkg)
      scores.push(pkg.snapshot.state.provisionalLegacyScore)
    }
    expect(scores[3]!).toBeGreaterThan(scores[0]!)
    expect(scores[1]!).toBeGreaterThanOrEqual(scores[0]!)
    const tenure = pkg.snapshot.state.flags.clubTenure
    expect(typeof tenure).toBe('number')
  })
})
