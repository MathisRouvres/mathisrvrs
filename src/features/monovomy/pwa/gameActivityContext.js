import { createContext } from 'react'

/**
 * Signale au shell si une partie est EN COURS, afin de ne jamais recharger pour
 * une mise à jour en plein tour.
 */
export const GameActivityContext = createContext({ playing: false, setPlaying: () => {} })
