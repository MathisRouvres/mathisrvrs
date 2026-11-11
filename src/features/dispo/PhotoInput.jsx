import { useId, useState } from 'react'
import { imageFileToAvatar } from './avatar'

/**
 * Bouton « choisir une photo » : l'image est réduite dans le navigateur puis rendue
 * en data URL à `onChange`. `children` = contenu du bouton (aperçu, texte…).
 */
export default function PhotoInput({ onChange, disabled = false, className = '', children }) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await onChange(await imageFileToAvatar(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo non enregistrée.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-w-0">
      <input
        id={id}
        type="file"
        accept="image/*"
        className="peer sr-only"
        disabled={disabled || busy}
        onChange={handleFile}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        aria-busy={busy}
        className={`cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-60 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] ${className}`}
      >
        {busy ? 'Traitement…' : children}
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
