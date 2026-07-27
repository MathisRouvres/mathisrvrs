import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { soireeBoard, actionCards, getCardById, getRuleById, MONOVOMY_CONTENT_VERSION } from '../content'
import {
  createGame,
  startClock,
  tickGameClock,
  stampTurnTimer,
  takeTurn,
  decideBuy,
  ackCard,
  endTurn,
  endGame,
  jailPayBail,
  jailUseCard,
  jailAttemptDouble,
  createOffer,
  respondOffer,
  counterOffer,
  cancelOffer,
  reactOffer,
  expireTrades,
  activateRule,
  advanceIntensity,
  expireRules,
  setDrinkMode,
  ranking,
  currentPlayer,
  sipsForCard,
  build,
  sellBuilding,
  mortgage,
  unmortgage,
  placeBid,
  passBid,
  stampAuctionTimer,
  auctionTimedOut,
  resolveAuction,
  DIFFICULTY_MULTIPLIER,
} from '../engine'

const CARD_POOL = actionCards.map((card) => card.id)
const TICK_MS = 1000

/** Dérive l’objet `result` (affichage) depuis un résultat de tour/prison. */
function deriveResult(config, turnResult) {
  const mult = DIFFICULTY_MULTIPLIER[config.difficulty] ?? 1
  const outcome = turnResult.outcome
  let card = null
  let sips = 0
  if (outcome.kind === 'draw_card') {
    const found = getCardById(outcome.cardId)
    if (found) {
      card = found
      sips = sipsForCard(found.baseSips, config.difficulty)
    }
  } else if (outcome.kind === 'pay_rent' || outcome.kind === 'tax') {
    sips = outcome.sips * mult
  } else if (outcome.kind === 'jail_stay' || outcome.kind === 'jail_out') {
    sips = (outcome.sips ?? 0) * mult
  }
  const bankruptcy = turnResult.bankruptcy
  return {
    roll: turnResult.roll,
    outcome,
    salary: turnResult.salary,
    passedStart: turnResult.passedStart,
    card,
    sips,
    bankruptcy,
    bankruptcySips: bankruptcy ? bankruptcy.penaltySips * mult : 0,
  }
}

