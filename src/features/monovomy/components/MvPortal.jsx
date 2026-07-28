import { createPortal } from 'react-dom'

/**
 * Sortie de secours pour les calques plein écran (feuilles, modales, détail de
 * case). Rendus dans `document.body`, ils ne dépendent plus de la mise en page de
 * la partie : aucun ancêtre ne peut les rogner (`overflow: hidden`), les décaler
 * (un filtre ou une transformation redéfinit le bloc conteneur d'un élément fixé)
 * ni les enfermer dans un contexte d'empilement.
 */
export default function MvPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
