import { useId, useMemo, useState } from 'react'
import { MaisonError, deleteTask, saveTask } from './api'
import { CATEGORIES, SUGGESTIONS, categoryOf } from './catalog'
import {
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  addDays,
  assigneesAt,
  describeRepeat,
  formatDay,
  isoWeekday,
  occurrenceDates,
  todayKey,
} from './recurrence'
import { formatTime } from './schedule'
import { focusRing, primaryButton, secondaryButton } from '../dispo/ui'
import { FormError, Modal, PersonAvatar, dangerButton, input, label } from './ui'

/** Plus grand intervalle : 99 périodes, ou 365 jours « après la dernière fois ». */
const maxEvery = (repeat) => (repeat === 'after' ? 365 : 99)

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Une fois' },
  { value: 'daily', label: 'Jours' },
  { value: 'weekly', label: 'Semaines' },
  { value: 'monthly', label: 'Mois' },
  { value: 'yearly', label: 'Ans' },
]
const EVERY_UNIT = { daily: ['jour', 'jours'], weekly: ['semaine', 'semaines'], monthly: ['mois', 'mois'], yearly: ['an', 'ans'] }
/** Le bouton « Jours » couvre les deux façons de compter : calendrier (daily) ou après la dernière fois (after). */
const radioOf = (repeat) => (repeat === 'after' ? 'daily' : repeat)

function emptyForm(start, assignee, time) {
  return {
    title: '',
    category: 'menage',
    start,
    time: time ?? '',
    repeat: 'none',
    every: 1,
    weekdays: [],
    until: '',
    duration: '',
    assignees: assignee ? [assignee] : [],
    rotate: false,
    notes: '',
  }
}

function formOf(task) {
  return { ...task, time: task.time ?? '', until: task.until ?? '', duration: task.duration ?? '' }
}

/**
 * Création ou modification d'une tâche. `occurrence` (tâche ouverte depuis le calendrier) permet de
 * sauter ou de déplacer seulement cette date-là (jour et heure). Les modifications valent pour toute
 * la série. `busyWith` : prénoms des personnes chargées qui travaillent à ce moment-là.
 */
