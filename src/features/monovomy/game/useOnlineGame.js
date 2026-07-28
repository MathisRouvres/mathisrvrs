import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { soireeBoard, actionCards } from '../content'
import {
  createGame,
  startClock,
  tickGameClock,
  stampTurnTimer,
  turnTimedOut,
  expireTrades,
  advanceIntensity,
  expireRules,
  ranking,
  stampAuctionTimer,
  auctionTimedOut,
  resolveAuction,
  DIFFICULTY_MULTIPLIER,
} from '../engine'
import {
  applyIntent,
  defaultIntentForPhase,
  initSnapshot,
  commitState,
  applyStampedIntent,
  createIntentStamper,
  electHost,
  acceptServerEpoch,
  restoreSnapshot,
  gameIdForSeed,
  createMemorySnapshotStore,
  createSupabaseSnapshotStore,
  PROTOCOL_VERSION,
} from '../net'
import { createSupabaseChannel } from '../net/supabaseTransport'
import { SUPABASE_CONFIG, SUPABASE_ENABLED } from '../../../config/features'
import { describeOutcome } from './describeOutcome'

const POOL = actionCards.map((card) => card.id)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const SESSION_KEY = 'mv_online_session'
const HOST_SILENCE_MS = 6000

function randomCode() {
  let code = ''
  for (let i = 0; i < 4; i += 1) code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length))
  return code
}
function randomId() {
  return `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}
function buildMe(form, clientId) {
  const name = (form.name || '').trim() || 'Joueur'
  return { clientId: clientId || randomId(), name, avatar: name.charAt(0).toUpperCase(), drinkMode: form.drinkMode || 'alcohol' }
}
function persistSession(data) {
  try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}
function readSession() {
  try { return JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}
function clearSession() {
  try { window.localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
}

/** Hook host-authoritative robuste (Phase 9) : snapshots, idempotence, migration d’hôte. */
export function useOnlineGame() {
  const [screen, setScreen] = useState('home')
  const [role, setRole] = useState(null)
  const [roomCode, setRoomCode] = useState('')
  const [members, setMembers] = useState([])
  const [gameState, setGameState] = useState(null)
  const [result, setResult] = useState(null)
  const [chat, setChat] = useState([])
  const [error, setError] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [meId, setMeId] = useState(null)
  const [netStatus, setNetStatus] = useState('idle')

  const channelRef = useRef(null)
  const meRef = useRef(null)
  const configRef = useRef(null)
  const membersRef = useRef([])
  const stateRef = useRef(null)
  const syncRef = useRef(null)
  const snapRef = useRef(null)
  const epochRef = useRef(0)
  const versionRef = useRef(0)
  const stamperRef = useRef(null)
  const storeRef = useRef(null)
  const lastHostAtRef = useRef(0)

  const broadcast = useCallback((msg) => {
    channelRef.current?.publish({ kind: 'server', from: meRef.current?.clientId ?? 'host', msg })
  }, [])

  const applyLocalState = useCallback((state, sync) => {
    setGameState(state)
    if (sync) {
      const current = state.players[state.currentPlayerIndex]
      const derived = describeOutcome(sync.outcome, state.config.difficulty, state.shieldedCardId ?? null)
      const bankruptcy = sync.bankruptcy
      const mult = DIFFICULTY_MULTIPLIER[state.config.difficulty] ?? 1
      setResult({
        roll: sync.roll, outcome: sync.outcome, salary: sync.salary, passedStart: sync.passedStart,
        card: derived.card, sips: derived.sips, bankruptcy,
        bankruptcySips: bankruptcy ? bankruptcy.penaltySips * mult : 0,
        activeDrinkMode: current?.drinkMode ?? 'alcohol',
      })
    } else {
      setResult(null)
    }
    setScreen(state.finished ? 'finished' : 'playing')
  }, [])

  /** Diffuse un snapshot confirmé (état + méta d’époque/version) et le persiste. */
  const commitAndBroadcast = useCallback((snap, sync, intent, isSide) => {
    snapRef.current = snap
    stateRef.current = snap.state
    epochRef.current = snap.hostEpoch
    versionRef.current = snap.snapshotVersion
    if (isSide) {
      broadcast({ t: 'tradeState', state: snap.state, hostEpoch: snap.hostEpoch, snapshotVersion: snap.snapshotVersion })
      setGameState(snap.state)
    } else {
      if (sync) syncRef.current = sync
      if (intent && intent.type === 'endTurn') syncRef.current = null
      broadcast({ t: 'state', state: snap.state, sync: syncRef.current, hostEpoch: snap.hostEpoch, snapshotVersion: snap.snapshotVersion })
      applyLocalState(snap.state, syncRef.current)
    }
    storeRef.current?.save(roomCode, snap)
  }, [broadcast, applyLocalState, roomCode])

  /**
   * Cœur hôte. `meta` présent = intention CLIENT estampillée → chemin idempotent
   * (dedup + validation). `meta` absent = action locale de l’hôte (fiable).
   */
  const hostApply = useCallback((fromClientId, intent, meta) => {
    const snap = snapRef.current
    if (!snap) return
    const stamp = Date.now()
    const isSide = typeof intent.type === 'string' && (intent.type.startsWith('trade') || intent.type === 'setDrinkMode' || intent.type === 'marketUse')

    if (meta) {
      const r = applyStampedIntent(snap, soireeBoard, fromClientId, { ...meta, intent, protocolVersion: meta.protocolVersion || PROTOCOL_VERSION }, stamp)
      snapRef.current = r.snapshot // seen mis à jour même sur doublon/rejet
      if (r.outcome === 'rejected') { broadcast({ t: 'error', to: fromClientId, message: r.error }); return }
      if (r.outcome !== 'applied') return // doublon / séquence périmée / spoof → ignoré
      let committed = r.snapshot
      if (intent.type === 'endTurn' && !committed.state.finished) {
        committed = { ...committed, state: stampTurnTimer(committed.state, stamp) }
      }
      commitAndBroadcast(committed, r.sync, intent, isSide)
      return
    }

    // Action locale hôte : validation métier directe puis commit versionné.
    const seatByClient = Object.fromEntries(membersRef.current.map((m) => [m.clientId, m.seat]))
    const res = applyIntent(snap.state, fromClientId, seatByClient, intent, soireeBoard, stamp)
    if (res.error) { broadcast({ t: 'error', to: fromClientId, message: res.error }); return }
    let state = res.state
    if (intent.type === 'endTurn' && !state.finished) state = stampTurnTimer(state, stamp)
    const committed = commitState(snap, state, stamp)
    commitAndBroadcast(committed, res.sync, intent, isSide)
  }, [broadcast, commitAndBroadcast])

  const pushChat = useCallback((clientId, name, text) => {
    setChat((prev) => [...prev, { clientId, name, text, at: Date.now() }].slice(-50))
  }, [])
  const hostChat = useCallback((clientId, name, text) => {
    broadcast({ t: 'chat', clientId, name, text, at: Date.now() })
    pushChat(clientId, name, text)
  }, [broadcast, pushChat])

  /** Envoie le snapshot courant à un client (reconnexion). */
  const sendSnapshotTo = useCallback((to) => {
    if (snapRef.current) broadcast({ t: 'snapshot', snapshot: snapRef.current, to, hostEpoch: snapRef.current.hostEpoch })
  }, [broadcast])

  const onEnvelopeHost = useCallback((env) => {
    if (env.kind !== 'client') return
    const msg = env.msg
    if (msg.t === 'hello') {
      const existing = membersRef.current.find((m) => m.clientId === msg.hello.clientId)
      if (!existing) {
        const seat = membersRef.current.length
        membersRef.current = [...membersRef.current, { ...msg.hello, seat, isHost: false, connected: true }]
        setMembers(membersRef.current)
      }
      broadcast({ t: 'lobby', members: membersRef.current })
      if (snapRef.current) sendSnapshotTo(msg.hello.clientId) // partie déjà lancée → resync
    } else if (msg.t === 'resync') {
      sendSnapshotTo(msg.clientId)
    } else if (msg.t === 'intent') {
      hostApply(msg.clientId, msg.intent, msg.meta)
    } else if (msg.t === 'chat') {
      const from = membersRef.current.find((m) => m.clientId === msg.clientId)
      hostChat(msg.clientId, from?.name ?? '???', msg.text)
    } else if (msg.t === 'leave') {
      membersRef.current = membersRef.current.map((m) => (m.clientId === msg.clientId ? { ...m, connected: false } : m))
      setMembers(membersRef.current)
      broadcast({ t: 'lobby', members: membersRef.current })
    }
  }, [broadcast, hostApply, hostChat, sendSnapshotTo])

  const becomeClientFromSnapshot = useCallback((snap) => {
    snapRef.current = snap
    stateRef.current = snap.state
    syncRef.current = null
    epochRef.current = snap.hostEpoch
    versionRef.current = snap.snapshotVersion
    membersRef.current = snap.members.map((m) => ({ ...m, isHost: m.clientId === snap.hostId }))
    setMembers(membersRef.current)
    setGameState(snap.state)
    setScreen(snap.state.finished ? 'finished' : 'playing')
  }, [])

  const onEnvelopeClient = useCallback((env) => {
    if (env.kind !== 'server') return
    const msg = env.msg
    lastHostAtRef.current = Date.now()
    if (msg.t === 'lobby') {
      membersRef.current = msg.members
      setMembers(msg.members)
    } else if (msg.t === 'state' || msg.t === 'tradeState') {
      // Rejet des messages d’une ancienne époque (ancien hôte) et de l’ordre inversé.
      if (msg.hostEpoch != null && !acceptServerEpoch(epochRef.current, msg.hostEpoch)) return
      if (msg.hostEpoch != null) epochRef.current = Math.max(epochRef.current, msg.hostEpoch)
      if (msg.snapshotVersion != null) {
        if (msg.snapshotVersion <= versionRef.current && msg.hostEpoch === epochRef.current) return
        versionRef.current = msg.snapshotVersion
      }
      stateRef.current = msg.state
      if (msg.t === 'state') { syncRef.current = msg.sync; applyLocalState(msg.state, msg.sync) }
      else setGameState(msg.state)
      if (netStatus !== 'connected') setNetStatus('connected')
    } else if (msg.t === 'snapshot') {
      if (msg.to && msg.to !== meRef.current?.clientId) return
      setNetStatus('syncing')
      const r = restoreSnapshot(msg.snapshot)
      if (r.error) { setError(r.error); return }
      becomeClientFromSnapshot(r.snapshot)
      setNetStatus('found')
      setTimeout(() => setNetStatus('connected'), 1200)
    } else if (msg.t === 'hostChanged') {
      epochRef.current = Math.max(epochRef.current, msg.hostEpoch)
      membersRef.current = msg.members
      setMembers(msg.members)
      if (msg.hostId === meRef.current?.clientId) setRole('host')
    } else if (msg.t === 'chat') {
      setChat((prev) => [...prev, { clientId: msg.clientId, name: msg.name, text: msg.text, at: msg.at }].slice(-50))
    } else if (msg.t === 'error') {
      if (msg.to === meRef.current?.clientId) setError(msg.message)
    }
  }, [applyLocalState, becomeClientFromSnapshot, netStatus])

  const makeStore = useCallback(() => (SUPABASE_ENABLED ? createSupabaseSnapshotStore(SUPABASE_CONFIG) : createMemorySnapshotStore()), [])

  const hostCreate = useCallback(async (form, difficulty) => {
    if (!SUPABASE_ENABLED) { setError('Supabase non configuré'); return }
    setError(null)
    const me = buildMe(form)
    meRef.current = me
    setMeId(me.clientId)
    const code = randomCode()
    try {
      const channel = await createSupabaseChannel(SUPABASE_CONFIG, code, me.clientId)
      channelRef.current = channel
      channel.subscribe(onEnvelopeHost)
    } catch (err) { setError(String(err instanceof Error ? err.message : err)); return }
    membersRef.current = [{ ...me, seat: 0, isHost: true, connected: true }]
    storeRef.current = makeStore()
    configRef.current = {
      difficulty, durationMinutes: 60, turnSeconds: 45, bankruptcy: 'none',
      shuffleOrder: true, startCompensation: true, auctionOnPass: true, themeId: 'soiree',
      seed: `mv-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    }
    setRole('host'); setRoomCode(code); setMembers(membersRef.current); setScreen('lobby'); setNetStatus('connected')
    persistSession({ role: 'host', roomCode: code, me })
  }, [onEnvelopeHost, makeStore])

  const clientJoin = useCallback(async (form, code) => {
    if (!SUPABASE_ENABLED) { setError('Supabase non configuré'); return }
    setError(null)
    const me = buildMe(form)
    meRef.current = me
    setMeId(me.clientId)
    const upper = code.trim().toUpperCase()
    setNetStatus('reconnecting')
    try {
      const channel = await createSupabaseChannel(SUPABASE_CONFIG, upper, me.clientId)
      channelRef.current = channel
      channel.subscribe(onEnvelopeClient)
      channel.publish({ kind: 'client', from: me.clientId, msg: { t: 'hello', hello: me, protocolVersion: PROTOCOL_VERSION } })
      channel.publish({ kind: 'client', from: me.clientId, msg: { t: 'resync', clientId: me.clientId, haveVersion: 0 } })
    } catch (err) { setError(String(err instanceof Error ? err.message : err)); setNetStatus('offline'); return }
    setRole('client'); setRoomCode(upper); setScreen('lobby'); setNetStatus('connected')
    persistSession({ role: 'client', roomCode: upper, me })
  }, [onEnvelopeClient])

  /** Reprend une partie après rechargement de page (rejoint + resync). */
  const resume = useCallback(async () => {
    const s = readSession()
    if (!s || !SUPABASE_ENABLED) return
    const me = buildMe({ name: s.me.name, drinkMode: s.me.drinkMode }, s.me.clientId)
    meRef.current = me
    setMeId(me.clientId)
    setNetStatus('reconnecting')
    try {
      const channel = await createSupabaseChannel(SUPABASE_CONFIG, s.roomCode, me.clientId)
      channelRef.current = channel
      channel.subscribe(onEnvelopeClient)
      channel.publish({ kind: 'client', from: me.clientId, msg: { t: 'hello', hello: me, protocolVersion: PROTOCOL_VERSION } })
      channel.publish({ kind: 'client', from: me.clientId, msg: { t: 'resync', clientId: me.clientId, haveVersion: 0 } })
    } catch (err) { setError(String(err instanceof Error ? err.message : err)); setNetStatus('offline'); return }
    lastHostAtRef.current = Date.now()
    setRole('client'); setRoomCode(s.roomCode); setScreen('lobby')
  }, [onEnvelopeClient])

  const hostStart = useCallback(() => {
    if (role !== 'host' || !configRef.current) return
    const ordered = membersRef.current.slice().sort((a, b) => a.seat - b.seat)
    const setups = ordered.map((m) => ({ id: `p${m.seat + 1}`, name: m.name, avatar: m.avatar, drinkMode: m.drinkMode }))
    const state = startClock(createGame(configRef.current, setups, POOL), Date.now())
    const roomMembers = ordered.map((m) => ({
      clientId: m.clientId, playerId: `p${m.seat + 1}`, name: m.name, avatar: m.avatar,
      drinkMode: m.drinkMode, seat: m.seat, connected: m.connected !== false, lastSeenAt: Date.now(),
    }))
    const snap = initSnapshot(state, roomMembers, meRef.current.clientId, Date.now())
    snapRef.current = snap; stateRef.current = state; syncRef.current = null
    epochRef.current = snap.hostEpoch; versionRef.current = snap.snapshotVersion
    broadcast({ t: 'state', state, sync: null, hostEpoch: snap.hostEpoch, snapshotVersion: snap.snapshotVersion })
    applyLocalState(state, null)
    storeRef.current?.save(roomCode, snap)
  }, [role, broadcast, applyLocalState, roomCode])

  // Horloge autoritaire (hôte) : ambiance, fin au timer, auto-résolution des inactifs.
  useEffect(() => {
    if (role !== 'host' || screen !== 'playing') return undefined
    const id = setInterval(() => {
      const stamp = Date.now()
      setNow(stamp)
      const snap = snapRef.current
      if (!snap || snap.state.finished) return
      let side = snap.state
      const expT = expireTrades(side, stamp); side = expT.state
      const expR = expireRules(side, stamp); side = expR.state
      const amb = advanceIntensity(side, soireeBoard, stamp); side = amb.state
      if (expT.changed || expR.changed || amb.changed) {
        commitAndBroadcast(commitState(snapRef.current, side, stamp), null, { type: 'tradeState' }, true)
      }
      const ticked = tickGameClock(snapRef.current.state, stamp)
      if (ticked.justEnded) {
        commitAndBroadcast(commitState(snapRef.current, ticked.state, stamp), null, { type: 'roll' }, false)
        return
      }
      // Enchère en cours : estampille le timer, résout à l'expiration.
      const auc = snapRef.current.state
      if (auc.phase === 'awaiting_auction' && auc.auction) {
        if (auc.auction.endsAt === 0) {
          const stamped = stampAuctionTimer(auc, stamp)
          if (stamped !== auc) commitAndBroadcast(commitState(snapRef.current, stamped, stamp), null, { type: 'tradeState' }, true)
        } else if (auctionTimedOut(auc, stamp)) {
          commitAndBroadcast(commitState(snapRef.current, resolveAuction(auc, soireeBoard), stamp), null, { type: 'roll' }, false)
        }
        return
      }
      let guard = 0
      while (guard < 8) {
        guard += 1
        const c = snapRef.current.state
        if (!c || c.finished || !turnTimedOut(c, Date.now())) break
        const intent = defaultIntentForPhase(c.phase)
        if (!intent) break
        const seatMember = membersRef.current.find((m) => m.seat === c.currentPlayerIndex)
        if (!seatMember) break
        hostApply(seatMember.clientId, intent) // action locale hôte (auto)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [role, screen, commitAndBroadcast, hostApply])

  // Watchdog client : silence prolongé de l’hôte → élection déterministe.
  useEffect(() => {
    if (screen !== 'playing' || role === 'host') return undefined
    const id = setInterval(() => {
      const snap = snapRef.current
      if (!snap || snap.state.finished) return
      if (Date.now() - lastHostAtRef.current < HOST_SILENCE_MS) return
      const { snapshot: migrated, newHostId } = electHost(snap, snap.hostId, Date.now())
      if (newHostId && newHostId === meRef.current?.clientId) {
        snapRef.current = migrated; stateRef.current = migrated.state
        epochRef.current = migrated.hostEpoch; versionRef.current = migrated.snapshotVersion
        membersRef.current = migrated.members.map((m) => ({ ...m, isHost: m.clientId === newHostId }))
        storeRef.current = makeStore()
        setRole('host'); setMembers(membersRef.current)
        broadcast({ t: 'hostChanged', hostId: newHostId, hostEpoch: migrated.hostEpoch, members: membersRef.current })
        broadcast({ t: 'state', state: migrated.state, sync: null, hostEpoch: migrated.hostEpoch, snapshotVersion: migrated.snapshotVersion })
      }
      lastHostAtRef.current = Date.now()
    }, 2000)
    return () => clearInterval(id)
  }, [screen, role, broadcast, makeStore])

  const sendIntent = useCallback((intent) => {
    const me = meRef.current
    if (!me) return
    if (role === 'host') { hostApply(me.clientId, intent); return }
    // Client : estampille (idempotence) + envoie.
    if (!stamperRef.current) {
      const seat = membersRef.current.find((m) => m.clientId === me.clientId)?.seat ?? 0
      stamperRef.current = createIntentStamper(`p${seat + 1}`, gameIdForSeed(snapRef.current?.seed ?? ''), 0)
    }
    const meta = stamperRef.current.stamp(intent, Date.now())
    channelRef.current?.publish({ kind: 'client', from: me.clientId, msg: { t: 'intent', clientId: me.clientId, intent, meta, protocolVersion: PROTOCOL_VERSION } })
  }, [role, hostApply])

  const sendChat = useCallback((text) => {
    const me = meRef.current
    const clean = (text || '').trim()
    if (!me || !clean) return
    if (role === 'host') hostChat(me.clientId, me.name, clean)
    else channelRef.current?.publish({ kind: 'client', from: me.clientId, msg: { t: 'chat', clientId: me.clientId, text: clean } })
  }, [role, hostChat])

  const reset = useCallback(() => {
    if (meRef.current) channelRef.current?.publish({ kind: 'client', from: meRef.current.clientId, msg: { t: 'leave', clientId: meRef.current.clientId } })
    channelRef.current?.close()
    channelRef.current = null; membersRef.current = []; stateRef.current = null; syncRef.current = null
    snapRef.current = null; stamperRef.current = null; storeRef.current = null
    epochRef.current = 0; versionRef.current = 0
    clearSession()
    setRole(null); setRoomCode(''); setMembers([]); setGameState(null); setResult(null)
    setChat([]); setError(null); setMeId(null); setNetStatus('idle'); setScreen('home')
  }, [])

  useEffect(() => {
    if (screen !== 'playing') return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [screen])

  const mySeat = useMemo(() => {
    const found = members.find((m) => m.clientId === meId)
    return found ? found.seat : null
  }, [members, meId])
  const myId = useMemo(() => (mySeat != null && gameState ? gameState.players[mySeat]?.id ?? null : null), [mySeat, gameState])
  const active = gameState ? gameState.players[gameState.currentPlayerIndex] : null
  const canAct = Boolean(gameState && !gameState.finished && mySeat === gameState.currentPlayerIndex)
  const results = useMemo(() => (gameState ? ranking(gameState, soireeBoard) : []), [gameState])

  return {
    screen, role, roomCode, members, gameState, result, chat, error, active, canAct, results,
    now, myId, netStatus, configured: SUPABASE_ENABLED,
    hostCreate, clientJoin, hostStart, sendIntent, sendChat, reset, resume,
    hasSavedSession: Boolean(readSession()),
  }
}
