import { describe, it, expect } from 'vitest'
import { createGame } from './setup'
import { takeTurn, endTurn } from './turn'
import {
  buyMarketCard,
  skipMarket,
  playMarketCard,
  fillMarketStock,
  marketStock,
  marketCardsOf,
  sipsPriceFor,
} from './market'
import { MARKET_MAX_CARDS, MARKET_STOCK_SIZE, SIPS_TO_CASH } from './constants'
import { soireeBoard } from '../content/board.soiree'
import { actionCards } from '../content/cards'
import { marketCards, getMarketCardById } from '../content/market'
import { marketCardSchema } from '../content/schema'
import type { GameConfig, GameState, PlayerSetup } from './types'

const CONFIG: GameConfig = {
  difficulty: 'facile',
  durationMinutes: 30,
  bankruptcy: 'none',
  themeId: 'soiree',
  seed: 'marche-noir',
}

const SETUPS: PlayerSetup[] = [
  { id: 'p1', name: 'Alice', avatar: '🍺', drinkMode: 'alcohol' },
  { id: 'p2', name: 'Bob', avatar: '🍷', drinkMode: 'alcohol' },
  { id: 'p3', name: 'Cleo', avatar: '🥃', drinkMode: 'soft' },
]

const POOL = actionCards.map((c) => c.id)

function game(): GameState {
  return createGame(CONFIG, SETUPS, POOL)
}

