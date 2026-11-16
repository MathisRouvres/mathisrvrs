/** Éléments partagés par les écrans de maison.mathis-rvrs.fr (mêmes tokens que /dispo). */
import { useEffect, useId, useRef } from 'react'
import { focusRing } from '../dispo/ui'

export const dangerButton = `inline-flex min-h-11 items-center justify-center rounded-xl border border-red-300 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10 ${focusRing}`
export const input = `w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2.5 text-base ${focusRing}`
export const label = 'text-sm font-medium'

export const NEUTRAL_COLOR = '#94a3b8'

/** Première lettre du prénom (lettre accentuée ou emoji compris). */
function initial(name) {
  return ([...name.trim()][0] ?? '?').toUpperCase()
}

/** Photo (cerclée de la couleur de la personne) ou initiale sur sa couleur. Décorative : le nom est donné à côté. */
export function PersonAvatar({ person, size = 32, className = '' }) {
  const style = { width: size, height: size }
  if (person.avatar) {
    return (
      <img
        src={person.avatar}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ ...style, boxShadow: `0 0 0 2px ${person.color}` }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ ...style, background: person.color, fontSize: Math.max(9, Math.round(size * 0.46)) }}
    >
      {initial(person.name)}
    </span>
  )
}

/** Avatars superposés (3 au plus, puis « +n »). */
export function AvatarStack({ people, size = 22 }) {
  if (people.length === 0) return null
  const shown = people.slice(0, 3)
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {shown.map((person) => (
        <PersonAvatar key={person.id} person={person} size={size} className="ring-2 ring-[var(--bg-elevated)]" />
      ))}
      {people.length > 3 && (
        <span className="pl-2.5 text-xs font-medium text-[var(--text-muted)]">+{people.length - 3}</span>
      )}
    </span>
  )
}

/**
 * Fenêtre modale native (<dialog>) : Échap ou « Fermer » appellent `onClose` (sauf `busy`).
 * Le focus revient où il était à la fermeture (comportement natif de showModal/close).
 * À l'ouverture, il va au champ marqué `data-autofocus` (showModal reprend le focus donné avant).
 */
export function Modal({ title, onClose, busy = false, children, wide = false }) {
  const id = useId()
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    dialog?.querySelector('[data-autofocus]')?.focus()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] ${wide ? 'w-[min(100%-1.5rem,40rem)]' : 'w-[min(100%-1.5rem,32rem)]'} overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/60`}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={`${id}-title`} className="font-display text-lg font-bold sm:text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer"
            className={`-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)] disabled:opacity-50 ${focusRing}`}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

/** Message d'erreur sous un formulaire (annoncé aux lecteurs d'écran). */
export function FormError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="text-sm text-red-600 dark:text-red-400">
      {children}
    </p>
  )
}
