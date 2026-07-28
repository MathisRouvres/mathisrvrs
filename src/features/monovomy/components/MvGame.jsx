import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { MonovomyButton } from '../MonovomyShell'
import MvTrade from './MvTrade'
import MvAuction from './MvAuction'
import MvMarket from './MvMarket'
import MvCards from './MvCards'
import MvHud from './MvHud'
import MvPlayerBar from './MvPlayerBar'
import MvCoach from './MvCoach'
import MvJournal from './MvJournal'
import MvCenter from './MvCenter'
import MvActionBar from './MvActionBar'
import MvDock from './MvDock'
import MvToasts from './MvToasts'
import { soireeBoard, getMarketCardById } from '../content'
import { centerPanelKind } from '../game/centerPanel'
import { incomingOffers, softAlternative, evaluateReminder } from '../engine'
import { completeGroups } from '../game/boardInsights'
import { logEntryForResult } from '../game/journal'
import { sound } from '../game/sound'
import { haptics } from '../game/haptics'
import { selectMainAction } from '../game/mainAction'
import { moneyMoves } from '../game/moneyMoves'
import { useReducedMotion } from '../game/useReducedMotion'

// Plateau 3D (three.js) chargé à la demande : les écrans secondaires (accueil,
// lobby, règles) ne tirent pas ce gros bundle.
const MvBoard3D = lazy(() => import('./board3d/MvBoard3D'))

const ROLL_MS = 1150
const TURN_ALERT_MS = 5000
const FX_MS = 2000

