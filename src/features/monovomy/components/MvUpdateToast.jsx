import { useState } from 'react'

/**
 * Notification de mise à jour. Ne recharge JAMAIS en plein tour : si une partie est
 * en cours, on affiche seulement une info (« s'appliquera après la partie »). Le
 * bouton d'application n'apparaît qu'une fois la partie terminée.
 */
export default function MvUpdateToast({ available, playing, onApply }) {
  const [dismissed, setDismissed] = useState(false)

  if (!available || dismissed) return null

  return (
    <div className="mv-update" role="status" aria-live="polite">
      <span className="mv-update__dot" aria-hidden="true" />
      <div className="mv-update__body">
        <p className="mv-update__title">Nouvelle version disponible</p>
        <p className="mv-update__desc">
          {playing ? 'Elle s’appliquera après la partie.' : 'Recharge pour profiter des dernières améliorations.'}
        </p>
      </div>
      {!playing && (
        <button type="button" className="mv-update__cta" onClick={onApply}>
          Mettre à jour
        </button>
      )}
      <button
        type="button"
        className="mv-update__close"
        onClick={() => setDismissed(true)}
        aria-label="Plus tard"
      >
        ✕
      </button>
    </div>
  )
}
