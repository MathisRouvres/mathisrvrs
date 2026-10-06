import { TEAMS } from './teams'

/** Scores des deux équipes, l'équipe qui joue mise en avant. */
export default function Scoreboard({ scores, active }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TEAMS.map((name, i) => (
        <div
          key={name}
          aria-current={i === active ? 'true' : undefined}
          className={`rounded-2xl border p-3 text-center transition ${
            i === active ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)] bg-[var(--bg-elevated)]'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{name}</p>
          <p className="font-display text-3xl font-bold">{scores[i]}</p>
        </div>
      ))}
    </div>
  )
}
