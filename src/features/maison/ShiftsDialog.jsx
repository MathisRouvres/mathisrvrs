import { useEffect, useId, useMemo, useState } from 'react'
import { MaisonError, loadState, saveShifts } from './api'
import { addDays, dayNumber, daysBetween, formatDay, startOfWeek } from './recurrence'
import { formatTime, ofName, parsePlanning } from './schedule'
import { focusRing, primaryButton, secondaryButton } from '../dispo/ui'
import { FormError, Modal, PersonAvatar, input, label } from './ui'

/** Créneaux par jour au plus (journée coupée en deux, plus une garde). */
const MAX_RANGES = 3
/** Plus longue période enregistrée en un appel (même limite que maison-api.php : 63 jours). */
const MAX_CHUNK_DAYS = 63
const REPEAT_OPTIONS = [1, 2, 4, 8]

const EXAMPLE = `# Une ligne par jour : date, puis horaires (ou « repos »)
lun 16/11 8h-16h30
mar 17/11 8h-12h 14h-18h
mer 18/11 repos
jeu 19/11 21h-6h`

/**
 * Horaires de travail d'une personne : saisie semaine par semaine (avec répétition sur plusieurs
 * semaines), ou import d'un planning collé en texte (par exemple lu par Claude sur une photo).
 */
export default function ShiftsDialog({ people, defaultPersonId, today, onClose, onSaved }) {
  const id = useId()
  const [tab, setTab] = useState('week')
  const [personId, setPersonId] = useState(defaultPersonId ?? people[0]?.id)
  const person = people.find((p) => p.id === personId)
  const [busy, setBusy] = useState(false)

  return (
    <Modal title="Horaires de travail" onClose={onClose} busy={busy} wide>
      <div className="space-y-5">
        <fieldset>
          <legend className={label}>Personne</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === personId}
                onClick={() => setPersonId(p.id)}
                disabled={busy}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-medium transition ${focusRing} ${
                  p.id === personId ? '' : 'border-[var(--border-color)] opacity-70 hover:opacity-100'
                }`}
                style={p.id === personId ? { borderColor: p.color, background: `${p.color}1f` } : undefined}
              >
                <PersonAvatar person={p} size={28} />
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>

        <div role="tablist" aria-label="Façon de saisir" className="inline-flex rounded-xl bg-[var(--bg-primary)] p-1">
          {[
            ['week', 'Semaine par semaine'],
            ['import', 'Importer un planning'],
          ].map(([value, text]) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`${id}-tab-${value}`}
              aria-selected={tab === value}
              aria-controls={`${id}-panel`}
              onClick={() => setTab(value)}
              className={`min-h-9 rounded-lg px-3 text-sm font-medium transition ${focusRing} ${
                tab === value ? 'bg-[var(--bg-elevated)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`}>
          {person &&
            (tab === 'week' ? (
              <WeekForm key={person.id} person={person} today={today} busy={busy} setBusy={setBusy} onSaved={onSaved} />
            ) : (
              <ImportForm key={person.id} person={person} today={today} busy={busy} setBusy={setBusy} onSaved={onSaved} />
            ))}
        </div>
      </div>
    </Modal>
  )
}

/** Horaires de la personne entre `from` et `to`, regroupés par jour (créneaux en minutes « HH:MM »). */
async function fetchWeek(personId, from, to, signal) {
  const state = await loadState(from, to, signal)
  const rows = new Map(daysBetween(from, to).map((day) => [day, []]))
  for (const shift of state.shifts) {
    if (shift.personId === personId && rows.has(shift.day)) rows.get(shift.day).push({ start: shift.start, end: shift.end })
  }
  return rows
}

