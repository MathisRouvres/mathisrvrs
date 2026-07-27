import type { TemporaryRule } from './schema'

/**
 * Catalogue des règles temporaires MonoVomy (Phase 8 — directeur d’ambiance).
 * Data-driven, validé par Zod (`temporaryRuleSchema`). Chaque règle porte une
 * variante soft : aucune sanction n’est jamais uniquement alcoolisée.
 */
export const temporaryRules: TemporaryRule[] = [
  {
    id: 'rule_accent',
    name: 'Accent obligatoire',
    description: 'Tout le monde parle avec un accent étranger. À chaque oubli, une gorgée.',
    duration: { kind: 'table', value: 1 },
    scope: 'global',
    stackingPolicy: 'replace',
    softVariant: 'À chaque oubli, un mini-gage plutôt qu’une gorgée.',
  },
  {
    id: 'rule_mot_interdit',
    name: 'Mot interdit',
    description: 'Interdit de prononcer « boire ». Celui qui le dit prend une gorgée.',
    duration: { kind: 'table', value: 1 },
    scope: 'global',
    stackingPolicy: 'stack',
    softVariant: 'Celui qui dit le mot interdit fait une pompe.',
  },
  {
    id: 'rule_loyers_doubles',
    name: 'Loyers doublés',
    description: 'Les loyers d’un groupe de couleur sont doublés.',
    duration: { kind: 'turn', value: 4 },
    scope: 'group',
    groupId: 'rouge',
    stackingPolicy: 'replace',
    softVariant: 'Loyers doublés : la sanction gorgée devient un mini-gage.',
  },
  {
    id: 'rule_encheres',
    name: 'Enchères obligatoires',
    description: 'Toute propriété atterrie non achetée part aux enchères.',
    duration: { kind: 'table', value: 1 },
    scope: 'economy',
    stackingPolicy: 'ignore',
    softVariant: 'Enchères : le perdant fait un mini-gage au lieu de boire.',
  },
  {
    id: 'rule_deplacements_inverses',
    name: 'Déplacements inversés',
    description: 'Les pions avancent dans le sens inverse ce tour de table.',
    duration: { kind: 'table', value: 1 },
    scope: 'movement',
    stackingPolicy: 'replace',
    softVariant: 'Sens inversé : ambiance seule, pas de sanction.',
  },
  {
    id: 'rule_bonus_dernier',
    name: 'Bonus au dernier',
    description: 'Le joueur le plus pauvre touche +100 € en passant Départ.',
    duration: { kind: 'turn', value: 6 },
    scope: 'last_player',
    stackingPolicy: 'replace',
    softVariant: 'Bonus au dernier : pur rattrapage économique, aucune sanction.',
  },
  {
    id: 'rule_prix_reduits',
    name: 'Prix cassés',
    description: 'Prix d’achat des propriétés réduits de 20 %.',
    duration: { kind: 'minutes', value: 3 },
    scope: 'economy',
    stackingPolicy: 'replace',
    softVariant: 'Prix cassés : opportunité économique, aucune sanction.',
  },
  {
    id: 'rule_chuchote',
    name: 'Chuchotements',
    description: 'Interdit de parler fort. Celui qui crie prend une gorgée.',
    duration: { kind: 'minutes', value: 2 },
    scope: 'global',
    stackingPolicy: 'stack',
    softVariant: 'Celui qui parle fort fait une imitation.',
  },
]

export function getRuleById(id: string): TemporaryRule | undefined {
  return temporaryRules.find((rule) => rule.id === id)
}
