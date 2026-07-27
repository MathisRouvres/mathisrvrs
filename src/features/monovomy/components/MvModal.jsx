export default function MvModal({ title, onClose, children }) {
  return (
    <div className="mv-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="mv-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="mv-modal__head">
          <h2 className="mv-modal__title">{title}</h2>
          <button type="button" className="mv-modal__close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="mv-modal__body">{children}</div>
      </div>
    </div>
  )
}
