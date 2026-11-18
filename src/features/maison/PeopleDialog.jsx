import { useEffect, useId, useRef, useState } from 'react'
import PhotoInput from '../dispo/PhotoInput'
import { MaisonError, deletePerson, savePerson } from './api'
import { PERSON_COLORS } from './catalog'
import { focusRing, primaryButton, secondaryButton } from '../dispo/ui'
import { FormError, Modal, PersonAvatar, dangerButton, input, label } from './ui'

/**
 * Gestion des personnes du foyer : liste, ajout, modification (prénom, couleur, photo, « C'est moi »),
 * suppression. `account` est le compte connecté, `meId` la personne qui lui est liée.
 */
export default function PeopleDialog({ people, account, meId, onClaim, onClose, onSaved, onDeleted }) {
  // null = liste ; 'new' = ajout ; sinon la personne modifiée.
  const [editing, setEditing] = useState(people.length === 0 ? 'new' : null)
  const [busy, setBusy] = useState(false)

  const usedColors = new Set(people.map((p) => p.color))
  const freeColor = (
    PERSON_COLORS.find((c) => !usedColors.has(c.value)) ?? PERSON_COLORS[people.length % PERSON_COLORS.length]
  ).value

  return (
    <Modal title={editing === 'new' ? 'Nouvelle personne' : editing ? `Modifier ${editing.name}` : 'Personnes du foyer'} onClose={onClose} busy={busy}>
      {editing ? (
        <PersonForm
          person={editing === 'new' ? { name: '', color: freeColor, avatar: null } : editing}
          canDelete={editing !== 'new'}
          account={account}
          isMe={editing !== 'new' && editing.id === meId}
          takenBy={editing !== 'new' && editing.account && editing.account !== account ? editing.account : null}
          onClaim={onClaim}
          busy={busy}
          setBusy={setBusy}
          onCancel={() => (people.length === 0 ? onClose() : setEditing(null))}
          onSaved={(person) => {
            onSaved(person)
            setEditing(null)
          }}
          onDeleted={(id) => {
            onDeleted(id)
            setEditing(null)
          }}
        />
      ) : (
        <>
          <ul className="space-y-2">
            {people.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => setEditing(person)}
                  className={`flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] px-3 py-2.5 text-left transition hover:border-[var(--accent)] ${focusRing}`}
                >
                  <PersonAvatar person={person} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{person.name}</span>
                    {person.id === meId ? (
                      <span className="block text-xs text-[var(--accent)]">C’est toi (compte « {account} »)</span>
                    ) : (
                      person.account && <span className="block text-xs text-[var(--text-muted)]">Compte « {person.account} »</span>
                    )}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">Modifier</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setEditing('new')} className={`${primaryButton} mt-5 w-full`}>
            + Ajouter une personne
          </button>
        </>
      )}
    </Modal>
  )
}

function PersonForm({ person, canDelete, account, isMe, takenBy, onClaim, busy, setBusy, onCancel, onSaved, onDeleted }) {
  const id = useId()
  const [name, setName] = useState(person.name)
  const [me, setMeChecked] = useState(isMe)
  const [color, setColor] = useState(person.color)
  const [avatar, setAvatar] = useState(person.avatar)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const nameRef = useRef(null)
  const trimmed = name.trim().replace(/\s+/g, ' ')

  // Formulaire ouvert depuis la liste (fenêtre déjà affichée) : focus sur le prénom.
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (!trimmed) {
      setError('Indique un prénom.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const saved = await savePerson({ ...(person.id ? { id: person.id } : {}), name: trimmed, color, avatar })
      onSaved(saved)
      if (me !== isMe) await onClaim(me ? saved.id : null)
    } catch (err) {
      setError(err instanceof MaisonError ? err.message : 'Enregistrement impossible, réessaie.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await deletePerson(person.id)
      onDeleted(person.id)
    } catch (err) {
      setError(err instanceof MaisonError ? err.message : 'Suppression impossible, réessaie.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="flex items-center gap-4">
        <PersonAvatar person={{ name: trimmed || '?', color, avatar }} size={72} />
        <div className="flex flex-col items-start gap-1">
          <PhotoInput onChange={setAvatar} disabled={busy} className={`${secondaryButton} min-h-10`}>
            {avatar ? 'Changer la photo' : 'Ajouter une photo'}
          </PhotoInput>
          {avatar && (
            <button
              type="button"
              onClick={() => setAvatar(null)}
              disabled={busy}
              className={`rounded text-xs text-[var(--text-muted)] underline ${focusRing}`}
            >
              Retirer la photo
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-name`} className={label}>
          Prénom
        </label>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          ref={nameRef}
          autoComplete="off"
          data-autofocus
          aria-invalid={Boolean(error) && !trimmed}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${input} mt-1.5`}
        />
      </div>

      <fieldset>
        <legend className={label}>Couleur</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {PERSON_COLORS.map((swatch) => (
            <label key={swatch.value} className="relative cursor-pointer">
              <input
                type="radio"
                name={`${id}-color`}
                value={swatch.value}
                checked={color === swatch.value}
                onChange={() => setColor(swatch.value)}
                className="peer sr-only"
              />
              <span className="sr-only">{swatch.name}</span>
              <span
                aria-hidden="true"
                className="block h-9 w-9 rounded-full ring-offset-2 ring-offset-[var(--bg-elevated)] transition peer-checked:ring-2 peer-checked:ring-[var(--text-primary)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--accent)]"
                style={{ background: swatch.value }}
              />
            </label>
          ))}
          <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-color)] px-3 text-sm">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className={`h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0 ${focusRing}`}
            />
            Autre couleur
          </label>
        </div>
      </fieldset>

      {account && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={me}
            onChange={(event) => setMeChecked(event.target.checked)}
            className={`mt-0.5 h-4 w-4 accent-[var(--accent)] ${focusRing}`}
          />
          <span>
            C’est moi <span className="text-[var(--text-muted)]">(compte « {account} »)</span>
            <span className="block text-[var(--text-muted)]">
              {takenBy
                ? `Actuellement lié au compte « ${takenBy} » : cocher le reprend.`
                : 'Le calendrier s’ouvre sur tes tâches et tes coches sont à ton nom.'}
            </span>
          </span>
        </label>
      )}

      <FormError id={`${id}-error`}>{error}</FormError>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={secondaryButton}>
          Annuler
        </button>
        {canDelete &&
          (confirmDelete ? (
            <button type="button" onClick={remove} disabled={busy} className={`${dangerButton} sm:ml-auto`}>
              Confirmer la suppression
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} className={`${dangerButton} sm:ml-auto`}>
              Supprimer
            </button>
          ))}
      </div>
      {confirmDelete && (
        <p className="text-sm text-[var(--text-secondary)]">
          {person.name} sera retiré·e de toutes ses tâches. Les tâches restent dans le calendrier.
        </p>
      )}
    </form>
  )
}
