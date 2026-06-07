import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
