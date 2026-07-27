import type { DilemmaDefinition, DilemmaEffect } from './types'
import { dilemmaDefinitionSchema } from './schema'
import {
  HIDDEN_TRAIT_IDS,
  RESOURCE_IDS,
  SPORT_STAT_IDS,
} from '../core/constants'
import { KNOWN_NPC_TOKENS } from '../core/npcs'

/**
 * Problème de validation structuré (Phase 4).
 * `eventId` = identifiant, `field` = champ, `message` = cause, `recommendation`
 * = recommandation. `code` = clé machine stable (tests, inventaire).
 */
export interface CatalogValidationIssue {
  severity: 'error' | 'warning'
  code: string
  eventId?: string
  field?: string
  message: string
  recommendation?: string
}

function mk(
  severity: CatalogValidationIssue['severity'],
  code: string,
  eventId: string | undefined,
  field: string | undefined,
  message: string,
  recommendation?: string,
): CatalogValidationIssue {
  return { severity, code, eventId, field, message, recommendation }
}

/** Options de validation — dépendances de contenu injectées (postes connus). */
export interface ValidateOptions {
  knownPositionIds?: ReadonlySet<string>
}

/** Contraintes éditoriales — format court (Phase 4). */
export const EDITORIAL_LIMITS = {
  titleMaxChars: 50,
  bodyIdealMinWords: 25,
  bodyIdealMaxWords: 65,
  bodyHardMaxWords: 90,
  choiceLabelMaxChars: 50,
  riskPreviewMaxWords: 15,
  resolutionMaxWords: 40,
} as const

/** Amplitudes maximales d’un delta (échelles 0–100 / 1–99). */
export const DELTA_LIMITS = {
  stat: 6,
  resource: 25,
  hidden: 8,
  relation: 20,
  cash: 100_000,
} as const

/** Ressources/traits où une baisse est un bénéfice (polarité inversée). */
const INVERTED_KEYS = new Set(['fatigue', 'fragilitePhysique'])

/** Intitulés de choix jugés trop génériques. */
const GENERIC_LABELS = new Set([
  'accepter',
  'refuser',
  'continuer',
  'oui',
  'non',
  'rester',
  'partir',
  'ignorer',
])

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// --------------------------------------------------------------------------
// Collecte d'effets
// --------------------------------------------------------------------------

interface DeltaRef {
  kind: string
  id?: string
  delta: number
}

function collectDeltas(effects: DilemmaEffect[], out: DeltaRef[]): void {
  for (const effect of effects) {
    if (effect.type === 'delta') {
      out.push({
        kind: effect.target.kind,
        id: 'id' in effect.target ? effect.target.id : undefined,
        delta: effect.delta,
      })
    }
    if (effect.type === 'skillCheck') {
      collectDeltas(effect.onSuccess, out)
      collectDeltas(effect.onFail, out)
    }
    if (effect.type === 'chance') collectDeltas(effect.effects, out)
  }
}

function walkEffects(
  effects: DilemmaEffect[],
  visit: (e: DilemmaEffect) => void,
): void {
  for (const e of effects) {
    visit(e)
    if (e.type === 'skillCheck') {
      walkEffects(e.onSuccess, visit)
      walkEffects(e.onFail, visit)
    }
    if (e.type === 'chance') walkEffects(e.effects, visit)
  }
}

function hasAnyEffect(effects: DilemmaEffect[]): boolean {
  return effects.length > 0
}

/** Toutes les couches d'effets d'un choix (immédiat + caché + retardé). */
function allChoiceEffects(
  choice: DilemmaDefinition['choices'][number],
): DilemmaEffect[] {
  return [
    ...choice.immediate,
    ...choice.hidden,
    ...choice.delayed.flatMap((d) => d.effects),
  ]
}

// --------------------------------------------------------------------------
// Analyse de qualité d'un choix (bénéfice / coût / incertitude)
// --------------------------------------------------------------------------

interface ChoiceSignals {
  hasBenefit: boolean
  hasCost: boolean
  hasUncertainty: boolean
}

function deltaIsBenefit(d: DeltaRef): boolean {
  if (d.kind === 'cash') return d.delta > 0
  const inverted = d.id ? INVERTED_KEYS.has(d.id) : false
  return inverted ? d.delta < 0 : d.delta > 0
}

function deltaIsCost(d: DeltaRef): boolean {
  if (d.kind === 'cash') return d.delta < 0
  const inverted = d.id ? INVERTED_KEYS.has(d.id) : false
  return inverted ? d.delta > 0 : d.delta < 0
}

