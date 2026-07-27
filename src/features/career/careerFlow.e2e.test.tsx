// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CareerApp from './CareerApp'
import { resetLocalCareerStoreForTests } from './persistence/localCareerStore'

/**
 * Parcours principal de bout en bout :
 * pays → poste → carrière → 2 dilemmes (résolution immédiate, sans bouton
 * « Continuer ») → bilan → saison suivante → rechargement → reprise exacte.
 */

async function resolveFirstOption(user: ReturnType<typeof userEvent.setup>) {
  const group = await screen.findByRole('group', { name: 'Tes options' })
  const buttons = within(group).getAllByRole('button')
  expect(buttons.length).toBeGreaterThanOrEqual(2)
  await user.click(buttons[0]!)
  // Choix irréversible : un premier appui arme, un second confirme (rare).
  if (screen.queryByText(/Appuie encore pour confirmer/) !== null) {
    await user.click(within(group).getAllByRole('button')[0]!)
  }
  // Aucun écran de validation : l'étape suivante s'affiche directement.
}

describe('parcours carrière express (E2E)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetLocalCareerStoreForTests()
    cleanup()
  })

  it(
    'joue une saison complète puis reprend après rechargement',
    { timeout: 30_000 },
    async () => {
      const user = userEvent.setup()
      const first = render(<CareerApp />)

      // 1-2. Écran de départ : pays + poste, aucun champ texte.
      expect(document.querySelector('input, textarea')).toBeNull()
      await user.click(screen.getByRole('button', { name: /France/ }))
      await user.click(screen.getByRole('button', { name: 'Milieu' }))

      // 3. Commencer — premier dilemme immédiat.
      await user.click(
        screen.getByRole('button', { name: 'Commencer ma carrière' }),
      )
      await screen.findByText('Dilemme 1 sur 2')
      const playerName = document.querySelector('.cg-hud__name')?.textContent
      expect(playerName?.length ?? 0).toBeGreaterThan(2)

      // 4. Premier choix → passage direct au deuxième dilemme, autosave signalée.
      await resolveFirstOption(user)
      await screen.findByText('Dilemme 2 sur 2')
      expect(screen.getByText('✓ Sauvegardé').className).toContain('is-visible')

      // 5. Deuxième choix → simulation automatique → bilan (sans « Continuer »).
      await resolveFirstOption(user)
      await screen.findByText('Bilan saison 1')

      // 6. Bilan compact + action principale unique.
      await user.click(
        screen.getByRole('button', { name: /Saison suivante|bilan de carrière/ }),
      )

      // 7. Saison 2 entamée (ou fin de carrière anticipée — improbable S1).
      await screen.findByText('Dilemme 1 sur 2')
      expect(screen.getByText(/Saison 2/)).toBeTruthy()

      // 8. « Rechargement » : démontage complet puis nouveau rendu.
      first.unmount()
      resetLocalCareerStoreForTests()
      render(<CareerApp />)

      // Reprise exacte : même joueur, saison 2, dilemme 1.
      await screen.findByText('Dilemme 1 sur 2')
      expect(screen.getByText(/Saison 2/)).toBeTruthy()
      expect(document.querySelector('.cg-hud__name')?.textContent).toBe(
        playerName,
      )
    },
  )

  it('reprend une carrière même après le premier dilemme seulement', async () => {
    const user = userEvent.setup()
    const first = render(<CareerApp />)
    await user.click(screen.getByRole('button', { name: /Espagne/ }))
    await user.click(screen.getByRole('button', { name: 'Attaquant' }))
    await user.click(
      screen.getByRole('button', { name: 'Commencer ma carrière' }),
    )
    await screen.findByText('Dilemme 1 sur 2')
    await resolveFirstOption(user)
    await screen.findByText('Dilemme 2 sur 2')

    first.unmount()
    resetLocalCareerStoreForTests()
    render(<CareerApp />)
    await screen.findByText('Dilemme 2 sur 2')
  })
})
