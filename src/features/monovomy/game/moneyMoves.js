/**
 * Mouvements d'argent portés par un résultat de tour : `{ playerId: delta }`.
 *
 * Le moteur transfère l'argent **dès le lancer** (transfert atomique, condition
 * du modèle host-authoritative : l'état diffusé est déjà à jour). À l'écran, ça
 * donnait un solde qui changeait pendant que le dé roulait encore — personne ne
 * voyait passer le paiement.
 *
 * Ces mouvements sont donc rejoués **à l'envers** pendant l'animation du dé : on
 * affiche le solde d'AVANT, puis le paiement tombe au moment où la carte de
 * résultat l'annonce. Pur et dérivé du seul `result` : aucun état en plus, aucun
 * risque de désynchronisation avec le moteur.
 *
 * @param {{ passedStart?: boolean, salary?: number, outcome: { kind: string } }} result
 * @param {string|null|undefined} activeId joueur dont c'est le tour
 * @returns {Record<string, number>} deltas par joueur (positif = encaisse)
 */
export function moneyMoves(result, activeId) {
  const moves = {}
  if (!result) return moves
  const add = (id, d) => {
    if (id && d) moves[id] = (moves[id] ?? 0) + d
  }
  if (result.passedStart) add(activeId, result.salary ?? 0)
  const o = result.outcome
  if (!o) return moves
  if (o.kind === 'pay_rent') {
    add(activeId, -o.amount)
    add(o.toPlayerId, o.amount)
  } else if (o.kind === 'tax') {
    add(activeId, -o.amount)
  }
  return moves
}
