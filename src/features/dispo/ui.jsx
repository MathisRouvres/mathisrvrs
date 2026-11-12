/** Classes et petits éléments partagés par les écrans de /dispo (mêmes tokens que /stats). */

export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
export const card =
  'min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-[var(--card-shadow)]'
export const primaryButton = `inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#070b14] ${focusRing}`
export const secondaryButton = `inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 text-sm font-medium transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`

const COLORS = ['#0ea5e9', '#8b5cf6', '#f97316', '#10b981', '#ec4899', '#eab308', '#6366f1', '#14b8a6']

function colorFor(name) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

/** Première lettre du prénom (lettre accentuée ou emoji compris). */
function initial(name) {
  return ([...name.trim()][0] ?? '?').toUpperCase()
}

/** Photo de profil, ou première lettre du prénom sur une couleur tirée du nom. Décorative : le nom est affiché à côté. */
export function Avatar({ person, size = 40, className = '' }) {
  const style = { width: size, height: size }
  if (person.avatar) {
    return (
      <img
        src={person.avatar}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={style}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ ...style, background: colorFor(person.name), fontSize: Math.max(9, Math.round(size * 0.5)) }}
    >
      {initial(person.name)}
    </span>
  )
}

export function Spinner({ label = 'Chargement…' }) {
  return (
    <p role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-[var(--text-secondary)]">
      <span className="inline-block h-5 w-5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
      {label}
    </p>
  )
}
