import type { CareerStageId } from '../types/season'
import { CAREER_STAGE_IDS } from '../types/season'

export interface StageContext {
  age: number
  seasonIndex: number
  reputation: number
  estimatedValue: number
  minutesThisSeason: number
  averageRating: number
  longInjury: boolean
  contractWeeksRemaining: number | null
  maxSeasons: number
  current: CareerStageId
  forceRetire?: boolean
}

/**
 * Machine à états : propose la prochaine étape sans transitions absurdes.
 * Les traits / décisions atypiques restent possibles via le contexte (notes, minutes, valeur).
 */
export function resolveNextCareerStage(ctx: StageContext): CareerStageId {
  if (ctx.forceRetire || ctx.current === 'carriere_terminee') {
    return 'carriere_terminee'
  }
  if (ctx.current === 'retraite') {
    return 'carriere_terminee'
  }

  if (ctx.age >= 37 || ctx.seasonIndex >= ctx.maxSeasons) {
    return ctx.current === 'fin_contrat' || ctx.current === 'declin'
      ? 'retraite'
      : 'retraite'
  }

  if (
    ctx.contractWeeksRemaining !== null &&
    ctx.contractWeeksRemaining <= 0 &&
    ctx.age >= 30
  ) {
    return 'fin_contrat'
  }

  if (ctx.age >= 33 && ctx.reputation < 55) {
    return 'declin'
  }

  if (ctx.age >= 34) {
    return 'declin'
  }

  // Apogée : fenêtre de performance + renommée
  if (
    ctx.age >= 24 &&
    ctx.age <= 32 &&
    ctx.reputation >= 62 &&
    ctx.averageRating >= 7.1 &&
    ctx.minutesThisSeason >= 1200
  ) {
    return 'apogee'
  }

  if (ctx.age >= 21 && ctx.reputation >= 40 && ctx.minutesThisSeason >= 600) {
    return 'progression'
  }

  if (ctx.age >= 18 && (ctx.minutesThisSeason >= 200 || ctx.reputation >= 28)) {
    return 'debuts_professionnels'
  }

  if (ctx.age >= 17 && ctx.seasonIndex >= 2) {
    return 'contrat_espoir'
  }

  if (ctx.current === 'creation') {
    return 'centre_formation'
  }

  // Conserve l’étape si déjà avancée, sauf régression claire
  if (
    ctx.current === 'apogee' &&
    (ctx.averageRating < 6.4 || ctx.minutesThisSeason < 400)
  ) {
    return ctx.age >= 31 ? 'declin' : 'progression'
  }

  if (ctx.current === 'progression' || ctx.current === 'apogee') {
    return ctx.current
  }

  if (ctx.current === 'debuts_professionnels') {
    return ctx.reputation >= 40 ? 'progression' : 'debuts_professionnels'
  }

  if (ctx.current === 'contrat_espoir') {
    return ctx.age >= 18 ? 'debuts_professionnels' : 'contrat_espoir'
  }

  return ctx.current === 'centre_formation' ? 'centre_formation' : ctx.current
}

export function isTerminalStage(stage: CareerStageId): boolean {
  return stage === 'retraite' || stage === 'carriere_terminee'
}

export function assertCareerStage(id: string): CareerStageId {
  if ((CAREER_STAGE_IDS as readonly string[]).includes(id)) {
    return id as CareerStageId
  }
  return 'centre_formation'
}
