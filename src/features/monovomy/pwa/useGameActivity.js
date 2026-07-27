import { useContext, useEffect } from 'react'
import { GameActivityContext } from './gameActivityContext'

/** À appeler dans un écran de jeu : marque la partie active tant que monté. */
export function useGameActivity(active) {
  const { setPlaying } = useContext(GameActivityContext)
  useEffect(() => {
    setPlaying(Boolean(active))
    return () => setPlaying(false)
  }, [active, setPlaying])
}

export function usePlaying() {
  return useContext(GameActivityContext).playing
}
