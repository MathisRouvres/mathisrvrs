import {
  formatAnnualDelta,
  formatContractRemaining,
  formatMoney,
  formatWage,
  lifestyleLabel,
  trajectoryIcon,
} from './careerUiMaps'

/** Étoiles de potentiel — estimation, jamais la valeur cachée exacte (§4). */
function PotentialStars({ stars }) {
  const full = Math.max(0, Math.min(5, Math.round(stars)))
  return (
    <span
      className="cg-potstars"
      role="img"
      aria-label={`Potentiel estimé ${full} sur 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? '' : 'cg-potstars__off'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}

/** Mini-courbe de forme (décorative, l'info portée par le qualificatif). */
function FormeSpark({ value }) {
  const high = value >= 55
  // Ligne stylisée : plus la forme est haute, plus la courbe est haute.
  const base = 20 - (value / 100) * 12
  const d = `M2 ${base + 3} L18 ${base - 2} L34 ${base + 2} L50 ${base - 4} L66 ${base + 1} L82 ${base - 3} L98 ${base}`
  return (
    <svg className="cg-spark" viewBox="0 0 100 24" aria-hidden="true" focusable="false">
      <path d={d} style={high ? undefined : { stroke: 'var(--cg-signal)' }} />
    </svg>
  )
}

/** Barre segmentée (confiance du coach / jauges compactes). */
function SegBar({ value, segments = 7, tone = 'gold', label }) {
  const on = Math.round((value / 100) * segments)
  return (
    <div
      className="cg-segbar"
      role="img"
      aria-label={label ?? `${value} sur 100`}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`cg-segbar__seg${
            i < on ? (tone === 'lime' ? ' is-on-lime' : ' is-on') : ''
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function formeQualifier(v) {
  if (v >= 80) return 'Excellente'
  if (v >= 62) return 'Bonne'
  if (v >= 42) return 'Correcte'
  if (v >= 24) return 'En baisse'
  return 'Au plus bas'
}

function mentalQualifier(v) {
  if (v >= 78) return 'Solide'
  if (v >= 58) return 'Stable'
  if (v >= 38) return 'Fragile'
  return 'Vacillant'
}

function coachQualifier(v) {
  if (v >= 78) return 'Très élevée'
  if (v >= 60) return 'Élevée'
  if (v >= 42) return 'Correcte'
  if (v >= 24) return 'Fragile'
  return 'Rompue'
}

/**
 * Panneau secondaire (§4) — potentiel, forme, mental, confiance du coach,
 * trajectoire. Affiché en rail à droite sur desktop, empilé sur mobile.
 */
export default function SecondaryRail({ summary }) {
  const v = summary.visible
  const t = summary.trajectory
  const fin = summary.finance
  const delta = fin?.lastAnnualDelta ?? 0

  return (
    <aside className="cg-rail" aria-label="Aperçu du joueur">
      {fin && (
        <div className="cg-railcard cg-anim-enter">
          <div className="cg-railcard__head">
            <span className="cg-railcard__label">Finances</span>
            <span className="cg-railcard__sub">{lifestyleLabel(fin.lifestyle)}</span>
          </div>
          <p className="cg-railcard__value">{formatMoney(fin.netWorth)}</p>
          <p className="cg-railcard__sub">
            Salaire — {formatWage(fin.weeklyWage)}
          </p>
          <p className="cg-railcard__sub">
            Contrat — {formatContractRemaining(fin.contractSeasonsRemaining)}
          </p>
          {delta !== 0 && (
            <p
              className={`cg-railcard__sub${delta >= 0 ? '' : ' cg-delta--down'}`}
            >
              Cette saison — {formatAnnualDelta(delta)}
            </p>
          )}
        </div>
      )}
      <div className="cg-railcard cg-anim-enter">
        <div className="cg-railcard__head">
          <span className="cg-railcard__label">Potentiel</span>
          <PotentialStars stars={summary.potentialStars} />
        </div>
        <p className="cg-railcard__value">{summary.potentialLabel}</p>
        <p className="cg-railcard__sub">{summary.recruiterBlurb}</p>
      </div>

      <div className="cg-railcard cg-anim-enter">
        <div className="cg-railcard__head">
          <span className="cg-railcard__label">Forme &amp; mental</span>
        </div>
        <FormeSpark value={v.forme} />
        <p className="cg-railcard__value">{formeQualifier(v.forme)}</p>
        <p className="cg-railcard__sub">Mental — {mentalQualifier(v.mental)}</p>
      </div>

      <div className="cg-railcard cg-anim-enter">
        <div className="cg-railcard__head">
          <span className="cg-railcard__label">Confiance du coach</span>
        </div>
        <SegBar
          value={v.confianceCoach}
          label={`Confiance du coach ${coachQualifier(v.confianceCoach)}`}
        />
        <p className="cg-railcard__value" style={{ marginTop: '0.4rem' }}>
          {coachQualifier(v.confianceCoach)}
        </p>
      </div>

      <div className="cg-railcard cg-anim-enter">
        <div className="cg-railcard__head">
          <span className="cg-railcard__label">Trajectoire</span>
        </div>
        <span className="cg-trajectory" data-trend={t.id}>
          <span className="cg-trajectory__icon" aria-hidden="true">
            {trajectoryIcon(t.id)}
          </span>
          {t.label}
        </span>
      </div>
    </aside>
  )
}