function WeekForm({ person, today, busy, setBusy, onSaved }) {
  const id = useId()
  const [week, setWeek] = useState(() => startOfWeek(today))
  const key = `${person.id}|${week}`
  const [loaded, setLoaded] = useState({ key: '', rows: null, error: '' })
  const [edits, setEdits] = useState({ key: '', rows: null })
  const [repeat, setRepeat] = useState(1)
  const [error, setError] = useState('')
  const end = addDays(week, 6)

  useEffect(() => {
    const controller = new AbortController()
    fetchWeek(person.id, week, addDays(week, 6), controller.signal)
      .then((rows) => setLoaded({ key, rows, error: '' }))
      .catch((err) => {
        if (!controller.signal.aborted) setLoaded({ key, rows: null, error: err instanceof MaisonError ? err.message : 'Chargement impossible.' })
      })
    return () => controller.abort()
  }, [person.id, week, key])

  const ready = loaded.key === key
  const rows = edits.key === key ? edits.rows : ready ? loaded.rows : null
  const update = (day, list) => setEdits({ key, rows: new Map(rows).set(day, list) })

  async function copyPrevious() {
    setError('')
    try {
      const previous = await fetchWeek(person.id, addDays(week, -7), addDays(week, -1))
      setEdits({ key, rows: new Map([...previous].map(([day, list]) => [addDays(day, 7), list])) })
    } catch (err) {
      setError(err instanceof MaisonError ? err.message : 'Chargement impossible.')
    }
  }

  async function save() {
    const list = []
    for (const [day, ranges] of rows) {
      for (const r of ranges) {
        if (!r.start || !r.end) return setError(`Complète les heures du ${formatDay(day, { weekday: 'long', day: 'numeric' })}.`)
        if (r.start === r.end) return setError(`Début et fin identiques le ${formatDay(day, { weekday: 'long', day: 'numeric' })}.`)
        list.push({ day, start: r.start, end: r.end })
      }
    }
    // Même semaine répétée sur les semaines suivantes.
    const all = []
    for (let k = 0; k < repeat; k++) for (const s of list) all.push({ ...s, day: addDays(s.day, 7 * k) })
    setBusy(true)
    setError('')
    try {
      await saveShifts(person.id, week, addDays(week, 7 * repeat - 1), all)
      onSaved(`Horaires ${ofName(person.name)} enregistrés${repeat > 1 ? ` pour ${repeat} semaines` : ''}.`)
      // Ce qui est affiché est maintenant enregistré.
      setLoaded({ key, rows, error: '' })
      setEdits({ key: '', rows: null })
    } catch (err) {
      setError(err instanceof MaisonError ? err.message : 'Enregistrement impossible, réessaie.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setWeek((w) => addDays(w, -7))}
          disabled={busy}
          aria-label="Semaine précédente"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] text-xl ${focusRing}`}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          onClick={() => setWeek((w) => addDays(w, 7))}
          disabled={busy}
          aria-label="Semaine suivante"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] text-xl ${focusRing}`}
        >
          <span aria-hidden="true">›</span>
        </button>
        <h3 className="font-semibold" aria-live="polite">
          Semaine du {formatDay(week, { day: 'numeric', month: 'short' })} au {formatDay(end, { day: 'numeric', month: 'short', year: 'numeric' })}
        </h3>
        <button type="button" onClick={copyPrevious} disabled={busy || !rows} className={`${secondaryButton} min-h-9 px-3 sm:ml-auto`}>
          Copier la semaine précédente
        </button>
      </div>

      {!rows ? (
        loaded.key === key && loaded.error ? (
          <FormError>{loaded.error}</FormError>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Chargement…</p>
        )
      ) : (
        <ul className="divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)]">
          {[...rows].map(([day, ranges]) => {
            const dayLabel = formatDay(day, { weekday: 'long', day: 'numeric' })
            return (
              <li key={day} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="w-24 shrink-0 text-sm font-medium capitalize">{formatDay(day, { weekday: 'short', day: 'numeric' })}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {ranges.length === 0 && <span className="text-sm text-[var(--text-muted)]">Repos</span>}
                  {ranges.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <input
                        type="time"
                        step={300}
                        value={r.start}
                        aria-label={`${dayLabel}, créneau ${i + 1} : début`}
                        onChange={(event) => update(day, ranges.map((x, j) => (j === i ? { ...x, start: event.target.value } : x)))}
                        className={`${input} w-[7.5rem] py-1.5`}
                      />
                      <span aria-hidden="true">–</span>
                      <input
                        type="time"
                        step={300}
                        value={r.end}
                        aria-label={`${dayLabel}, créneau ${i + 1} : fin`}
                        onChange={(event) => update(day, ranges.map((x, j) => (j === i ? { ...x, end: event.target.value } : x)))}
                        className={`${input} w-[7.5rem] py-1.5`}
                      />
                      <button
                        type="button"
                        onClick={() => update(day, ranges.filter((_, j) => j !== i))}
                        aria-label={`${dayLabel} : retirer le créneau ${i + 1}`}
                        className={`inline-flex h-9 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] ${focusRing}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {ranges.length < MAX_RANGES && (
                  <button
                    type="button"
                    onClick={() => update(day, [...ranges, ranges.length === 0 ? { start: '09:00', end: '17:00' } : { start: '', end: '' }])}
                    aria-label={`${dayLabel} : ajouter un créneau`}
                    className={`min-h-9 rounded-lg px-2 text-sm font-medium text-[var(--accent)] ${focusRing}`}
                  >
                    + créneau
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={`${id}-repeat`}>Appliquer à</label>
        <select
          id={`${id}-repeat`}
          value={repeat}
          onChange={(event) => setRepeat(Number(event.target.value))}
          className={`${input} w-auto py-1.5`}
        >
          {REPEAT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? 'cette semaine' : `cette semaine et les ${n - 1} suivantes`}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-[var(--text-muted)]">Fin avant le début (ex. 21h – 6h) : horaire de nuit, jusqu’au lendemain.</p>

      <FormError>{error}</FormError>
      <button type="button" onClick={save} disabled={busy || !rows} className={primaryButton}>
        {busy ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}

/** Jours consécutifs regroupés (un appel à l'API par série, 63 jours au plus) : les jours absents ne changent pas. */
function runsOf(days) {
  const runs = []
  for (const day of days) {
    const last = runs[runs.length - 1]
    if (last && dayNumber(day) === dayNumber(last.to) + 1 && dayNumber(day) - dayNumber(last.from) < MAX_CHUNK_DAYS) last.to = day
    else runs.push({ from: day, to: day })
  }
  return runs
}

function ImportForm({ person, today, busy, setBusy, onSaved }) {
  const id = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const parsed = useMemo(() => parsePlanning(text, today), [text, today])
  const days = [...parsed.days]

  async function save() {
    setBusy(true)
    setError('')
    try {
      for (const run of runsOf(days.map(([day]) => day))) {
        const shifts = days
          .filter(([day]) => day >= run.from && day <= run.to)
          .flatMap(([day, list]) => list.map((s) => ({ day, ...s })))
        await saveShifts(person.id, run.from, run.to, shifts)
      }
      onSaved(`Planning ${ofName(person.name)} importé : ${days.length} jour${days.length > 1 ? 's' : ''}.`)
      setText('')
    } catch (err) {
      setError(err instanceof MaisonError ? err.message : 'Import impossible, réessaie.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-secondary)]">
        <p>
          Colle le planning {ofName(person.name)}, une ligne par jour : la date, puis les horaires ou « repos ». Les jours absents
          du texte ne changent pas.
        </p>
        <p className="mt-2">
          📷 <strong>Photo du planning ?</strong> Dans Claude Code, envoie l’image et demande « lis le planning {ofName(person.name)} » :
          Claude te donne ce texte, prêt à coller ici.
        </p>
      </div>

      <div>
        <label htmlFor={`${id}-text`} className={label}>
          Planning
        </label>
        <textarea
          id={`${id}-text`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          placeholder={EXAMPLE}
          spellCheck={false}
          className={`${input} mt-1.5 resize-y font-mono text-sm`}
        />
      </div>

      {parsed.errors.length > 0 && (
        <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200" aria-live="polite">
          {parsed.errors.map((message) => (
            <li key={message}>⚠️ {message}</li>
          ))}
        </ul>
      )}

      {days.length > 0 && (
        <section aria-label="Aperçu">
          <h3 className="text-sm font-semibold">
            Aperçu : {days.length} jour{days.length > 1 ? 's' : ''}
          </h3>
          <ul className="mt-2 grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-[var(--border-color)] p-2 text-sm sm:grid-cols-2">
            {days.map(([day, list]) => (
              <li key={day} className="flex gap-2">
                <span className="w-28 shrink-0 capitalize text-[var(--text-secondary)]">
                  {formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span>{list.length === 0 ? 'Repos' : list.map((s) => `${formatTime(s.start)}–${formatTime(s.end)}`).join(', ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FormError>{error}</FormError>
      <button type="button" onClick={save} disabled={busy || days.length === 0} className={primaryButton}>
        {busy ? 'Import…' : `Enregistrer ${days.length > 0 ? `${days.length} jour${days.length > 1 ? 's' : ''}` : 'le planning'}`}
      </button>
    </div>
  )
}