describe('Marché Noir — contenu', () => {
  it('valide le schéma de chaque carte', () => {
    for (const card of marketCards) {
      expect(() => marketCardSchema.parse(card)).not.toThrow()
    }
  })

  it('a des identifiants uniques', () => {
    const ids = marketCards.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('fournit assez de cartes pour remplir le stock', () => {
    expect(marketCards.length).toBeGreaterThan(MARKET_STOCK_SIZE)
  })

  it('dérive le prix en gorgées du prix en euros (1 gorgée = 50 €)', () => {
    for (const card of marketCards) {
      expect(sipsPriceFor(card)).toBe(Math.round(card.priceCash / SIPS_TO_CASH))
    }
  })

  it('impose une variante soft à chaque carte', () => {
    for (const card of marketCards) {
      expect(card.softVariant.length).toBeGreaterThan(3)
    }
  })

  it('place le Marché Noir sur le plateau Soirée', () => {
    expect(soireeBoard.spaces.filter((s) => s.kind === 'market')).toHaveLength(1)
  })
})

describe('Marché Noir — stock', () => {
  it('approvisionne le marché dès la création de partie', () => {
    expect(marketStock(game())).toHaveLength(MARKET_STOCK_SIZE)
  })

  it('tire un stock déterministe pour une même seed', () => {
    expect(marketStock(game())).toEqual(marketStock(game()))
  })

  it('propose des cartes distinctes', () => {
    const stock = marketStock(game())
    expect(new Set(stock).size).toBe(stock.length)
  })

  it('renouvelle le stock à chaque re-tirage', () => {
    const s = game()
    const before = marketStock(s)
    fillMarketStock(s)
    fillMarketStock(s)
    expect(marketStock(s)).toHaveLength(MARKET_STOCK_SIZE)
    expect(s.marketDraws).toBe(3)
    // Flux dédié : la séquence des dés n'est jamais décalée par le marché.
    expect(s.rngState).toBe(game().rngState)
    expect(before).toHaveLength(MARKET_STOCK_SIZE)
  })
})

describe('Marché Noir — achat', () => {
  it('achète en argent et débite le joueur', () => {
    const s = game()
    const cardId = marketStock(s)[0]!
    const price = getMarketCardById(cardId)!.priceCash
    const cash = s.players[0]!.cash
    const r = buyMarketCard(s, 'p1', cardId, 'cash')
    expect(r.error).toBeNull()
    expect(r.state.players[0]!.cash).toBe(cash - price)
    expect(marketCardsOf(r.state.players[0])).toEqual([cardId])
    expect(r.sipsPaid).toBe(0)
  })

  it('achète en gorgées sans toucher au cash', () => {
    const s = game()
    const cardId = marketStock(s)[0]!
    const cash = s.players[0]!.cash
    const r = buyMarketCard(s, 'p1', cardId, 'sips')
    expect(r.error).toBeNull()
    expect(r.state.players[0]!.cash).toBe(cash)
    expect(r.sipsPaid).toBe(sipsPriceFor(getMarketCardById(cardId)!))
  })

  it('re-tire le stock après un achat', () => {
    const s = game()
    const cardId = marketStock(s)[0]!
    const r = buyMarketCard(s, 'p1', cardId, 'cash')
    expect(marketStock(r.state)).toHaveLength(MARKET_STOCK_SIZE)
    expect(r.state.marketDraws).toBe((s.marketDraws ?? 0) + 1)
    expect(r.state.rngState).toBe(s.rngState)
  })

  it('refuse une carte hors stock', () => {
    const s = game()
    const absent = marketCards.map((c) => c.id).find((id) => !marketStock(s).includes(id))!
    expect(buyMarketCard(s, 'p1', absent, 'cash').error).toBe('not_in_stock')
  })

  it('refuse un achat sans fonds', () => {
    const s = game()
    s.players[0]!.cash = 10
    expect(buyMarketCard(s, 'p1', marketStock(s)[0]!, 'cash').error).toBe('insufficient_cash')
  })

  it('plafonne l’inventaire à 3 cartes', () => {
    let s = game()
    for (let i = 0; i < MARKET_MAX_CARDS; i += 1) {
      const r = buyMarketCard(s, 'p1', marketStock(s)[0]!, 'sips')
      expect(r.error).toBeNull()
      s = r.state
    }
    expect(marketCardsOf(s.players[0])).toHaveLength(MARKET_MAX_CARDS)
    expect(buyMarketCard(s, 'p1', marketStock(s)[0]!, 'sips').error).toBe('inventory_full')
  })

  it('quitte le marché sans acheter', () => {
    const s = game()
    s.phase = 'awaiting_market'
    const next = skipMarket(s)
    expect(next.phase).toBe('turn_cleanup')
    expect(marketCardsOf(next.players[0])).toHaveLength(0)
  })

  it('ne mute jamais l’état d’entrée', () => {
    const s = game()
    buyMarketCard(s, 'p1', marketStock(s)[0]!, 'cash')
    expect(marketCardsOf(s.players[0])).toHaveLength(0)
  })
})

/** Donne une carte précise à un joueur, sans passer par le stock. */
function grant(state: GameState, playerId: string, cardId: string): GameState {
  const next = { ...state, players: state.players.map((p) => ({ ...p })) }
  const player = next.players.find((p) => p.id === playerId)!
  player.marketCards = [...(player.marketCards ?? []), cardId]
  return next
}

describe('Marché Noir — usage des cartes', () => {
  it('refuse une carte que le joueur ne possède pas', () => {
    expect(playMarketCard(game(), 'p1', 'mk_bouclier').error).toBe('not_owned')
  })

  it('consomme la carte jouée', () => {
    const s = grant(game(), 'p1', 'mk_bouclier')
    const r = playMarketCard(s, 'p1', 'mk_bouclier')
    expect(r.error).toBeNull()
    expect(marketCardsOf(r.state.players[0])).toHaveLength(0)
  })

  it('journalise une annonce publique à chaque usage', () => {
    const s = grant(game(), 'p1', 'mk_tournee')
    const r = playMarketCard(s, 'p1', 'mk_tournee')
    expect(r.announce?.effect).toBe('round')
    expect(r.state.marketLog).toHaveLength(1)
    expect(r.state.marketSeq).toBe(1)
  })

  it('arme le bouclier et annule les gorgées du prochain loyer', () => {
    let s = grant(game(), 'p1', 'mk_bouclier')
    s = playMarketCard(s, 'p1', 'mk_bouclier').state
    expect(s.players[0]!.shielded).toBe(true)

    // Bob possède toutes les propriétés : Alice paie forcément un loyer.
    for (const space of soireeBoard.spaces) {
      if (space.kind === 'property' || space.kind === 'station' || space.kind === 'utility') {
        s.ownership[space.id] = 'p2'
        s.players[1]!.ownedSpaceIds.push(space.id)
      }
    }
    s.currentPlayerIndex = 0
    s.orderCursor = s.order.indexOf(0)

    let out = takeTurn(s, soireeBoard)
    for (let guard = 0; out.outcome.kind !== 'pay_rent' && guard < 20; guard += 1) {
      s = endTurn(out.state)
      s.currentPlayerIndex = 0
      s.orderCursor = s.order.indexOf(0)
      s.phase = 'awaiting_roll'
      out = takeTurn(s, soireeBoard)
    }
    expect(out.outcome.kind).toBe('pay_rent')
    if (out.outcome.kind === 'pay_rent') expect(out.outcome.sips).toBe(0)
    expect(out.state.players[0]!.shielded).toBe(false)
  })

  it('refuse un second bouclier tant que le premier est armé', () => {
    let s = grant(game(), 'p1', 'mk_bouclier')
    s = grant(s, 'p1', 'mk_bouclier')
    s = playMarketCard(s, 'p1', 'mk_bouclier').state
    expect(playMarketCard(s, 'p1', 'mk_bouclier').error).toBe('already_shielded')
  })

  it('arme le dé truqué et retient le plus haut des deux lancers', () => {
    const base = grant(game(), 'p1', 'mk_de_truque')
    const plain = takeTurn(base, soireeBoard)
    const armed = playMarketCard(base, 'p1', 'mk_de_truque').state
    const loaded = takeTurn(armed, soireeBoard)
    expect(loaded.roll.total).toBeGreaterThanOrEqual(plain.roll.total)
    expect(loaded.state.players[0]!.loadedDie).toBe(false)
  })

  it('refuse le dé truqué hors de la phase de lancer', () => {
    const s = grant(game(), 'p1', 'mk_de_truque')
    s.phase = 'turn_cleanup'
    expect(playMarketCard(s, 'p1', 'mk_de_truque').error).toBe('wrong_timing')
  })

  it('vole une carte au hasard avec le pickpocket', () => {
    let s = grant(game(), 'p1', 'mk_pickpocket')
    s = grant(s, 'p2', 'mk_cle_cuve')
    const r = playMarketCard(s, 'p1', 'mk_pickpocket', 'p2')
    expect(r.error).toBeNull()
    expect(marketCardsOf(r.state.players[1])).toHaveLength(0)
    expect(marketCardsOf(r.state.players[0])).toEqual(['mk_cle_cuve'])
  })

  it('refuse le pickpocket sur une cible sans carte', () => {
    const s = grant(game(), 'p1', 'mk_pickpocket')
    expect(playMarketCard(s, 'p1', 'mk_pickpocket', 'p2').error).toBe('nothing_to_steal')
  })

  it('refuse une carte ciblée sans cible', () => {
    const s = grant(game(), 'p1', 'mk_baillon')
    expect(playMarketCard(s, 'p1', 'mk_baillon').error).toBe('no_target')
  })

  it('rend un jeton de sortie de cuve', () => {
    const s = grant(game(), 'p1', 'mk_cle_cuve')
    const r = playMarketCard(s, 'p1', 'mk_cle_cuve')
    expect(r.state.players[0]!.jailCards).toBe(1)
  })

  it('annule le loyer du tour courant avec le passe-droit', () => {
    const s = grant(game(), 'p1', 'mk_passe_droit')
    s.lastRent = {
      payerId: 'p1',
      ownerId: 'p2',
      spaceId: 'rue_soif',
      amount: 120,
      sips: 1,
      turnStep: s.turnStep,
    }
    const cashPayer = s.players[0]!.cash
    const cashOwner = s.players[1]!.cash
    const r = playMarketCard(s, 'p1', 'mk_passe_droit')
    expect(r.error).toBeNull()
    expect(r.state.players[0]!.cash).toBe(cashPayer + 120)
    expect(r.state.players[1]!.cash).toBe(cashOwner - 120)
    expect(r.state.lastRent).toBeNull()
  })

  it('refuse le passe-droit sur un loyer d’un tour précédent', () => {
    const s = grant(game(), 'p1', 'mk_passe_droit')
    s.lastRent = {
      payerId: 'p1',
      ownerId: 'p2',
      spaceId: 'rue_soif',
      amount: 120,
      sips: 1,
      turnStep: s.turnStep - 1,
    }
    expect(playMarketCard(s, 'p1', 'mk_passe_droit').error).toBe('no_rent_to_cancel')
  })
})

describe('Marché Noir — rétrocompatibilité', () => {
  it('accepte un état sans champs de marché (snapshot antérieur)', () => {
    const s = game() as GameState & { market?: unknown }
    delete s.market
    delete s.marketLog
    delete s.marketSeq
    for (const p of s.players) delete p.marketCards
    expect(marketStock(s)).toEqual([])
    expect(marketCardsOf(s.players[0])).toEqual([])
    expect(() => takeTurn(s, soireeBoard)).not.toThrow()
  })
})
