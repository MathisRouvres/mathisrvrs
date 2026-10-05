import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Compte à rebours calé sur l'heure absolue (pas de dérive si l'onglet ralentit).
 * `onDone(start)` est appelé une fois quand le temps est écoulé ; il reçoit
 * `start` pour pouvoir enchaîner un nouveau décompte.
 */
export function useCountdown(onDone) {
  const [endAt, setEndAt] = useState(null)
  const [now, setNow] = useState(0)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const start = useCallback((seconds) => {
    const t = Date.now()
    setNow(t)
    setEndAt(t + seconds * 1000)
  }, [])

  useEffect(() => {
    if (endAt === null) return undefined
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endAt) {
        setEndAt(null)
        onDoneRef.current?.(start)
      }
    }, 200)
    return () => clearInterval(id)
  }, [endAt, start])

  const stop = useCallback(() => setEndAt(null), [])

  const remaining = endAt === null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000))
  return { remaining, running: endAt !== null, start, stop }
}

/** Petite vibration de fin de chrono, si le téléphone le permet. */
export function buzz(ms = 300) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Vibration indisponible : sans conséquence.
  }
}
