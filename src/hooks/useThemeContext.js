import { useContext } from 'react'
import { ThemeContext } from '../context/themeContext'

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}
