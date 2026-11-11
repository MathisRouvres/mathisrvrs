import { useState } from 'react'
import { DispoError, createPerson } from './api'
import PhotoInput from './PhotoInput'
import { Avatar, card, focusRing, primaryButton, secondaryButton } from './ui'

/** Écran d'arrivée : choisir son profil, ou en créer un (prénom + photo facultative). */
export default function ProfilePicker({ people, onPick }) {
  const [adding, setAdding] = useState(people.length === 0)

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Qui es-tu ?</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Choisis ton profil pour cocher tes disponibilités. Pas de mot de passe : tout le monde qui a le lien peut
        participer.
      </p>

      {people.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {people.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => onPick(person)}
                className={`flex w-full min-w-0 flex-col items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 shadow-[var(--card-shadow)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] ${focusRing}`}
              >
                <Avatar person={person} size={64} />
                <span className="w-full truncate text-center font-semibold">{person.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <NewPersonForm
          canCancel={people.length > 0}
          onCancel={() => setAdding(false)}
          onCreated={onPick}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${secondaryButton} mt-6 w-full sm:w-auto`}>
          + Je ne suis pas dans la liste
        </button>
      )}
    </main>
  )
}

function NewPersonForm({ canCancel, onCancel, onCreated }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const trimmed = name.trim().replace(/\s+/g, ' ')

  async function submit(event) {
    event.preventDefault()
    if (!trimmed) {
      setError('Indique ton prénom.')
      return
    }
    setBusy(true)
    setError('')
    try {
      onCreated(await createPerson(trimmed, avatar))
    } catch (err) {
      setError(err instanceof DispoError ? err.message : 'Profil non créé, réessaie.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${card} mt-8 space-y-5`} noValidate>
      <h2 className="font-display text-lg font-bold">Nouveau profil</h2>

      <div className="flex items-center gap-4">
        <Avatar person={{ name: trimmed || '?', avatar }} size={72} />
        <div className="flex flex-col gap-1">
          <PhotoInput onChange={setAvatar} disabled={busy} className={`${secondaryButton} min-h-10`}>
            {avatar ? 'Changer la photo' : 'Ajouter une photo'}
          </PhotoInput>
          {avatar && (
            <button
              type="button"
              onClick={() => setAvatar(null)}
              className={`self-start rounded text-xs text-[var(--text-muted)] underline ${focusRing}`}
            >
              Retirer
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="dispo-name" className="text-sm font-medium">
          Prénom
        </label>
        <input
          id="dispo-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          autoComplete="given-name"
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'dispo-name-error' : undefined}
          className={`mt-1.5 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2.5 text-base ${focusRing}`}
        />
        {error && (
          <p id="dispo-name-error" role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? 'Création…' : 'Créer mon profil'}
        </button>
        {canCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className={secondaryButton}>
            Annuler
          </button>
        )}
      </div>
    </form>
  )
}
