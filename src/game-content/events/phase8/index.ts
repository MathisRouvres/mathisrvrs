import type { DilemmaDefinition } from '../../../game-engine/dilemmas'
import { perfDilemmas } from './perf'
import { coachDilemmas } from './coach'
import { vestiaireDilemmas } from './vestiaire'
import { concurrenceDilemmas } from './concurrence'
import { blessureDilemmas } from './blessures'
import { mediaDilemmas } from './media'
import { selectionDilemmas } from './selection'
import { originauxDilemmas } from './originaux'

/**
 * Phase 8 — Enrichissement sportif & humain (~96 dilemmes originaux).
 * Performance, entraîneur, vestiaire, concurrence, blessures, médias,
 * supporters, sélection + situations modernes (données, IA, image numérique).
 */
export const phase8Dilemmas: DilemmaDefinition[] = [
  ...perfDilemmas,
  ...coachDilemmas,
  ...vestiaireDilemmas,
  ...concurrenceDilemmas,
  ...blessureDilemmas,
  ...mediaDilemmas,
  ...selectionDilemmas,
  ...originauxDilemmas,
]

export {
  perfDilemmas,
  coachDilemmas,
  vestiaireDilemmas,
  concurrenceDilemmas,
  blessureDilemmas,
  mediaDilemmas,
  selectionDilemmas,
  originauxDilemmas,
}
