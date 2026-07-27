import { describe, expect, it } from 'vitest'
import {
  validateDilemmaCatalog,
  buildDilemmaInventory,
  type CatalogValidationIssue,
} from './index'
import type { DilemmaDefinition } from './types'
import { dilemma, choice, fx } from '../../game-content/events/helpers'

const KNOWN_POS = new Set(['gk', 'cb', 'cm', 'st'])

/** Dilemme de référence — valide, sans erreur ni avertissement de qualité. */
function base(over: Partial<DilemmaDefinition> = {}): DilemmaDefinition {
  return dilemma({
    id: 'v_base',
    title: 'Titre court valide',
    body: 'Un contexte de validation raisonnable qui tient dans la fenêtre idéale de mots pour éviter tout avertissement inutile pendant les tests de ce module précis ici.',
    category: 'money',
    rarity: 'common',
    weight: 8,
    ageMin: 20,
    ageMax: 34,
    choices: [
      choice({
        id: 'a',
        label: 'Option A distincte',
        stance: 'financial',
        riskPreview: 'Gain possible, coût réel.',
        immediate: [fx.cash(5000), fx.res('moral', -3)],
        delayed: [fx.delayed(1, [fx.chance(0.3, [fx.res('moral', -2)])])],
      }),
      choice({
        id: 'b',
        label: 'Option B distincte',
        stance: 'prudent',
        riskPreview: 'Sécurité, occasion ratée.',
        immediate: [fx.res('financesPersonnelles', 4), fx.res('moral', -2)],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
    ...over,
  })
}

function codes(issues: CatalogValidationIssue[]): Set<string> {
  return new Set(issues.map((i) => i.code))
}

function run(
  events: DilemmaDefinition[],
  opts = { knownPositionIds: KNOWN_POS },
): CatalogValidationIssue[] {
  return validateDilemmaCatalog(events, opts)
}

describe('validateur — le dilemme de référence est propre', () => {
  it('aucune erreur ni avertissement de qualité', () => {
    const issues = run([base()])
    expect(issues.filter((i) => i.severity === 'error')).toEqual([])
    // Pas d'avertissement de qualité sur la référence.
    const quality = issues.filter((i) =>
      [
        'body-outside-ideal',
        'choice-all-positive',
        'choice-all-negative',
        'choice-no-uncertainty',
        'dominant-choice',
      ].includes(i.code),
    )
    expect(quality).toEqual([])
  })
})

describe('validateur — format court', () => {
  it('titre trop long', () => {
    const issues = run([base({ title: 'x'.repeat(51) })])
    expect(codes(issues).has('title-too-long')).toBe(true)
  })

  it('texte trop long', () => {
    const issues = run([base({ body: 'mot '.repeat(95) })])
    expect(codes(issues).has('body-too-long')).toBe(true)
  })

  it('intitulé de choix trop long', () => {
    const e = base()
    e.choices[0]!.label = 'y'.repeat(51)
    expect(codes(run([e])).has('choice-label-too-long')).toBe(true)
  })

  it('sous-texte trop long', () => {
    const e = base()
    e.choices[0]!.riskPreview = Array.from({ length: 16 }, () => 'mot').join(' ')
    expect(codes(run([e])).has('risk-preview-too-long')).toBe(true)
  })

  it('contexte hors fenêtre idéale (avertissement)', () => {
    const issues = run([base({ body: 'mot '.repeat(80) })])
    expect(codes(issues).has('body-outside-ideal')).toBe(true)
    expect(codes(issues).has('body-too-long')).toBe(false)
  })
})

describe('validateur — structure & effets', () => {
  it('événement sans choix (schéma)', () => {
    const e = base()
    e.choices = [e.choices[0]!]
    const issues = run([e])
    expect(issues.some((i) => i.severity === 'error')).toBe(true)
  })

  it('choix sans effet', () => {
    const e = base()
    e.choices[0]!.immediate = []
    e.choices[0]!.hidden = []
    e.choices[0]!.delayed = []
    expect(codes(run([e])).has('choice-no-effect')).toBe(true)
  })

  it('deux choix aux effets identiques', () => {
    const e = base()
    e.choices[1]!.immediate = [...e.choices[0]!.immediate]
    e.choices[1]!.delayed = [...e.choices[0]!.delayed]
    e.choices[1]!.hidden = []
    expect(codes(run([e])).has('choice-identical-effects')).toBe(true)
  })

  it('intitulés de choix identiques', () => {
    const e = base()
    e.choices[1]!.label = e.choices[0]!.label
    expect(codes(run([e])).has('choice-duplicate-label')).toBe(true)
  })

  it('statistique inconnue (skillCheck)', () => {
    const e = base()
    e.choices[0]!.immediate = [
      fx.skillCheck('stat', 'bogus_stat', 40, [fx.res('moral', 2)], [fx.res('moral', -2)]),
    ]
    expect(codes(run([e])).has('unknown-stat')).toBe(true)
  })

  it('valeur hors limites', () => {
    const e = base()
    e.choices[0]!.immediate = [fx.res('moral', 40)]
    expect(codes(run([e])).has('delta-out-of-range')).toBe(true)
  })
})

describe('validateur — qualité des choix', () => {
  it('option entièrement positive + réponse dominante', () => {
    const e = base()
    e.choices[0]!.immediate = [fx.res('moral', 4), fx.res('financesPersonnelles', 3)]
    e.choices[0]!.delayed = []
    const c = codes(run([e]))
    expect(c.has('choice-all-positive')).toBe(true)
    expect(c.has('dominant-choice')).toBe(true)
  })

  it('option entièrement négative', () => {
    const e = base()
    e.choices[0]!.immediate = [fx.res('moral', -4), fx.cash(-3000)]
    e.choices[0]!.delayed = []
    expect(codes(run([e])).has('choice-all-negative')).toBe(true)
  })

  it('choix sans incertitude', () => {
    const e = base()
    e.choices[0]!.delayed = []
    e.choices[0]!.hidden = []
    e.choices[0]!.immediate = [fx.cash(3000), fx.res('moral', -2)]
    expect(codes(run([e])).has('choice-no-uncertainty')).toBe(true)
  })

  it('intitulé générique', () => {
    const e = base()
    e.choices[0]!.label = 'Accepter'
    expect(codes(run([e])).has('choice-generic-label')).toBe(true)
  })
})

describe('validateur — conditions & cohérence', () => {
  it('condition impossible', () => {
    const issues = run([
      base({ prerequisites: [{ type: 'minResource', id: 'moral', value: 150 }] }),
    ])
    expect(codes(issues).has('impossible-condition')).toBe(true)
  })

  it('incompatibilité d’âge', () => {
    const issues = run([base({ ageMin: 34, ageMax: 20 })])
    expect(codes(issues).has('age-mismatch')).toBe(true)
  })

  it('incompatibilité de poste', () => {
    const issues = run([base({ positions: ['zzz_inconnu'] })])
    expect(codes(issues).has('unknown-position')).toBe(true)
  })

  it('répétable sans cooldown', () => {
    const issues = run([base({ cooldownSeasons: 0, unique: false, tags: [] })])
    expect(codes(issues).has('repeatable-no-cooldown')).toBe(true)
  })

  it('événement trop fréquent', () => {
    const issues = run([base({ weight: 40, cooldownSeasons: 1, rarity: 'common' })])
    expect(codes(issues).has('too-frequent')).toBe(true)
  })

  it('conséquence après la retraite', () => {
    const issues = run([base({ careerStages: ['carriere_terminee'], ageMax: 40 })])
    expect(codes(issues).has('post-retirement')).toBe(true)
  })

  it('incohérence contractuelle', () => {
    const e = base()
    e.choices[0]!.immediate = [
      fx.flag('contract_signed'),
      fx.flag('transfer_accepted'),
      fx.res('moral', -2),
    ]
    expect(codes(run([e])).has('contract-incoherence')).toBe(true)
  })

  it('incohérence financière (investissement coût nul)', () => {
    const e = base()
    e.choices[0]!.immediate = [
      fx.makeInvestment({ investmentId: 'x', label: 'X', cost: 0, sector: 's' }),
    ]
    expect(codes(run([e])).has('financial-incoherence')).toBe(true)
  })
})

describe('validateur — références & structure de catalogue', () => {
  it('référence cassée', () => {
    const e = base()
    e.choices[0]!.nextEventIds = ['inexistant']
    expect(codes(run([e])).has('broken-reference')).toBe(true)
  })

  it('chaîne infinie', () => {
    const a = base({ id: 'chain_a' })
    a.choices[0]!.nextEventIds = ['chain_b']
    const b = base({ id: 'chain_b' })
    b.choices[0]!.nextEventIds = ['chain_a']
    expect(codes(run([a, b])).has('infinite-chain')).toBe(true)
  })

  it('événement inaccessible (flag jamais posé)', () => {
    const issues = run([
      base({ prerequisites: [{ type: 'hasFlag', key: 'jamais_pose_flag' }] }),
    ])
    expect(codes(issues).has('unreachable-event')).toBe(true)
  })

  it('identifiant dupliqué', () => {
    const issues = run([base({ id: 'dup' }), base({ id: 'dup' })])
    expect(codes(issues).has('duplicate-id')).toBe(true)
  })

  it('troisième dilemme potentiel', () => {
    const target1 = base({ id: 'q1' })
    const target2 = base({ id: 'q2' })
    const e = base({ id: 'q_src' })
    e.choices[0]!.nextEventIds = ['q1', 'q2']
    expect(codes(run([e, target1, target2])).has('third-dilemma-risk')).toBe(true)
  })

  it('doublon sémantique', () => {
    const shared =
      'Un promoteur immobilier propose un bien coûteux mais tangible pour ton patrimoine sur plusieurs saisons difficiles.'
    const a = base({ id: 'dupsem_a', title: 'Une pierre pour ton avenir', body: shared })
    const b = base({
      id: 'dupsem_b',
      title: 'Une pierre pour ton avenir',
      body: shared,
    })
    expect(codes(run([a, b])).has('semantic-duplicate')).toBe(true)
  })
})

describe('validateur — erreurs structurées', () => {
  it('chaque problème porte identifiant, champ, cause, recommandation', () => {
    const issues = run([base({ title: 'x'.repeat(60) })])
    const issue = issues.find((i) => i.code === 'title-too-long')!
    expect(issue.eventId).toBe('v_base')
    expect(issue.field).toBe('title')
    expect(issue.message).toBeTruthy()
    expect(issue.recommendation).toBeTruthy()
  })
})

describe('inventaire', () => {
  it('produit une répartition complète', () => {
    const inv = buildDilemmaInventory(
      [base({ id: 'i1' }), base({ id: 'i2', rarity: 'rare', positions: ['gk'] })],
      { knownPositionIds: KNOWN_POS },
    )
    expect(inv.total).toBe(2)
    expect(inv.byCategory.money).toBe(2)
    expect(inv.rare).toBe(1)
    expect(inv.byPosition.gk).toBe(1)
    expect(inv.delayed).toBeGreaterThanOrEqual(1)
    expect(Object.keys(inv.byAgeBucket).length).toBeGreaterThan(0)
  })
})
