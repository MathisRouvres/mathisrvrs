import { useEffect } from 'react'
import { MonovomyButton } from '../MonovomyShell'
import { SOFT_CATEGORY_LABEL } from '../engine'
import { sound } from '../game/sound'
import { haptics } from '../game/haptics'

const FAMILY_COLOR = { defi: '#f5b21a', chance: '#ec1e79', gage: '#7c3aed', regle: '#22c1c3', duel: '#f97316' }
const FAMILY_LABEL = { defi: 'DÉFI', chance: 'CHANCE À BOIRE', gage: 'GAGE', regle: 'RÈGLE', duel: 'DUEL' }
const FAMILY_ICON = { defi: '🎯', chance: '🍸', gage: '🎭', regle: '📜', duel: '⚔️' }
const FAMILY_TAG = {
  defi: 'Réussis… ou bois',
  chance: 'Distribue les gorgées',
  gage: 'Exécute le gage',
  regle: 'Règle jusqu’à la fin',
  duel: 'Le perdant boit',
}

// Métadonnées de « carte » pour chaque type de case (hors carte action).
const TYPE_META = {
  buy_offer: { label: 'PROPRIÉTÉ', icon: '🏠', accent: '#7c3aed', tag: 'À vendre' },
  cannot_afford: { label: 'PROPRIÉTÉ', icon: '🏠', accent: '#7c3aed', tag: 'Trop cher' },
  own_property: { label: 'PROPRIÉTÉ', icon: '🏠', accent: '#7c3aed', tag: 'Déjà à toi' },
  pay_rent: { label: 'LOYER', icon: '💸', accent: '#ec1e79', tag: 'À régler' },
  tax: { label: 'TAXE', icon: '🧾', accent: '#f97316', tag: 'À la banque' },
  go_jail: { label: 'AU POSTE', icon: '🚓', accent: '#e11d48', tag: 'Direction la cuve' },
  jail_visit: { label: 'SIMPLE VISITE', icon: '👀', accent: '#22c1c3', tag: 'Tranquille' },
  jail_stay: { label: 'EN CUVE', icon: '🔒', accent: '#e11d48', tag: 'Double raté' },
  jail_out: { label: 'LIBÉRÉ', icon: '🔓', accent: '#22c1c3', tag: 'Sortie de cuve' },
  parking: { label: 'BAR OUVERT', icon: '🍹', accent: '#22c1c3', tag: 'Petite pause' },
}
const DEFAULT_META = { label: 'CASE', icon: '🎲', accent: '#7c3aed', tag: '' }

