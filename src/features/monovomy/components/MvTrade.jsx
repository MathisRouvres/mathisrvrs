import { useMemo, useState } from 'react'
import { MonovomyButton } from '../MonovomyShell'
import MvPortal from './MvPortal'
import { soireeBoard, getMarketCardById } from '../content'
import { bundleValue, emptyBundle, incomingOffers } from '../engine'
import { playerColor } from './board3d/playerColors'

/**
 * Négociation — refonte (Phase 12).
 *
 * L'ancien panneau montrait tout d'un coup : offres reçues, offres envoyées,
 * composeur à deux colonnes, boutons ±50 €, réactions rapides. Trop dense pour
 * un téléphone en soirée.
 *
 * Nouveau modèle, un écran = une décision :
 *   1. `inbox`   — les offres reçues, une par une, en grand. Accepter / Contre / Refuser.
 *   2. `who`     — à qui je propose ? Une rangée d'avatars, un tap.
 *   3. `compose` — deux paniers empilés (« il/elle donne » puis « je donne »),
 *                  chaque actif est une pastille qu'on tape. La balance se lit
 *                  en direct, en une phrase. Un seul bouton d'envoi.
 *
 * Aucune valeur n'est imposée : l'estimation reste indicative.
 */

const spaceOf = (id) => soireeBoard.spaces.find((s) => s.id === id)
const spaceName = (id) => spaceOf(id)?.name ?? id

/** Pastille d'actif sélectionnable (propriété, carte, jeton). */
function Chip({ on, label, sub, onClick }) {
  return (
    <button type="button" className={`mv-deal__chip ${on ? 'is-on' : ''}`} onClick={onClick}>
      <b>{label}</b>
      {sub && <small>{sub}</small>}
    </button>
  )
}

/** Récapitulatif compact d'un panier. */
function Basket({ bundle }) {
  const parts = []
  if (bundle.cash > 0) parts.push(`${bundle.cash} €`)
  for (const id of bundle.properties) parts.push(spaceName(id))
  for (const id of bundle.cards) parts.push(getMarketCardById(id)?.name ?? id)
  if (bundle.jailCards > 0) parts.push(`🗝 ×${bundle.jailCards}`)
  return <span className="mv-deal__basket">{parts.length ? parts.join(' + ') : 'rien'}</span>
}

/** Curseur d'argent : un seul geste, pas de martèlement de boutons ±50. */
function CashSlider({ value, max, onChange, label }) {
  const step = 50
  const top = Math.max(0, Math.floor(max / step) * step)
  return (
    <label className="mv-deal__cash">
      <span>{label} <b>{value} €</b></span>
      <input
        type="range"
        min="0"
        max={top}
        step={step}
        value={Math.min(value, top)}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={top === 0}
      />
    </label>
  )
}

