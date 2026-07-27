import type { DilemmaDefinition } from '../../../game-engine/dilemmas'
import { sportDilemmas } from './sport'
import { positionDilemmas } from './positions'
import { coachDilemmas } from './coach'
import { vestiaireDilemmas } from './vestiaire'
import { contratDilemmas } from './contrats'
import { blessureDilemmas } from './blessures'
import { argentDilemmas } from './argent'
import { mediaDilemmas } from './medias'
import { selectionDilemmas } from './selection'
import { finDilemmas } from './fin'
import { chaineDilemmas } from './chaines'

/** Catalogue Phase 5 — 60 dilemmes cœur + postes + chaînes narratives. */
export const phase5Dilemmas: DilemmaDefinition[] = [
  ...sportDilemmas,
  ...positionDilemmas,
  ...coachDilemmas,
  ...vestiaireDilemmas,
  ...contratDilemmas,
  ...blessureDilemmas,
  ...argentDilemmas,
  ...mediaDilemmas,
  ...selectionDilemmas,
  ...finDilemmas,
  ...chaineDilemmas,
]

export {
  sportDilemmas,
  positionDilemmas,
  coachDilemmas,
  vestiaireDilemmas,
  contratDilemmas,
  blessureDilemmas,
  argentDilemmas,
  mediaDilemmas,
  selectionDilemmas,
  finDilemmas,
  chaineDilemmas,
}
