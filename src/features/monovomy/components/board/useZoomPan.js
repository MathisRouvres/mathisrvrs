import { useCallback, useRef, useState } from 'react'

/** Zoom (pincer / boutons) + déplacement (glisser quand zoomé), sans dépendance. */
export function useZoomPan() {
  const [t, setT] = useState({ scale: 1, x: 0, y: 0 })
  const ref = useRef({ pointers: new Map(), startDist: 0, startScale: 1, last: null })

  const onPointerDown = useCallback(
    (e) => {
      const s = ref.current
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      s.last = { x: e.clientX, y: e.clientY }
      if (s.pointers.size === 2) {
        const pts = [...s.pointers.values()]
        s.startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        s.startScale = t.scale
      }
    },
    [t.scale],
  )

  const onPointerMove = useCallback((e) => {
    const s = ref.current
    if (!s.pointers.has(e.pointerId)) return
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (s.pointers.size === 2) {
      const pts = [...s.pointers.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const factor = dist / (s.startDist || dist)
      const scale = Math.min(3, Math.max(1, s.startScale * factor))
      setT((prev) => ({ ...prev, scale }))
    } else if (s.pointers.size === 1 && s.last) {
      const dx = e.clientX - s.last.x
      const dy = e.clientY - s.last.y
      s.last = { x: e.clientX, y: e.clientY }
      setT((prev) => (prev.scale > 1 ? { ...prev, x: prev.x + dx, y: prev.y + dy } : prev))
    }
  }, [])

  const onPointerUp = useCallback((e) => {
    ref.current.pointers.delete(e.pointerId)
    ref.current.last = null
  }, [])

  const reset = useCallback(() => setT({ scale: 1, x: 0, y: 0 }), [])
  const zoomIn = useCallback(() => setT((p) => ({ ...p, scale: Math.min(3, p.scale + 0.3) })), [])
  const zoomOut = useCallback(
    () =>
      setT((p) => {
        const scale = Math.max(1, p.scale - 0.3)
        return scale === 1 ? { scale: 1, x: 0, y: 0 } : { ...p, scale }
      }),
    [],
  )

  return {
    transform: t,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    reset,
    zoomIn,
    zoomOut,
  }
}