/** Hook orchestrant une partie hot-seat (un téléphone qui tourne). */
export function useHotseatGame() {
  const [screen, setScreen] = useState('lobby')
  const [state, setState] = useState(null)
  const [result, setResult] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const stateRef = useRef(null)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const start = useCallback((config, setups) => {
    const fresh = startClock(createGame(config, setups, CARD_POOL), Date.now())
    setState(fresh)
    setResult(null)
    setScreen('playing')
  }, [])

  // Horloge de partie : tick régulier, fin automatique au timer.
  useEffect(() => {
    if (screen !== 'playing') return undefined
    const id = setInterval(() => {
      const cur = stateRef.current
      if (!cur || cur.finished) return
      const stamp = Date.now()
      setNow(stamp)
      let base = cur
      base = expireTrades(base, stamp).state
      base = expireRules(base, stamp).state
      base = advanceIntensity(base, soireeBoard, stamp).state
      // Enchère : estampille le timer, résout à l'expiration.
      if (base.phase === 'awaiting_auction' && base.auction) {
        if (base.auction.endsAt === 0) base = stampAuctionTimer(base, stamp)
        else if (auctionTimedOut(base, stamp)) base = resolveAuction(base, soireeBoard)
      }
      const { state: ticked, justEnded } = tickGameClock(base, stamp)
      if (justEnded) {
        setState(ticked)
        setScreen('finished')
      } else if (ticked !== cur) {
        setState(ticked)
      }
    }, TICK_MS)
    return () => clearInterval(id)
  }, [screen])

  const roll = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.phase !== 'awaiting_roll') return prev
      const turnResult = takeTurn(prev, soireeBoard)
      setResult(deriveResult(prev.config, turnResult))
      return turnResult.state
    })
  }, [])

  const jail = useCallback((action) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'awaiting_jail') return prev
      const me = prev.players[prev.currentPlayerIndex]
      let r = null
      if (action === 'bail') r = jailPayBail(prev)
      else if (action === 'card' && me && me.jailCards > 0) r = jailUseCard(prev)
      else if (action === 'double') r = jailAttemptDouble(prev, soireeBoard)
      if (!r) return prev
      // Sortie par caution/carte (jail_out) → le joueur va ensuite lancer : pas de reveal bloquant.
      if (r.outcome.kind === 'jail_out') setResult(null)
      else setResult(deriveResult(prev.config, r))
      return r.state
    })
  }, [])

  const buy = useCallback((yes) => {
    setState((prev) =>
      prev && prev.phase === 'awaiting_purchase' ? decideBuy(prev, soireeBoard, yes) : prev,
    )
  }, [])

  const next = useCallback(() => {
    setResult(null)
    setState((prev) => {
      if (!prev) return prev
      let s = prev
      if (s.phase === 'awaiting_card') {
        const card = getCardById(s.pendingCardId ?? '')
        s = ackCard(s, card?.effect === 'jail_free')
        if (card?.ruleId) {
          const def = getRuleById(card.ruleId)
          if (def) s = activateRule(s, def, Date.now()).state
        }
      }
      if (s.phase === 'turn_cleanup') s = endTurn(s)
      return s.finished ? s : stampTurnTimer(s, Date.now())
    })
  }, [])

  // Négociation hot-seat : l’acteur est le joueur qui tient le téléphone (courant).
  const sendTrade = useCallback((intent) => {
    setState((prev) => {
      if (!prev || prev.finished) return prev
      const me = prev.players[prev.currentPlayerIndex]
      if (!me) return prev
      const now = Date.now()
      let r = null
      if (intent.type === 'tradeCreate') r = createOffer(prev, me.id, intent.receiverId, intent.offered, intent.requested, now)
      else if (intent.type === 'tradeRespond') r = respondOffer(prev, intent.offerId, me.id, intent.accept, now)
      else if (intent.type === 'tradeCounter') r = counterOffer(prev, intent.offerId, me.id, intent.offered, intent.requested, now)
      else if (intent.type === 'tradeCancel') r = cancelOffer(prev, intent.offerId, me.id)
      else if (intent.type === 'tradeReact') r = reactOffer(prev, intent.offerId, me.id, intent.reaction, now)
      return r && !r.error ? r.state : prev
    })
  }, [])

  // Gestion établissements/hypothèques hot-seat : l'acteur est le joueur courant.
  const manage = useCallback((intent) => {
    setState((prev) => {
      if (!prev || prev.finished) return prev
      const me = prev.players[prev.currentPlayerIndex]
      if (!me) return prev
      const id = intent.spaceId
      let r = null
      if (intent.type === 'build') r = build(prev, soireeBoard, me.id, id)
      else if (intent.type === 'sellBuilding') r = sellBuilding(prev, soireeBoard, me.id, id)
      else if (intent.type === 'mortgage') r = mortgage(prev, soireeBoard, me.id, id)
      else if (intent.type === 'unmortgage') r = unmortgage(prev, soireeBoard, me.id, id)
      return r && !r.error ? r.state : prev
    })
  }, [])

  // Enchères hot-seat : chaque joueur mise/passe depuis le téléphone partagé.
  const auctionBid = useCallback((playerId, amount) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'awaiting_auction') return prev
      const r = placeBid(prev, playerId, amount, Date.now())
      return r.error ? prev : r.state
    })
  }, [])
  const auctionPass = useCallback((playerId) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'awaiting_auction') return prev
      const r = passBid(prev, playerId, soireeBoard)
      return r.error ? prev : r.state
    })
  }, [])

  const changeDrinkMode = useCallback((mode) => {
    setState((prev) => {
      if (!prev) return prev
      const me = prev.players[prev.currentPlayerIndex]
      return me ? setDrinkMode(prev, me.id, mode) : prev
    })
  }, [])

  const finish = useCallback(() => {
    setState((prev) => (prev ? endGame(prev, 'host') : prev))
    setScreen('finished')
  }, [])

  const reset = useCallback(() => {
    setState(null)
    setResult(null)
    setScreen('lobby')
  }, [])

  const results = useMemo(() => (state ? ranking(state, soireeBoard) : []), [state])
  const active = state && !state.finished ? currentPlayer(state) : null
  const myId = active ? active.id : null

  return {
    screen,
    state,
    result,
    results,
    active,
    now,
    myId,
    start,
    roll,
    jail,
    buy,
    next,
    sendTrade,
    manage,
    auctionBid,
    auctionPass,
    changeDrinkMode,
    finish,
    reset,
    version: MONOVOMY_CONTENT_VERSION,
  }
}
