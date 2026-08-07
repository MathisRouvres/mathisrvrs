// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import MvBoard from './MvBoard'
import { createGame } from '../engine'
import { actionCards } from '../content/cards'
import type { BoardMapId } from '../content/maps/types'
import { getBoardMap } from '../content/maps/registry'
import type { GameConfig, PlayerSetup } from '../engine/types'

afterEach(cleanup)

const POOL = actionCards.map((card) => card.id)
const setups = (n: number): PlayerSetup[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `J${i + 1}`,
    avatar: `${i + 1}`,
    drinkMode: 'alcohol' as const,
  }))

function gameOn(mapId: BoardMapId) {
  const config: GameConfig = {
    difficulty: 'inter',
    durationMinutes: 60,
    bankruptcy: 'none',
    themeId: 'soiree',
    mapId,
    seed: `ui-${mapId}`,
  }
  return createGame(config, setups(4), POOL, getBoardMap(mapId))
}

describe('plateau 2D — piloté par la map active', () => {
  it('dessine les 40 cases du plateau carré', () => {
    const state = gameOn('classic_square')
    const { container } = render(<MvBoard state={state} active={state.players[0]} />)
    expect(container.querySelectorAll('.mv-case')).toHaveLength(40)
    expect(screen.getByText('Rue de la Soif')).toBeTruthy()
  })

  it('dessine les 56 cases du plateau en 8', () => {
    const state = gameOn('infinity_party')
    const { container } = render(<MvBoard state={state} active={state.players[0]} />)
    expect(container.querySelectorAll('.mv-case')).toHaveLength(56)
    expect(screen.getByText('Terrasse du Soleil')).toBeTruthy()
    expect(screen.getByText('Le Pont des Perdus')).toBeTruthy()
  })

  it('positionne chaque case sans grille, aux coordonnées de la map', () => {
    const state = gameOn('infinity_party')
    const { container } = render(<MvBoard state={state} active={state.players[0]} />)
    const cases = Array.from(container.querySelectorAll<HTMLElement>('.mv-case'))
    // Aucune propriété de grille : tout est en positionnement absolu.
    for (const node of cases) {
      expect(node.style.gridRow).toBe('')
      expect(node.style.left).toMatch(/%$/)
      expect(node.style.top).toMatch(/%$/)
    }
    // Les deux passages du croisement ne sont pas sur le même calque.
    const layers = new Set(cases.map((node) => node.style.zIndex))
    expect(layers.size).toBeGreaterThan(1)
  })

  it('respecte le ratio déclaré par la map', () => {
    const square = render(<MvBoard state={gameOn('classic_square')} active={null} />)
    expect(square.container.querySelector<HTMLElement>('.mv-board')?.style.aspectRatio).toMatch(/^1(\s*\/\s*1)?$/)
    cleanup()
    const eight = render(<MvBoard state={gameOn('infinity_party')} active={null} />)
    expect(eight.container.querySelector<HTMLElement>('.mv-board')?.style.aspectRatio).toMatch(/^2(\s*\/\s*1)?$/)
  })
})
