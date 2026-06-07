import { useThemeContext } from '../hooks/useThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, isTransitioning } = useThemeContext()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Passer en mode professionnel (clair)' : 'Passer en mode personnel (sombre)'}
      aria-pressed={isDark}
      aria-busy={isTransitioning}
      className={`group relative flex h-11 items-center gap-3 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2 shadow-sm transition-[border-color,box-shadow,background-color] duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)] hover:border-[var(--accent)] hover:shadow-md ${className}`}
    >
      <span
        className={`absolute inset-0 rounded-full transition-opacity duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
          isDark ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle at 30% 50%, rgba(34,211,238,0.15), transparent 70%)',
        }}
        aria-hidden="true"
      />

      <span className="relative z-10 flex w-full items-center gap-2 px-1">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
            !isDark ? 'scale-110 bg-[var(--accent)] text-white' : 'scale-100 text-[var(--text-muted)]'
          }`}
          aria-hidden="true"
        >
          ☀️
        </span>

        <span
          className={`relative h-6 w-12 rounded-full transition-colors duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          }`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full shadow-md transition-[left,background,transform] duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
              isDark
                ? 'left-[calc(100%-1.375rem)] scale-100 bg-gradient-to-br from-neon-cyan to-neon-purple'
                : 'left-0.5 scale-100 bg-white'
            } ${isTransitioning ? 'scale-95' : 'scale-100'}`}
          />
        </span>

        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all duration-[720ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
            isDark
              ? 'scale-110 bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30'
              : 'scale-100 text-[var(--text-muted)]'
          }`}
          aria-hidden="true"
        >
          🌙
        </span>
      </span>

      <span className="sr-only">
        {isDark ? 'Mode personnel actif' : 'Mode professionnel actif'}
      </span>
    </button>
  )
}
