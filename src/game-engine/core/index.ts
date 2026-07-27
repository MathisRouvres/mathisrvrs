export {
  ENGINE_VERSION,
  CONTENT_VERSION,
  SAVE_SCHEMA_VERSION,
  STORAGE_ROOT_KEY,
  GAME_MODES,
  CAREER_STATUSES,
  CAREER_STAGES,
  DIFFICULTIES,
  CAREER_LENGTHS,
  CAREER_LENGTH_SEASONS,
  STRONG_FEET,
  SPORT_STAT_IDS,
  RESOURCE_IDS,
  HIDDEN_TRAIT_IDS,
  STAT_MIN,
  STAT_MAX,
  RESOURCE_MIN,
  RESOURCE_MAX,
  HIDDEN_MIN,
  HIDDEN_MAX,
  SEASON_CALENDAR_YEAR,
} from './constants'
export {
  clamp,
  clampStat,
  clampRelation,
  clampCash,
  clampResource,
  clampHidden,
} from './clamp'
export { createId, createSeed, nowIso } from './ids'
export { createEmptyCareerState } from './createEmptyCareerState'
export {
  createCareerPackage,
  isCareerReadOnly,
  type CreateCareerInput,
} from './createCareerPackage'
export {
  createPlayerCareerPackage,
  buildSummaryFromDraft,
  quickGenerateDraft,
  listDefaultFoundingChoices,
  buildDisplayName,
  computePlayerBundle,
} from './createPlayerCareer'
export type {
  PlayerCreationDraft,
  PlayerSummaryCard,
} from './playerCreationTypes'
export {
  assertDraftBasics,
  SPORT_STAT_LABELS,
  RESOURCE_LABELS,
} from './playerCreationTypes'
export { migrateCareerSave, tryMigrateCareerSave } from './migrate'
export {
  createCareer,
  getNextDilemma,
  resolveDilemmaChoice,
  completeSeason,
  simulateSeason,
  getCareerSummary,
  isCareerFinished,
  assertDilemmaInvariant,
  checkDilemmaInvariant,
  getVisibleStats,
  type ExpressCareerInput,
  type CareerSummary,
  type VisibleStatDelta,
  type SportStatDelta,
} from './expressCareer'
export {
  potentialLabelFromStars,
  deriveTrajectory,
  deriveCareerTier,
  listCareerTiers,
  deriveAttributes,
  type Trajectory,
  type TrajectoryId,
  type CareerTier,
  type CareerTierId,
  type AttributeView,
} from './careerQuality'
export {
  seasonPhaseFromDilemmas,
  deriveClubStatus,
  patchStateToV4,
} from './visibleStats'
export {
  createNpcs,
  simulateRivalSeason,
  interpolateNpcText,
  interpolateDilemma,
  getPastEcho,
  KNOWN_NPC_TOKENS,
} from './npcs'
export { simulateClubSeason, type ClubSeasonInput } from './simulateClub'
export {
  buildFinalReport,
  buildShareCard,
  computeLegacy,
  pickArchetype,
  LEGACY_DIMENSION_LABELS,
  type FinalReport,
  type LegacyBreakdown,
  type LegacyDimensionId,
  type CareerArchetype,
  type ShareCard,
} from './finalReport'
export {
  trophyMeta,
  topCelebration,
  computeContribution,
  computeTrophyValue,
  collectAchievements,
  generateBonusTrophies,
  seasonTrophyImpact,
  buildPalmares,
  CONTRIBUTION_LABELS,
  ACHIEVEMENT_LABELS,
  T as TROPHY_LABELS,
  type CelebrationLevel,
  type ContributionTier,
  type Contribution,
  type TrophyMeta,
  type TrophyImpact,
  type PalmaresEntry,
} from './trophy'
export {
  computeSeasonDistinctions,
  scoreForAward,
  scoreByMetric,
  overallScore,
  isEligible,
  familyFromRole,
  type AwardPerf,
  type AwardsImpact,
  type SeasonDistinctions,
  type PlayerContext,
} from './awards'
export {
  computeMajorDistinctions,
  worldAccessScore,
  CAREER_HONOR_NAME,
  type MajorAwardsInput,
  type MajorAwardsResult,
} from './majorAwards'
export {
  computeSeasonRecords,
  buildCareerRecords,
  type RecordsInput,
  type SeasonRecordsResult,
  type CareerRecords,
} from './records'
export {
  buildSeasonProgression,
  buildCareerLevelView,
  buildSkillChanges,
  buildTimelineCards,
  deriveCareerLevel,
  CAREER_LEVELS,
  SKILL_CAUSE_LABELS,
  type SeasonProgression,
  type CareerLevelView,
  type CareerLevelTier,
  type SkillChange,
  type SkillCause,
  type TimelineCard,
} from './progression'
export {
  DILEMMAS_PER_SEASON,
  CLUB_STATUSES,
  SEASON_LOOP_PHASES,
  MACRO_POSITION_IDS,
  VISIBLE_STAT_IDS,
} from './constants'
export {
  careerSavePackageSchema,
  careerRunSchema,
  careerStateSchema,
  playerProfileSchema,
} from './schemas'
export {
  simulateSeason as simulateSeasonDetailed,
  type SeasonSimulationInput,
} from './simulateSeason'
export {
  applySeasonResult,
  advanceCareerSeason,
  buildSeasonInputFromPackage,
} from './applySeason'
export {
  resolveNextCareerStage,
  isTerminalStage,
  assertCareerStage,
} from './careerStages'
export {
  deriveClubStanding,
  deriveSeasonObjective,
  evaluateSeasonObjective,
  objectiveOutcomeEffects,
  CLUB_STANDING_LABELS,
  SEASON_OBJECTIVE_LABELS,
  OBJECTIVE_RESULT_LABELS,
  type ClubStandingId,
  type SeasonObjectiveId,
  type ObjectiveResultId,
  type ObjectiveEffects,
} from './competition'
export {
  getPositionCurve,
  ageGrowthFactor,
  positionOverall,
  POSITION_CURVES,
} from './positionCurves'
export {
  STANDARD_SEASON_CHAPTERS,
  chaptersForMode,
} from './seasonChapters'
export {
  WAGE_BRACKETS,
  WAGE_TIER_IDS,
  WAGE_TIER_LABELS,
  LIFESTYLE_PARAMS,
  WEEKS_PER_SEASON,
  DEFAULT_AGENT_COMMISSION,
  INVESTMENT_YIELD_RATE,
  SELECTION_INCOME,
  LOYALTY_MILESTONE_SEASONS,
  computeContractWage,
  computeMarketScore,
  deriveWageTier,
  buildContract,
  normalizeContract,
  defaultBonuses,
  resolveContractForSeason,
  wageFactorsFromState,
  computeAnnualFinance,
  applyAnnualFinance,
  ageSponsorships,
  deriveLifestyle,
  initialWealth,
  type WageTierId,
  type WageFactors,
  type WageResult,
  type ContractEventReason,
  type ContractResolution,
  type AnnualFinance,
  type AnnualFinanceInput,
  type AnnualIncome,
  type AnnualExpenses,
} from './finance'
