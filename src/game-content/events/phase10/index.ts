import type { DilemmaDefinition } from '../../../game-engine/dilemmas'
import { chainesLongTermeDilemmas } from './chaines'

/**
 * Phase 10 — Conséquences à long terme.
 * 6 chaînes narratives (sponsor controversé, gestion financière, course au
 * record, documentaire, fuite de données, jeune protégé) réutilisant la
 * mémoire existante (flags, échos, files, dette). Emplacement 2.
 */
export const phase10Dilemmas: DilemmaDefinition[] = [
  ...chainesLongTermeDilemmas,
]

export { chainesLongTermeDilemmas }
