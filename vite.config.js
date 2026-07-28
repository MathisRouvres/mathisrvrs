import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// Repère de build, affiché dans les réglages MonoVomy. Sans lui, impossible de
// distinguer « le correctif ne marche pas » de « le téléphone sert encore
// l'ancienne version ».
const BUILD_ID =
  process.env.GITHUB_SHA?.slice(0, 7) ??
  new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  define: {
    __APP_BUILD__: JSON.stringify(BUILD_ID),
  },
  resolve: {
    alias: {
      '@game-engine': path.join(rootDir, 'src/game-engine'),
      '@game-content': path.join(rootDir, 'src/game-content'),
    },
  },
  // Deps runtime déclarées explicitement : évite au démarrage dev la longue
  // phase « scanning dependencies » (très coûteuse quand la machine est chargée).
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'zod'],
  },
})