export default function MvGame({
  state,
  result,
  active,
  now = 0,
  myId = null,
  onRoll,
  onBuy,
  onNext,
  onJail,
  onSendTrade,
  onSetDrinkMode,
  onManage,
  onBid,
  onPass,
  onMarketBuy,
  onMarketUse,
  auctionControllableIds = [],
  onFinish,
  canAct = true,
  showFinish = true,
  mode = 'local',
  netStatus = 'idle',
  role = null,
  chat = [],
  onSendChat,
}) {
  const [showTrade, setShowTrade] = useState(false)
  const [showCards, setShowCards] = useState(false)
  const reducedMotion = useReducedMotion()

  // Événement de scène centrale (transient) — déclaré tôt (utilisé par des effets).
  const [event, setEvent] = useState(null)
  const eventId = useRef(0)
  const fireEvent = useCallback((icon, text, tone = 'gold') => {
    eventId.current += 1
    const id = eventId.current
    setEvent({ id, icon, text, tone })
    setTimeout(() => setEvent((cur) => (cur && cur.id === id ? null : cur)), 2400)
  }, [])

  // Notifications (toasts) — infos sans ancrage spatial (règle, reconnexion).
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)
  const pushToast = useCallback((icon, text, tone = 'info') => {
    toastId.current += 1
    const id = toastId.current
    setToasts((t) => [...t, { id, icon, text, tone }].slice(-3))
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  // Toast : règle temporaire nouvellement activée.
  const prevRulesRef = useRef(null)
  useEffect(() => {
    const keys = state.activeRules.map((r) => `${r.id}-${r.activatedStep}`)
    const prev = prevRulesRef.current
    if (prev) {
      for (const r of state.activeRules) {
        if (!prev.includes(`${r.id}-${r.activatedStep}`)) pushToast('📜', `Règle : ${r.name}`, 'info')
      }
    }
    prevRulesRef.current = keys
  }, [state.activeRules, pushToast])

  // Toast : carte du Marché Noir jouée (annonce publique, jamais silencieuse).
  const prevMarketSeqRef = useRef(state.marketSeq ?? 0)
  useEffect(() => {
    const log = state.marketLog ?? []
    const last = log[log.length - 1]
    if (last && last.seq > prevMarketSeqRef.current) {
      const by = state.players.find((p) => p.id === last.byId)?.name ?? 'Quelqu’un'
      const card = getMarketCardById(last.cardId)
      const on = last.targetId ? state.players.find((p) => p.id === last.targetId)?.name : null
      pushToast(card?.emoji ?? '🃏', `${by} joue ${card?.name ?? 'une carte'}${on ? ` sur ${on}` : ''}`, 'info')
    }
    prevMarketSeqRef.current = state.marketSeq ?? 0
  }, [state.marketSeq, state.marketLog, state.players, pushToast])

  // Toast : reconnexion réseau retrouvée.
  const prevNetRef = useRef(netStatus)
  useEffect(() => {
    if (netStatus === 'found' && prevNetRef.current !== 'found') pushToast('🔌', 'Reconnecté à la partie', 'good')
    prevNetRef.current = netStatus
  }, [netStatus, pushToast])
  const tradeCount = myId ? incomingOffers(state, myId, now).length : 0
  const me = myId ? state.players.find((p) => p.id === myId) : null
  const myCards = me?.marketCards?.length ?? 0
  const myMode = myId ? state.players.find((p) => p.id === myId)?.drinkMode : null

  // Rappel de modération sur transition d’ambiance (chaos / avant finale).
  const prevIntensityRef = useRef(state.partyIntensity)
  const [reminder, setReminder] = useState(null)
  useEffect(() => {
    const prev = prevIntensityRef.current
    if (prev !== state.partyIntensity) {
      const r = evaluateReminder({ now, lastReminderAt: now, sanctionStreak: 0, prevIntensity: prev, intensity: state.partyIntensity })
      prevIntensityRef.current = state.partyIntensity
      if (state.partyIntensity === 'chaos') fireEvent('🔥', 'Niveau CHAOS', 'hot')
      else if (state.partyIntensity === 'finale') fireEvent('🏁', 'FINALE', 'hot')
      if (r) {
        setReminder(r.text)
        const t = setTimeout(() => setReminder(null), 6000)
        return () => clearTimeout(t)
      }
    }
    return undefined
  }, [state.partyIntensity, now, fireEvent])

  const handleSoft = (mode) => {
    if (!onSetDrinkMode) return
    if (mode === 'alcohol' && typeof window !== 'undefined' && !window.confirm('Revenir en mode alcool ?')) return
    onSetDrinkMode(mode)
  }

  const softAlt =
    active && active.drinkMode === 'soft' && result && result.sips > 0
      ? softAlternative(state.config.seed, `${active.id}:${state.turnStep}:${result.outcome.kind}`)
      : null
  const isDecision = state.phase === 'awaiting_purchase'
  const softActive = active && active.drinkMode === 'soft'
  const hydrate = state.turn > 0 && state.turn % 6 === 0

  // Décomptes dérivés des timestamps absolus partagés (survivent à la reconnexion).
  const gameLeft = state.endsAt > 0 ? state.endsAt - now : -1
  const turnLeft = state.turnEndsAt > 0 ? state.turnEndsAt - now : -1
  const turnUrgent = turnLeft >= 0 && turnLeft <= TURN_ALERT_MS
  const turnTotal = (state.config.turnSeconds ?? 0) * 1000
  const turnFrac = turnTotal > 0 && turnLeft >= 0 ? Math.max(0, Math.min(1, turnLeft / turnTotal)) : null

  // Action attendue (libellé toujours visible dans le HUD).
  const mainAction = selectMainAction({
    phase: state.phase,
    canAct,
    activeName: active?.name,
    finished: state.finished,
  })

  // Haptique : alerte unique quand le tour approche de la fin (canAct seulement).
  const alertedRef = useRef(false)
  useEffect(() => {
    if (canAct && turnUrgent && !alertedRef.current) {
      alertedRef.current = true
      haptics.vibrate('timer')
    } else if (!turnUrgent) {
      alertedRef.current = false
    }
  }, [canAct, turnUrgent])

  const [prevResult, setPrevResult] = useState(null)
  const [rollId, setRollId] = useState(0)
  const [rolling, setRolling] = useState(false)

  if (result !== prevResult) {
    setPrevResult(result)
    setRolling(Boolean(result))
    if (result) setRollId((n) => n + 1)
  }

  // Pendant le lancer : on ré-affiche les soldes d'AVANT paiement (les mouvements
  // sont rejoués à l'envers). La faillite est exclue — le moteur y remet le cash
  // à plat, l'inverser n'aurait aucun sens.
  const pendingMoves = rolling && result && !result.bankruptcy ? moneyMoves(result, active?.id) : null
  const viewPlayers = pendingMoves
    ? state.players.map((p) => (pendingMoves[p.id] ? { ...p, cash: p.cash - pendingMoves[p.id] } : p))
    : state.players
  const viewActive = active ? viewPlayers.find((p) => p.id === active.id) ?? active : active
  const viewState = pendingMoves ? { ...state, players: viewPlayers } : state

  // Une fois le dé arrêté : qui paie, qui encaisse. Les pastilles concernées
  // restent allumées tant que la carte de résultat est à l'écran.
  const moneyFx = !rolling && result ? moneyMoves(result, active?.id) : null

  // Haptique : loyer/taxe (paiement) et faillite, au moment de la révélation.
  useEffect(() => {
    if (rolling || !result) return
    if (result.bankruptcy) haptics.vibrate('event')
    else if (result.outcome?.kind === 'pay_rent' || result.outcome?.kind === 'tax') haptics.vibrate('pay')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling])

  const dice = result && result.roll.total > 0 ? { d1: result.roll.d1, d2: result.roll.d2, id: rollId } : null

  useEffect(() => {
    if (!rolling) return undefined
    const land = setTimeout(() => sound.play('land'), ROLL_MS - 150)
    const done = setTimeout(() => setRolling(false), ROLL_MS)
    return () => { clearTimeout(land); clearTimeout(done) }
  }, [rolling])

  const handleRoll = () => {
    sound.play('roll')
    haptics.vibrate('roll')
    onRoll()
  }

  // ── Effets visuels (Phase 12) : nombres flottants, arc de loyer, burst, shake ──
  const gameRef = useRef(null)
  const chipRefs = useRef(new Map())
  const fxId = useRef(0)
  const [floaters, setFloaters] = useState([])
  const [arc, setArc] = useState(null)
  const [burst, setBurst] = useState(false)
  const [shake, setShake] = useState(false)
  const [justOwned, setJustOwned] = useState(null)

  // Journal de partie.
  const [log, setLog] = useState([])
  const [logOpen, setLogOpen] = useState(false)
  const logId = useRef(0)
  const pushLog = useCallback((icon, text) => {
    logId.current += 1
    const id = logId.current
    setLog((l) => [{ id, icon, text }, ...l].slice(0, 40))
  }, [])

  const registerChip = useCallback((id, el) => {
    if (el) chipRefs.current.set(id, el)
    else chipRefs.current.delete(id)
  }, [])

  const anchorOf = (playerId) => {
    const cont = gameRef.current?.getBoundingClientRect()
    const el = chipRefs.current.get(playerId)
    if (!cont || !el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2 - cont.left, y: r.top - cont.top }
  }

  const pushFloater = (playerId, text, tone, big = false) => {
    const a = anchorOf(playerId)
    if (!a) return
    fxId.current += 1
    const id = fxId.current
    setFloaters((list) => [...list, { id, x: a.x, y: a.y, text, tone, big }])
    setTimeout(() => setFloaters((list) => list.filter((f) => f.id !== id)), FX_MS)
  }

  // Nombres flottants + arc de loyer + shake : à l'arrêt du dé, pas au lancer.
  useEffect(() => {
    if (rolling || !result || reducedMotion) return
    const o = result.outcome
    if (result.passedStart && active) pushFloater(active.id, `+${result.salary}€`, 'up')
    if (o.kind === 'pay_rent') {
      pushFloater(active.id, `−${o.amount}€`, 'down', true)
      pushFloater(o.toPlayerId, `+${o.amount}€`, 'up', true)
      const p = anchorOf(active.id)
      const w = anchorOf(o.toPlayerId)
      if (p && w) {
        fxId.current += 1
        const id = fxId.current
        setArc({ id, x1: p.x, y1: p.y, x2: w.x, y2: w.y })
        setTimeout(() => setArc((cur) => (cur && cur.id === id ? null : cur)), 1000)
      }
    }
    if (o.kind === 'tax' && active) pushFloater(active.id, `−${o.amount}€`, 'down', true)
    if (result.bankruptcy) {
      setShake(true)
      setTimeout(() => setShake(false), 620)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling])

  // Effets 3D pilotés par le résultat du tour : loyer (pièces qui volent) et
  // faillite (vidage des cases). Valeur dérivée — pas d'état, pas d'effet : le
  // plateau ne réagit qu'au changement d'`id`. Indépendant de reduced-motion, le
  // plateau remplace lui-même chaque effet par un fondu.
  const boardFx = useMemo(() => {
    if (rolling || !result) return null
    if (result.bankruptcy) return { type: 'bankrupt', playerId: result.bankruptcy.playerId, id: `bank-${rollId}` }
    const o = result.outcome
    if (o.kind === 'pay_rent' && active) {
      return { type: 'rent', spaceId: soireeBoard.spaces[active.position]?.id, playerId: o.toPlayerId, id: `rent-${rollId}` }
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling])

  // Journal + événement central à la révélation (indépendant de reduced-motion).
  useEffect(() => {
    if (rolling || !result) return
    const name = active?.name ?? 'Joueur'
    if (result.passedStart) pushLog('💰', `${name} touche ${result.salary}€ (Départ)`)
    const e = logEntryForResult(result, name)
    if (e) pushLog(e.icon, e.text)
    const o = result.outcome
    if (result.bankruptcy) { pushLog('💥', `${name} fait faillite`); fireEvent('💥', `${name} fait faillite`, 'bad') }
    else if (o.kind === 'go_jail') fireEvent('🚓', `${name} → prison`, 'bad')
    else if (o.kind === 'pay_rent' && o.amount >= 150) fireEvent('💸', `Gros loyer · ${o.amount}€`, 'bad')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling])

  // Burst doré + journal quand un joueur COMPLÈTE un groupe (monopole).
  const prevMonoRef = useRef(null)
  useEffect(() => {
    const groups = completeGroups(state, soireeBoard).monopolyGroupsByOwner
    const prev = prevMonoRef.current
    if (prev) {
      for (const [ownerId, arr] of Object.entries(groups)) {
        if (arr.length > (prev[ownerId]?.length ?? 0)) {
          const nm = state.players.find((p) => p.id === ownerId)?.name ?? 'Un joueur'
          pushLog('⭐', `${nm} complète un groupe !`)
          fireEvent('⭐', `${nm} complète un groupe !`, 'gold')
          if (!reducedMotion) {
            fxId.current += 1
            const id = fxId.current
            setBurst(id)
            setTimeout(() => setBurst((cur) => (cur === id ? false : cur)), 1200)
          }
        }
      }
    }
    prevMonoRef.current = groups
  }, [state, reducedMotion, pushLog, fireEvent])

  const handleBuyFx = (yes) => {
    if (yes && result?.outcome?.kind === 'buy_offer') {
      const { price, spaceId, name } = result.outcome
      if (active && !reducedMotion) pushFloater(active.id, `-${price}€`, 'down')
      pushLog('🏠', `${active?.name ?? 'Joueur'} achète ${name} (${price}€)`)
      if (spaceId) {
        setJustOwned(spaceId)
        setTimeout(() => setJustOwned((cur) => (cur === spaceId ? null : cur)), 700)
      }
    }
    onBuy(yes)
  }

  // Descripteur de la scène centrale 3D : quel panneau est ouvert, et quel
  // minuteur alimente la jauge circulaire du podium (enchère prioritaire).
  const centerData = useMemo(() => {
    const panel = centerPanelKind(state, result, rolling)
    const auc = state.phase === 'awaiting_auction' ? state.auction : null
    const total = (state.config?.durationMinutes ?? 0) * 60000
    if (auc && auc.endsAt > 0) {
      return { panel, turn: state.turn, timerLeft: auc.endsAt - now, timerTotal: (state.config?.auctionSeconds ?? 20) * 1000 }
    }
    return { panel, turn: state.turn, timerLeft: state.endsAt > 0 ? state.endsAt - now : -1, timerTotal: total }
  }, [state, result, rolling, now])


  return (
    <div ref={gameRef} className={`mv-game ${shake ? 'is-shake' : ''}`}>
      <MvHud
        state={viewState}
        active={viewActive}
        mainAction={mainAction}
        gameLeft={gameLeft}
        turnLeft={turnLeft}
        myId={myId}
        mode={mode}
        netStatus={netStatus}
        role={role}
      />
      {reminder && <p className="mv-reminder">{reminder}</p>}

      <Suspense fallback={<div className="mv-board3d__loading">Chargement du plateau…</div>}>
        <MvBoard3D
          state={state}
          dice={dice}
          reducedMotion={reducedMotion}
          onManage={onManage}
          canManage={canAct && (state.phase === 'awaiting_roll' || state.phase === 'turn_cleanup')}
          managePlayerId={active ? active.id : null}
          justOwned={justOwned}
          fx={boardFx}
          center={centerData}
          centerSlot={
            <MvCenter
              state={state}
              result={result}
              active={active}
              now={now}
              rolling={rolling}
              isDecision={isDecision}
              canAct={canAct}
              softActive={softActive}
              softAlt={softAlt}
              event={event}
            />
          }
        />
      </Suspense>

      {hydrate && <p className="mv-hydrate">💧 Pense à boire de l’eau entre les tours</p>}

      {/* Bandeau joueurs et échange partagent UNE seule rangée : sur mobile chaque
          ligne prise ici est prise au plateau. « Terminer la partie » est une action
          rare et sans retour : elle vit dans Réglages, pas sous le pouce. */}
      <div className="mv-strip">
        <MvPlayerBar
          players={viewPlayers}
          currentIndex={state.currentPlayerIndex}
          reducedMotion={reducedMotion}
          registerChip={registerChip}
          moneyFx={moneyFx}
        />

        {myId && (onSendTrade || onMarketUse) && (
          <div className="mv-actions mv-actions--sec">
            {onSendTrade && (
              <MonovomyButton variant="secondary" onClick={() => setShowTrade(true)} aria-label="Échanger">
                🤝<span className="mv-lbl-lg"> Échanger</span>{tradeCount ? ` (${tradeCount})` : ''}
              </MonovomyButton>
            )}
            {onMarketUse && (
              <MonovomyButton variant="secondary" onClick={() => setShowCards(true)} aria-label="Mes cartes">
                🃏<span className="mv-lbl-lg"> Cartes</span>{myCards ? ` (${myCards})` : ''}
              </MonovomyButton>
            )}
          </div>
        )}
      </div>

      {/* CTA principal unique, contextuel, au pouce. */}
      {rolling ? (
        <div className="mv-actionbar"><p className="mv-actionbar__wait">🎲 Le dé roule…</p></div>
      ) : (
        <MvActionBar
          phase={state.phase}
          canAct={canAct}
          activeName={active ? active.name : ''}
          result={result}
          jailCards={active ? active.jailCards : 0}
          turnFrac={turnFrac}
          turnUrgent={turnUrgent}
          onRoll={handleRoll}
          onBuy={handleBuyFx}
          onNext={onNext}
          onJail={onJail}
        />
      )}

      {/* Couche d'effets (nombres flottants, arc de loyer, burst monopole). */}
      <div className="mv-fx" aria-hidden="true">
        {arc && (
          <svg className="mv-fx__arc">
            <line x1={arc.x1} y1={arc.y1} x2={arc.x2} y2={arc.y2} />
          </svg>
        )}
        {floaters.map((f) => (
          <span key={f.id} className={`mv-floater is-${f.tone} ${f.big ? 'is-big' : ''}`} style={{ left: f.x, top: f.y }}>
            {f.text}
          </span>
        ))}
        {burst && (
          <div className="mv-burst">
            <span className="mv-burst__flash" />
            {Array.from({ length: 14 }, (_, k) => (
              <i key={k} className="mv-burst__p" style={{ '--a': `${(k / 14) * 360}deg` }} />
            ))}
            <span className="mv-burst__label">MONOPOLE&nbsp;!</span>
          </div>
        )}
      </div>

      {showTrade && myId && onSendTrade && (
        <MvTrade state={state} myId={myId} now={now} onSend={onSendTrade} onClose={() => setShowTrade(false)} />
      )}

      {state.phase === 'awaiting_market' && canAct && onMarketBuy && result?.outcome?.kind === 'market' && (
        <MvMarket
          offers={result.outcome.offers}
          player={active}
          difficulty={state.config.difficulty}
          onBuy={(cardId, pay) => onMarketBuy(cardId, pay)}
        />
      )}

      {showCards && me && onMarketUse && (
        <MvCards
          player={me}
          players={state.players}
          onUse={onMarketUse}
          onClose={() => setShowCards(false)}
        />
      )}

      {state.phase === 'awaiting_auction' && state.auction && (
        <MvAuction
          auction={state.auction}
          players={state.players}
          now={now}
          controllableIds={auctionControllableIds}
          onBid={onBid}
          onPass={onPass}
        />
      )}

      {!result && state.phase !== 'awaiting_auction' && !showTrade && (
        <MvJournal entries={log} open={logOpen} onToggle={() => setLogOpen((o) => !o)} />
      )}

      <MvToasts toasts={toasts} />

      <MvDock
        state={state}
        myId={myId}
        active={active}
        mode={mode}
        chat={chat}
        onSendChat={onSendChat}
        onManage={onManage}
        canManage={canAct && (state.phase === 'awaiting_roll' || state.phase === 'turn_cleanup')}
        managePlayerId={active ? active.id : null}
        onSoft={onSetDrinkMode ? handleSoft : null}
        myMode={myMode}
        onFinish={showFinish ? onFinish : null}
      />

      <MvCoach />
    </div>
  )
}
