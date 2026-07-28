import { MonovomyButton } from '../MonovomyShell'
import MvPortal from './MvPortal'

const GROUP_LABEL = {
  brun: 'Brun', cyan: 'Cyan', rose: 'Rose', orange: 'Orange',
  rouge: 'Rouge', jaune: 'Jaune', vert: 'Vert', bleu: 'Bleu',
}
const GROUP_COLOR = {
  brun: '#c07a3a', cyan: '#22c1c3', rose: '#ec4899', orange: '#f97316',
  rouge: '#ef4d63', jaune: '#f5b21a', vert: '#34d17e', bleu: '#3b82f6',
}
const KIND_META = {
  property: { label: 'Propriété', icon: '🏠', color: '#8b5cf6' },
  station: { label: 'Gare', icon: '🚕', color: '#4aa6e6' },
  utility: { label: 'Service', icon: '🍸', color: '#22c1c3' },
  start: { label: 'Départ', icon: '🏁', color: '#34d17e' },
  tax: { label: 'Taxe', icon: '🧾', color: '#f5b21a' },
  action: { label: 'Carte', icon: '🃏', color: '#ec1e79' },
  jail: { label: 'Cuve · visite', icon: '🔒', color: '#22c1c3' },
  gojail: { label: 'Au poste', icon: '🚓', color: '#ef4d63' },
  parking: { label: 'Bar ouvert', icon: '🍹', color: '#8b5cf6' },
}

/** Libellé d'un palier de loyer (0 = base, 1..4 maisons, 5 hôtel). */
function tierLabel(i, max) {
  if (i === 0) return 'Base'
  if (i >= max) return '🏨'
  return `🏠${i}`
}
function levelLabel(level, maxLevel) {
  if (level <= 0) return 'Terrain nu'
  if (level >= maxLevel) return '🏨 Hôtel'
  return `🏠 ${level} maison${level > 1 ? 's' : ''}`
}

export default function MvCaseDetail({
  space,
  ownerName,
  ownerColor,
  management,
  onBuild,
  onSell,
  onMortgage,
  onUnmortgage,
  onClose,
}) {
  const price = 'price' in space ? space.price : null
  const rents = 'rents' in space ? space.rents : null
  const isProperty = space.kind === 'property'
  const purchasable = 'price' in space
  const meta = KIND_META[space.kind] ?? KIND_META.property
  const accent = isProperty ? (GROUP_COLOR[space.group] ?? meta.color) : meta.color
  const m = management
  const showManage =
    m && m.isProperty && (m.level > 0 || m.mortgaged || m.canBuild || m.canSell || m.canMortgage || m.canUnmortgage)

  return (
    <MvPortal>
    <div className="mv-casedetail" onClick={onClose}>
      <div className="mv-casedetail__card" style={{ '--accent': accent }} onClick={(e) => e.stopPropagation()}>
        <span className="mv-casedetail__glow" aria-hidden="true" />
        <button type="button" className="mv-casedetail__x" onClick={onClose} aria-label="Fermer">✕</button>

        <header className="mv-casedetail__hero">
          <span className="mv-casedetail__icon" aria-hidden="true">{meta.icon}</span>
          <div className="mv-casedetail__head">
            <span className="mv-casedetail__kind">
              {meta.label}
              {isProperty && <> · {GROUP_LABEL[space.group] ?? space.group}</>}
            </span>
            <h3 className="mv-casedetail__name">{space.name}</h3>
          </div>
        </header>

        {price != null && (
          <div className="mv-casedetail__price">
            <span>Prix d’achat</span>
            <b>{price}€</b>
          </div>
        )}

        {isProperty && rents && (
          <div className="mv-casedetail__section">
            <p className="mv-casedetail__label">Loyers par niveau</p>
            <div className="mv-rents">
              {rents.map((r, i) => (
                <span key={i} className={`mv-rent ${m && m.level === i ? 'is-current' : ''}`}>
                  <small>{tierLabel(i, rents.length - 1)}</small>
                  <b>{r}€</b>
                </span>
              ))}
            </div>
          </div>
        )}

        {!isProperty && rents && (
          <div className="mv-casedetail__price">
            <span>Loyers</span>
            <b>{rents.join(' · ')}€</b>
          </div>
        )}

        {'sipTier' in space && (
          <p className="mv-casedetail__line">
            🥂 Gorgées au loyer : <b>{space.sipTier === 3 ? 'cul sec' : space.sipTier}</b> <small>(× niveau)</small>
          </p>
        )}
        {space.kind === 'tax' && (
          <p className="mv-casedetail__line">🧾 Taxe : <b>{space.amount}€</b> · {space.sips} gorgée(s)</p>
        )}

        {m && m.isProperty && (m.level > 0 || m.mortgaged || m.isMonopoly) && (
          <p className="mv-casedetail__state">
            {m.mortgaged ? '🏦 Hypothéquée' : levelLabel(m.level, m.maxLevel)}
            {m.isMonopoly && !m.mortgaged && m.level === 0 && ' · Monopole (loyer ×2)'}
          </p>
        )}

        <div className={`mv-casedetail__owner ${ownerName ? 'is-owned' : 'is-free'}`}>
          {ownerName ? (
            <>
              <i className="mv-casedetail__ownerdot" style={{ background: ownerColor }} />
              <span>Propriétaire</span>
              <b>{ownerName}</b>
            </>
          ) : purchasable ? (
            <span className="mv-casedetail__freetag">✦ Case libre — à acheter</span>
          ) : (
            <span className="mv-casedetail__freetag">Case spéciale · non achetable</span>
          )}
        </div>

        {showManage && (
          <div className="mv-casedetail__manage">
            {m.canBuild && (
              <MonovomyButton onClick={onBuild}>🏗 Construire · {m.buildCost}€</MonovomyButton>
            )}
            {m.canSell && (
              <MonovomyButton variant="secondary" onClick={onSell}>Revendre · +{m.sellRefund}€</MonovomyButton>
            )}
            {m.canMortgage && (
              <MonovomyButton variant="secondary" onClick={onMortgage}>
                🏦 Hypothéquer · +{space.price ? Math.round(space.price / 2) : 0}€
              </MonovomyButton>
            )}
            {m.canUnmortgage && (
              <MonovomyButton onClick={onUnmortgage}>Lever l’hypothèque · {m.unmortgageCost}€</MonovomyButton>
            )}
          </div>
        )}
      </div>
    </div>
    </MvPortal>
  )
}
