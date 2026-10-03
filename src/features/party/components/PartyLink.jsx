/**
 * Lien interne aux jeux de soirée : navigation sans rechargement, tout en
 * gardant un vrai `href` (nouvel onglet, clic molette, accessibilité).
 */
export default function PartyLink({ href, navigate, className, children, ...rest }) {
  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(href)
  }

  return (
    <a href={href} onClick={onClick} className={className} {...rest}>
      {children}
    </a>
  )
}
