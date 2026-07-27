import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
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