function analyzeChoice(
  choice: DilemmaDefinition['choices'][number],
): ChoiceSignals {
  const deltas: DeltaRef[] = []
  collectDeltas(allChoiceEffects(choice), deltas)

  let hasBenefit = deltas.some(deltaIsBenefit)
  let hasCost = deltas.some(deltaIsCost)

  // Effets Phase 3 non-delta : polarité connue.
  walkEffects(allChoiceEffects(choice), (e) => {
    if (e.type === 'signSponsor') hasBenefit = true
    if (e.type === 'endSponsor' && (e.reputationHit ?? 0) > 0) hasCost = true
    if (e.type === 'makeInvestment' && e.investment.cost > 0) hasCost = true
  })

  const hasUncertainty =
    choice.delayed.length > 0 ||
    choice.hidden.length > 0 ||
    (choice.nextEventIds?.length ?? 0) > 0 ||
    allChoiceEffects(choice).some(
      (e) => e.type === 'chance' || e.type === 'skillCheck',
    )

  return { hasBenefit, hasCost, hasUncertainty }
}

// --------------------------------------------------------------------------
// Contrôles éditoriaux
// --------------------------------------------------------------------------

function validateEditorial(event: DilemmaDefinition): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []

  if (event.title.length > EDITORIAL_LIMITS.titleMaxChars) {
    issues.push(
      mk(
        'error',
        'title-too-long',
        event.id,
        'title',
        `titre trop long (${event.title.length} caractères)`,
        `raccourcir à ${EDITORIAL_LIMITS.titleMaxChars} caractères maximum`,
      ),
    )
  }

  const words = wordCount(event.body)
  if (words > EDITORIAL_LIMITS.bodyHardMaxWords) {
    issues.push(
      mk(
        'error',
        'body-too-long',
        event.id,
        'body',
        `contexte trop long (${words} mots)`,
        `réduire à ${EDITORIAL_LIMITS.bodyHardMaxWords} mots maximum`,
      ),
    )
  } else if (
    words < EDITORIAL_LIMITS.bodyIdealMinWords ||
    words > EDITORIAL_LIMITS.bodyIdealMaxWords
  ) {
    issues.push(
      mk(
        'warning',
        'body-outside-ideal',
        event.id,
        'body',
        `contexte hors fenêtre idéale (${words} mots)`,
        `viser ${EDITORIAL_LIMITS.bodyIdealMinWords}–${EDITORIAL_LIMITS.bodyIdealMaxWords} mots`,
      ),
    )
  }

  for (const choice of event.choices) {
    if (choice.label.length > EDITORIAL_LIMITS.choiceLabelMaxChars) {
      issues.push(
        mk(
          'error',
          'choice-label-too-long',
          event.id,
          `choices.${choice.id}.label`,
          `intitulé trop long (${choice.label.length} caractères)`,
          `raccourcir à ${EDITORIAL_LIMITS.choiceLabelMaxChars} caractères maximum`,
        ),
      )
    }
    const riskWords = wordCount(choice.riskPreview)
    if (riskWords > EDITORIAL_LIMITS.riskPreviewMaxWords) {
      issues.push(
        mk(
          'error',
          'risk-preview-too-long',
          event.id,
          `choices.${choice.id}.riskPreview`,
          `sous-texte trop long (${riskWords} mots)`,
          `réduire à ${EDITORIAL_LIMITS.riskPreviewMaxWords} mots maximum`,
        ),
      )
    } else if (riskWords > 0 && riskWords < 3) {
      issues.push(
        mk(
          'warning',
          'risk-preview-vague',
          event.id,
          `choices.${choice.id}.riskPreview`,
          `sous-texte trop vague (${riskWords} mots)`,
          'préciser bénéfice et risque en quelques mots',
        ),
      )
    }
  }

  for (const echo of event.echoes ?? []) {
    if (wordCount(echo.text) > EDITORIAL_LIMITS.resolutionMaxWords) {
      issues.push(
        mk(
          'warning',
          'resolution-too-long',
          event.id,
          'echoes.text',
          `texte de résolution trop long (${wordCount(echo.text)} mots)`,
          `réduire à ${EDITORIAL_LIMITS.resolutionMaxWords} mots maximum`,
        ),
      )
    }
  }

  return issues
}

// --------------------------------------------------------------------------
// Contrôles de choix (structure + qualité)
// --------------------------------------------------------------------------

function choiceSignature(choice: DilemmaDefinition['choices'][number]): string {
  return JSON.stringify({
    immediate: choice.immediate,
    delayed: choice.delayed,
    hidden: choice.hidden,
    next: choice.nextEventIds ?? [],
  })
}

