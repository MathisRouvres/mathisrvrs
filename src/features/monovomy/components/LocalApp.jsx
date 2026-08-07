import { useHotseatGame } from '../game/useHotseatGame'
import MvLobby from './MvLobby'
import MvGame from './MvGame'
import MvRanking from './MvRanking'
import { useWakeLock } from '../pwa/useWakeLock'
import { useGameActivity } from '../pwa/useGameActivity'
import { boardForState } from '../engine'

export default function LocalApp({ onExit }) {
  const game = useHotseatGame()
  const playing = game.screen === 'playing' && Boolean(game.state)

  useGameActivity(playing)
  useWakeLock(playing)

  return (
    <>
      {game.screen === 'lobby' && <MvLobby onStart={game.start} version={game.version} onExit={onExit} />}

      {game.screen === 'playing' && game.state && (
        <MvGame
          state={game.state}
          result={game.result}
          active={game.active}
          now={game.now}
          myId={game.myId}
          onRoll={game.roll}
          onBuy={game.buy}
          onNext={game.next}
          onJail={game.jail}
          onSendTrade={game.sendTrade}
          onSetDrinkMode={game.changeDrinkMode}
          onManage={game.manage}
          onBid={game.auctionBid}
          onPass={game.auctionPass}
          onMarketBuy={game.marketBuy}
          onMarketUse={game.marketUse}
          auctionControllableIds={game.state.auction ? game.state.auction.activeBidders : []}
          onFinish={game.finish}
        />
      )}

      {game.screen === 'finished' && <MvRanking results={game.results} onReplay={game.reset} mapName={boardForState(game.state).name} />}
    </>
  )
}
