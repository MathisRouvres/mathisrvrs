// Décor animé partagé (accueil, lobby) : orbes néon, grille et emojis flottants.
// Purement décoratif : aria-hidden, jamais cliquable, positionné derrière le contenu.
const FLOATERS = ['🍻', '🎲', '💸', '🍺', '🎰', '🥂', '🍹', '🎯']

export default function MvBackdrop() {
  return (
    <div className="mv-backdrop" aria-hidden="true">
      <span className="mv-orb mv-orb--violet" />
      <span className="mv-orb mv-orb--magenta" />
      <span className="mv-orb mv-orb--cyan" />
      <div className="mv-floaters">
        {FLOATERS.map((emoji) => (
          <span key={emoji} className="mv-floater">
            {emoji}
          </span>
        ))}
      </div>
    </div>
  )
}
