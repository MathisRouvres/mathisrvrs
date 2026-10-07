import { useId, useState } from 'react'
import { MAX_NAME_LENGTH } from '../engine'
import { btnPrimary } from '../components/buttons'
import { cleanName, isRoomCode, normalizeRoomCode } from './doc'
import { readLastName } from './hooks'

const field =
  'min-h-12 w-full min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40'

const tab = (active) =>
  `min-h-11 flex-1 rounded-xl text-sm font-semibold transition ${
    active ? 'bg-[var(--accent)] text-white shadow dark:text-[#070b14]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
  }`

/**
 * Accueil : créer une partie à plusieurs téléphones ou en rejoindre une avec
 * son code (prérempli quand on arrive par le lien ou le QR code).
 */
export default function RoomJoin({ session, initialCode = '' }) {
  const id = useId()
  const [mode, setMode] = useState(initialCode ? 'join' : 'create')
  const [name, setName] = useState(readLastName)
  const [code, setCode] = useState(() => normalizeRoomCode(initialCode))
  const clean = cleanName(name)
  const ready = clean.length > 0 && (mode === 'create' || isRoomCode(code))

  function submit(event) {
    event.preventDefault()
    if (!ready) return
    if (mode === 'create') session.create(clean)
    else session.join(code, clean)
  }

  return (
    <section aria-labelledby={`${id}-title`} className="glass-card flex flex-col gap-4 rounded-3xl p-5">
      <div>
        <h2 id={`${id}-title`} className="font-display text-lg font-bold">
          <span aria-hidden="true">📱 </span>Chacun son téléphone
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Même carte sur tous les écrans, rôles secrets et votes sur le sien. Tout le monde peut faire avancer la partie.
        </p>
      </div>

      <div role="tablist" aria-label="Partie à plusieurs" className="flex gap-1 rounded-2xl border border-[var(--border-color)] p-1">
        <button type="button" role="tab" aria-selected={mode === 'create'} className={tab(mode === 'create')} onClick={() => setMode('create')}>
          Créer une partie
        </button>
        <button type="button" role="tab" aria-selected={mode === 'join'} className={tab(mode === 'join')} onClick={() => setMode('join')}>
          Rejoindre
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === 'join' && (
          <div>
            <label htmlFor={`${id}-code`} className="text-sm font-semibold text-[var(--text-secondary)]">
              Code de la partie
            </label>
            <input
              id={`${id}-code`}
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="ABCD"
              className={`${field} mt-1 text-center font-display text-2xl font-bold uppercase tracking-[0.4em]`}
            />
          </div>
        )}
        <div>
          <label htmlFor={`${id}-name`} className="text-sm font-semibold text-[var(--text-secondary)]">
            Ton prénom
          </label>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="given-name"
            enterKeyHint="go"
            placeholder="Prénom"
            className={`${field} mt-1`}
          />
        </div>
        <button type="submit" className={`${btnPrimary} w-full`} disabled={!ready}>
          {mode === 'create' ? 'Créer la partie' : 'Rejoindre la partie'}
        </button>
      </form>
    </section>
  )
}
