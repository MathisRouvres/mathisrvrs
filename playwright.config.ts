import { defineConfig } from '@playwright/test'

/**
 * Tests de bout en bout MonoVomy — un vrai navigateur, un vrai serveur Vite.
 *
 * Cible mobile par défaut (le jeu est mobile-first). Le serveur est démarré par
 * Playwright ; `VITE_MONOVOMY_ENABLED` doit être vrai (voir `.env.local`).
 */
const PORT = 4321

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        // Chromium au gabarit iPhone 15 Plus : c'est la cible du jeu, et c'est
        // le seul moteur qui rende du WebGL en headless sans GPU.
        browserName: 'chromium',
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        launchOptions: {
          args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        },
      },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/monovomy`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
