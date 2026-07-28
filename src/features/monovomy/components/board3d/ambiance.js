/**
 * Ambiance visuelle pilotée par l'intensité de soirée (moteur : partyIntensity).
 * Le plateau « chauffe » avec la partie : couleurs, lumières, brouillard, bloom et
 * pulsation (tempo) évoluent de Warm-up à Finale.
 *
 * Éclairage 3 points (voir AmbianceLights) :
 * - `lightA` / `lightB` : les deux sources latérales (rectAreaLight, ou pointLight
 *   en rendu allégé) ;
 * - `rim` : contre-jour derrière le plateau qui dessine le liseré des pions et des
 *   cases. Froid et discret au warm-up, chaud et saturé en finale ;
 * - `exposure` : exposition ACES du renderer (neutre → surexposée en fin de partie) ;
 * - `vignette` : 0 → 1, assombrissement des bords (sol 3D + voile DOM).
 */
export const AMBIANCE = {
  warmup: {
    lightA: '#22c1c3', lightB: '#7c3aed', i1: 12, i2: 12, ambient: 0.7,
    speed: 2, pulse: 0.12, bloom: 0.5, fog: '#0a0618', bg: '#0a0512',
    rim: { color: '#9ec5ff', intensity: 70 }, exposure: 1.0, vignette: 0.3,
  },
  party: {
    lightA: '#f5b21a', lightB: '#ec1e79', i1: 16, i2: 13, ambient: 0.78,
    speed: 3, pulse: 0.32, bloom: 0.62, fog: '#120a1e', bg: '#0c0614',
    rim: { color: '#c77bff', intensity: 115 }, exposure: 1.1, vignette: 0.52,
  },
  chaos: {
    lightA: '#f97316', lightB: '#ec1e79', i1: 21, i2: 16, ambient: 0.86,
    speed: 4.5, pulse: 0.6, bloom: 0.86, fog: '#180a18', bg: '#100610',
    rim: { color: '#ff5aa8', intensity: 155 }, exposure: 1.2, vignette: 0.76,
  },
  finale: {
    lightA: '#ec1e79', lightB: '#9b3cff', i1: 25, i2: 20, ambient: 0.96,
    speed: 6, pulse: 0.9, bloom: 1.05, fog: '#1a0820', bg: '#140510',
    rim: { color: '#ff3d6e', intensity: 195 }, exposure: 1.3, vignette: 1,
  },
}

export function ambianceFor(intensity) {
  return AMBIANCE[intensity] ?? AMBIANCE.warmup
}
