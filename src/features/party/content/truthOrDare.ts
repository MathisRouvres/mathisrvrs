import { truths } from './truths'
import { dares } from './dares'

/**
 * Action ou Vérité. Les actions impliquant quelqu'un d'autre supposent toujours
 * son accord : chacun peut refuser ou passer son tour.
 */
export const truthOrDare = { truth: truths, dare: dares }
