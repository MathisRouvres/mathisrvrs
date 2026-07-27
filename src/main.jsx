import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Capture précoce de l'invitation d'installation PWA — uniquement sur MonoVomy.
// L'événement peut précéder le montage React ; on le relaie au hook via window +
// un événement custom. Le portfolio (`/`) n'est jamais concerné.
if (window.location.pathname.startsWith('/monovomy')) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    window.__mvDeferredInstallPrompt = e
    window.dispatchEvent(new CustomEvent('mv-beforeinstallprompt', { detail: e }))
  })
}

const stored = localStorage.getItem('mathis-rvrs-theme')
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const initialTheme = stored === 'light' || stored === 'dark' ? stored : systemDark ? 'dark' : 'light'
document.documentElement.classList.add(initialTheme)
document.documentElement.style.colorScheme = initialTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
