import { useId } from 'react'
import { useRoomPlayer } from '../room/hooks'
import { tally, validVotes } from '../room/votes'
import { useSessionVotes } from '../useSessionState'

/**
 * Vote sur chaque téléphone d'une partie partagée. Chacun choisit une option
 * (un second appui l'annule). Les résultats s'affichent quand tous les
 * téléphones ont voté, dès son propre vote (`reveal="mine"`) ou quand le jeu le
 * décide (`revealed`). `showVoters` affiche qui a voté quoi, `average` la
 * moyenne (options numériques), `locked` fige les votes (résultat révélé).
 */
export default function RoomVote({
  field,
  title,
  options,
  players,
  reveal = 'all',
  revealed = false,
  showVoters = false,
  average = false,
  locked = false,
}) {
  const id = useId()
  const { myName, phones } = useRoomPlayer()
  const [votes, cast] = useSessionVotes(field, myName)
  const values = options.map((o) => o.value)
  const voters = players.filter((p) => phones.has(p))
  const count = validVotes(votes, voters, values).size
  const mine = myName ? votes[myName] : undefined
  const canVote = Boolean(myName) && players.includes(myName)
  const done = voters.length > 0 && count === voters.length
  const show = revealed || done || (reveal === 'mine' && values.includes(mine))
  const results = show ? tally(votes, voters, values) : []
  const max = Math.max(1, ...results.map((r) => r.count))
  const labelOf = (value) => options.find((o) => o.value === value)?.label ?? String(value)
  const counted = results.filter((r) => r.count > 0)
  const total = counted.reduce((sum, r) => sum + r.count, 0)
  const mean = average && total > 0 ? counted.reduce((sum, r) => sum + r.option * r.count, 0) / total : null

  return (
    <section aria-labelledby={`${id}-title`} className="glass-card flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`${id}-title`} className="font-semibold">
          {title}
        </h3>
        <p aria-live="polite" className="shrink-0 text-xs text-[var(--text-muted)]">
          {count}/{voters.length} vote{count > 1 ? 's' : ''}
        </p>
      </div>

      {locked ? null : canVote ? (
        <div className={`grid gap-2 ${options.length > 4 ? 'grid-cols-6' : options.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {options.map((o) => {
            const selected = mine === o.value
            return (
              <button
                key={String(o.value)}
                type="button"
                aria-pressed={selected}
                onClick={() => cast(selected ? null : o.value)}
                className={`min-h-12 break-words rounded-2xl border px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#070b14]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--accent)]'
                }`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">Tu regardes : seuls les joueurs votent.</p>
      )}

      {mean !== null && (
        <p className="text-center font-display text-2xl font-bold">
          {mean.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
          <span className="text-base text-[var(--text-secondary)]"> /10 en moyenne</span>
        </p>
      )}
      {show ? (
        <ul className="flex flex-col gap-2" aria-label="Résultats">
          {(average ? counted : results).map((r) => (
            <li key={String(r.option)} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="min-w-0 break-words font-semibold">{labelOf(r.option)}</span>
                <span className="shrink-0 tabular-nums text-[var(--text-secondary)]">{r.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              {showVoters && r.voters.length > 0 && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">{r.voters.join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          {reveal === 'mine' ? 'Vote pour voir les résultats.' : 'Résultats quand tout le monde aura voté.'}
        </p>
      )}
    </section>
  )
}
