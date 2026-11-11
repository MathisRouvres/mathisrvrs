import { SLOT_MINUTES, slotLabel } from './slots'
import { GROUP_SIZE } from './WeekGrid'
import { Avatar, card } from './ui'

const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })

function endLabel(startIndex, length) {
  const total = startIndex + length
  return total * SLOT_MINUTES >= 24 * 60 ? '24:00' : slotLabel(total)
}

/** Meilleures plages communes de la semaine (≥ 2 personnes), groupe le plus grand d'abord. */
export default function BestSlots({ runs, meId, peopleById }) {
  return (
    <section className={card} aria-labelledby="dispo-best">
      <h2 id="dispo-best" className="font-display text-base font-bold">
        Créneaux communs
      </h2>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        Cette semaine, au moins deux personnes dispo ensemble. Bordure orange : {GROUP_SIZE} ou plus.
      </p>

      {runs.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Aucun créneau commun pour l’instant. Coche tes dispos et partage le lien.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {runs.slice(0, 8).map((run) => (
            <li
              key={`${run.day.toISOString()}-${run.startIndex}`}
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-3 ${
                run.people.length >= GROUP_SIZE
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold first-letter:uppercase">{dayFormat.format(run.day)}</p>
                <p className="text-xs tabular-nums text-[var(--text-secondary)]">
                  {slotLabel(run.startIndex)} – {endLabel(run.startIndex, run.length)}
                </p>
              </div>
              <ul className="flex items-center" aria-label={`${run.people.length} personnes`}>
                {run.people.map((id) => {
                  const person = peopleById.get(id)
                  if (!person) return null
                  return (
                    <li key={id} className="-ml-2 first:ml-0" title={id === meId ? `${person.name} (toi)` : person.name}>
                      <Avatar person={person} size={32} className="ring-2 ring-[var(--bg-elevated)]" />
                      <span className="sr-only">{person.name}</span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
