import { useCallback, useEffect, useRef, useState } from 'react'
import { blip, unlockAudio } from '../../../lib/synth'

/**
 * Compte à rebours calé sur l'heure absolue (pas de dérive si l'onglet ralentit).
 * `onDone(start)` est appelé une fois quand le temps est écoulé ; il reçoit
 * `start` pour pouvoir enchaîner un nouveau décompte.
 *
 * Option `ticks` : nombre de dernières secondes signalées par un bip (0 = aucun,
 * par défaut, pour ne rien trahir d'un chrono secret).
 */
export function useCountdown(onDone, { ticks = 0 } = {}) {
  const [endAt, setEndAt] = useState(null)
  const [now, setNow] = useState(0)
  const onDoneRef = useRef(onDone)
  const lastTickRef = useRef(null)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const start = useCallback((seconds) => {
    // Appelé depuis un tap : c'est le moment de débloquer l'audio sur iOS.
    unlockAudio()
    const t = Date.now()
    lastTickRef.current = null
    setNow(t)
    setEndAt(t + seconds * 1000)
  }, [])

  useEffect(() => {
    if (endAt === null) return undefined
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      const left = Math.ceil((endAt - t) / 1000)
      if (left > 0 && left <= ticks && lastTickRef.current !== left) {
        lastTickRef.current = left
        chime('tick')
      }
      if (t >= endAt) {
        // Coupé tout de suite : `onDone` ne doit jamais partir deux fois.
        clearInterval(id)
        setEndAt(null)
        onDoneRef.current?.(start)
      }
    }, 200)
    return () => clearInterval(id)
  }, [endAt, start, ticks])

  const stop = useCallback(() => setEndAt(null), [])

  const remaining = endAt === null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000))
  return { remaining, running: endAt !== null, start, stop }
}

/** Petite vibration de fin de chrono, si le téléphone le permet (pas sur iPhone). */
export function buzz(ms = 300) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Vibration indisponible : sans conséquence.
  }
}

let soundOn = true

/** Réglage « Son » des jeux de soirée (piloté par usePartySettings). */
export function setPartySound(on) {
  soundOn = Boolean(on)
}

/**
 * Signal sonore des chronos, audible même sur iPhone (où `buzz` est sans effet) :
 * `tick` (dernières secondes), `go` (départ), `end` (temps écoulé).
 */
export function chime(kind) {
  if (!soundOn) return
  switch (kind) {
    case 'tick':
      blip(880, 0.08, 'square', 0.04)
      break
    case 'go':
      blip(1320, 0.25, 'square', 0.05)
      break
    case 'end':
      ;[0, 180, 360].forEach((delay) => setTimeout(() => blip(440, 0.3, 'sawtooth', 0.07), delay))
      break
    // Patate chaude : tic-tac pressant de fin de mèche, puis explosion.
    case 'urgent':
      blip(1320, 0.05, 'square', 0.05)
      break
    case 'boom':
      blip(70, 0.6, 'sawtooth', 0.1)
      break
    default:
      break
  }
}
