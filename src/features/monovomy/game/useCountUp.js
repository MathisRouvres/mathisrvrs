import { useEffect, useRef, useState } from 'react'

/**
 * Compteur animé (tween linéaire). Partagé par le HUD et le bandeau joueurs : un
 * montant qui change doit rouler, pas sauter. Respecte reduced-motion (valeur
 * affichée directement).
 */
export function useCountUp(value, reducedMotion, ms = 600) {
  const [disp, setDisp] = useState(value)
  const fromRef = useRef(value)
  useEffect(() => {
    if (reducedMotion) return undefined
    const from = fromRef.current
    const to = value
    if (from === to) return undefined
    let raf = 0
    const start = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - start) / ms)
      setDisp(Math.round(from + (to - from) * k))
      if (k < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reducedMotion, ms])
  return reducedMotion ? value : disp
}

/**
 * Dernière variation d'une valeur, avec un identifiant : de quoi afficher un
 * « +120€ » flottant qui disparaît tout seul.
 */
export function useDelta(value, ttl = 1200) {
  const [delta, setDelta] = useState(null)
  const prev = useRef(value)
  const id = useRef(0)
  useEffect(() => {
    const d = value - prev.current
    prev.current = value
    if (d === 0) return undefined
    id.current += 1
    const mine = id.current
    setDelta({ id: mine, value: d })
    const t = setTimeout(() => setDelta((cur) => (cur && cur.id === mine ? null : cur)), ttl)
    return () => clearTimeout(t)
  }, [value, ttl])
  return delta
}
