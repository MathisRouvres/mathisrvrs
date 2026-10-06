import { createContext } from 'react'

/** Jeu et niveau de la partie sauvegardée (`{ slug, level }`), fourni par SessionScope. */
export const SessionContext = createContext(null)