function validateChoices(event: DilemmaDefinition): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const labels = new Set<string>()
  const signatures = new Set<string>()

  const signals = event.choices.map(analyzeChoice)

  for (let i = 0; i < event.choices.length; i += 1) {
    const choice = event.choices[i]!
    const sig = signals[i]!

    // Choix sans aucun effet = faux choix.
    const any =
      hasAnyEffect(choice.immediate) ||
      hasAnyEffect(choice.hidden) ||
      choice.delayed.some((d) => hasAnyEffect(d.effects)) ||
      (choice.nextEventIds?.length ?? 0) > 0
    if (!any) {
      issues.push(
        mk(
          'error',
          'choice-no-effect',
          event.id,
          `choices.${choice.id}`,
          'choix sans aucun effet',
          'ajouter au moins un effet immédiat, caché ou retardé',
        ),
      )
    }

    const label = choice.label.trim().toLowerCase()
    if (labels.has(label)) {
      issues.push(
        mk(
          'error',
          'choice-duplicate-label',
          event.id,
          `choices.${choice.id}.label`,
          `intitulé de choix identique à un autre (« ${choice.label} »)`,
          'différencier clairement chaque intitulé',
        ),
      )
    }
    labels.add(label)
    if (GENERIC_LABELS.has(label)) {
      issues.push(
        mk(
          'warning',
          'choice-generic-label',
          event.id,
          `choices.${choice.id}.label`,
          `intitulé trop générique (« ${choice.label} »)`,
          'préciser l’action et son enjeu',
        ),
      )
    }

    const signature = choiceSignature(choice)
    if (signatures.has(signature) && any) {
      issues.push(
        mk(
          'error',
          'choice-identical-effects',
          event.id,
          `choices.${choice.id}`,
          'deux choix aux effets identiques (faux choix)',
          'donner à chaque choix des conséquences distinctes',
        ),
      )
    }
    signatures.add(signature)

    // Valeurs hors limites.
    const deltas: DeltaRef[] = []
    collectDeltas(allChoiceEffects(choice), deltas)
    for (const { kind, delta } of deltas) {
      const limit = DELTA_LIMITS[kind as keyof typeof DELTA_LIMITS]
      if (limit !== undefined && Math.abs(delta) > limit) {
        issues.push(
          mk(
            'error',
            'delta-out-of-range',
            event.id,
            `choices.${choice.id}`,
            `valeur hors limites: ${kind} ${delta > 0 ? '+' : ''}${delta}`,
            `rester dans ±${limit} pour ${kind}`,
          ),
        )
      }
    }

    // Qualité : bénéfice, coût, incertitude.
    if (any && sig.hasBenefit && !sig.hasCost) {
      issues.push(
        mk(
          'warning',
          'choice-all-positive',
          event.id,
          `choices.${choice.id}`,
          'option entièrement positive (aucun coût)',
          'ajouter un coût ou un risque crédible',
        ),
      )
    }
    if (any && sig.hasCost && !sig.hasBenefit) {
      issues.push(
        mk(
          'warning',
          'choice-all-negative',
          event.id,
          `choices.${choice.id}`,
          'option entièrement négative (aucun bénéfice)',
          'offrir un bénéfice ou une contrepartie',
        ),
      )
    }
    if (any && !sig.hasUncertainty) {
      issues.push(
        mk(
          'warning',
          'choice-no-uncertainty',
          event.id,
          `choices.${choice.id}`,
          'choix sans part d’incertitude',
          'introduire un effet retardé, caché ou probabiliste',
        ),
      )
    }
  }

  // Réponse évidemment meilleure : une option sans coût quand une autre en a un.
  const freeWins = signals.filter((s) => s.hasBenefit && !s.hasCost).length
  const costly = signals.some((s) => s.hasCost)
  if (event.choices.length >= 2 && freeWins >= 1 && costly) {
    issues.push(
      mk(
        'warning',
        'dominant-choice',
        event.id,
        'choices',
        'une réponse est évidemment meilleure (dominante)',
        'équilibrer les options pour créer un vrai dilemme',
      ),
    )
  }

  return issues
}

// --------------------------------------------------------------------------
// Conditions, cohérence, poste, contrat, finance, retraite
// --------------------------------------------------------------------------

