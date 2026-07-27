import type { DilemmaDefinition } from '../../../game-engine/dilemmas'
import { chainesADilemmas } from './chaines-a'
import { chainesBDilemmas } from './chaines-b'
import { chainesCDilemmas } from './chaines-c'
import { finsAlternativesDilemmas } from './fins'
import { personnagesDilemmas } from './personnages'
import { postes2Dilemmas } from './postes2'
import { agesDilemmas } from './ages'
import { paysDilemmas } from './pays'

/** Catalogue Phase 7 — chaînes longues, personnages, âges, pays, fins. */
export const phase7Dilemmas: DilemmaDefinition[] = [
  ...chainesADilemmas,
  ...chainesBDilemmas,
  ...chainesCDilemmas,
  ...finsAlternativesDilemmas,
  ...personnagesDilemmas,
  ...postes2Dilemmas,
  ...agesDilemmas,
  ...paysDilemmas,
]

export {
  chainesADilemmas,
  chainesBDilemmas,
  chainesCDilemmas,
  finsAlternativesDilemmas,
  personnagesDilemmas,
  postes2Dilemmas,
  agesDilemmas,
  paysDilemmas,
}
