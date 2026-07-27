import type { DilemmaDefinition } from '../../../game-engine/dilemmas'
import { agentDilemmas } from './agents'
import { sponsorDilemmas } from './sponsors'
import { investmentDilemmas } from './investments'
import { patrimoineDilemmas } from './patrimoine'

/**
 * Catalogue Phase 3 — lot de validation : agents, sponsors, investissements,
 * patrimoine (5 + 5 + 5 + 5). Emplacement 2 (carrière).
 */
export const phase3Dilemmas: DilemmaDefinition[] = [
  ...agentDilemmas,
  ...sponsorDilemmas,
  ...investmentDilemmas,
  ...patrimoineDilemmas,
]

export {
  agentDilemmas,
  sponsorDilemmas,
  investmentDilemmas,
  patrimoineDilemmas,
}
