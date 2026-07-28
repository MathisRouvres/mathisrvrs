import { useEffect, useRef } from 'react'
import { useOnlineGame } from '../game/useOnlineGame'
import { MonovomyButton } from '../MonovomyShell'
import MvOnlineLobby from './MvOnlineLobby'
import MvGame from './MvGame'
import MvRanking from './MvRanking'
import { useOnline } from '../pwa/useOnline'
import { useWakeLock } from '../pwa/useWakeLock'
import { useGameActivity } from '../pwa/useGameActivity'
import { readLastProfile, saveLastProfile } from '../pwa/pwaEnv'
import { shareInvite } from '../pwa/share'

const NET_TEXT = {
  reconnecting: 'Reconnexion à la partie…',
  syncing: 'Synchronisation…',
  found: 'Partie retrouvée',
  offline: 'Déconnexion temporaire',
}

function NetBanner({ status }) {
  const text = NET_TEXT[status]
  if (!text) return null
  return <div className={`mv-netbanner is-${status}`}>{text}</div>
}

export default function OnlineApp({ onExit, initialJoinCode = '' }) {
  const g = useOnlineGame()
  const online = useOnline()
  const playing = g.screen === 'playing' && Boolean(g.gameState)

  useGameActivity(playing)
  useWakeLock(playing)

  const lastProfile = readLastProfile()

  // Deep link : préremplit code + pseudo. Auto-join si le pseudo est déjà connu.
  const autoJoinedRef = useRef(false)
  useEffect(() => {
    if (autoJoinedRef.current) return
    if (!initialJoinCode || !g.configured || !online) return
    if (g.screen !== 'home') return
    if (lastProfile?.name) {
      autoJoinedRef.current = true
      saveLastProfile(lastProfile)
      g.clientJoin(lastProfile, initialJoinCode)
    }
  }, [initialJoinCode, g, online, lastProfile])

  const handleCreate = (form, difficulty) => {
    saveLastProfile(form)
    g.hostCreate(form, difficulty)
  }
  const handleJoin = (form, code) => {
    saveLastProfile(form)
    g.clientJoin(form, code)
  }
  const handleShare = () => shareInvite(g.roomCode)

  if (g.screen === 'playing' && g.gameState) {
    return (
      <>
      <NetBanner status={g.netStatus} />
      <MvGame
        state={g.gameState}
        result={g.result}
        active={g.active}
        now={g.now}
        myId={g.myId}
        canAct={g.canAct}
        showFinish={g.role === 'host'}
        onRoll={() => g.sendIntent({ type: 'roll' })}
        onBuy={(yes) => g.sendIntent({ type: 'buy', yes })}
        onNext={() =>
          g.sendIntent(g.gameState.phase === 'awaiting_card' ? { type: 'ackCard' } : { type: 'endTurn' })
        }
        onJail={(action) => g.sendIntent({ type: 'jail', action })}
        onSendTrade={(intent) => g.sendIntent(intent)}
        onSetDrinkMode={(mode) => g.sendIntent({ type: 'setDrinkMode', mode })}
        onManage={(intent) => g.sendIntent(intent)}
        onBid={(_pid, amount) => g.sendIntent({ type: 'bid', amount })}
        onPass={() => g.sendIntent({ type: 'passBid' })}
        onMarketBuy={(cardId, pay) => g.sendIntent({ type: 'marketBuy', cardId, pay })}
        onMarketUse={(_pid, cardId, targetId) => g.sendIntent({ type: 'marketUse', cardId, targetId })}
        auctionControllableIds={g.myId ? [g.myId] : []}
        onFinish={() => g.sendIntent({ type: 'endGame' })}
        mode="online"
        netStatus={g.netStatus}
        role={g.role}
        chat={g.chat}
        onSendChat={g.sendChat}
      />
      </>
    )
  }

  if (g.screen === 'finished' && g.gameState) {
    return <MvRanking results={g.results} onReplay={g.reset} />
  }

  return (
    <>
      <NetBanner status={g.netStatus} />
      {!online && (
        <div className="mv-offline" role="alert">
          <p className="mv-offline__title">📴 Tu es hors ligne</p>
          <p className="mv-offline__desc">
            Le mode en ligne nécessite une connexion. Reviens au menu pour lancer une partie locale
            (hot-seat), jouable sans réseau.
          </p>
          <MonovomyButton variant="ghost" onClick={onExit}>← Menu</MonovomyButton>
        </div>
      )}
      {online && g.screen === 'home' && g.hasSavedSession && (
        <div className="mv-resume">
          <p>Une partie précédente a été trouvée.</p>
          <MonovomyButton onClick={g.resume}>↩︎ Reprendre la partie</MonovomyButton>
        </div>
      )}
      {online && (
        <MvOnlineLobby
          configured={g.configured}
          screen={g.screen}
          role={g.role}
          roomCode={g.roomCode}
          members={g.members}
          error={g.error}
          presetCode={initialJoinCode}
          presetName={lastProfile?.name || ''}
          presetDrinkMode={lastProfile?.drinkMode || 'alcohol'}
          onCreate={handleCreate}
          onJoin={handleJoin}
          onStart={g.hostStart}
          onShare={handleShare}
          onExit={onExit}
        />
      )}
    </>
  )
}
