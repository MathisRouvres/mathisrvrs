import ProgressRing from './ProgressRing'
import { deltaText, deltaTone } from './careerUiMaps'

/**
 * Carte de statistique principale (§4) : valeur centrale + anneau + label +
 * qualification + évolution récente. L'information ne repose jamais sur la
 * seule couleur (delta textuel + qualificatif).
 */
export default function MainStatCard({
  label,
  value,
  fraction,
  color,
  qualifier,
  delta = null,
  ringLabel,
}) {
  const tone = deltaTone(delta)
  return (
    <div className="cg-statcard">
      <span className="cg-statcard__label">{label}</span>
      <ProgressRing
        fraction={fraction}
        color={color}
        label={ringLabel ?? `${label} ${value}`}
      >
        {value}
      </ProgressRing>
      <span className="cg-statcard__qual">{qualifier}</span>
      {delta !== null && (
        <span className={`cg-statcard__delta cg-statcard__delta--${tone}`}>
          {tone === 'flat' ? '—' : `${deltaText(delta)} cette saison`}
        </span>
      )}
    </div>
  )
}
