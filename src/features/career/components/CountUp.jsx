import { useEffect, useState } from 'react'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

/**
 * Nombre animé court (§5, §9). Présentation pure : compte de `from` à `to`.
 * Respecte prefers-reduced-motion (affiche directement la valeur finale) et
 * n'a aucun effet bloquant — c'est purement visuel.
 */
export default function CountUp({ from, to, duration = 650, className }) {
  const reduced = useReducedMotion()
  const shouldAnimate = !reduced && from !== to
  const [value, setValue] = useState(from)

  useEffect(() => {
    if (!shouldAnimate) return undefined
    let start = null
    let raf = 0
    const step = (ts) => {
      if (start === null) start = ts
      const p = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setValue(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [from, to, duration, shouldAnimate])

  // Sans animation (reduced-motion / pas de changement) : valeur finale directe.
  return <span className={className}>{shouldAnimate ? value : to}</span>
}
