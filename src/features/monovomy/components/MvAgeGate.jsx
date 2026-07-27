export default function MvAgeGate({ onConfirm }) {
  return (
    <div className="mv-agegate">
      <div className="mv-agegate__card">
        <div className="mv-agegate__logo">
          <span className="mv-mono">MONO</span>
          <span className="mv-vomy">VOMY</span>
        </div>
        <p className="mv-agegate__badge">+18</p>
        <p>
          MonoVomy est un jeu à boire réservé aux adultes. En entrant, tu confirmes avoir
          <strong> 18 ans ou plus</strong>.
        </p>
        <p className="mv-agegate__mod">
          L’abus d’alcool est dangereux pour la santé. À consommer avec modération. Un mode
          sans alcool est disponible pour chaque joueur.
        </p>
        <div className="mv-actions">
          <button type="button" className="mv-btn mv-btn--primary" onClick={onConfirm}>
            J’ai 18 ans ou plus
          </button>
        </div>
      </div>
    </div>
  )
}
