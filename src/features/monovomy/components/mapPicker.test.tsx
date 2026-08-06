// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MvMapPicker from './MvMapPicker'
import { listBoardMaps } from '../content'

afterEach(cleanup)

describe('MvMapPicker', () => {
  it('affiche une carte par plateau du registre, avec sa miniature', () => {
    render(<MvMapPicker value="classic_square" onSelect={() => {}} />)
    const maps = listBoardMaps()
    for (const map of maps) {
      expect(screen.getByText(map.name)).toBeTruthy()
      expect(screen.getByLabelText(`Aperçu du plateau ${map.name}`)).toBeTruthy()
      expect(screen.getByText(`${map.path.length} cases`)).toBeTruthy()
    }
  })

  it('marque le plateau sélectionné', () => {
    render(<MvMapPicker value="classic_square" onSelect={() => {}} />)
    const option = screen.getAllByRole('radio')[0]
    expect(option?.getAttribute('aria-checked')).toBe('true')
  })

  it('remonte la sélection de l’hôte', async () => {
    const onSelect = vi.fn()
    render(<MvMapPicker value="classic_square" onSelect={onSelect} />)
    await userEvent.click(screen.getAllByRole('radio')[0]!)
    expect(onSelect).toHaveBeenCalledWith('classic_square')
  })

  it('verrouille la sélection pour un joueur non-hôte', async () => {
    const onSelect = vi.fn()
    render(<MvMapPicker value="classic_square" onSelect={onSelect} canEdit={false} />)
    expect(screen.getByText('Choisi par l’hôte')).toBeTruthy()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    const card = document.querySelector('.mv-mapcard') as HTMLButtonElement
    expect(card.disabled).toBe(true)
    await userEvent.click(card)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('signale un plateau incompatible avec le nombre de joueurs', () => {
    render(<MvMapPicker value="classic_square" onSelect={() => {}} playerCount={2} />)
    expect(screen.getByText(/Prévu pour 3 à 8 joueurs/)).toBeTruthy()
  })
})
