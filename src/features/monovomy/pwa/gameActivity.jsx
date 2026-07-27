import { useMemo, useState } from 'react'
import { GameActivityContext } from './gameActivityContext'

export function GameActivityProvider({ children }) {
  const [playing, setPlaying] = useState(false)
  const value = useMemo(() => ({ playing, setPlaying }), [playing])
  return <GameActivityContext.Provider value={value}>{children}</GameActivityContext.Provider>
}
