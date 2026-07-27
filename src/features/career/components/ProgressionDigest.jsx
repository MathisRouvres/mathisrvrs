import { SKILL_CAUSE_LABELS } from '../../../game-engine'
import CountUp from './CountUp'
import {
  clubStatusLabel,
  formatWage,
  reputationQualifier,
  trajectoryIcon,
} from './careerUiMaps'

/**
 * Valorisation visuelle de la progression (Phase 14, §3–§6). Composant PUREMENT
 * présentationnel : il consomme le digest calculé par le moteur
 * (`bilan.progression`) et n'exécute aucune logique métier. Lisible sans couleur
 * (flèches + signes), animations courtes et non bloquantes.
 */
export default function ProgressionDigest({ progression }) {
  if (!progression) return null
  const { niveau, reputation, status, salary, skills = [], level, palmares = [] } =
    progression

  const repBeforeLabel = reputationQualifier(reputation.before)
  const repAfterLabel = reputationQualifier(reputation.after)
  const repChanged = repBeforeLabel !== repAfterLabel

  return (
    <div className="cg-progress" aria-label="Progression de la saison">
      {/* Niveau — avant → après (§3) */}
      <div className="cg-progress__level cg-anim-enter">
        <span className="cg-progress__tag">Niveau</span>
        <span className="cg-progress__ba">
          <span className="cg-progress__before">{niveau.before}</span>
          <span className="cg-progress__arrow" aria-hidden="true">
            →
          </span>
          <CountUp
            className="cg-progress__after"
            from={niveau.before}
            to={niveau.after}
          />
        </span>
        {niveau.delta !== 0 ? (
          <span
            className={`cg-delta cg-anim-pop ${niveau.delta > 0 ? 'cg-delta--up' : 'cg-delta--down'}`}
          >
            {`${niveau.delta > 0 ? '▲ +' : '▼ '}${niveau.delta} cette saison`}
          </span>
        ) : (
          <span className="cg-delta">Stable cette saison</span>
        )}
      </div>

      {/* Palier de carrière (§4) */}
      {level && (
        <div
          className={`cg-palier${level.promoted ? ' cg-palier--promoted' : ''} cg-anim-enter`}
          role="group"
          aria-label="Palier de carrière"
        >
          <div className="cg-palier__row">
            {level.previous && (
              <span className="cg-palier__prev">{level.previous.label}</span>
            )}
            <span className="cg-palier__current">
              {level.promoted ? '⭐ ' : ''}
              {level.current.label}
            </span>
            {level.next && (
              <span className="cg-palier__next">→ {level.next.label}</span>
            )}
          </div>
          {level.next && (
            <div
              className="cg-palier__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(level.progressToNext * 100)}
              aria-label={`Progression vers ${level.next.label}`}
            >
              <span
                className="cg-palier__fill"
                style={{ width: `${Math.round(level.progressToNext * 100)}%` }}
              />
            </div>
          )}
          <p className="cg-palier__traj">
            <span aria-hidden="true">{trajectoryIcon(level.trajectory.id)}</span>{' '}
            {level.trajectory.label}
          </p>
        </div>
      )}

      {/* Changements de contexte (§3) */}
      <ul className="cg-progress__rows">
        {status && (
          <li className="cg-progress__change cg-anim-pop">
            <span className="cg-progress__ctag">Statut</span>
            {clubStatusLabel(status.before)}{' '}
            <span aria-hidden="true">→</span>{' '}
            <strong>{clubStatusLabel(status.after)}</strong>
          </li>
        )}
        {repChanged && (
          <li className="cg-progress__change cg-anim-pop">
            <span className="cg-progress__ctag">Réputation</span>
            {repBeforeLabel} <span aria-hidden="true">→</span>{' '}
            <strong>{repAfterLabel}</strong>
          </li>
        )}
        {salary && (
          <li className="cg-progress__change cg-anim-pop">
            <span className="cg-progress__ctag">Salaire</span>
            {formatWage(salary.before)} <span aria-hidden="true">→</span>{' '}
            <strong>{formatWage(salary.after)}</strong>
          </li>
        )}
        {palmares.length > 0 && (
          <li className="cg-progress__change cg-anim-pop">
            <span className="cg-progress__ctag">Palmarès</span>
            <strong>{palmares.join(' · ')}</strong>
          </li>
        )}
      </ul>

      {/* Compétences modifiées (§6) */}
      {skills.length > 0 && (
        <ul className="cg-skills" aria-label="Compétences modifiées">
          {skills.map((s) => (
            <li key={s.id} className={`cg-skill cg-skill--${s.direction} cg-anim-pop`}>
              <span className="cg-skill__name">{s.label}</span>
              <span className="cg-skill__ba">
                {s.before} <span aria-hidden="true">→</span> {s.after}
              </span>
              <span className="cg-skill__delta">
                {`${s.direction === 'up' ? '▲ +' : '▼ '}${s.delta}`}
              </span>
              <span className="cg-skill__cause">
                {SKILL_CAUSE_LABELS[s.cause] ?? ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
