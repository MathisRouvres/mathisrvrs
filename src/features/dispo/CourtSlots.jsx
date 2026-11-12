import { GROUP_SIZE } from './WeekGrid'
import { Avatar, card, focusRing } from './ui'

const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const priceFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const MAX_SHOWN = 10

/**
 * Terrains de padel libres (clubs autour de La Rochelle) où au moins deux personnes sont dispo
 * sur toute la durée. `clubs` = null tant que la première lecture n'est pas arrivée.
 */
export default function CourtSlots({ clubs, matches, error, meId, peopleById }) {
  const missing = clubs?.filter((club) => club.status !== 'ok') ?? []

  return (
    <section className={card} aria-labelledby="dispo-courts" aria-busy={!clubs && !error}>
      <h2 id="dispo-courts" className="font-display text-base font-bold">
        🎾 Terrains libres
      </h2>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        Padel près de La Rochelle, quand au moins deux d’entre vous sont dispo sur tout le créneau.
      </p>

      {error && !clubs ? (
        <p role="alert" className="mt-4 text-sm text-[var(--text-secondary)]">
          Créneaux des clubs indisponibles pour l’instant.
        </p>
      ) : !clubs ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Recherche des terrains…</p>
      ) : matches.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Aucun terrain libre sur vos créneaux communs cette semaine. Les clubs ouvrent souvent les réservations
          quelques jours avant.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {matches.slice(0, MAX_SHOWN).map((match) => (
            <li
              key={`${match.club.id}-${match.slot.start}-${match.slot.duration}`}
              className={`rounded-xl border p-3 ${
                match.people.length >= GROUP_SIZE
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
              }`}
            >
              <p className="text-sm font-semibold first-letter:uppercase">{dayFormat.format(match.start)}</p>
              <p className="text-xs tabular-nums text-[var(--text-secondary)]">
                {timeFormat.format(match.start)} – {timeFormat.format(match.end)} · {match.club.name}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {match.slot.courts > 1 ? `${match.slot.courts} terrains` : '1 terrain'}
                {match.slot.price != null && ` · ${priceFormat.format(match.slot.price / 100)}`}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <ul className="flex items-center" aria-label={`${match.people.length} personnes dispo`}>
                  {match.people.map((id) => {
                    const person = peopleById.get(id)
                    if (!person) return null
                    return (
                      <li key={id} className="-ml-2 first:ml-0" title={id === meId ? `${person.name} (toi)` : person.name}>
                        <Avatar person={person} size={28} className="ring-2 ring-[var(--bg-elevated)]" />
                        <span className="sr-only">{person.name}</span>
                      </li>
                    )
                  })}
                </ul>
                <a
                  href={match.slot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-9 shrink-0 items-center rounded-lg px-2 text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline ${focusRing}`}
                >
                  Réserver ↗<span className="sr-only"> sur le site de {match.club.name} (nouvel onglet)</span>
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {missing.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
          {missing.map((club) => (
            <li key={club.id}>
              {club.name} : {club.status === 'unavailable' ? 'site injoignable pour l’instant' : 'pas encore connecté'}{' '}
              ·{' '}
              <a
                href={club.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded underline underline-offset-2 hover:text-[var(--accent)] ${focusRing}`}
              >
                voir le planning<span className="sr-only"> (nouvel onglet)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
