import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import { MaisonError, loadState, setMark } from './api'
import { categoryOf } from './catalog'
import PeopleDialog from './PeopleDialog'
import TaskDialog from './TaskDialog'
import {
  addDays,
  addMonths,
  dayNumber,
  daysBetween,
  expand,
  formatDay,
  monthGrid,
  startOfWeek,
  todayKey,
  WEEKDAY_SHORT,
} from './recurrence'
import { Spinner, card, focusRing, primaryButton, secondaryButton } from '../dispo/ui'
import { AvatarStack, NEUTRAL_COLOR, PersonAvatar } from './ui'

/** Jours en arrière où une tâche non cochée est signalée « en retard ». */
const OVERDUE_DAYS = 14
/** Plus longue période chargée en une fois (même limite que maison-api.php). */
const MAX_RANGE_DAYS = 400
const REFRESH_MS = 60_000

function usePageMeta() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Maison | Tâches'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => {
      document.title = previousTitle
      robots.remove()
    }
  }, [])
}

/** Période affichée (vue semaine ou mois autour de `anchor`). */
function viewRange(view, anchor) {
  if (view === 'week') {
    const from = startOfWeek(anchor)
    return { from, to: addDays(from, 6) }
  }
  const grid = monthGrid(anchor)
  return { from: grid[0], to: grid[grid.length - 1] }
}

/** Période chargée : la vue, plus les jours « en retard » si elle reste dans la limite. */
function loadRange(range, today) {
  const from = range.from < addDays(today, -OVERDUE_DAYS) ? range.from : addDays(today, -OVERDUE_DAYS)
  const to = range.to > today ? range.to : today
  if (dayNumber(to) - dayNumber(from) <= MAX_RANGE_DAYS) return { from, to, withOverdue: true }
  return { from: range.from, to: range.to, withOverdue: false }
}

