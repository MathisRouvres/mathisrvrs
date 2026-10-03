import { useId, useState } from 'react'
import { MAX_NAME_LENGTH, MAX_PLAYERS } from '../engine'
import { btnPrimary } from './buttons'

/** Saisie des prénoms des joueurs, partagée entre les jeux qui en ont besoin. */
export default function PlayersEditor({ players, onChange, min }) {
  const [name, setName] = useState('')
  const inputId = useId()
  const trimmed = name.trim()
  const full = players.length >= MAX_PLAYERS
  const missing = Math.max(0, min - players.length)

  function add(event) {
    event.preventDefault()
    if (!trimmed || full) return
    onChange([...players, trimmed])
    setName('')
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="glass-card rounded-3xl p-5">
      <h2 id={`${inputId}-title`} className="font-display text-lg font-bold">
        Joueurs <span className="text-sm font-medium text-[var(--text-muted)]">({players.length})</span>
      </h2>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <label htmlFor={inputId} className="sr-only">Prénom du joueur</label>
        <input
          id={inputId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder={full ? 'Maximum atteint' : 'Prénom'}
          disabled={full}
          autoComplete="off"
          enterKeyHint="done"
          className="min-h-12 min-w-0 flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
        />
        <button type="submit" className={btnPrimary} disabled={!trimmed || full}>
          Ajouter
        </button>
      </form>

      {players.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {players.map((player, i) => (
            <li
              key={`${player}-${i}`}
              className="flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] py-1 pl-3 pr-1 text-sm"
            >
              {player}
              <button
                type="button"
                onClick={() => onChange(players.filter((_, j) => j !== i))}
                aria-label={`Retirer ${player}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {missing > 0 && (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Ajoute encore {missing} joueur{missing > 1 ? 's' : ''} pour commencer.
        </p>
      )}
    </section>
  )
}
