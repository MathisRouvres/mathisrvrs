/**
 * Progression de la saison (§6) : « Saison N · Étape · Dilemme X sur 2 » + un
 * stepper à exactement DEUX étapes. Rien ne laisse penser qu'un troisième
 * dilemme puisse apparaître.
 *
 * Le texte « Saison N » et « Dilemme X sur 2 » sert aussi de repère de test.
 */
export default function SeasonProgress({ seasonIndex, stageLabel, dilemmaNumber }) {
  const firstDone = dilemmaNumber >= 2
  return (
    <div className="cg-season cg-anim-enter">
      <div className="cg-season__row">
        <p className="cg-season__label">
          Saison {seasonIndex} · {stageLabel} ·{' '}
          <span className="cg-season__count">Dilemme {dilemmaNumber} sur 2</span>
        </p>
        <div
          className="cg-steps2"
          role="img"
          aria-label={`Dilemme ${dilemmaNumber} sur 2`}
        >
          <span className={`cg-step2${firstDone ? ' is-done' : ' is-active'}`}>
            <span className="cg-step2__dot" aria-hidden="true">
              {firstDone ? '✓' : '1'}
            </span>
          </span>
          <span
            className={`cg-step2__line${firstDone ? ' is-done' : ''}`}
            aria-hidden="true"
          />
          <span className={`cg-step2${dilemmaNumber === 2 ? ' is-active' : ''}`}>
            <span className="cg-step2__dot" aria-hidden="true">
              2
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