export default function TaskDialog({
  task,
  defaultStart,
  defaultTime,
  defaultAssignee,
  occurrence,
  today,
  people,
  busyWith = [],
  onClose,
  onSaved,
  onDeleted,
  onSkip,
  onMove,
}) {
  const id = useId()
  const [form, setForm] = useState(() => (task ? formOf(task) : emptyForm(defaultStart, defaultAssignee, defaultTime)))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [ideaCategory, setIdeaCategory] = useState('all')
  const [moveTo, setMoveTo] = useState(() => (occurrence ? addDays(occurrence.date < today ? today : occurrence.date, 1) : ''))
  const [moveTime, setMoveTime] = useState(() => occurrence?.time ?? '')
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const recurring = form.repeat !== 'none'
  const every = Math.min(maxEvery(form.repeat), Math.max(1, Number(form.every) || 1))
  const ruleForPreview = { ...form, every, until: form.until || null }

  // Prochaine personne du tour de rôle (à partir d'aujourd'hui).
  const nextTurn = useMemo(() => {
    // « Après la dernière fois » : dépend des coches, pas d'aperçu.
    if (!form.rotate || !recurring || form.repeat === 'after' || form.assignees.length < 2) return null
    const today = todayKey()
    const draft = { ...form, every, until: form.until || null, duration: null, id: '' }
    const next = occurrenceDates(draft, today, addDays(today, 400))[0]
    if (!next) return null
    const personId = assigneesAt(draft, next.index)[0]
    return { date: next.date, person: peopleById.get(personId) }
  }, [form, every, recurring, peopleById])

  function toggleAssignee(personId) {
    set({
      assignees: form.assignees.includes(personId)
        ? form.assignees.filter((p) => p !== personId)
        : [...form.assignees, personId],
    })
  }

  function toggleWeekday(day) {
    const current = form.weekdays.length > 0 ? form.weekdays : [isoWeekday(form.start)]
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    set({ weekdays: next.sort((a, b) => a - b) })
  }

  function applySuggestion(idea) {
    set({
      title: idea.title,
      category: idea.category,
      repeat: idea.repeat,
      every: idea.every,
      weekdays: idea.weekdays,
      duration: idea.duration ?? '',
    })
  }

  async function submit(event) {
    event.preventDefault()
    const title = form.title.trim().replace(/\s+/g, ' ')
    if (!title) return setError('Donne un nom à la tâche.')
    if (!form.start) return setError('Choisis une date.')
    if (recurring && form.until && form.until < form.start) return setError('La date de fin doit suivre la date de début.')
    const duration = form.duration === '' ? null : Math.round(Number(form.duration))
    if (duration !== null && !(duration >= 1 && duration <= 600)) return setError('Durée de 1 à 600 minutes.')

    setBusy(true)
    setError('')
    try {
      const saved = await saveTask({
        ...(task ? { id: task.id } : {}),
        title,
        notes: form.notes.trim(),
        category: form.category,
        start: form.start,
        time: form.time || null,
        repeat: form.repeat,
        every: recurring ? every : 1,
        weekdays: form.repeat === 'weekly' ? form.weekdays : [],
        until: recurring && form.until ? form.until : null,
        duration,
        assignees: form.assignees,
        rotate: recurring && form.assignees.length > 1 && form.rotate,
      })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof MaisonError ? err.message : 'Enregistrement impossible, réessaie.')
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await deleteTask(task.id)
      onDeleted(task.id)
    } catch (err) {
      setError(err instanceof MaisonError ? err.message : 'Suppression impossible, réessaie.')
      setBusy(false)
    }
  }

  const ideas = SUGGESTIONS.filter((idea) => ideaCategory === 'all' || idea.category === ideaCategory)
  const weekdaysShown = form.weekdays.length > 0 ? form.weekdays : [isoWeekday(form.start || todayKey())]

  return (
    <Modal title={task ? 'Modifier la tâche' : 'Nouvelle tâche'} onClose={onClose} busy={busy} wide>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {!task && (
          <details className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3" open={!form.title}>
            <summary className={`cursor-pointer rounded text-sm font-semibold ${focusRing}`}>💡 Idées de tâches</summary>
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrer les idées">
              {[{ id: 'all', label: 'Toutes', emoji: '' }, ...CATEGORIES.filter((c) => SUGGESTIONS.some((s) => s.category === c.id))].map(
                (c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={ideaCategory === c.id}
                    onClick={() => setIdeaCategory(c.id)}
                    className={`min-h-8 rounded-full border px-3 text-xs font-medium transition ${focusRing} ${
                      ideaCategory === c.id
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#070b14]'
                        : 'border-[var(--border-color)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {c.emoji} {c.label}
                  </button>
                ),
              )}
            </div>
            <ul className="mt-3 grid max-h-52 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {ideas.map((idea) => (
                <li key={idea.title}>
                  <button
                    type="button"
                    onClick={() => applySuggestion(idea)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-[var(--bg-elevated)] ${focusRing}`}
                  >
                    <span aria-hidden="true">{categoryOf(idea.category).emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{idea.title}</span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">
                        {describeRepeat({ ...idea, start: form.start || todayKey(), until: null })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div>
            <label htmlFor={`${id}-title`} className={label}>
              Tâche
            </label>
            <input
              id={`${id}-title`}
              value={form.title}
              onChange={(event) => set({ title: event.target.value })}
              maxLength={80}
              placeholder="Ex. Sortir les poubelles"
              autoComplete="off"
              data-autofocus
              className={`${input} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor={`${id}-category`} className={label}>
              Catégorie
            </label>
            <select
              id={`${id}-category`}
              value={form.category}
              onChange={(event) => set({ category: event.target.value })}
              className={`${input} mt-1.5`}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_9rem_1fr]">
          <div>
            <label htmlFor={`${id}-start`} className={label}>
              {recurring ? 'À partir du' : 'Date'}
            </label>
            <input
              id={`${id}-start`}
              type="date"
              value={form.start}
              onChange={(event) => set({ start: event.target.value })}
              required
              className={`${input} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor={`${id}-time`} className={label}>
              Heure <span className="font-normal text-[var(--text-muted)]">(facultatif)</span>
            </label>
            <div className="mt-1.5 flex items-center gap-1">
              <input
                id={`${id}-time`}
                type="time"
                step={300}
                value={form.time}
                onChange={(event) => set({ time: event.target.value })}
                className={`${input} min-w-0`}
              />
              {form.time && (
                <button
                  type="button"
                  onClick={() => set({ time: '' })}
                  aria-label="Retirer l’heure"
                  className={`inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] ${focusRing}`}
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor={`${id}-duration`} className={label}>
              Durée estimée <span className="font-normal text-[var(--text-muted)]">(minutes, facultatif)</span>
            </label>
            <input
              id={`${id}-duration`}
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={form.duration}
              onChange={(event) => set({ duration: event.target.value })}
              className={`${input} mt-1.5`}
            />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className={label}>Répéter</legend>
          <div className="flex flex-wrap items-center gap-2">
            {recurring && (
              <label className="inline-flex items-center gap-2 text-sm">
                Tous les
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxEvery(form.repeat)}
                  value={form.every}
                  onChange={(event) => set({ every: event.target.value })}
                  aria-label="Intervalle"
                  className={`${input} w-20 py-2`}
                />
              </label>
            )}
            <div role="radiogroup" aria-label="Rythme" className="inline-flex flex-wrap gap-1 rounded-xl bg-[var(--bg-primary)] p-1">
              {REPEAT_OPTIONS.map((option) => {
                const unit = EVERY_UNIT[option.value]
                const raw = unit ? unit[every > 1 ? 1 : 0] : option.label
                const text = raw[0].toUpperCase() + raw.slice(1)
                const checked = radioOf(form.repeat) === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => {
                      if (!checked) set({ repeat: option.value, every: Math.min(Number(form.every) || 1, maxEvery(option.value)) })
                    }}
                    className={`min-h-9 rounded-lg px-3 text-sm font-medium transition ${focusRing} ${
                      checked
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {text}
                  </button>
                )
              })}
            </div>
          </div>

          {(form.repeat === 'daily' || form.repeat === 'after') && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.repeat === 'after'}
                onChange={(event) =>
                  set({ repeat: event.target.checked ? 'after' : 'daily', every: event.target.checked ? every : Math.min(every, 99) })
                }
                className={`mt-0.5 h-4 w-4 accent-[var(--accent)] ${focusRing}`}
              />
              <span>
                Compter à partir du jour où c’est fait
                <span className="block text-[var(--text-muted)]">
                  Ex. draps : 14 jours après le dernier changement, même s’il a pris du retard.
                </span>
              </span>
            </label>
          )}

          {form.repeat === 'weekly' && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jours de la semaine">
              {WEEKDAY_SHORT.map((short, index) => {
                const day = index + 1
                const on = weekdaysShown.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    aria-label={WEEKDAY_LONG[index]}
                    onClick={() => toggleWeekday(day)}
                    disabled={on && weekdaysShown.length === 1}
                    className={`h-10 w-11 rounded-xl border text-sm font-semibold capitalize transition ${focusRing} ${
                      on
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white disabled:opacity-100 dark:text-[#070b14]'
                        : 'border-[var(--border-color)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {short}
                  </button>
                )
              })}
            </div>
          )}

          {recurring && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor={`${id}-until`}>Jusqu’au</label>
              <input
                id={`${id}-until`}
                type="date"
                value={form.until}
                min={form.start}
                onChange={(event) => set({ until: event.target.value })}
                className={`${input} w-auto py-2`}
              />
              {form.until ? (
                <button type="button" onClick={() => set({ until: '' })} className={`rounded text-xs underline ${focusRing}`}>
                  Sans fin
                </button>
              ) : (
                <span className="text-[var(--text-muted)]">(sans fin)</span>
              )}
            </div>
          )}

          <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
            {form.start ? `↻ ${describeRepeat(ruleForPreview)}` : ''}
          </p>
        </fieldset>

        <fieldset>
          <legend className={label}>Qui s’en charge ?</legend>
          {people.length === 0 ? (
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">Ajoute d’abord les personnes du foyer (bouton « Personnes »).</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {people.map((person) => {
                const position = form.assignees.indexOf(person.id)
                const on = position !== -1
                return (
                  <button
                    key={person.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleAssignee(person.id)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-medium transition ${focusRing} ${
                      on ? '' : 'border-[var(--border-color)] opacity-70 hover:opacity-100'
                    }`}
                    style={on ? { borderColor: person.color, background: `${person.color}1f` } : undefined}
                  >
                    <PersonAvatar person={person} size={28} />
                    {person.name}
                    {on && form.rotate && recurring && form.assignees.length > 1 && (
                      <span className="text-xs text-[var(--text-muted)]">#{position + 1}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          {recurring && form.assignees.length > 1 && (
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.rotate}
                onChange={(event) => set({ rotate: event.target.checked })}
                className={`mt-0.5 h-4 w-4 accent-[var(--accent)] ${focusRing}`}
              />
              <span>
                Chacun son tour <span className="text-[var(--text-muted)]">(dans l’ordre des numéros)</span>
                {nextTurn?.person && (
                  <span className="block text-[var(--text-secondary)]">
                    Prochaine fois : {nextTurn.person.name}, {formatDay(nextTurn.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                )}
              </span>
            </label>
          )}
        </fieldset>

        <div>
          <label htmlFor={`${id}-notes`} className={label}>
            Notes <span className="font-normal text-[var(--text-muted)]">(facultatif)</span>
          </label>
          <textarea
            id={`${id}-notes`}
            value={form.notes}
            onChange={(event) => set({ notes: event.target.value })}
            maxLength={500}
            rows={2}
            className={`${input} mt-1.5 resize-y`}
          />
        </div>

        {busyWith.length > 0 && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            ⚠️ Prévue pendant le travail de {busyWith.join(' et ')} : déplace-la ou confie-la à quelqu’un d’autre.
          </p>
        )}

        {task && occurrence && !occurrence.mark && (
          <fieldset className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
            <legend className={`${label} px-1`}>Déplacer {task.repeat === 'none' ? 'la tâche' : 'cette date seulement'}</legend>
            {task.repeat !== 'none' && (occurrence.date !== occurrence.origin || occurrence.time !== task.time) && (
              <p className="mb-2 text-sm text-[var(--text-secondary)]">
                Déjà déplacée : prévue le {formatDay(occurrence.origin, { weekday: 'long', day: 'numeric', month: 'long' })}
                {task.time ? ` à ${formatTime(task.time)}` : ''}.{' '}
                <button
                  type="button"
                  onClick={() => onMove(occurrence, occurrence.origin, task.time)}
                  disabled={busy}
                  className={`rounded underline ${focusRing}`}
                >
                  La remettre comme prévu
                </button>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={`${id}-move`} className="sr-only">
                Nouvelle date
              </label>
              <input
                id={`${id}-move`}
                type="date"
                value={moveTo}
                onChange={(event) => setMoveTo(event.target.value)}
                className={`${input} w-auto py-2`}
              />
              <label htmlFor={`${id}-move-time`} className="sr-only">
                Nouvelle heure
              </label>
              <input
                id={`${id}-move-time`}
                type="time"
                step={300}
                value={moveTime}
                onChange={(event) => setMoveTime(event.target.value)}
                className={`${input} w-auto py-2`}
              />
              <button
                type="button"
                onClick={() => onMove(occurrence, moveTo, moveTime || null)}
                disabled={busy || !moveTo || (moveTo === occurrence.date && (moveTime || null) === occurrence.time)}
                className={secondaryButton}
              >
                Déplacer
              </button>
            </div>
          </fieldset>
        )}

        <FormError id={`${id}-error`}>{error}</FormError>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? 'Enregistrement…' : task ? 'Enregistrer' : 'Ajouter la tâche'}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
            Annuler
          </button>
          {task && occurrence && !occurrence.mark && task.repeat !== 'none' && (
            <button type="button" onClick={() => onSkip(occurrence)} disabled={busy} className={secondaryButton}>
              Sauter le {formatDay(occurrence.date, { day: 'numeric', month: 'short' })}
            </button>
          )}
          {task &&
            (confirmDelete ? (
              <button type="button" onClick={remove} disabled={busy} className={`${dangerButton} sm:ml-auto`}>
                Supprimer{task.repeat !== 'none' ? ' toutes les dates' : ''}
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} className={`${dangerButton} sm:ml-auto`}>
                Supprimer…
              </button>
            ))}
        </div>
        {task && task.repeat !== 'none' && (
          <p className="text-xs text-[var(--text-muted)]">Les modifications s’appliquent à toutes les dates de cette tâche.</p>
        )}
      </form>
    </Modal>
  )
}
