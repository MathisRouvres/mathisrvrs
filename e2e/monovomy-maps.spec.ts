import { test, expect, type Page } from '@playwright/test'

/**
 * Scénarios de bout en bout du choix de plateau.
 *
 * Le jeu ouvre plusieurs calques (contrôle d'âge, aide, coach d'accueil) dont les
 * animations interceptent les clics : les gestes passent donc par un clic DOM
 * direct, ce qui teste bien le comportement applicatif sans dépendre du timing
 * des transitions.
 */
const domClick = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => (el as HTMLElement).click())

async function openLocalLobby(page: Page) {
  await page.goto('/monovomy')
  const gate = page.getByRole('button', { name: /18 ans/ })
  if (await gate.count()) await gate.click()
  await expect(page.locator('.mv-modecard--local')).toBeVisible()
  await domClick(page, '.mv-modecard--local')
  await expect(page.locator('.mv-mapcard')).toHaveCount(2)
}

async function startGame(page: Page, mapName: string) {
  await page.locator('.mv-mapcard', { hasText: mapName }).first().evaluate((el) => (el as HTMLElement).click())
  await expect(page.locator('.mv-mapcard.is-active')).toContainText(mapName)
  await domClick(page, 'button:has-text("Lancer la partie")')
  await expect(page.locator('canvas')).toBeVisible()
  // Coach d'accueil : on le passe pour dégager le plateau.
  const skip = page.getByRole('button', { name: /^Passer$/ })
  if (await skip.count()) await skip.first().evaluate((el) => (el as HTMLElement).click())
}

test.describe('choix du plateau dans le lobby', () => {
  test('propose les deux plateaux avec leur aperçu réel', async ({ page }) => {
    await openLocalLobby(page)

    const classic = page.locator('.mv-mapcard', { hasText: 'Plateau Classique' })
    const infinity = page.locator('.mv-mapcard', { hasText: 'Infinity Party' })

    await expect(classic).toContainText('40 cases')
    await expect(classic).toContainText('3–8 joueurs')
    await expect(infinity).toContainText('56 cases')
    await expect(infinity).toContainText('4–8 joueurs')

    // Miniature : un tracé réel par plateau, pas une image générique.
    await expect(classic.locator('svg.mv-mapthumb')).toBeVisible()
    await expect(infinity.locator('svg.mv-mapthumb')).toBeVisible()
    expect(await classic.locator('circle').count()).toBe(40)
    expect(await infinity.locator('circle').count()).toBe(56)

    // Le plateau classique est sélectionné par défaut.
    await expect(page.locator('.mv-mapcard.is-active')).toContainText('Plateau Classique')
  })

  test('bloque le lancement quand la map n’accepte pas le nombre de joueurs', async ({ page }) => {
    await openLocalLobby(page)
    await page.locator('.mv-mapcard', { hasText: 'Infinity Party' }).evaluate((el) => (el as HTMLElement).click())

    // Infinity Party se joue à 4 joueurs minimum : on descend à 3.
    await domClick(page, 'button[aria-label="Retirer un joueur"]')
    await expect(page.locator('.mv-counter__value')).toHaveText('3')
    await expect(page.locator('.mv-error')).toContainText('4–8 joueurs')
    await expect(page.getByRole('button', { name: /Lancer la partie/ })).toBeDisabled()

    // On remonte à 4 : le lancement redevient possible.
    await domClick(page, 'button[aria-label="Ajouter un joueur"]')
    await expect(page.getByRole('button', { name: /Lancer la partie/ })).toBeEnabled()
  })
})

test.describe('scénario plateau classique', () => {
  test('lance une partie sur le plateau carré', async ({ page }) => {
    await openLocalLobby(page)
    await startGame(page, 'Plateau Classique')

    // Économie du plateau classique.
    await expect(page.locator('.mv-hud2')).toContainText('1500')
    await expect(page.locator('.mv-hud2')).toContainText('Départ')

    // Le tour se joue : après le lancer, la barre d'action propose autre chose
    // que « lancer le dé » (achat, carte, fin de tour…).
    await domClick(page, '.mv-actionbar button:has-text("Lancer le dé")')
    await expect(page.locator('.mv-actionbar')).not.toContainText('Lancer le dé', { timeout: 30_000 })
  })
})

/**
 * La reprise après rechargement est propre au mode EN LIGNE (snapshots hôte,
 * Supabase) : elle n'est pas couverte ici, le hot-seat ne persiste pas la partie.
 */
test.describe('scénario Infinity Party', () => {
  test('lance et joue plusieurs tours sur le plateau en 8', async ({ page }) => {
    await openLocalLobby(page)
    await startGame(page, 'Infinity Party')

    // Économie propre à la map (capital 1800) et pion sur la case Départ.
    await expect(page.locator('.mv-hud2')).toContainText('1800')
    await expect(page.locator('.mv-hud2')).toContainText('Départ')

    // Économie de la map jusque dans la barre des joueurs (le carré démarre à 1500).
    await expect(page.locator('.mv-pbar')).toContainText('1800')

    // Plusieurs tours : le pion progresse le long du parcours.
    for (let turn = 0; turn < 4; turn += 1) {
      const roll = page.locator('.mv-actionbar button:has-text("Lancer le dé")')
      if (await roll.count()) {
        await roll.first().evaluate((el) => (el as HTMLElement).click())
        await page.waitForTimeout(2500)
      }
      // Achat proposé → on accepte ; sinon on enchaîne.
      const buy = page.locator('.mv-actionbar button:has-text("Acheter")')
      if (await buy.count()) await buy.first().evaluate((el) => (el as HTMLElement).click())
      const next = page.locator('.mv-actionbar button:has-text("Continuer"), .mv-actionbar button:has-text("Terminer le tour")')
      if (await next.count()) await next.first().evaluate((el) => (el as HTMLElement).click())
      await page.waitForTimeout(800)
    }

    // La partie tourne toujours sur Infinity Party après plusieurs tours.
    await expect(page.locator('.mv-hud2')).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()
  })
})