function validateConditions(event: DilemmaDefinition): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const all = [...event.prerequisites, ...event.exclusions]
  for (const cond of all) {
    if (
      (cond.type === 'minResource' && cond.value > 100) ||
      (cond.type === 'minStat' && cond.value > 99) ||
      (cond.type === 'minHidden' && cond.value > 99) ||
      (cond.type === 'minRelation' && cond.value > 100)
    ) {
      issues.push(
        mk(
          'error',
          'impossible-condition',
          event.id,
          'prerequisites/exclusions',
          `condition impossible: ${cond.type} ${'id' in cond ? cond.id : ''} ≥ ${'value' in cond ? cond.value : '?'}`,
          'ramener le seuil dans les bornes atteignables',
        ),
      )
    }
    if (cond.type === 'maxResource' && cond.value < 0) {
      issues.push(
        mk(
          'error',
          'impossible-condition',
          event.id,
          'prerequisites/exclusions',
          `condition impossible: maxResource ${cond.id} ≤ ${cond.value}`,
          'utiliser un seuil ≥ 0',
        ),
      )
    }
  }

  if (
    !event.unique &&
    event.cooldownSeasons === 0 &&
    !event.tags.includes('fallback')
  ) {
    issues.push(
      mk(
        'error',
        'repeatable-no-cooldown',
        event.id,
        'cooldownSeasons',
        'événement répétable sans cooldown',
        'définir cooldownSeasons ≥ 1 ou marquer unique',
      ),
    )
  }

  // Fréquence : poids élevé + cooldown faible.
  if (
    event.rarity === 'common' &&
    event.weight > 25 &&
    event.cooldownSeasons < 2
  ) {
    issues.push(
      mk(
        'warning',
        'too-frequent',
        event.id,
        'weight',
        `événement potentiellement trop fréquent (poids ${event.weight}, cooldown ${event.cooldownSeasons})`,
        'baisser le poids ou augmenter le cooldown',
      ),
    )
  }

  return issues
}

function validatePositions(
  event: DilemmaDefinition,
  known?: ReadonlySet<string>,
): CatalogValidationIssue[] {
  if (!known || !event.positions) return []
  const issues: CatalogValidationIssue[] = []
  for (const pos of event.positions) {
    if (!known.has(pos)) {
      issues.push(
        mk(
          'error',
          'unknown-position',
          event.id,
          'positions',
          `poste inconnu: ${pos}`,
          'utiliser un identifiant de poste existant',
        ),
      )
    }
  }
  return issues
}

const CONTRACT_SIGN_FLAGS = ['contract_signed', 'contract_extended']
const CONTRACT_MOVE_FLAGS = ['transfer_accepted']

function validateCoherence(event: DilemmaDefinition): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  for (const choice of event.choices) {
    const flags = new Set<string>()
    let makeInvestmentBadCost = false
    let sponsorZeroPay = false
    walkEffects(allChoiceEffects(choice), (e) => {
      if (e.type === 'setFlag') flags.add(e.key)
      if (e.type === 'makeInvestment' && e.investment.cost <= 0) {
        makeInvestmentBadCost = true
      }
      if (e.type === 'signSponsor' && e.sponsor.annualPay <= 0) {
        sponsorZeroPay = true
      }
    })

    // Incohérence contractuelle : signer/prolonger ET partir dans le même choix.
    const signs = CONTRACT_SIGN_FLAGS.some((f) => flags.has(f))
    const moves = CONTRACT_MOVE_FLAGS.some((f) => flags.has(f))
    if (signs && moves) {
      issues.push(
        mk(
          'error',
          'contract-incoherence',
          event.id,
          `choices.${choice.id}`,
          'incohérence contractuelle: signature et transfert simultanés',
          'séparer signature/prolongation et transfert',
        ),
      )
    }

    // Incohérence financière.
    if (makeInvestmentBadCost) {
      issues.push(
        mk(
          'error',
          'financial-incoherence',
          event.id,
          `choices.${choice.id}`,
          'investissement au coût nul ou négatif',
          'définir un coût strictement positif',
        ),
      )
    }
    if (sponsorZeroPay) {
      issues.push(
        mk(
          'warning',
          'financial-incoherence',
          event.id,
          `choices.${choice.id}`,
          'contrat de sponsor sans rémunération',
          'définir une rémunération annuelle positive',
        ),
      )
    }

    // Risque de 3e dilemme : plusieurs enchaînements la même saison.
    let sameSeasonQueued = choice.nextEventIds?.length ?? 0
    walkEffects(choice.immediate, (e) => {
      if (e.type === 'queueEvent' && (e.seasonOffset ?? 0) === 0) {
        sameSeasonQueued += 1
      }
    })
    if (sameSeasonQueued > 1) {
      issues.push(
        mk(
          'warning',
          'third-dilemma-risk',
          event.id,
          `choices.${choice.id}`,
          `enchaîne ${sameSeasonQueued} événements la même saison (risque de 3e dilemme)`,
          'ne déclencher qu’un seul événement enchaîné par saison',
        ),
      )
    }
  }
  return issues
}

