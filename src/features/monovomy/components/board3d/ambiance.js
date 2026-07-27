/**
 * Ambiance visuelle pilotée par l'intensité de soirée (moteur : partyIntensity).
 * Le plateau « chauffe » avec la partie : couleurs, lumières, brouillard, bloom et
 * pulsation (tempo) évoluent de Warm-up à Finale.
 */
export const AMBIANCE = {
  warmup: { lightA: '#22c1c3', lightB: '#7c3aed', i1: 12, i2: 12, ambient: 0.7, speed: 2, pulse: 0.12, bloom: 0.5, fog: '#0a0618', bg: '#0a0512' },
  party: { lightA: '#f5b21a', lightB: '#ec1e79', i1: 16, i2: 13, ambient: 0.78, speed: 3, pulse: 0.32, bloom: 0.62, fog: '#120a1e', bg: '#0c0614' },
  chaos: { lightA: '#f97316', lightB: '#ec1e79', i1: 21, i2: 16, ambient: 0.86, speed: 4.5, pulse: 0.6, bloom: 0.86, fog: '#180a18', bg: '#100610' },
  finale: { lightA: '#ec1e79', lightB: '#9b3cff', i1: 25, i2: 20, ambient: 0.96, speed: 6, pulse: 0.9, bloom: 1.05, fog: '#1a0820', bg: '#140510' },
}

export function ambianceFor(intensity) {
  return AMBIANCE[intensity] ?? AMBIANCE.warmup
}