function formatMinutes(total) {
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/**
 * maison.mathis-rvrs.fr : calendrier des tâches du foyer, derrière la connexion de l'espace
 * privé. Personnes (photo, couleur), tâches ponctuelles ou répétées, tour de rôle, cases à cocher.
 */
export default function MaisonApp() {
  usePageMeta()
  const [today, setToday] = useState(todayKey)
  const [view, setView] = useState('week')
  const [anchor, setAnchor] = useState(today)
  const [filter, setFilter] = useState('all')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [toast, setToast] = useState('')

  const range = useMemo(() => viewRange(view, anchor), [view, anchor])
  const loaded = useMemo(() => loadRange(range, today), [range, today])
  const loadedRef = useRef(loaded)
  useEffect(() => {
    loadedRef.current = loaded
  }, [loaded])

  // Chargement à chaque changement de période.
  useEffect(() => {
    const controller = new AbortController()
    loadState(loaded.from, loaded.to, controller.signal)
      .then((state) => {
        setData(state)
        setError(null)
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err)
      })
    return () => controller.abort()
  }, [loaded.from, loaded.to, attempt])

  // Relecture discrète (onglet visible) : ce que l'autre personne a coché apparaît sans recharger.
  const ready = data !== null
  useEffect(() => {
    if (!ready) return undefined
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      setToday(todayKey())
      const { from, to } = loadedRef.current
      loadState(from, to)
        .then(setData)
        .catch(() => {})
    }
    const timer = setInterval(refresh, REFRESH_MS)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [ready])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const people = useMemo(() => data?.people ?? [], [data])
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const activeFilter = filter !== 'all' && peopleById.has(filter) ? filter : 'all'
  const keep = useCallback(
    (occ) => activeFilter === 'all' || occ.assignees.includes(activeFilter),
    [activeFilter],
  )

  const occurrences = useMemo(
    () => (data ? expand(data.tasks, data.marks, range.from, range.to).filter(keep) : []),
    [data, range, keep],
  )
  const overdue = useMemo(
    () =>
      data && loaded.withOverdue
        ? expand(data.tasks, data.marks, addDays(today, -OVERDUE_DAYS), addDays(today, -1)).filter(
            (occ) => !occ.mark && keep(occ),
          )
        : [],
    [data, loaded.withOverdue, today, keep],
  )

  const byDay = useMemo(() => {
    const map = new Map()
    for (const occ of occurrences) {
      if (!map.has(occ.date)) map.set(occ.date, [])
      map.get(occ.date).push(occ)
    }
    return map
  }, [occurrences])

  // ── Actions ────────────────────────────────────────────────────────────────

  const updateMarks = (taskId, date, mark) =>
    setData((d) => ({
      ...d,
      marks: [...d.marks.filter((m) => !(m.taskId === taskId && m.date === date)), ...(mark ? [mark] : [])],
    }))

  async function changeMark(occ, status) {
    const previous = occ.mark
    const personId =
      status === 'done'
        ? occ.assignees.length === 1
          ? occ.assignees[0]
          : activeFilter !== 'all'
            ? activeFilter
            : null
        : null
    updateMarks(occ.task.id, occ.date, status ? { taskId: occ.task.id, date: occ.date, status, personId } : null)
    try {
      await setMark(occ.task.id, occ.date, status, personId)
    } catch (err) {
      updateMarks(occ.task.id, occ.date, previous)
      setToast(err instanceof MaisonError ? err.message : 'Modification non enregistrée, réessaie.')
    }
  }

  const toggleDone = (occ) => changeMark(occ, occ.mark?.status === 'done' ? null : 'done')

  function openTask(occ) {
    setDialog({ type: 'task', task: occ.task, occurrenceDate: occ.date })
  }

  function newTask(start = today < range.from || today > range.to ? range.from : today) {
    setDialog({ type: 'task', task: null, defaultStart: start })
  }

  function taskSaved(task) {
    setData((d) => ({ ...d, tasks: [...d.tasks.filter((t) => t.id !== task.id), task] }))
    setDialog(null)
    setToast('Tâche enregistrée.')
  }

  function taskDeleted(id) {
    setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id), marks: d.marks.filter((m) => m.taskId !== id) }))
    setDialog(null)
    setToast('Tâche supprimée.')
  }

  function skip(task, date) {
    const occ = expand([task], data.marks, date, date)[0]
    setDialog(null)
    if (occ) changeMark(occ, 'skipped')
  }

  function personSaved(person) {
    setData((d) => ({
      ...d,
      people: d.people.some((p) => p.id === person.id)
        ? d.people.map((p) => (p.id === person.id ? person : p))
        : [...d.people, person],
    }))
  }

  function personDeleted(id) {
    setData((d) => ({
      ...d,
      people: d.people.filter((p) => p.id !== id),
      tasks: d.tasks.map((t) => (t.assignees.includes(id) ? { ...t, assignees: t.assignees.filter((a) => a !== id) } : t)),
      marks: d.marks.map((m) => (m.personId === id ? { ...m, personId: null } : m)),
    }))
    if (filter === id) setFilter('all')
  }

  function move(step) {
    setAnchor((a) => (view === 'week' ? addDays(a, step * 7) : addMonths(a, step)))
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  let content
  if (error && !data) {
    content = (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
        <div className={card} role="alert">
          <h1 className="font-display text-xl font-bold">Calendrier indisponible</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{error.message}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className={`${primaryButton} mt-5`}>
            Réessayer
          </button>
        </div>
      </main>
    )
  } else if (!data) {
    content = <Spinner />
  } else {
    const title =
      view === 'week'
        ? `${formatDay(range.from, { day: 'numeric', month: 'short' })} – ${formatDay(range.to, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : formatDay(anchor, { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())
    const isCurrent = today >= range.from && today <= range.to && (view === 'week' || anchor.slice(0, 7) === today.slice(0, 7))

    content = (
      <main className="mx-auto w-full max-w-7xl px-3 pb-24 pt-5 sm:px-6 sm:pt-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">🏠 Maison</h1>
            <p className="text-sm text-[var(--text-secondary)]">Les tâches du foyer, qui fait quoi et quand.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDialog({ type: 'people' })} className={secondaryButton}>
              👥 Personnes
            </button>
            <button type="button" onClick={() => newTask()} className={primaryButton}>
              + Nouvelle tâche
            </button>
          </div>
        </header>

        {people.length > 0 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Afficher les tâches de">
            <FilterChip active={activeFilter === 'all'} onClick={() => setFilter('all')}>
              Tout le monde
            </FilterChip>
            {people.map((person) => (
              <FilterChip
                key={person.id}
                active={activeFilter === person.id}
                color={person.color}
                onClick={() => setFilter(activeFilter === person.id ? 'all' : person.id)}
              >
                <PersonAvatar person={person} size={24} />
                {person.name}
              </FilterChip>
            ))}
          </div>
        )}

        {data.tasks.length === 0 ? (
          <Onboarding hasPeople={people.length > 0} onPeople={() => setDialog({ type: 'people' })} onTask={() => newTask()} />
        ) : (
          <>
            {overdue.length > 0 && (
              <section aria-labelledby="overdue-title" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
                <h2 id="overdue-title" className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  ⏰ En retard ({overdue.length})
                </h2>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {overdue.map((occ) => (
                    <TaskItem
                      key={`${occ.task.id}|${occ.date}`}
                      occ={occ}
                      peopleById={peopleById}
                      onToggle={toggleDone}
                      onOpen={openTask}
                      showDate
                    />
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <IconButton label={view === 'week' ? 'Semaine précédente' : 'Mois précédent'} onClick={() => move(-1)}>
                  ‹
                </IconButton>
                <IconButton label={view === 'week' ? 'Semaine suivante' : 'Mois suivant'} onClick={() => move(1)}>
                  ›
                </IconButton>
                <h2 className="ml-2 font-display text-lg font-bold sm:text-xl" aria-live="polite">
                  {title}
                </h2>
                {!isCurrent && (
                  <button type="button" onClick={() => setAnchor(today)} className={`${secondaryButton} ml-2 min-h-9 px-3`}>
                    Aujourd’hui
                  </button>
                )}
              </div>
              <div role="radiogroup" aria-label="Affichage" className="inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 shadow-[var(--card-shadow)]">
                {[
                  ['week', 'Semaine'],
                  ['month', 'Mois'],
                ].map(([value, text]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={view === value}
                    onClick={() => setView(value)}
                    className={`min-h-9 rounded-lg px-4 text-sm font-medium transition ${focusRing} ${
                      view === value ? 'bg-[var(--accent)] text-white dark:text-[#070b14]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {view === 'week' ? (
              <>
                <WeekLoad occurrences={occurrences} people={people} activeFilter={activeFilter} />
                <WeekView
                  days={daysBetween(range.from, range.to)}
                  today={today}
                  byDay={byDay}
                  peopleById={peopleById}
                  onToggle={toggleDone}
                  onOpen={openTask}
                  onAdd={newTask}
                />
              </>
            ) : (
              <MonthView
                days={monthGrid(anchor)}
                month={anchor.slice(0, 7)}
                today={today}
                byDay={byDay}
                peopleById={peopleById}
                onPick={(day) => {
                  setAnchor(day)
                  setView('week')
                }}
              />
            )}
          </>
        )}

        {dialog?.type === 'task' && (
          <TaskDialog
            task={dialog.task}
            defaultStart={dialog.defaultStart}
            defaultAssignee={activeFilter !== 'all' ? activeFilter : null}
            occurrenceDate={dialog.occurrenceDate}
            people={people}
            onClose={() => setDialog(null)}
            onSaved={taskSaved}
            onDeleted={taskDeleted}
            onSkip={skip}
          />
        )}
        {dialog?.type === 'people' && (
          <PeopleDialog people={people} onClose={() => setDialog(null)} onSaved={personSaved} onDeleted={personDeleted} />
        )}

        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          {toast && (
            <p className="rounded-xl bg-[var(--text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--bg-primary)] shadow-lg">
              {toast}
            </p>
          )}
        </div>
      </main>
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">{content}</div>
    </ThemeProvider>
  )
}

