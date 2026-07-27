export type {
  DilemmaDefinition,
  DilemmaChoiceDefinition,
  DilemmaEffect,
  DilemmaCondition,
  DilemmaCategory,
  DilemmaRarity,
  ChoiceStance,
  DilemmaResolutionLog,
} from './types'
export {
  DILEMMA_CATEGORIES,
  DILEMMA_RARITIES,
  CHOICE_STANCES,
} from './types'
export { dilemmaDefinitionSchema, dilemmaChoiceSchema } from './schema'
export { applyDilemmaEffects } from './applyEffects'
export { isDilemmaEligible, pickDilemma, evaluateCondition } from './eligibility'
export {
  pickDilemmaForSlot,
  passesContextGuards,
  slotForCategory,
  SLOT1_CATEGORIES,
  SLOT2_CATEGORIES,
  type SeasonSlot,
} from './slots'
export {
  resolveDilemmaChoice as resolveDilemmaChoiceEngine,
} from './resolveChoice'
export {
  validateDilemmaCatalog,
  assertValidDilemmaCatalog,
  buildDilemmaInventory,
  formatDilemmaInventory,
  EDITORIAL_LIMITS,
  DELTA_LIMITS,
  type CatalogValidationIssue,
  type ValidateOptions,
  type DilemmaInventory,
} from './validateCatalog'
export { processDueDilemmaEffects } from './processDelayed'
export {
  describeChoiceOutcomes,
  STANCE_LABELS,
  type ChoiceDescription,
  type ChoiceOutcome,
  type OutcomeLevel,
} from './describeChoice'
