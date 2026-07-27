import { useEffect, useState } from 'react'

/**
 * Anneau de progression SVG (§4). La barre se remplit à l'affichage
 * (transition CSS, désactivée sous prefers-reduced-motion).
 *
 * @param {number} fraction  Remplissage 0–1.
 * @param {string} color     Couleur d'accent CSS (var ou hex).
 * @param {number} size      Diamètre en px.
 * @param {number} stroke    Épaisseur du trait.
 * @param {string} label     Étiquette accessible (lecteur d'écran).
 */
export default function ProgressRing({
  fraction,
  color = 'var(--cg-lime)',
  size = 74,
  stroke = 7,
  label,
  children,
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const target = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0))

  // Anime le remplissage depuis 0 à l'affichage.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target))
    return () => cancelAnimationFrame(id)
  }, [target])

  const offset = circumference * (1 - shown)

  return (
    <span
      className="cg-ring"
      style={{ '--cg-ring-color': color, width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden={label ? undefined : true} focusable="false">
        <circle
          className="cg-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className="cg-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="cg-ring__num" aria-hidden="true">
        {children}
      </span>
    </span>
  )
}