// ── Morceaux d'écran ─────────────────────────────────────────────────────────

function FilterChip({ active, color, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border-2 px-3 text-sm font-medium transition ${focusRing} ${
        active ? 'bg-[var(--bg-elevated)] shadow-[var(--card-shadow)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
      style={active ? { borderColor: color ?? 'var(--accent)' } : undefined}
    >
      {children}
    </button>
  )
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] text-xl transition hover:border-[var(--accent)] ${focusRing}`}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}

function Onboarding({ hasPeople, onPeople, onTask }) {
  return (
    <section className={`${card} mx-auto mt-8 max-w-xl`}>
      <h2 className="font-display text-xl font-bold">Bienvenue 👋</h2>
      <ol className="mt-4 space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="font-bold text-[var(--accent)]">1.</span>
          <span>
            Ajoute les personnes du foyer, avec une photo et une couleur.{' '}
            {hasPeople && <span className="text-emerald-600 dark:text-emerald-400">✓ fait</span>}
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-bold text-[var(--accent)]">2.</span>
          <span>Ajoute les tâches : une idée toute prête ou la tienne, une fois ou à répéter (chaque jour, semaine, mois…).</span>
        </li>
        <li className="flex gap-3">
          <span className="font-bold text-[var(--accent)]">3.</span>
          <span>Coche ce qui est fait. Les tâches oubliées remontent dans « En retard ».</span>
        </li>
      </ol>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onPeople} className={hasPeople ? secondaryButton : primaryButton}>
          👥 {hasPeople ? 'Gérer les personnes' : 'Ajouter des personnes'}
        </button>
        <button type="button" onClick={onTask} className={hasPeople ? primaryButton : secondaryButton}>
          + Première tâche
        </button>
      </div>
    </section>
  )
}

/** Une occurrence : case « fait », titre (ouvre la tâche), personnes, répétition, durée. */
function TaskItem({ occ, peopleById, onToggle, onOpen, showDate = false }) {
  const { task, mark } = occ
  const done = mark?.status === 'done'
  const skipped = mark?.status === 'skipped'
  const assigned = occ.assignees.map((id) => peopleById.get(id)).filter(Boolean)
  const doer = done && mark.personId ? peopleById.get(mark.personId) : null
  const color = assigned[0]?.color ?? NEUTRAL_COLOR
  const category = categoryOf(task.category)
  const when = formatDay(occ.date, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <li
      className={`flex min-w-0 items-start gap-2 rounded-xl border border-[var(--border-color)] border-l-4 bg-[var(--bg-elevated)] p-2 transition ${
        done || skipped ? 'opacity-60' : ''
      }`}
      style={{ borderLeftColor: color }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`${task.title}, ${when} : ${done ? 'fait' : skipped ? 'sautée' : 'à faire'}`}
        onClick={() => onToggle(occ)}
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${focusRing}`}
        style={done ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color }}
      >
        {done ? '✓' : ''}
      </button>
      <button type="button" onClick={() => onOpen(occ)} className={`min-w-0 flex-1 rounded text-left ${focusRing}`}>
        <span className={`block break-words text-sm font-medium leading-snug ${done || skipped ? 'line-through' : ''}`}>
          <span aria-hidden="true">{category.emoji} </span>
          {task.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
          {showDate && <span className="capitalize">{formatDay(occ.date, { weekday: 'short', day: 'numeric' })}</span>}
          {doer ? (
            <span className="inline-flex items-center gap-1">
              <PersonAvatar person={doer} size={18} /> fait
            </span>
          ) : (
            <AvatarStack people={assigned} size={20} />
          )}
          {assigned.length > 0 && <span className="sr-only">Pour {assigned.map((p) => p.name).join(', ')}.</span>}
          {skipped && <span>sautée</span>}
          {task.repeat !== 'none' && (
            <span title={task.rotate ? 'Répétée, chacun son tour' : 'Répétée'}>↻{task.rotate ? ' tour' : ''}</span>
          )}
          {task.duration && <span>{formatMinutes(task.duration)}</span>}
        </span>
      </button>
    </li>
  )
}