const TERMINAL_STAGES = new Set(['carriere_terminee'])

function validateRetirement(
  event: DilemmaDefinition,
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  if (
    event.careerStages &&
    event.careerStages.length > 0 &&
    event.careerStages.some((s) => TERMINAL_STAGES.has(s))
  ) {
    issues.push(
      mk(
        'error',
        'post-retirement',
        event.id,
        'careerStages',
        'conséquence après la retraite (étape terminale)',
        'retirer « carriere_terminee » des étapes ciblées',
      ),
    )
  }
  if (event.careerStages?.includes('retraite') && event.ageMax < 28) {
    issues.push(
      mk(
        'error',
        'retirement-age-mismatch',
        event.id,
        'ageMax',
        'événement de retraite avec ageMax trop bas (impossible)',
        'relever ageMax pour une étape de retraite',
      ),
    )
  }
  return issues
}

// --------------------------------------------------------------------------
// Références, statistiques, boucles, accessibilité
// --------------------------------------------------------------------------

function collectEffectRefs(
  effects: DilemmaEffect[],
  refs: { eventIds: Set<string>; invalid: Set<string> },
): void {
  walkEffects(effects, (effect) => {
    if (effect.type === 'queueEvent') refs.eventIds.add(effect.eventId)
    if (effect.type === 'skillCheck') {
      if (
        effect.pool === 'stat' &&
        !(SPORT_STAT_IDS as readonly string[]).includes(effect.id)
      ) {
        refs.invalid.add(`stat:${effect.id}`)
      }
      if (
        effect.pool === 'resource' &&
        !(RESOURCE_IDS as readonly string[]).includes(effect.id)
      ) {
        refs.invalid.add(`resource:${effect.id}`)
      }
      if (
        effect.pool === 'hidden' &&
        !(HIDDEN_TRAIT_IDS as readonly string[]).includes(effect.id)
      ) {
        refs.invalid.add(`hidden:${effect.id}`)
      }
    }
  })
}

function detectInfiniteLoops(
  catalog: DilemmaDefinition[],
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const byId = new Map(catalog.map((e) => [e.id, e]))

  function dfs(id: string, stack: string[], visiting: Set<string>) {
    if (visiting.has(id)) {
      issues.push(
        mk(
          'error',
          'infinite-chain',
          id,
          'nextEventIds/queueEvent',
          `Boucle narrative détectée: ${[...stack, id].join(' → ')}`,
          'briser le cycle d’enchaînement',
        ),
      )
      return
    }
    const event = byId.get(id)
    if (!event) return
    visiting.add(id)
    const nexts = new Set<string>()
    for (const choice of event.choices) {
      for (const n of choice.nextEventIds ?? []) nexts.add(n)
      for (const f of event.followUpEventIds) nexts.add(f)
      const add = (effects: DilemmaEffect[]) =>
        walkEffects(effects, (e) => {
          if (e.type === 'queueEvent') nexts.add(e.eventId)
        })
      add(choice.immediate)
      add(choice.hidden)
      for (const d of choice.delayed) add(d.effects)
    }
    for (const n of nexts) {
      if (!byId.has(n)) continue
      dfs(n, [...stack, id], new Set(visiting))
    }
  }

  for (const event of catalog) dfs(event.id, [], new Set())
  return issues
}

const ENGINE_FLAG_PREFIXES = [
  'seen:',
  'cooldown:',
  'debt:',
  'debt_label:',
  'debt_due:',
  'queuedDilemmaId',
  'lastDilemma',
  // Phase 3 — flags posés par les effets moteur agents/sponsors/investissements.
  'sponsor_active',
  'sponsor_broken',
  'sponsor_ban:',
  'investment_active',
  'invested:',
  'agent_profile',
  'agent_changed',
]

function collectSettableFlags(catalog: DilemmaDefinition[]): Set<string> {
  const flags = new Set<string>()
  const walk = (effects: DilemmaEffect[]) =>
    walkEffects(effects, (ef) => {
      if (ef.type === 'setFlag') flags.add(ef.key)
      if (ef.type === 'narrativeDebt') {
        flags.add(`debt:${ef.debtId}`)
        flags.add(`debt_label:${ef.debtId}`)
        flags.add(`debt_due:${ef.debtId}`)
      }
    })
  for (const event of catalog) {
    flags.add(`seen:${event.id}`)
    flags.add(`cooldown:${event.id}`)
    for (const choice of event.choices) {
      walk(choice.immediate)
      walk(choice.hidden)
      for (const d of choice.delayed) walk(d.effects)
    }
  }
  return flags
}

