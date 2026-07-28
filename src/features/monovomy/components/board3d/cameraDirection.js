/**
 * Règles de reprise en main du cadrage, isolées du rendu pour rester vérifiables.
 *
 * Le principe : le joueur est prioritaire. Tout geste sur le canvas suspend la mise
 * en scène, qui ne revient qu'après un silence — court pour un recadrage de phase,
 * plus long pour le suivi du pion, qui déplace l'image sans qu'on l'ait demandé.
 */

/** Silence requis avant de suivre à nouveau le pion actif. */
export const IDLE_MS = 4000
/** Silence requis avant un simple recadrage de phase. */
export const GRACE_MS = 900

/**
 * Le réalisateur peut-il recadrer, et peut-il suivre le pion ?
 *
 * `resumed` marque la frame qui suit la sortie de la caméra libre. Ce cas ne doit
 * PAS attendre le silence : couper la caméra libre est une demande explicite de
 * revenir au pion, pas un geste de cadrage qu'il faudrait laisser reposer.
 *
 * @param {{dragging?: boolean, silence?: number, resumed?: boolean}} input
 */
export function framing({ dragging = false, silence = Infinity, resumed = false } = {}) {
  if (resumed) return { canFrame: true, canFollow: true }
  if (dragging) return { canFrame: false, canFollow: false }
  return { canFrame: silence > GRACE_MS, canFollow: silence > IDLE_MS }
}
