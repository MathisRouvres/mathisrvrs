import type { DilemmaDefinition } from '../../../game-engine/dilemmas'
import { contratsDilemmas } from './contrats'
import { transfertsDilemmas } from './transferts'
import { agentsDilemmas } from './agents'
import { sponsorsDilemmas } from './sponsors'
import { depensesDilemmas } from './depenses'
import { investissementsDilemmas } from './investissements'
import { finDilemmas } from './fin'

/**
 * Phase 9 — Dilemmes économiques & professionnels (~110).
 * Contrats/salaires, transferts, agents, sponsors, dépenses/entourage,
 * investissements/patrimoine, fin de carrière. Emplacement 2 (carrière).
 */
export const phase9Dilemmas: DilemmaDefinition[] = [
  ...contratsDilemmas,
  ...transfertsDilemmas,
  ...agentsDilemmas,
  ...sponsorsDilemmas,
  ...depensesDilemmas,
  ...investissementsDilemmas,
  ...finDilemmas,
]

export {
  contratsDilemmas,
  transfertsDilemmas,
  agentsDilemmas,
  sponsorsDilemmas,
  depensesDilemmas,
  investissementsDilemmas,
  finDilemmas,
}
