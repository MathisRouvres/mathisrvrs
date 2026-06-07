import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'mathis-rvrs-theme'
const TRANSITION_MS = 720

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* ignore */
  }
  return null
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function supportsViewTransitions() {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
}

function applyThemeToDom(theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme
}

function persistTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => getStoredTheme() ?? getSystemTheme())
  const [isTransitioning, setIsTransitioning] = useState(false)

  const setTheme = useCallback(
    (next) => {
      if (next === theme) return

      const commit = () => {
        applyThemeToDom(next)
        setThemeState(next)
        persistTheme(next)
      }

      if (prefersReducedMotion()) {
        commit()
        return
      }

      setIsTransitioning(true)

      if (supportsViewTransitions()) {
        const transition = document.startViewTransition(commit)
        transition.finished
          .catch(() => {})
          .finally(() => setIsTransitioning(false))
        return
      }

      const root = document.documentElement
      root.classList.add('theme-transitioning')

      requestAnimationFrame(() => {
        requestAnimationFrame(commit)
      })

      window.setTimeout(() => {
        root.classList.remove('theme-transitioning')
        setIsTransitioning(false)
      }, TRANSITION_MS)
    },
    [theme],
  )

  useEffect(() => {
    const stored = getStoredTheme()
    if (stored) return undefined

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [setTheme])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isTransitioning,
    useViewTransition: supportsViewTransitions(),
  }
}