const PIP_LAYOUT = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function PipDie({ value }) {
  const dots = PIP_LAYOUT[value] || []
  return (
    <span className="mv-pipdie" aria-label={`dé ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={dots.includes(i) ? 'mv-pip is-on' : 'mv-pip'} />
      ))}
    </span>
  )
}

function outcomeLabel(result, active) {
  const outcome = result.outcome
  switch (outcome.kind) {
    case 'buy_offer':
      return `${outcome.name} est libre — ${outcome.price}€`
    case 'cannot_afford':
      return `${outcome.name} — trop cher (${outcome.price}€)`
    case 'own_property':
      return `${outcome.name} — c’est déjà chez toi`
    case 'pay_rent':
      return `Loyer chez ${outcome.toName} : ${outcome.amount}€`
    case 'tax':
      return `${outcome.name} : ${outcome.amount}€`
    case 'go_jail':
      return 'Au poste ! Direction la cuve.'
    case 'jail_visit':
      return 'Simple visite en cuve.'
    case 'jail_stay':
      return `Double raté — encore ${outcome.turnsLeft} tour(s) en cuve.`
    case 'jail_out':
      return outcome.via === 'card' ? 'Carte de sortie utilisée !' : 'Caution payée — te voilà libre.'
    case 'parking':
      return 'Bar ouvert — petite pause.'
    case 'draw_card': {
      if (!result.card) return 'Carte action'
      const useSoft = active && active.drinkMode === 'soft' && result.card.soft
      return useSoft ? result.card.soft : result.card.text
    }
    default:
      return outcome.name || '—'
  }
}

export default function MvCardReveal({ result, active, isDecision, canAct, onBuy, onNext, softActive, softAlt, showActions = true }) {
  const outcome = result.outcome
  const isCard = outcome.kind === 'draw_card' && result.card

  const meta = isCard
    ? {
        label: FAMILY_LABEL[result.card.family],
        icon: FAMILY_ICON[result.card.family],
        accent: FAMILY_COLOR[result.card.family],
        tag: FAMILY_TAG[result.card.family],
      }
    : TYPE_META[outcome.kind] || DEFAULT_META

  const accent = meta.accent
  const waiting = active ? `En attente de ${active.name}…` : '…'

  useEffect(() => {
    if (result.sips > 0 || outcome.kind === 'draw_card') {
      const timer = setTimeout(() => sound.play('sip'), 250)
      return () => clearTimeout(timer)
    }
  }, [result, outcome])

  const handleBuy = (yes) => {
    if (yes) {
      sound.play('buy')
      haptics.vibrate('buy')
    }
    onBuy(yes)
  }

  return (
    <div className="mv-reveal">
      <div className={`mv-card ${isCard ? 'is-action' : ''}`} style={{ '--accent': accent }}>
        <header className="mv-card__head">
          <span className="mv-card__type">
            <span className="mv-card__typeic">{meta.icon}</span>
            {meta.label}
          </span>
          <span className="mv-card__roll">
            <PipDie value={result.roll.d1} />
            <PipDie value={result.roll.d2} />
            <b>{result.roll.total}</b>
            {result.roll.isDouble && <em>double</em>}
          </span>
        </header>

        <div className="mv-card__body">
          <div className="mv-card__art" aria-hidden="true">
            <span>{meta.icon}</span>
          </div>

          {result.passedStart && <p className="mv-salary">+{result.salary}€ · passage Départ</p>}
          <p className="mv-card__text">{outcomeLabel(result, active)}</p>

          {result.roll.isDouble && outcome.kind !== 'go_jail' && (
            <p className="mv-double">🎲 Double — tu rejoues !</p>
          )}

          {result.sips > 0 && (
            softActive && softAlt ? (
              <p className="mv-sips mv-sips--soft">🥤 {SOFT_CATEGORY_LABEL[softAlt.category]} — {softAlt.text}</p>
            ) : (
              <p className="mv-sips">🥂 {result.sips} {softActive ? 'mini-gage(s)' : 'gorgée(s)'}</p>
            )
          )}
          {result.bankruptcy && (
            <p className="mv-bankrupt">
              💥 Faillite —{' '}
              {result.bankruptcy.eliminated ? 'éliminé !' : result.bankruptcy.rescued ? 'relance 300€' : 'à sec'}
              {result.bankruptcySips > 0 ? ` · ${result.bankruptcySips} gorgée(s)` : ''}
            </p>
          )}
        </div>

        <footer className="mv-card__foot">
          <span className="mv-card__brand">
            <b className="mv-mono">Mono</b><b className="mv-vomy">Vomy</b>
          </span>
          {meta.tag && <span className="mv-card__tag">{meta.tag}</span>}
        </footer>

        {showActions && (
        <div className="mv-card__actions">
          {isDecision ? (
            canAct ? (
              <>
                <MonovomyButton onClick={() => handleBuy(true)}>Acheter</MonovomyButton>
                <MonovomyButton variant="ghost" onClick={() => handleBuy(false)}>Passer</MonovomyButton>
              </>
            ) : (
              <p className="mv-wait">{waiting}</p>
            )
          ) : canAct ? (
            <MonovomyButton onClick={onNext}>Continuer →</MonovomyButton>
          ) : (
            <p className="mv-wait">{waiting}</p>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