function isEngineManagedFlag(key: string): boolean {
  return ENGINE_FLAG_PREFIXES.some((p) => key === p || key.startsWith(p))
}

function detectUnreachableEvents(
  catalog: DilemmaDefinition[],
  ids: Set<string>,
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const settable = collectSettableFlags(catalog)
  const queuedTargets = new Set<string>()

  for (const event of catalog) {
    for (const f of event.followUpEventIds) queuedTargets.add(f)
    for (const choice of event.choices) {
      for (const n of choice.nextEventIds ?? []) queuedTargets.add(n)
      const add = (effects: DilemmaEffect[]) =>
        walkEffects(effects, (e) => {
          if (e.type === 'queueEvent') queuedTargets.add(e.eventId)
        })
      add(choice.immediate)
      add(choice.hidden)
      for (const d of choice.delayed) add(d.effects)
    }
  }

  for (const event of catalog) {
    for (const pre of event.prerequisites) {
      if (pre.type === 'hasFlag') {
        if (
          !settable.has(pre.key) &&
          !isEngineManagedFlag(pre.key) &&
          !queuedTargets.has(event.id)
        ) {
          issues.push(
            mk(
              'error',
              'unreachable-event',
              event.id,
              'prerequisites',
              `prérequis flag jamais posé: ${pre.key}`,
              'poser ce flag ailleurs ou retirer le prérequis',
            ),
          )
        }
      }
      if (pre.type === 'hasFlag' && pre.key.startsWith('seen:')) {
        const ref = pre.key.slice('seen:'.length)
        if (!ids.has(ref)) {
          issues.push(
            mk(
              'error',
              'broken-reference',
              event.id,
              'prerequisites',
              `prérequis « vu » vers un événement inexistant: ${ref}`,
              'référencer un événement existant',
            ),
          )
        }
      }
    }

    for (const echo of event.echoes ?? []) {
      if (!settable.has(echo.flag) && !isEngineManagedFlag(echo.flag)) {
        issues.push(
          mk(
            'warning',
            'dead-echo',
            event.id,
            'echoes.flag',
            `écho lié à un flag jamais posé: ${echo.flag}`,
            'poser ce flag ou retirer l’écho',
          ),
        )
      }
    }
  }

  return issues
}

// --------------------------------------------------------------------------
// Doublon sémantique
// --------------------------------------------------------------------------

const STOPWORDS = new Set([
  'le','la','les','un','une','des','de','du','et','ou','a','à','au','aux','en',
  'ton','ta','tes',' te','tu','toi','ne','pas','plus','que','qui','se','sa','son',
  'ses','sur','dans','pour','par','avec','sans','mais','the','of','il','elle',
  'on','ce','cette','ces','est','tout','tous','leur','vous','nous',
])

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-zà-ÿ0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const w of a) if (b.has(w)) inter += 1
  return inter / (a.size + b.size - inter)
}

function detectSemanticDuplicates(
  catalog: DilemmaDefinition[],
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const byCategory = new Map<string, Array<{ id: string; tok: Set<string> }>>()
  for (const event of catalog) {
    const list = byCategory.get(event.category) ?? []
    list.push({ id: event.id, tok: tokens(`${event.title} ${event.body}`) })
    byCategory.set(event.category, list)
  }
  for (const list of byCategory.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const sim = jaccard(list[i]!.tok, list[j]!.tok)
        if (sim >= 0.6) {
          issues.push(
            mk(
              'warning',
              'semantic-duplicate',
              list[j]!.id,
              'title/body',
              `doublon sémantique probable avec ${list[i]!.id} (similarité ${sim.toFixed(2)})`,
              'différencier la situation ou fusionner',
            ),
          )
        }
      }
    }
  }
  return issues
}

// --------------------------------------------------------------------------
// Validation d'ensemble
// --------------------------------------------------------------------------