/** Panier d'un joueur : argent + propriétés + cartes + jetons de cuve. */
function Side({ title, player, bundle, onChange, tone }) {
  const toggle = (key, id) => {
    const list = bundle[key]
    onChange({
      ...bundle,
      [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    })
  }
  const cards = player.marketCards ?? []
  const idx = Number.isInteger(player.seatIndex) ? player.seatIndex : 0

  return (
    <section className={`mv-deal__side is-${tone}`}>
      <header className="mv-deal__sidehead">
        <i className="mv-deal__dot" style={{ background: playerColor(idx) }} />
        <b>{title}</b>
        <Basket bundle={bundle} />
      </header>

      <CashSlider
        label="Argent"
        value={bundle.cash}
        max={player.cash}
        onChange={(cash) => onChange({ ...bundle, cash })}
      />

      {player.ownedSpaceIds.length > 0 && (
        <div className="mv-deal__chips">
          {player.ownedSpaceIds.map((id) => {
            const sp = spaceOf(id)
            return (
              <Chip
                key={id}
                on={bundle.properties.includes(id)}
                label={spaceName(id)}
                sub={sp && 'price' in sp ? `${sp.price} €` : null}
                onClick={() => toggle('properties', id)}
              />
            )
          })}
        </div>
      )}

      {cards.length > 0 && (
        <div className="mv-deal__chips">
          {cards.map((id, i) => {
            const card = getMarketCardById(id)
            // Main à doublons (deux Boucliers) : un exemplaire est sélectionné si le
            // panier en contient plus que le rang d'occurrence de cette carte.
            const rank = cards.slice(0, i).filter((x) => x === id).length
            const picked = bundle.cards.filter((x) => x === id).length > rank
            return (
              <Chip
                key={`${id}-${i}`}
                on={picked}
                label={`${card?.emoji ?? '🃏'} ${card?.name ?? id}`}
                sub={card ? `${card.priceCash} €` : null}
                onClick={() => {
                  const list = [...bundle.cards]
                  if (picked) list.splice(list.indexOf(id), 1)
                  else list.push(id)
                  onChange({ ...bundle, cards: list })
                }}
              />
            )
          })}
        </div>
      )}

      {player.jailCards > 0 && (
        <div className="mv-deal__chips">
          <Chip
            on={bundle.jailCards > 0}
            label={`🗝 Clé de cuve ×${player.jailCards}`}
            onClick={() => onChange({ ...bundle, jailCards: bundle.jailCards > 0 ? 0 : 1 })}
          />
        </div>
      )}
    </section>
  )
}

export default function MvTrade({ state, myId, now, onSend, onClose }) {
  const players = state.players
  const me = players.find((p) => p.id === myId)
  const others = players.filter((p) => p.id !== myId && !p.eliminated)

  const incoming = useMemo(() => (myId ? incomingOffers(state, myId, now) : []), [state, myId, now])
  const mySent = state.trades.filter(
    (o) => o.senderId === myId && o.status === 'pending' && now < o.expiresAt,
  )

  // L'écran d'entrée dépend de la situation : une offre reçue passe avant tout.
  const [step, setStep] = useState(incoming.length > 0 ? 'inbox' : 'who')
  const [withId, setWithId] = useState(null)
  const [give, setGive] = useState(emptyBundle)
  const [take, setTake] = useState(emptyBundle)
  const [counterOf, setCounterOf] = useState(null)

  if (!me) return null

  const other = players.find((p) => p.id === withId)
  const seatOf = (id) => players.findIndex((p) => p.id === id)

  const reset = () => {
    setGive(emptyBundle())
    setTake(emptyBundle())
    setCounterOf(null)
  }

  const openCompose = (playerId) => {
    setWithId(playerId)
    reset()
    setStep('compose')
  }

  // Contre-proposition : on repart de l'offre reçue, sens inversé, déjà remplie.
  const openCounter = (offer) => {
    setWithId(offer.senderId)
    setGive(offer.requestedAssets)
    setTake(offer.offeredAssets)
    setCounterOf(offer.id)
    setStep('compose')
  }

  const send = () => {
    if (counterOf) {
      onSend({ type: 'tradeCounter', offerId: counterOf, offered: give, requested: take })
    } else {
      onSend({ type: 'tradeCreate', receiverId: withId, offered: give, requested: take })
    }
    reset()
    onClose?.()
  }

  const delta = bundleValue(soireeBoard, take) - bundleValue(soireeBoard, give)
  const empty =
    bundleValue(soireeBoard, take) === 0 &&
    bundleValue(soireeBoard, give) === 0 &&
    take.jailCards === 0 &&
    give.jailCards === 0

  const verdict = (d) => {
    if (d > 60) return { text: 'Tu y gagnes', tone: 'good' }
    if (d < -60) return { text: 'Tu y perds', tone: 'bad' }
    return { text: 'Équilibré', tone: 'even' }
  }

  return (
    <MvPortal>
      <div className="mv-deal" role="dialog" aria-label="Négociation">
        <div className="mv-deal__card">
          <header className="mv-deal__head">
            {step === 'compose' ? (
              <button type="button" className="mv-deal__back" onClick={() => setStep(incoming.length ? 'inbox' : 'who')}>← Retour</button>
            ) : (
              <h3>🤝 Deals</h3>
            )}
            <button type="button" className="mv-deal__x" onClick={onClose} aria-label="Fermer">✕</button>
          </header>

          {/* Onglets : uniquement s'il y a quelque chose à arbitrer. */}
          {step !== 'compose' && incoming.length > 0 && (
            <nav className="mv-deal__tabs">
              <button type="button" className={step === 'inbox' ? 'is-on' : ''} onClick={() => setStep('inbox')}>
                Reçues ({incoming.length})
              </button>
              <button type="button" className={step === 'who' ? 'is-on' : ''} onClick={() => setStep('who')}>
                Proposer
              </button>
            </nav>
          )}

          {/* 1. Offres reçues — une décision par carte, rien d'autre à l'écran. */}
          {step === 'inbox' && (
            <div className="mv-deal__inbox">
              {incoming.map((o) => {
                const from = players.find((p) => p.id === o.senderId)
                const d = bundleValue(soireeBoard, o.offeredAssets) - bundleValue(soireeBoard, o.requestedAssets)
                const v = verdict(d)
                return (
                  <article key={o.id} className="mv-deal__offer">
                    <p className="mv-deal__from">
                      <i className="mv-deal__dot" style={{ background: playerColor(seatOf(o.senderId)) }} />
                      <b>{from?.name ?? '???'}</b> te propose
                    </p>
                    <p className="mv-deal__flow">
                      <span className="mv-deal__get">↓ tu reçois <Basket bundle={o.offeredAssets} /></span>
                      <span className="mv-deal__give">↑ tu donnes <Basket bundle={o.requestedAssets} /></span>
                    </p>
                    <p className={`mv-deal__verdict is-${v.tone}`}>{v.text}</p>
                    <div className="mv-deal__acts">
                      <MonovomyButton onClick={() => onSend({ type: 'tradeRespond', offerId: o.id, accept: true })}>
                        Accepter
                      </MonovomyButton>
                      <MonovomyButton variant="secondary" onClick={() => openCounter(o)}>Contre-offre</MonovomyButton>
                      <MonovomyButton variant="ghost" onClick={() => onSend({ type: 'tradeRespond', offerId: o.id, accept: false })}>
                        Refuser
                      </MonovomyButton>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* 2. À qui ? Un tap sur un avatar, rien de plus. */}
          {step === 'who' && (
            <div className="mv-deal__who">
              <p className="mv-deal__hint">Avec qui tu négocies ?</p>
              <div className="mv-deal__players">
                {others.map((p) => (
                  <button key={p.id} type="button" className="mv-deal__player" onClick={() => openCompose(p.id)}>
                    <i className="mv-deal__dot" style={{ background: playerColor(seatOf(p.id)) }} />
                    <b>{p.avatar} {p.name}</b>
                    <small>{p.cash} € · {p.ownedSpaceIds.length} propriété(s) · {(p.marketCards ?? []).length} carte(s)</small>
                  </button>
                ))}
              </div>

              {mySent.length > 0 && (
                <div className="mv-deal__sent">
                  <p className="mv-deal__hint">En attente de réponse</p>
                  {mySent.map((o) => (
                    <div key={o.id} className="mv-deal__sentrow">
                      <span>→ {players.find((p) => p.id === o.receiverId)?.name}</span>
                      <button type="button" onClick={() => onSend({ type: 'tradeCancel', offerId: o.id })}>Annuler</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Composeur : deux paniers, une balance, un bouton. */}
          {step === 'compose' && other && (
            <div className="mv-deal__compose">
              <Side
                title={`Tu prends chez ${other.name}`}
                player={{ ...other, seatIndex: seatOf(other.id) }}
                bundle={take}
                onChange={setTake}
                tone="get"
              />
              <Side
                title="Tu donnes"
                player={{ ...me, seatIndex: seatOf(me.id) }}
                bundle={give}
                onChange={setGive}
                tone="give"
              />

              <p className={`mv-deal__verdict is-${verdict(delta).tone}`}>
                {verdict(delta).text}
                <small> · indicatif, tu décides</small>
              </p>

              <MonovomyButton className="mv-deal__send" onClick={send} disabled={empty}>
                {counterOf ? 'Envoyer la contre-offre' : `Proposer à ${other.name}`}
              </MonovomyButton>
            </div>
          )}
        </div>
      </div>
    </MvPortal>
  )
}
