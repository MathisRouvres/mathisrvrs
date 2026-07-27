import { useEffect } from 'react'
import './styles/career-theme.css'

/**
 * Shell dédié Mode Carrière — hors ThemeProvider / design system portfolio.
 */
export default function CareerShell({ children, title }) {
  useEffect(() => {
    const previousTitle = document.title
    const previousTheme = document.documentElement.getAttribute('style')
    document.title = `${title} | Mode Carrière`
    document.documentElement.style.colorScheme = 'dark'
    return () => {
      document.title = previousTitle
      if (previousTheme != null) {
        document.documentElement.setAttribute('style', previousTheme)
      } else {
        document.documentElement.style.removeProperty('color-scheme')
      }
    }
  }, [title])

  return (
    <div className="career-root">
      <a href="#career-main" className="cg-skip">
        Aller au contenu principal
      </a>

      <header className="cg-topbar">
        <div className="cg-topbar__inner">
          <a href="/" className="cg-brand" aria-label="Retour au portfolio">
            <span className="cg-brand__mark">Carrière</span>
            <span className="cg-brand__tag">Académie</span>
          </a>
          <p className="cg-topbar__meta">Invité · sauvegarde locale</p>
        </div>
      </header>

      <main id="career-main" className="cg-shell">
        {children}
      </main>
    </div>
  )
}

export function CareerButton({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}) {
  const variantClass =
    variant === 'secondary'
      ? 'cg-btn--secondary'
      : variant === 'ghost'
        ? 'cg-btn--ghost'
        : variant === 'danger'
          ? 'cg-btn--danger'
          : 'cg-btn--primary'

  return (
    <button type={type} className={`cg-btn ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