export function validateDilemmaCatalog(
  catalog: DilemmaDefinition[],
  opts: ValidateOptions = {},
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const ids = new Set<string>()

  for (const raw of catalog) {
    const parsed = dilemmaDefinitionSchema.safeParse(raw)
    if (!parsed.success) {
      issues.push(
        mk(
          'error',
          'schema-invalid',
          raw.id,
          undefined,
          `Schéma invalide: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
          'corriger la structure selon le schéma',
        ),
      )
      continue
    }
    const event = parsed.data as DilemmaDefinition

    if (ids.has(event.id)) {
      issues.push(
        mk('error', 'duplicate-id', event.id, 'id', 'identifiant dupliqué', 'rendre l’identifiant unique'),
      )
    }
    ids.add(event.id)

    if (event.ageMin > event.ageMax) {
      issues.push(
        mk(
          'error',
          'age-mismatch',
          event.id,
          'ageMin/ageMax',
          `incompatibilité d’âge: ageMin ${event.ageMin} > ageMax ${event.ageMax}`,
          'inverser ou corriger les bornes d’âge',
        ),
      )
    }

    if (event.choices.length < 2) {
      issues.push(
        mk(
          'error',
          'no-choices',
          event.id,
          'choices',
          'événement sans choix suffisants',
          'fournir au moins deux choix',
        ),
      )
    }

    const choiceIds = new Set<string>()
    for (const choice of event.choices) {
      if (choiceIds.has(choice.id)) {
        issues.push(
          mk(
            'error',
            'duplicate-choice-id',
            event.id,
            `choices.${choice.id}`,
            `choix dupliqué: ${choice.id}`,
            'rendre chaque id de choix unique',
          ),
        )
      }
      choiceIds.add(choice.id)
    }

    issues.push(...validateEditorial(event))
    issues.push(...validateChoices(event))
    issues.push(...validateConditions(event))
    issues.push(...validatePositions(event, opts.knownPositionIds))
    issues.push(...validateCoherence(event))
    issues.push(...validateRetirement(event))
    issues.push(...validateNpcTokens(event))

    for (const pre of event.prerequisites) {
      for (const ex of event.exclusions) {
        if (
          pre.type === 'hasFlag' &&
          ex.type === 'missingFlag' &&
          pre.key === ex.key
        ) {
          issues.push(
            mk(
              'error',
              'contradictory-conditions',
              event.id,
              'prerequisites/exclusions',
              `prérequis/exclusion contradictoires sur le flag ${pre.key}`,
              'lever la contradiction',
            ),
          )
        }
      }
    }
  }

  // Références croisées.
  for (const event of catalog) {
    const refs = { eventIds: new Set<string>(), invalid: new Set<string>() }
    for (const choice of event.choices) {
      collectEffectRefs(choice.immediate, refs)
      collectEffectRefs(choice.hidden, refs)
      for (const d of choice.delayed) collectEffectRefs(d.effects, refs)
      for (const n of choice.nextEventIds ?? []) refs.eventIds.add(n)
    }
    for (const f of event.followUpEventIds) refs.eventIds.add(f)

    for (const ref of refs.eventIds) {
      if (!ids.has(ref)) {
        issues.push(
          mk(
            'error',
            'broken-reference',
            event.id,
            'nextEventIds/queueEvent',
            `référence vers un événement inexistant: ${ref}`,
            'référencer un événement du catalogue',
          ),
        )
      }
    }
    for (const inv of refs.invalid) {
      issues.push(
        mk(
          'error',
          'unknown-stat',
          event.id,
          'skillCheck',
          `test sur une clé inconnue (${inv})`,
          'utiliser une statistique/ressource/trait existant',
        ),
      )
    }
  }

  issues.push(...detectInfiniteLoops(catalog))
  issues.push(...detectUnreachableEvents(catalog, ids))
  issues.push(...detectSemanticDuplicates(catalog))

  if (catalog.length < 40) {
    issues.push(
      mk(
        'warning',
        'low-coverage',
        undefined,
        undefined,
        `catalogue sous le seuil (40), actuel=${catalog.length}`,
        'étoffer le catalogue',
      ),
    )
  }

  return issues
}

function validateNpcTokens(event: DilemmaDefinition): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const texts = [
    event.title,
    event.body,
    ...event.choices.flatMap((c) => [c.label, c.riskPreview]),
  ]
  for (const text of texts) {
    for (const match of text.matchAll(/\{[a-z_]+\}/g)) {
      if (!KNOWN_NPC_TOKENS.includes(match[0])) {
        issues.push(
          mk(
            'error',
            'broken-reference',
            event.id,
            'text',
            `jeton PNJ inconnu: ${match[0]}`,
            'utiliser un jeton PNJ connu',
          ),
        )
      }
    }
  }
  return issues
}

export function assertValidDilemmaCatalog(
  catalog: DilemmaDefinition[],
  opts: ValidateOptions = {},
): void {
  const issues = validateDilemmaCatalog(catalog, opts).filter(
    (i) => i.severity === 'error',
  )
  if (issues.length > 0) {
    throw new Error(
      `Catalogue dilemmes invalide:\n${issues
        .map((i) => `- [${i.eventId ?? '?'}] (${i.field ?? '-'}) ${i.message}${i.recommendation ? ` → ${i.recommendation}` : ''}`)
        .join('\n')}`,
    )
  }
}

// --------------------------------------------------------------------------
// Inventaire (Phase 4)
// --------------------------------------------------------------------------

export interface DilemmaInventory {
  total: number
  byCategory: Record<string, number>
  byPosition: Record<string, number>
  byAgeBucket: Record<string, number>
  byCareerStage: Record<string, number>
  rare: number
  delayed: number
  chains: number
  tooLongText: string[]
  dominantChoiceEvents: string[]
  unreachableEvents: string[]
}

function ageBucket(ageMin: number): string {
  if (ageMin <= 20) return '16-20'
  if (ageMin <= 25) return '21-25'
  if (ageMin <= 30) return '26-30'
  if (ageMin <= 35) return '31-35'
  return '36+'
}

export function buildDilemmaInventory(
  catalog: DilemmaDefinition[],
  opts: ValidateOptions = {},
): DilemmaInventory {
  const byCategory: Record<string, number> = {}
  const byPosition: Record<string, number> = {}
  const byAgeBucket: Record<string, number> = {}
  const byCareerStage: Record<string, number> = {}
  const tooLongText: string[] = []
  let rare = 0
  let delayed = 0
  let chains = 0

  for (const event of catalog) {
    byCategory[event.category] = (byCategory[event.category] ?? 0) + 1
    byAgeBucket[ageBucket(event.ageMin)] =
      (byAgeBucket[ageBucket(event.ageMin)] ?? 0) + 1
    for (const pos of event.positions ?? []) {
      byPosition[pos] = (byPosition[pos] ?? 0) + 1
    }
    for (const stage of event.careerStages ?? ['any']) {
      byCareerStage[stage] = (byCareerStage[stage] ?? 0) + 1
    }
    if (event.rarity === 'rare' || event.rarity === 'legendary') rare += 1
    if (event.choices.some((c) => c.delayed.length > 0)) delayed += 1
    if (
      event.choices.some((c) => (c.nextEventIds?.length ?? 0) > 0) ||
      event.followUpEventIds.length > 0
    ) {
      chains += 1
    }
    if (wordCount(event.body) > EDITORIAL_LIMITS.bodyIdealMaxWords) {
      tooLongText.push(event.id)
    }
  }

  const issues = validateDilemmaCatalog(catalog, opts)
  const dominantChoiceEvents = [
    ...new Set(
      issues
        .filter((i) => i.code === 'dominant-choice' && i.eventId)
        .map((i) => i.eventId as string),
    ),
  ]
  const unreachableEvents = [
    ...new Set(
      issues
        .filter((i) => i.code === 'unreachable-event' && i.eventId)
        .map((i) => i.eventId as string),
    ),
  ]

  return {
    total: catalog.length,
    byCategory,
    byPosition,
    byAgeBucket,
    byCareerStage,
    rare,
    delayed,
    chains,
    tooLongText,
    dominantChoiceEvents,
    unreachableEvents,
  }
}

function fmtRecord(rec: Record<string, number>): string {
  return Object.entries(rec)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `    ${k.padEnd(20)} ${v}`)
    .join('\n')
}

export function formatDilemmaInventory(inv: DilemmaInventory): string {
  return [
    `INVENTAIRE DILEMMES — ${inv.total} événements`,
    '',
    'Par catégorie :',
    fmtRecord(inv.byCategory),
    '',
    'Par poste :',
    Object.keys(inv.byPosition).length ? fmtRecord(inv.byPosition) : '    (aucun)',
    '',
    "Par tranche d'âge (ageMin) :",
    fmtRecord(inv.byAgeBucket),
    '',
    'Par statut / étape :',
    fmtRecord(inv.byCareerStage),
    '',
    `Événements rares/légendaires : ${inv.rare}`,
    `Événements à conséquences retardées : ${inv.delayed}`,
    `Chaînes narratives : ${inv.chains}`,
    `Textes trop longs (> ${EDITORIAL_LIMITS.bodyIdealMaxWords} mots) : ${inv.tooLongText.length}`,
    `Choix dominants : ${inv.dominantChoiceEvents.length}`,
    `Événements inaccessibles : ${inv.unreachableEvents.length}`,
  ].join('\n')
}
