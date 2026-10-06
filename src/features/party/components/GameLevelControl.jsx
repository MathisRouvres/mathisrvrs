import { useId, useRef, useState } from 'react'
import { LEVEL_META } from '../usePartySettings'
import LevelPicker from './LevelPicker'

/**
 * Niveau sur la page d'un jeu : replié par défaut, pour qu'un tap égaré ne
 * relance pas la partie en cours. Le déplier prévient de la conséquence.
 */
export default function GameLevelControl({ level, adult, onChange, onConfirmAdult }) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef(null)
  const panelId = useId()
  const meta = LEVEL_META[level]

  function close() {
    setOpen(false)
    toggleRef.current?.focus()
  }

  return (
    <div className="glass-card rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">
          <span className="text-[var(--text-secondary)]">Niveau : </span>
          <span className="font-semibold">
            <span aria-hidden="true">{meta.emoji} </span>
            {meta.label}
          </span>
        </p>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="min-h-11 shrink-0 rounded-xl border border-[var(--border-color)] px-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
        >
          {open ? 'Fermer' : 'Changer'}
        </button>
      </div>

      {open && (
        <div id={panelId} className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Changer de niveau relance la partie : scores et manche en cours repartent de zéro.
          </p>
          <LevelPicker
            level={level}
            adult={adult}
            onChange={(next) => {
              close()
              onChange(next)
            }}
            onConfirmAdult={() => {
              close()
              onConfirmAdult()
            }}
          />
        </div>
      )}
    </div>
  )
}
