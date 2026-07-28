/**
 * Journal de partie (Phase mobile) — dérive un événement lisible depuis un
 * résultat de tour. Pur et testable. Retourne null pour les cases sans intérêt
 * (parking, simple visite, rien).
 */
export function logEntryForResult(result, activeName) {
  if (!result) return null
  const o = result.outcome
  switch (o.kind) {
    case 'buy_offer':
      return { icon: '🏠', text: `${activeName} tombe sur ${o.name} — libre (${o.price}€)` }
    case 'cannot_afford':
      return { icon: '🏠', text: `${activeName} ne peut pas s’offrir ${o.name} (${o.price}€)` }
    case 'pay_rent':
      return { icon: '💸', text: `${activeName} paie ${o.amount}€ de loyer à ${o.toName}` }
    case 'tax':
      return { icon: '🧾', text: `${activeName} paie ${o.amount}€ · ${o.name}` }
    case 'go_jail':
      return { icon: '🚓', text: `${activeName} file en prison` }
    case 'draw_card':
      return { icon: '🃏', text: `${activeName} tire une carte` }
    case 'market':
      return { icon: '🕶️', text: `${activeName} entre au Marché Noir` }
    case 'jail_stay':
      return { icon: '🔒', text: `${activeName} reste en cuve` }
    case 'jail_out':
      return { icon: '🔓', text: `${activeName} sort de cuve` }
    case 'own_property':
      return { icon: '📍', text: `${activeName} repasse chez lui · ${o.name}` }
    default:
      return null
  }
}