/** Charge de la semaine par personne : tâches faites / prévues et temps estimé. */
function WeekLoad({ occurrences, people, activeFilter }) {
  const rows = people
    .filter((p) => activeFilter === 'all' || p.id === activeFilter)
    .map((person) => {
      const mine = occurrences.filter((o) => o.assignees.includes(person.id) && o.mark?.status !== 'skipped')
      const done = mine.filter((o) => o.mark?.status === 'done').length
      const minutes = mine.reduce((sum, o) => sum + (o.task.duration ?? 0), 0)
      return { person, total: mine.length, done, minutes }
    })
    .filter((row) => row.total > 0)
  if (rows.length === 0) return null

  return (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Charge de la semaine">
      {rows.map(({ person, total, done, minutes }) => (
        <li key={person.id} className="flex items-center gap-3 rounded-xl bg-[var(--bg-elevated)] px-3 py-2 shadow-[var(--card-shadow)]">
          <PersonAvatar person={person} size={32} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-semibold">{person.name}</span>
              <span className="shrink-0 text-xs text-[var(--text-muted)]">
                {done}/{total}
                {minutes > 0 && ` · ${formatMinutes(minutes)}`}
              </span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-primary)]"
              role="progressbar"
              aria-label={`${person.name} : ${done} tâches faites sur ${total}`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
            >
              <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: person.color }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function WeekView({ days, today, byDay, peopleById, onToggle, onOpen, onAdd }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {days.map((day) => {
        const list = byDay.get(day) ?? []
        const isToday = day === today
        const past = day < today
        return (
          <section
            key={day}
            aria-label={formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}
            className={`flex min-w-0 flex-col rounded-2xl border p-2.5 ${
              isToday ? 'border-[var(--accent)] bg-[var(--bg-elevated)] shadow-[var(--card-shadow)]' : 'border-[var(--border-color)]'
            } ${past && !isToday ? 'opacity-80' : ''}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <h3 className="text-sm font-semibold capitalize">
                {formatDay(day, { weekday: 'short' })}{' '}
                <span className={isToday ? 'rounded-full bg-[var(--accent)] px-1.5 text-white dark:text-[#070b14]' : ''}>
                  {Number(day.slice(8))}
                </span>
                {isToday && <span className="sr-only"> (aujourd’hui)</span>}
              </h3>
              <button
                type="button"
                onClick={() => onAdd(day)}
                aria-label={`Ajouter une tâche le ${formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-[var(--text-muted)] transition hover:bg-[var(--bg-primary)] hover:text-[var(--accent)] ${focusRing}`}
              >
                +
              </button>
            </div>
            {list.length === 0 ? (
              <p className="px-1 pb-1 text-xs text-[var(--text-muted)]">Rien de prévu</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((occ) => (
                  <TaskItem key={occ.task.id} occ={occ} peopleById={peopleById} onToggle={onToggle} onOpen={onOpen} />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function MonthView({ days, month, today, byDay, peopleById, onPick }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)]">
      <div className="grid grid-cols-7 border-b border-[var(--border-color)] text-center text-xs font-semibold uppercase text-[var(--text-muted)]" aria-hidden="true">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const list = byDay.get(day) ?? []
          const remaining = list.filter((o) => !o.mark).length
          const outside = day.slice(0, 7) !== month
          const isToday = day === today
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(day)}
              aria-label={`${formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })} : ${
                list.length === 0 ? 'rien de prévu' : `${list.length} tâche${list.length > 1 ? 's' : ''}, ${remaining} à faire`
              }`}
              className={`flex min-h-16 min-w-0 flex-col items-stretch gap-1 border-b border-r border-[var(--border-color)] p-1 text-left transition hover:bg-[var(--bg-primary)] sm:min-h-28 sm:p-1.5 ${focusRing} ${
                outside ? 'text-[var(--text-muted)] opacity-60' : ''
              }`}
            >
              <span
                className={`self-start rounded-full px-1.5 text-xs font-semibold ${isToday ? 'bg-[var(--accent)] text-white dark:text-[#070b14]' : ''}`}
              >
                {Number(day.slice(8))}
              </span>
              {/* Petit écran : une pastille par tâche. */}
              <span className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden="true">
                {list.slice(0, 6).map((occ) => (
                  <span
                    key={occ.task.id}
                    className={`h-2 w-2 rounded-full ${occ.mark ? 'opacity-30' : ''}`}
                    style={{ background: peopleById.get(occ.assignees[0])?.color ?? NEUTRAL_COLOR }}
                  />
                ))}
              </span>
              {/* Grand écran : titres. */}
              <span className="hidden flex-col gap-0.5 sm:flex" aria-hidden="true">
                {list.slice(0, 3).map((occ) => (
                  <span
                    key={occ.task.id}
                    className={`truncate rounded px-1 py-0.5 text-[11px] leading-tight ${occ.mark ? 'line-through opacity-50' : ''}`}
                    style={{
                      background: `${peopleById.get(occ.assignees[0])?.color ?? NEUTRAL_COLOR}26`,
                      borderLeft: `3px solid ${peopleById.get(occ.assignees[0])?.color ?? NEUTRAL_COLOR}`,
                    }}
                  >
                    {occ.task.title}
                  </span>
                ))}
                {list.length > 3 && <span className="px-1 text-[11px] text-[var(--text-muted)]">+{list.length - 3} autres</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
