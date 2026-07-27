export interface ClubDefinition {
  id: string
  name: string
  shortName: string
  region: string
  prestige: number
  isAcademy: boolean
}

export interface CompetitionDefinition {
  id: string
  name: string
  tier: number
  region: string
}

export interface EventChoiceDefinition {
  id: string
  label: string
  effects?: Record<string, number>
}

export interface EventDefinition {
  id: string
  title: string
  body: string
  weight: number
  tags: string[]
  choices: EventChoiceDefinition[]
}

export type { CareerSavePackage } from './persistence'
export type {
  CareerRun,
  CareerState,
  PlayerProfile,
  GameMode,
  CareerStatus,
  StatId,
} from './career'
