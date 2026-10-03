import { useState } from 'react'
import { LEVELS } from '../engine'
import { LEVEL_META } from '../usePartySettings'
import { btnGhost, btnPrimary } from './buttons'

/**
 * Choix du niveau Soft / Épicé / Hot. Le niveau Hot demande une confirmation
 * d'âge, mémorisée ensuite avec les autres réglages.
 */
export default function LevelPicker({ level, adult, onChange, onConfirmAdult }) {
  const [askingAge, setAskingAge] = useState(false)

  function select(next) {
    if (next === 'hot' && !adult) {
      setAskingAge(true)
      return
    }
    setAskingAge(false)
    onChange(next)
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Niveau des questions" className="grid grid-cols-3 gap-2">
        {LEVELS.map((id) => {
          const meta = LEVEL_META[id]
          const active = level === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${meta.label} (${meta.hint})`}
              onClick={() => select(id)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border px-2 py-2 transition ${
                active
                  ? 'border-transparent bg-[var(--accent)] text-white dark:text-[#070b14]'
                  : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]'
              }`}
            >
              <span className="text-sm font-semibold">
                <span aria-hidden="true">{meta.emoji} </span>
                {meta.label}
              </span>
              <span className={`text-[11px] ${active ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>{meta.hint}</span>
            </button>
          )
        })}
      </div>

      {askingAge && (
        <div
          role="alertdialog"
          aria-labelledby="party-age-title"
          aria-describedby="party-age-desc"
          className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4"
        >
          <p id="party-age-title" className="font-semibold">Niveau Hot réservé aux adultes</p>
          <p id="party-age-desc" className="mt-1 text-sm text-[var(--text-secondary)]">
            Questions et défis à caractère sexuel. En continuant, tu confirmes que tous les joueurs ont
            18 ans ou plus et sont d’accord pour ce niveau.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                setAskingAge(false)
                onConfirmAdult()
              }}
            >
              Nous avons 18 ans ou plus
            </button>
            <button type="button" className={btnGhost} onClick={() => setAskingAge(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
