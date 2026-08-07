import { useEffect, useRef, useState } from 'react'
import { MonovomyButton } from '../MonovomyShell'
import { SOFT_CATEGORY_LABEL, buildCostFor } from '../engine'
import { defaultBoardMap } from '../content'
import { GROUP_COLORS, GROUP_LABEL } from '../game/groupColors'
import { sound } from '../game/sound'
import { haptics } from '../game/haptics'
import { useReducedMotion } from '../game/useReducedMotion'

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
  market: { label: 'MARCHÉ NOIR', icon: '🕶️', accent: '#0f172a', tag: 'Sous le manteau' },
}
const DEFAULT_META = { label: 'CASE', icon: '🎲', accent: '#7c3aed', tag: '' }

// Durées : elles DOIVENT rester alignées sur les keyframes CSS, sinon la file
// enchaîne une entrée avant la fin de la sortie précédente.
const ENTER_MS = 450
const EXIT_MS = 260
const REDUCED_MS = 150

const RENT_STEPS = ['Terrain nu', '1 maison', '2 maisons', '3 maisons', '4 maisons', 'Hôtel']

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

/** Retrouve la case concernée : par identifiant si on l'a, par nom sinon. */
function spaceOf(outcome, board) {
  if (outcome.spaceId) {
    const byId = board.spaces.find((s) => s.id === outcome.spaceId)
    if (byId) return byId
  }
  if (outcome.name) return board.spaces.find((s) => s.name === outcome.name) ?? null
  return null
}

/**
 * Une carte rare = celle qui laisse une trace : elle installe une règle, elle est
 * persistante, ou elle n'apparaît qu'en finale. Ce sont celles qui méritent le
 * bord doré.
 */
function isRareCard(card) {
  return Boolean(card && (card.ruleId || card.persistent || card.intensity === 'finale'))
}

function cardText(result, active) {
  if (!result.card) return 'Carte action'
  const useSoft = active && active.drinkMode === 'soft' && result.card.soft
  return useSoft ? result.card.soft : result.card.text
}

/**
 * Modèle d'affichage d'une révélation : bandeau, titre, corps, et surtout les
 * conséquences chiffrées isolées du texte — c'est ce qu'on lit en premier.
 */
function faceOf(result, active, board) {
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

  const impacts = []
  let title = outcome.name || '—'
  // Toujours affecté ci-dessous (le switch a une branche par défaut).
  let text

  switch (outcome.kind) {
    case 'buy_offer':
      text = 'Personne ne l’a encore prise.'
      impacts.push({ value: outcome.price, unit: '€', hint: 'Prix', tone: 'buy' })
      break
    case 'cannot_afford':
      text = 'Pas assez en caisse — elle part aux enchères.'
      impacts.push({ value: outcome.price, unit: '€', hint: 'Prix', tone: 'bad' })
      break
    case 'own_property':
      text = 'C’est déjà chez toi. Sers-toi.'
      break
    case 'pay_rent':
      title = outcome.name
      text = `Propriété de ${outcome.toName}.`
      impacts.push({ value: outcome.amount, unit: '€', hint: 'Loyer', tone: 'bad' })
      break
    case 'tax':
      title = outcome.name
      text = 'La banque encaisse.'
      impacts.push({ value: outcome.amount, unit: '€', hint: 'À payer', tone: 'bad' })
      break
    case 'go_jail':
      title = 'Au poste !'
      text = 'Direction la cuve, sans passer par la case Départ.'
      break
    case 'jail_visit':
      title = 'Simple visite'
      text = 'Tu regardes les autres depuis le bar.'
      break
    case 'jail_stay':
      title = 'En cuve'
      text = 'Double raté — tu restes au frais.'
      impacts.push({ value: outcome.turnsLeft, unit: 'tour(s)', hint: 'Encore', tone: 'bad' })
      break
    case 'jail_out':
      title = 'Libéré'
      text = outcome.via === 'card' ? 'Carte de sortie utilisée !' : 'Caution payée — te voilà libre.'
      break
    case 'parking':
      title = 'Bar ouvert'
      text = 'Petite pause, personne ne paie.'
      break
    case 'market':
      title = 'Marché Noir'
      text = 'Trois cartes sous le manteau. Argent ou gorgées, à toi de voir.'
      break
    case 'draw_card':
      title = meta.label
      text = cardText(result, active)
      break
    default:
      text = outcome.name || '—'
  }

  if (result.passedStart) impacts.push({ value: `+${result.salary}`, unit: '€', hint: 'Départ', tone: 'good' })
  if (result.sips > 0) {
    impacts.push({
      value: result.sips,
      unit: active && active.drinkMode === 'soft' ? 'mini-gage(s)' : 'gorgée(s)',
      hint: 'À boire',
      tone: 'sip',
    })
  }

  const space = spaceOf(outcome, board)
  const showTitle = ['buy_offer', 'cannot_afford', 'own_property', 'pay_rent'].includes(outcome.kind)
  return {
    meta,
    title,
    text,
    impacts,
    rare: isRareCard(result.card),
    space: showTitle && space && 'price' in space ? space : null,
  }
}

