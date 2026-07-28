/**
 * Quel panneau la scène centrale doit-elle ouvrir ? Partagé par le contenu HTML
 * (MvCenter) et la scène 3D (CenterStage) : les deux ne peuvent plus diverger.
 */
export function centerPanelKind(state, result, rolling) {
  if (state.phase === 'awaiting_auction' && state.auction) return 'auction'
  if (result && !rolling) return 'card'
  return null
}
