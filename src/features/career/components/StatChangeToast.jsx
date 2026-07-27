import { formatVisibleDelta } from './careerUiMaps'

/**
 * Retour éphémère des conséquences d'un choix (§9) — non bloquant, sans
 * validation. Apparaît après un choix puis disparaît tout seul (timer géré
 * par le parent). Le joueur enchaîne immédiatement le dilemme suivant.
 */
export default function StatChangeToast({ toast, onDismiss }) {
  if (!toast) return null
  const { deltas = [], hasHidden = false } = toast

  return (
    <div className="cg-toast cg-anim-enter" role="status" aria-live="polite">
      <div className="cg-toast__body">
        {deltas.length > 0 ? (
          <ul className="cg-toast__deltas">
            {deltas.map(({ id, delta }) => (
              <li
                key={id}
                className={`cg-delta cg-anim-pop${delta > 0 ? ' cg-delta--up' : ' cg-delta--down'}`}
              >
                {formatVisibleDelta(id, delta)}
              </li>
            ))}
          </ul>
        ) : (
          <span className="cg-toast__none">Choix enregistré</span>
        )}
        {hasHidden && (
          <p className="cg-toast__hint">Des conséquences plus tard, peut-être…</p>
        )}
      </div>
      <button
        type="button"
        className="cg-toast__close"
        aria-label="Masquer"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  )
}
