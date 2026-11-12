import { useId, useState } from 'react'
import { cropToAvatar, loadImageFile } from './avatar'
import PhotoCropper from './PhotoCropper'

/**
 * Bouton « choisir une photo » : l'image choisie s'ouvre dans la fenêtre de recadrage, puis le
 * cadre validé est réduit dans le navigateur et rendu en data URL à `onChange` (qui peut être
 * asynchrone : la fenêtre reste ouverte et affiche l'erreur s'il échoue).
 * `children` = contenu du bouton (aperçu, texte…).
 */
export default function PhotoInput({ onChange, disabled = false, className = '', children }) {
  const id = useId()
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      setPending(await loadImageFile(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image illisible.')
    }
  }

  function close() {
    if (pending) URL.revokeObjectURL(pending.url)
    setPending(null)
    setError('')
  }

  async function confirm(crop) {
    setBusy(true)
    setError('')
    try {
      await onChange(cropToAvatar(pending.image, crop))
      close()
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
        disabled={disabled || busy || Boolean(pending)}
        onChange={handleFile}
        aria-describedby={error && !pending ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-60 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] ${className}`}
      >
        {children}
      </label>
      {error && !pending && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {pending && (
        <PhotoCropper
          image={pending.image}
          url={pending.url}
          busy={busy}
          error={error}
          onCancel={close}
          onConfirm={confirm}
        />
      )}
    </div>
  )
}
