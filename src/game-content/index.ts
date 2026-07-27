export { GAME_CONTENT_VERSION } from './version'
export { clubs, getClubById, getClubsByCountry } from './clubs'
export { competitions, getCompetitionById } from './competitions'
export {
  competitionCatalog,
  getCompetitionArchetype,
  competitionHierarchy,
  type CompetitionArchetype,
  type CompetitionType,
} from './competitions/catalog'
export {
  championships,
  getChampionshipByCountry,
  getChampionshipById,
  deriveChampionshipCategory,
  CHAMPIONSHIP_CATEGORY_LABELS,
  type ChampionshipDefinition,
  type ChampionshipCategoryId,
} from './championships'
export {
  events,
  getEventById,
  dilemmaCatalog,
  getDilemmaById,
  getValidatedCatalog,
  getCatalogValidationIssues,
  validateDilemmaContent,
  catalogStats,
  dilemmaCatalogById,
  expressDilemmas,
  phase5Dilemmas,
  activeDilemmaCatalog,
  legacyFullDilemmaCatalog,
} from './events'
export { positions, getPositionById } from './positions'
export { origins, getOriginById } from './origins'
export { countries, getCountryById } from './countries'
export {
  MACRO_POSITIONS,
  getMacroPosition,
  macroFromPreciseRole,
  type MacroPositionId,
} from './macroPositions'
export {
  foundingCategories,
  getFoundingCategory,
  getFoundingOption,
} from './founding'
export { playstyles, getPlaystyleById } from './playstyles'
export { visuals, getVisualById } from './visuals'
