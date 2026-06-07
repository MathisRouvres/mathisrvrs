export default function Button({
  children,
  variant = 'primary',
  href,
  onClick,
  className = '',
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-offset-4 active:scale-[0.98]'

  const variants = {
    primary:
      'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25 hover:brightness-110 hover:shadow-xl hover:shadow-[var(--accent)]/30 dark:text-slate-900',
    secondary:
      'glass-card text-[var(--text-primary)] hover:border-[var(--accent)] hover:shadow-md',
    ghost:
      'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]',
    neon:
      'border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] dark:animate-neon-flicker',
  }

  const classes = `${base} ${variants[variant]} ${className}`

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} onClick={onClick} className={classes} {...props}>
      {children}
    </button>
  )
}
