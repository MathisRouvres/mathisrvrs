import { MonovomyButton } from '../MonovomyShell'

/**
 * Bouton d'action principal contextuel (Phase 6), fixé en bas, accessible au pouce.
 * UNE action domine, elle change selon la phase : lancer / acheter / refuser /
 * continuer / terminer / sortir de cuve. En enchère, la surface d'action est le
 * panneau d'enchère → la barre s'efface.
 */
export default function MvActionBar({
  phase,
  canAct,
  activeName,
  result,
  jailCards = 0,
  turnFrac = null,
  turnUrgent = false,
  onRoll,
  onBuy,
  onNext,
  onJail,
}) {
  if (phase === 'awaiting_auction') return null

  let content
  if (!canAct) {
    content = <p className="mv-actionbar__wait mv-surface-1">En attente de {activeName || '…'}…</p>
  } else if (phase === 'awaiting_roll') {
    content = <MonovomyButton className="mv-actionbar__primary is-live" onClick={onRoll}>🎲 Lancer le dé</MonovomyButton>
  } else if (phase === 'awaiting_jail') {
    content = (
      <div className="mv-actionbar__multi">
        <MonovomyButton className="mv-actionbar__primary is-live" onClick={() => onJail?.('bail')}>💸 Payer pour sortir</MonovomyButton>
        <MonovomyButton variant="ghost" onClick={() => onJail?.('double')}>🎲 Tenter un double</MonovomyButton>
        {jailCards > 0 && (
          <MonovomyButton variant="ghost" onClick={() => onJail?.('card')}>🎟 Carte de sortie</MonovomyButton>
        )}
      </div>
    )
  } else if (phase === 'awaiting_purchase' && result?.outcome?.kind === 'buy_offer') {
    content = (
      <div className="mv-actionbar__multi">
        <MonovomyButton className="mv-actionbar__primary is-live" onClick={() => onBuy?.(true)}>
          🏠 Acheter {result.outcome.price}€
        </MonovomyButton>
        <MonovomyButton variant="ghost" onClick={() => onBuy?.(false)}>Refuser</MonovomyButton>
      </div>
    )
  } else if (phase === 'awaiting_card') {
    content = <MonovomyButton className="mv-actionbar__primary" onClick={onNext}>Continuer →</MonovomyButton>
  } else {
    content = <MonovomyButton className="mv-actionbar__primary" onClick={onNext}>Terminer le tour</MonovomyButton>
  }

  return (
    <div className="mv-actionbar">
      {content}
      {canAct && phase === 'awaiting_roll' && turnFrac != null && (
        <span className={`mv-rollprogress ${turnUrgent ? 'is-alert' : ''}`} aria-hidden="true">
          <span className="mv-rollprogress__fill" style={{ width: `${turnFrac * 100}%` }} />
        </span>
      )}
    </div>
  )
}
