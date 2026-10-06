import { useMemo } from 'react'
import { SessionContext } from '../sessionContext'

/** Jeu et niveau dont les composants enfants sauvegardent l'état. */
export default function SessionScope({ slug, level, children }) {
  const value = useMemo(() => ({ slug, level }), [slug, level])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
