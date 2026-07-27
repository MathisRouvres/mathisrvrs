import { useMemo, useState } from 'react'
import { MonovomyButton } from '../MonovomyShell'
import { soireeBoard } from '../content'
import { bundleValue, estimateTrade, incomingOffers } from '../engine'

const REACTION_LABEL = {
  too_expensive: 'Trop cher',
  add_property: 'Ajoute une propriété',
  deal: 'Deal',
  never: 'Jamais',
  last_offer: 'Dernière offre',
}
const BALANCE_LABEL = { avantageux: '🟢 Avantageux', équilibré: '🟡 Équilibré', risqué: '🔴 Risqué' }

const spaceName = (id) => soireeBoard.spaces.find((s) => s.id === id)?.name ?? id

function BundleView({ bundle }) {
  const parts = []
  if (bundle.cash > 0) parts.push(`${bundle.cash} €`)
  for (const id of bundle.properties) parts.push(spaceName(id))
  if (bundle.jailCards > 0) parts.push(`🎟×${bundle.jailCards}`)
  return <span className="mv-trade__bundle">{parts.length ? parts.join(' + ') : '—'}</span>
}

/** Panneau de négociation : offres reçues + composeur d’offre + réactions rapides. */
export default function MvTrade({ state, myId, now, onSend, onClose }) {
  const players = state.players
  const me = players.find((p) => p.id === myId)
  const others = players.filter((p) => p.id !== myId && !p.eliminated)

  const [receiverId, setReceiverId] = useState(others[0]?.id ?? '')
  const [offered, setOffered] = useState({ cash: 0, properties: [], jailCards: 0 })
  const [requested, setRequested] = useState({ cash: 0, properties: [], jailCards: 0 })

  const receiver = players.find((p) => p.id === receiverId)
  const incoming = useMemo(() => (myId ? incomingOffers(state, myId, now) : []), [state, myId, now])
  const mySent = state.trades.filter((o) => o.senderId === myId && o.status === 'pending' && now < o.expiresAt)

  if (!me) return null

  const bump = (side, key, delta) => {
    const setter = side === 'offered' ? setOffered : setRequested
    setter((b) => ({ ...b, [key]: Math.max(0, b[key] + delta) }))
  }
  const toggleProp = (side, id) => {
    const setter = side === 'offered' ? setOffered : setRequested
    setter((b) => ({
      ...b,
      properties: b.properties.includes(id) ? b.properties.filter((x) => x !== id) : [...b.properties, id],
    }))
  }

  // Estimation du point de vue de l’émetteur (moi) : je reçois `requested`, je cède `offered`.
  const senderDelta = bundleValue(soireeBoard, requested) - bundleValue(soireeBoard, offered)
  const senderLabel = senderDelta > 60 ? 'avantageux' : senderDelta < -60 ? 'risqué' : 'équilibré'

  const canSend = receiverId && (offered.cash || offered.properties.length || offered.jailCards || requested.cash || requested.properties.length || requested.jailCards)

  const send = () => {
    onSend({ type: 'tradeCreate', receiverId, offered, requested })
    setOffered({ cash: 0, properties: [], jailCards: 0 })
    setRequested({ cash: 0, properties: [], jailCards: 0 })
  }

  return (
    <div className="mv-trade">
      <header className="mv-trade__head">
        <h3>🤝 Négociation</h3>
        <button type="button" className="mv-trade__x" onClick={onClose}>✕</button>
      </header>

      {incoming.length > 0 && (
        <section className="mv-trade__incoming">
          <h4>Offres reçues</h4>
          {incoming.map((o) => {
            const est = estimateTrade(soireeBoard, o)
            const from = players.find((p) => p.id === o.senderId)
            return (
              <div key={o.id} className="mv-trade__offer">
                <p className="mv-trade__from">De {from?.name ?? '???'} · {BALANCE_LABEL[est.label]}</p>
                <p className="mv-trade__line"><b>Tu reçois</b> <BundleView bundle={o.offeredAssets} /></p>
                <p className="mv-trade__line"><b>Tu donnes</b> <BundleView bundle={o.requestedAssets} /></p>
                {o.lastReaction && <p className="mv-trade__react">💬 {REACTION_LABEL[o.lastReaction.reaction]}</p>}
                <div className="mv-trade__acts">
                  <MonovomyButton onClick={() => onSend({ type: 'tradeRespond', offerId: o.id, accept: true })}>Deal ✅</MonovomyButton>
                  <MonovomyButton variant="ghost" onClick={() => onSend({ type: 'tradeRespond', offerId: o.id, accept: false })}>Refuser</MonovomyButton>
                </div>
                <div className="mv-trade__reacts">
                  {Object.entries(REACTION_LABEL).map(([k, label]) => (
                    <button key={k} type="button" className="mv-trade__rbtn" onClick={() => onSend({ type: 'tradeReact', offerId: o.id, reaction: k })}>{label}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {mySent.length > 0 && (
        <section className="mv-trade__sent">
          <h4>Mes offres en attente</h4>
          {mySent.map((o) => (
            <div key={o.id} className="mv-trade__offer is-sent">
              <p className="mv-trade__line">→ {players.find((p) => p.id === o.receiverId)?.name}</p>
              <p className="mv-trade__line"><b>Tu donnes</b> <BundleView bundle={o.offeredAssets} /></p>
              <p className="mv-trade__line"><b>Tu reçois</b> <BundleView bundle={o.requestedAssets} /></p>
              <MonovomyButton variant="ghost" onClick={() => onSend({ type: 'tradeCancel', offerId: o.id })}>Annuler</MonovomyButton>
            </div>
          ))}
        </section>
      )}

      <section className="mv-trade__compose">
        <h4>Proposer un échange</h4>
        <label className="mv-trade__to">
          À&nbsp;:
          <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)}>
            {others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <div className="mv-trade__side">
          <p className="mv-trade__label">Tu donnes <BundleView bundle={offered} /></p>
          <div className="mv-trade__qbtns">
            <button type="button" onClick={() => bump('offered', 'cash', 50)}>+50 €</button>
            <button type="button" onClick={() => bump('offered', 'cash', 100)}>+100 €</button>
            <button type="button" onClick={() => bump('offered', 'cash', -50)}>−50 €</button>
            {me.jailCards > 0 && <button type="button" onClick={() => bump('offered', 'jailCards', offered.jailCards ? -1 : 1)}>🎟 {offered.jailCards ? 'retirer' : 'ajouter'}</button>}
          </div>
          <div className="mv-trade__props">
            {me.ownedSpaceIds.map((id) => (
              <button key={id} type="button" className={`mv-trade__prop ${offered.properties.includes(id) ? 'is-on' : ''}`} onClick={() => toggleProp('offered', id)}>{spaceName(id)}</button>
            ))}
          </div>
        </div>

        <div className="mv-trade__side">
          <p className="mv-trade__label">Tu reçois <BundleView bundle={requested} /></p>
          <div className="mv-trade__qbtns">
            <button type="button" onClick={() => bump('requested', 'cash', 50)}>+50 €</button>
            <button type="button" onClick={() => bump('requested', 'cash', 100)}>+100 €</button>
            <button type="button" onClick={() => bump('requested', 'cash', -50)}>−50 €</button>
            {receiver && receiver.jailCards > 0 && <button type="button" onClick={() => bump('requested', 'jailCards', requested.jailCards ? -1 : 1)}>🎟 {requested.jailCards ? 'retirer' : 'ajouter'}</button>}
          </div>
          <div className="mv-trade__props">
            {receiver?.ownedSpaceIds.map((id) => (
              <button key={id} type="button" className={`mv-trade__prop ${requested.properties.includes(id) ? 'is-on' : ''}`} onClick={() => toggleProp('requested', id)}>{spaceName(id)}</button>
            ))}
          </div>
        </div>

        <p className="mv-trade__estimate">Estimation : {BALANCE_LABEL[senderLabel]} <small>(indicatif, tu décides)</small></p>
        <MonovomyButton onClick={send} disabled={!canSend}>Envoyer l’offre →</MonovomyButton>
      </section>
    </div>
  )
}