/** Titre de propriété classique, mis à l'identité MonoVomy. */
function PropertyTitle({ space }) {
  const color = GROUP_COLORS[space.group] || '#7c3aed'
  const cost = buildCostFor(space)
  const rents = space.rents || []
  return (
    <div className="mv-title" style={{ '--g': color }}>
      <div className="mv-title__band">
        <span>Titre de propriété</span>
        {space.group && <b>{GROUP_LABEL[space.group] || space.group}</b>}
      </div>
      <b className="mv-title__name">{space.name}</b>
      <dl className="mv-title__rents">
        {rents.map((r, i) => (
          <div key={i} className={i === 0 ? 'is-base' : undefined}>
            <dt>{space.group ? RENT_STEPS[i] || `Palier ${i}` : `${i + 1} gare(s)`}</dt>
            <dd>{r}€</dd>
          </div>
        ))}
      </dl>
      {space.group && cost > 0 && (
        <p className="mv-title__costs">
          <span>Maison <b>{cost}€</b></span>
          <span>Hôtel <b>{cost}€</b></span>
          <span>Hypothèque <b>{Math.round(space.price / 2)}€</b></span>
        </p>
      )}
    </div>
  )
}

/**
 * Révélation de carte : le moment le plus regardé de la partie.
 *
 * Cycle explicite `enter → idle → exit` avec UNE file d'attente : si une seconde
 * révélation tombe pendant qu'une carte est à l'écran, elle patiente le temps que
 * la première glisse hors champ. Sans ça les deux se chevauchent et on ne lit ni
 * l'une ni l'autre.
 *
 * Le retournement se joue sur un dos de carte : le texte n'apparaît qu'une fois la
 * face passée à plat (dernier quart de l'animation), donc jamais déformé.
 */
export default function MvCardReveal({ result, active, isDecision, canAct, onBuy, onNext, softActive, softAlt, showActions = true, board = defaultBoardMap() }) {
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState(result)
  const [phase, setPhase] = useState('enter')
  const shownRef = useRef(result)
  const pending = useRef(null)

  // Nouvelle révélation : on ne coupe jamais la sortie en cours.
  useEffect(() => {
    if (result === shownRef.current) return
    pending.current = result
    setPhase('exit')
  }, [result])

  useEffect(() => {
    if (phase === 'enter') {
      const t = setTimeout(() => setPhase('idle'), reducedMotion ? REDUCED_MS : ENTER_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'exit') {
      const t = setTimeout(() => {
        const next = pending.current
        pending.current = null
        if (next) {
          shownRef.current = next
          setShown(next)
          setPhase('enter')
        }
      }, reducedMotion ? REDUCED_MS : EXIT_MS)
      return () => clearTimeout(t)
    }
    return undefined
  }, [phase, reducedMotion])

  const face = faceOf(shown, active, board)
  const accent = face.meta.accent
  const waiting = active ? `En attente de ${active.name}…` : '…'

  useEffect(() => {
    if (shown.sips > 0 || shown.outcome.kind === 'draw_card') {
      const timer = setTimeout(() => sound.play('sip'), 250)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [shown])

  const handleBuy = (yes) => {
    if (yes) {
      sound.play('buy')
      haptics.vibrate('buy')
    }
    onBuy(yes)
  }

  return (
    <div className="mv-reveal">
      <div
        className={`mv-card is-${phase} ${face.rare ? 'is-rare' : ''} ${reducedMotion ? 'is-reduced' : ''}`}
        style={{ '--accent': accent }}
      >
        <div className="mv-card__flip">
          {/* Dos de carte : c'est lui qu'on voit pendant la première moitié du flip. */}
          <div className="mv-card__back" aria-hidden="true">
            <span className="mv-card__backmark">
              <b className="mv-mono">Mono</b><b className="mv-vomy">Vomy</b>
            </span>
          </div>

          <div className="mv-card__front">
            <header className="mv-card__head">
              <span className="mv-card__type">
                <span className="mv-card__typeic">{face.meta.icon}</span>
                {face.meta.label}
              </span>
              <span className="mv-card__roll">
                <PipDie value={shown.roll.d1} />
                <PipDie value={shown.roll.d2} />
                <b>{shown.roll.total}</b>
                {shown.roll.isDouble && <em>double</em>}
              </span>
            </header>

            <div className="mv-card__body">
              <h3 className="mv-card__title">{face.title}</h3>
              {face.text && <p className="mv-card__text">{face.text}</p>}

              {face.space && <PropertyTitle space={face.space} />}

              {shown.roll.isDouble && shown.outcome.kind !== 'go_jail' && (
                <p className="mv-double">🎲 Double — tu rejoues !</p>
              )}
              {softActive && softAlt && shown.sips > 0 && (
                <p className="mv-sips mv-sips--soft">🥤 {SOFT_CATEGORY_LABEL[softAlt.category]} — {softAlt.text}</p>
              )}
              {shown.bankruptcy && (
                <p className="mv-bankrupt">
                  💥 Faillite —{' '}
                  {shown.bankruptcy.eliminated ? 'éliminé !' : shown.bankruptcy.rescued ? 'relance 300€' : 'à sec'}
                  {shown.bankruptcySips > 0 ? ` · ${shown.bankruptcySips} gorgée(s)` : ''}
                </p>
              )}
            </div>

            {face.impacts.length > 0 && (
              <div className="mv-card__impact">
                {face.impacts.map((im, i) => (
                  <span key={i} className={`mv-impact tone-${im.tone}`}>
                    <small>{im.hint}</small>
                    <b>{im.value}<i>{im.unit}</i></b>
                  </span>
                ))}
              </div>
            )}

            <footer className="mv-card__foot">
              <span className="mv-card__brand">
                <b className="mv-mono">Mono</b><b className="mv-vomy">Vomy</b>
              </span>
              {face.meta.tag && <span className="mv-card__tag">{face.meta.tag}</span>}
            </footer>

            {/* Reflet spéculaire : balaye la carte une fois posée. */}
            <i className="mv-card__sheen" aria-hidden="true" />
          </div>
        </div>

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
