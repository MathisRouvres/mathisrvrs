import type { DilemmaDefinition } from '../../game-engine/dilemmas'
import { phase5Dilemmas } from './phase5'
import { phase7Dilemmas } from './phase7'
import { phase3Dilemmas } from './phase3'
import { phase8Dilemmas } from './phase8'
import { phase9Dilemmas } from './phase9'
import { phase10Dilemmas } from './phase10'
import { expressDilemmas } from './express'

/**
 * Catalogue actif du moteur express.
 * Phases 5 + 7 + 3 + 8 + 9 + 10 (conséquences long terme) + dilemme de secours.
 * Module léger sans dépendance au validateur — importable par le moteur.
 */
export const activeDilemmaCatalog: DilemmaDefinition[] = [
  ...phase5Dilemmas,
  ...phase7Dilemmas,
  ...phase3Dilemmas,
  ...phase8Dilemmas,
  ...phase9Dilemmas,
  ...phase10Dilemmas,
  ...expressDilemmas.filter((d) => d.id === 'express_fallback_training'),
]
