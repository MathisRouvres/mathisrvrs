import { useEffect, useRef } from 'react'
import { CareerButton } from '../CareerShell'

/**
 * Présentation spéciale d'un palier de carrière franchi (§9). Modale légère,
 * rare et valorisée. Accessible : rôle dialog, focus piégé sur l'action,
 * Échap et clic sur le fond pour fermer.
 */
export default function CareerMilestoneModal({ milestone, onClose }) {
  const btnRef = useRef(null)

  useEffect(() => {
    btnRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!milestone) return null

  return (
    <div
      className="cg-modal"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="cg-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cg-milestone-title"
      >
        <p className="cg-milestone__kicker">Nouveau palier</p>
        <p className="cg-milestone__icon" aria-hidden="true">
          {milestone.icon}
        </p>
        <h2 id="cg-milestone-title" className="cg-milestone__title">
          {milestone.title}
        </h2>
        <p className="cg-milestone__text">{milestone.text}</p>
        <div className="cg-actions" style={{ justifyContent: 'center' }}>
          <CareerButton
            ref={btnRef}
            type="button"
            variant="primary"
            className="cg-btn--hero"
            onClick={onClose}
          >
            Continuer
          </CareerButton>
        </div>
      </div>
    </div>
  )
}
