// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PartyApp from './PartyApp'
import { SESSION_KEY } from './session'

function seedPlayers(players: string[]) {
  localStorage.setItem('party-settings-v1', JSON.stringify({ level: 'soft', adult: false, players }))
}

function seedSession(slug: string, level: string, state: Record<string, unknown>) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ [slug]: { level, savedAt: Date.now(), state } }))
}

function savedState(slug: string) {
  return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}')[slug]?.state
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(cleanup)

describe('page d’un jeu de soirée', () => {
  it('replie le choix du niveau et prévient qu’en changer relance la partie', async () => {
    const user = userEvent.setup()
    render(<PartyApp initialPath="/games/soiree/quiz" />)

    expect(screen.queryByRole('radiogroup', { name: 'Niveau des questions' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Changer' }))
    expect(screen.getByRole('radiogroup', { name: 'Niveau des questions' })).toBeTruthy()
    expect(screen.getByText(/relance la partie/)).toBeTruthy()

    await user.click(screen.getByRole('radio', { name: /Épicé/ }))
    expect(screen.queryByRole('radiogroup', { name: 'Niveau des questions' })).toBeNull()
    expect(screen.getByText('Épicé')).toBeTruthy()
  })

  it('retrouve les scores du quiz après un rechargement', async () => {
    const user = userEvent.setup()
    render(<PartyApp initialPath="/games/soiree/quiz" />)
    await user.click(screen.getByRole('button', { name: 'Voir la réponse' }))
    await user.click(screen.getByRole('button', { name: 'Bonne réponse' }))
    expect(savedState('quiz').scores).toEqual([1, 0])

    cleanup()
    render(<PartyApp initialPath="/games/soiree/quiz" />)
    expect(screen.getByRole('button', { name: 'Remettre les scores à zéro' })).toBeTruthy()
  })

  it('ne reprend pas une partie sauvegardée à un autre niveau', () => {
    seedSession('quiz', 'spicy', { scores: [3, 2] })
    render(<PartyApp initialPath="/games/soiree/quiz" />)
    expect(screen.queryByRole('button', { name: 'Remettre les scores à zéro' })).toBeNull()
  })

  it('ignore une sauvegarde invalide au lieu de planter', () => {
    seedSession('quiz', 'soft', { scores: 'abc', team: 7, deck: { order: [0, 0], position: 9 } })
    render(<PartyApp initialPath="/games/soiree/quiz" />)
    expect(screen.getByRole('button', { name: 'Voir la réponse' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Remettre les scores à zéro' })).toBeNull()
  })

  it('Bus : remélange en reprenant la partie quand il reste moins de 4 cartes', async () => {
    const user = userEvent.setup()
    seedPlayers(['Ana', 'Bob'])
    seedSession('le-bus', 'soft', { pos: 50 })
    render(<PartyApp initialPath="/games/soiree/le-bus" />)

    await user.click(screen.getByRole('button', { name: 'Monter dans le bus' }))
    expect(savedState('le-bus').pos).toBe(0)
    await user.click(screen.getByRole('button', { name: 'Rouge' }))
    expect(screen.getByText(/Raté|Plus haut ou plus bas/)).toBeTruthy()
  })

  it('Imposteur : recache le rôle affiché après un rechargement', async () => {
    const user = userEvent.setup()
    seedPlayers(['Ana', 'Bob', 'Chloé'])
    render(<PartyApp initialPath="/games/soiree/imposteur" />)
    await user.click(screen.getByRole('button', { name: 'Lancer la partie' }))
    await user.click(screen.getByRole('button', { name: 'Je suis Ana, voir mon rôle' }))

    cleanup()
    render(<PartyApp initialPath="/games/soiree/imposteur" />)
    expect(screen.getByRole('button', { name: 'Je suis Ana, voir mon rôle' })).toBeTruthy()
  })
})

describe('accueil des jeux de soirée', () => {
  it('propose de reprendre la dernière partie, ou de l’abandonner', async () => {
    const user = userEvent.setup()
    seedSession('quiz', 'soft', { scores: [1, 0] })
    render(<PartyApp initialPath="/games/soiree" />)

    const banner = screen.getByRole('region', { name: 'Partie en cours' })
    expect(within(banner).getByText('Quiz culture G')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Abandonner la partie de Quiz culture G' }))
    expect(screen.queryByRole('region', { name: 'Partie en cours' })).toBeNull()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('reprend la partie au niveau où elle a été jouée', async () => {
    const user = userEvent.setup()
    seedSession('quiz', 'spicy', { scores: [2, 0] })
    render(<PartyApp initialPath="/games/soiree" />)

    await user.click(screen.getByRole('link', { name: 'Reprendre la partie' }))
    expect(screen.getByText('Épicé')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remettre les scores à zéro' })).toBeTruthy()
  })

  it('ne montre rien quand aucune partie n’a été jouée', () => {
    render(<PartyApp initialPath="/games/soiree" />)
    expect(screen.queryByRole('region', { name: 'Partie en cours' })).toBeNull()
  })
})
