// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PartyApp from '../PartyApp'
import { createLoopbackHub, type TransportFactory } from './transport'

/** Un téléphone : son propre écran, son propre transport, aucun stockage partagé. */
function phone(hub: ReturnType<typeof createLoopbackHub>) {
  const container = document.body.appendChild(document.createElement('div'))
  const factory: TransportFactory = (code, id, handlers) => hub.factory(code, id, handlers)
  render(<PartyApp initialPath="/games/soiree" roomTransport={factory} roomStorage={null} />, { container })
  return within(container)
}

async function createRoom(screen: ReturnType<typeof phone>, name: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Ton prénom'), name)
  await user.click(screen.getByRole('button', { name: 'Créer la partie' }))
  const label = await screen.findByLabelText('Partie à plusieurs téléphones')
  return label.querySelector('strong')?.textContent ?? ''
}

async function joinRoom(screen: ReturnType<typeof phone>, code: string, name: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('tab', { name: 'Rejoindre' }))
  await user.type(screen.getByLabelText('Code de la partie'), code)
  await user.type(screen.getByLabelText('Ton prénom'), name)
  await user.click(screen.getByRole('button', { name: 'Rejoindre la partie' }))
  await screen.findByLabelText('Partie à plusieurs téléphones')
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/games/soiree')
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('partie à plusieurs téléphones', () => {
  it('rejoindre avec le code, suivre le jeu choisi et la même carte', async () => {
    const hub = createLoopbackHub()
    const lea = phone(hub)
    const max = phone(hub)
    const code = await createRoom(lea, 'Léa')
    expect(code).toMatch(/^[A-Z2-9]{4}$/)
    await joinRoom(max, code, 'Max')

    await waitFor(() => expect(lea.getByText(/2 téléphones/)).toBeTruthy())

    const user = userEvent.setup()
    await user.click(lea.getByRole('link', { name: /J’ai déjà \/ Je n’ai jamais/ }))
    await max.findByRole('button', { name: 'Carte suivante' })

    const counter = (s: ReturnType<typeof phone>) => s.getByText(/^Carte \d+ sur/).textContent
    const card = (s: ReturnType<typeof phone>) => s.getByText('Je n’ai jamais…').nextElementSibling?.textContent
    await waitFor(() => expect(card(max)).toBe(card(lea)))
    expect(counter(max)).toBe(counter(lea))

    await user.click(max.getByRole('button', { name: 'Carte suivante' }))
    await waitFor(() => expect(counter(lea)).toMatch(/^Carte 2 sur/))
    await waitFor(() => expect(card(lea)).toBe(card(max)))
  })

  it('partage la liste des joueurs et la retire en quittant', async () => {
    const hub = createLoopbackHub()
    const lea = phone(hub)
    const max = phone(hub)
    const code = await createRoom(lea, 'Léa')
    await joinRoom(max, code, 'Max')

    const user = userEvent.setup()
    await user.click(max.getByRole('link', { name: /^Imposteur/ }))
    await waitFor(() => expect(lea.getByRole('button', { name: 'Retirer Max' })).toBeTruthy())
    expect(lea.getByRole('button', { name: 'Retirer Léa' })).toBeTruthy()

    await user.click(max.getByRole('button', { name: 'Inviter' }))
    await user.click(max.getByRole('button', { name: 'Quitter la partie' }))
    await waitFor(() => expect(lea.queryByRole('button', { name: 'Retirer Max' })).toBeNull())
    expect(max.queryByLabelText('Partie à plusieurs téléphones')).toBeNull()
  })

  it('Imposteur : chacun voit son rôle sur son téléphone, vote, et l’appli tranche', async () => {
    const hub = createLoopbackHub()
    const phones = [phone(hub), phone(hub), phone(hub)]
    const [lea, max, zoe] = phones
    const code = await createRoom(lea, 'Léa')
    await joinRoom(max, code, 'Max')
    await joinRoom(zoe, code, 'Zoé')
    await waitFor(() => expect(lea.getByText(/3 téléphones/)).toBeTruthy())

    const user = userEvent.setup()
    await user.click(zoe.getByRole('link', { name: /^Imposteur/ }))
    await waitFor(() => expect(lea.getByRole('button', { name: 'Retirer Zoé' })).toBeTruthy())
    await user.click(lea.getByRole('button', { name: 'Lancer la partie' }))

    for (const p of phones) {
      await user.click(await p.findByRole('button', { name: 'Voir ton rôle' }))
    }
    await waitFor(() => expect(lea.getByText('3/3 ont vu leur rôle')).toBeTruthy())
    const impostors = phones.filter((p) => p.queryByText('Tu es l’imposteur'))
    expect(impostors).toHaveLength(1)
    const secret = phones.find((p) => p.queryByText('Le mot secret'))
    expect(secret).toBeTruthy()

    await user.click(max.getByRole('button', { name: 'Tout le monde a vu, on commence' }))
    await lea.findByRole('button', { name: /Révéler/ })

    const impostorIndex = phones.indexOf(impostors[0]!)
    const impostorName = ['Léa', 'Max', 'Zoé'][impostorIndex]!
    for (const p of phones) {
      await user.click(within(p.getByRole('region', { name: /Qui est/ })).getByRole('button', { name: impostorName }))
    }
    await waitFor(() => expect(lea.getByText('3/3 votes')).toBeTruthy())
    await user.click(zoe.getByRole('button', { name: /Révéler/ }))
    await waitFor(() => expect(max.getByRole('status').textContent).toContain(`${impostorName} démasqué`))
  })

  it('Tu préfères : les résultats s’affichent après son vote, avec les prénoms', async () => {
    const hub = createLoopbackHub()
    const lea = phone(hub)
    const max = phone(hub)
    const code = await createRoom(lea, 'Léa')
    await joinRoom(max, code, 'Max')
    const user = userEvent.setup()
    await user.click(lea.getByRole('link', { name: /Tu préfères/ }))
    const region = await max.findByRole('region', { name: 'Ton choix' })
    expect(within(region).queryByRole('list', { name: 'Résultats' })).toBeNull()

    const [first] = within(region).getAllByRole('button')
    await user.click(first!)
    await waitFor(() => expect(within(region).getByRole('list', { name: 'Résultats' }).textContent).toContain('Max'))
    await waitFor(() => expect(lea.getByText('1/2 vote')).toBeTruthy())
  })

  it('Loup-Garou : le meneur ne joue pas et voit les rôles, les joueurs ne voient que le leur', async () => {
    const hub = createLoopbackHub()
    const lea = phone(hub)
    const max = phone(hub)
    const code = await createRoom(lea, 'Léa')
    await joinRoom(max, code, 'Max')
    const user = userEvent.setup()

    await user.click(max.getByRole('button', { name: 'Inviter' }))
    await user.click(max.getByRole('checkbox', { name: /Je joue/ }))
    await user.click(lea.getByRole('link', { name: /Loup-Garou/ }))
    await lea.findByRole('button', { name: 'Distribuer les rôles' })
    await waitFor(() => expect(lea.queryByRole('button', { name: 'Retirer Max' })).toBeNull())
    for (const guest of ['Ana', 'Bob', 'Cid', 'Dan', 'Eve']) {
      await user.type(lea.getByLabelText('Prénom du joueur'), `${guest}{Enter}`)
    }
    await user.click(lea.getByRole('button', { name: 'Distribuer les rôles' }))

    await lea.findByRole('button', { name: 'Voir ton rôle' })
    expect(await max.findByText('Tu regardes la partie')).toBeTruthy()
    await user.click(max.getByRole('button', { name: /la nuit tombe/ }))

    await max.findByRole('button', { name: 'Suivant' })
    await waitFor(() => expect(lea.getByText('Mon rôle (à l’abri des regards)')).toBeTruthy())
    expect(lea.queryByRole('button', { name: 'Suivant' })).toBeNull()
    expect(max.getByRole('region', { name: 'Joueurs' }).textContent).toMatch(/Loup-Garou/)
    expect(lea.getByRole('region', { name: 'Joueurs' }).textContent).not.toMatch(/Villageois|Voyante|Sorcière|Chasseur/)
  })
})
