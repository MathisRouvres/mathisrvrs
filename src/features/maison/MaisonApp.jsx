import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import { MaisonError, loadState, saveTask, setMark, setMe, setMove } from './api'
import { categoryOf } from './catalog'
import PeopleDialog from './PeopleDialog'
import ShiftsDialog from './ShiftsDialog'
import TaskDialog from './TaskDialog'
import TimeGrid from './TimeGrid'
import { busyAssignees, formatTime, segmentsOn } from './schedule'
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
/** Tâches en retard montrées avant « Voir les autres » (la journée reste visible sur téléphone). */
const OVERDUE_SHOWN = 3
/** Plus longue période chargée en une fois (même limite que maison-api.php). */
const MAX_RANGE_DAYS = 400
const REFRESH_MS = 60_000
/** « Plus tard » sur la question « Qui es-tu ? » (cet appareil seulement). */
const WHOAMI_KEY = 'maison:whoami-later'

const isSmallScreen = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches

function readLater() {
  try {
    return localStorage.getItem(WHOAMI_KEY) === '1'
  } catch {
    return false
  }
}

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

/** Période affichée (vue jour, semaine ou mois autour de `anchor`). */
function viewRange(view, anchor) {
  if (view === 'day') return { from: anchor, to: anchor }
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

/** « Aujourd'hui, lundi 17 novembre », « Demain, … », sinon la date. */
function dayTitle(day, today) {
  const date = formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })
  const near = { [today]: 'Aujourd’hui', [addDays(today, 1)]: 'Demain', [addDays(today, -1)]: 'Hier' }[day]
  return near ? `${near}, ${date}` : date.replace(/^./, (c) => c.toUpperCase())
}

/**
 * maison.mathis-rvrs.fr : calendrier des tâches du foyer, derrière la connexion de l'espace
 * privé. Personnes (photo, couleur), tâches ponctuelles ou répétées, tour de rôle, cases à cocher.
 */
export default function MaisonApp() {
  usePageMeta()
  const [today, setToday] = useState(todayKey)
  // Téléphone : la journée d'abord ; sinon la semaine.
  const [view, setView] = useState(() => (isSmallScreen() ? 'day' : 'week'))
  const [anchor, setAnchor] = useState(today)
  // null : pas encore choisi → « mes tâches » si le compte est lié à une personne.
  const [filter, setFilter] = useState(null)
  const [whoamiLater, setWhoamiLater] = useState(readLater)
  const [showAllOverdue, setShowAllOverdue] = useState(false)
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

  const reload = useCallback(() => {
    const { from, to } = loadedRef.current
    return loadState(from, to)
      .then(setData)
      .catch(() => {})
  }, [])

  // Relecture discrète (onglet visible) : ce que l'autre personne a coché apparaît sans recharger.
  const ready = data !== null
  useEffect(() => {
    if (!ready) return undefined
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      setToday(todayKey())
      reload()
    }
    const timer = setInterval(refresh, REFRESH_MS)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [ready, reload])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const people = useMemo(() => data?.people ?? [], [data])
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const meId = data?.me?.personId && peopleById.has(data.me.personId) ? data.me.personId : null
  const wanted = filter ?? meId ?? 'all'
  const activeFilter = wanted !== 'all' && peopleById.has(wanted) ? wanted : 'all'
  const keep = useCallback(
    (occ) => activeFilter === 'all' || occ.assignees.includes(activeFilter),
    [activeFilter],
  )

  const occurrences = useMemo(
    () => (data ? expand(data.tasks, data.marks, range.from, range.to, data).filter(keep) : []),
    [data, range, keep],
  )
  // En retard : 14 derniers jours ; une tâche « après la dernière fois » reste en retard sans limite.
  const overdue = useMemo(() => {
    if (!data || !loaded.withOverdue) return []
    const recent = expand(data.tasks, data.marks, addDays(today, -OVERDUE_DAYS), addDays(today, -1), data)
    const after = data.tasks.filter((t) => t.repeat === 'after')
    const older = expand(after, data.marks, '2000-01-01', addDays(today, -OVERDUE_DAYS - 1), data)
    return [...older, ...recent].filter((occ) => !occ.mark && keep(occ))
  }, [data, loaded.withOverdue, today, keep])

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

  /** Remplace le déplacement de l'occurrence (taskId, date prévue) ; `move` null le retire. */
  const updateMoves = (taskId, date, move) =>
    setData((d) => ({
      ...d,
      moves: [...d.moves.filter((m) => !(m.taskId === taskId && m.date === date)), ...(move ? [move] : [])],
    }))

  /** Qui a fait la tâche : la personne liée au compte, sinon la seule personne prévue, sinon le filtre. */
  function doerOf(occ) {
    if (meId) return meId
    if (occ.assignees.length === 1) return occ.assignees[0]
    return activeFilter !== 'all' ? activeFilter : null
  }

  async function changeMark(occ, status) {
    const previous = occ.mark
    const personId = status === 'done' ? doerOf(occ) : null
    const doneOn = todayKey()
    updateMarks(occ.task.id, occ.origin, status ? { taskId: occ.task.id, date: occ.origin, status, personId, doneOn } : null)
    try {
      await setMark(occ.task.id, occ.origin, status, personId, doneOn)
      // « Après la dernière fois » : la prochaine date se calcule sur le serveur (chains).
      if (occ.task.repeat === 'after') reload()
    } catch (err) {
      updateMarks(occ.task.id, occ.origin, previous)
      setToast(err instanceof MaisonError ? err.message : 'Modification non enregistrée, réessaie.')
    }
  }

  const toggleDone = (occ) => changeMark(occ, occ.mark?.status === 'done' ? null : 'done')

  /**
   * Place une occurrence le jour `day` à l'heure `time` (« HH:MM » ou null) : glisser-déposer,
   * « Demain », « Reporter ». Revenir à la date et à l'heure prévues annule le déplacement. Tâche
   * unique : change directement sa date et son heure.
   */
  async function placeOccurrence(occ, day, time) {
    setDialog(null)
    const { task } = occ
    if (day === occ.date && time === occ.time) return
    const label = `${formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}${time ? `, ${formatTime(time)}` : ''}`

    if (task.repeat === 'none') {
      const previous = task
      const next = { ...task, start: day, time }
      setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === task.id ? next : t)) }))
      try {
        await saveTask(next)
        setToast(`Déplacée au ${label}.`)
      } catch (err) {
        setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === task.id ? previous : t)) }))
        setToast(err instanceof MaisonError ? err.message : 'Déplacement non enregistré, réessaie.')
      }
      return
    }

    // Une tâche répétée garde son heure habituelle ; « sans heure » ne peut pas la retirer pour une seule date.
    if (time === null && task.time) {
      setToast('Cette tâche a une heure habituelle : modifie la tâche pour la retirer.')
      return
    }
    const at = time === task.time ? null : time
    const back = day === occ.origin && at === null
    const previous = data.moves.find((m) => m.taskId === task.id && m.date === occ.origin) ?? null
    updateMoves(task.id, occ.origin, back ? null : { taskId: task.id, date: occ.origin, to: day, at })
    try {
      await setMove(task.id, occ.origin, back ? null : day, at)
      setToast(back ? 'Remise à sa date et son heure prévues.' : `Déplacée au ${label}.`)
    } catch (err) {
      updateMoves(task.id, occ.origin, previous)
      setToast(err instanceof MaisonError ? err.message : 'Déplacement non enregistré, réessaie.')
    }
  }

  /** Reporte une occurrence au jour `to`, à la même heure. */
  const moveOccurrence = (occ, to) => placeOccurrence(occ, to, occ.time)

  /** Lie le compte connecté à une personne (null : le délie). */
  async function claimMe(personId) {
    const previous = data.me
    setData((d) => ({
      ...d,
      me: { ...d.me, personId },
      people: d.people.map((p) =>
        p.id === personId ? { ...p, account: d.me.account } : p.account === d.me.account ? { ...p, account: null } : p,
      ),
    }))
    setFilter(null)
    try {
      await setMe(personId)
    } catch (err) {
      setData((d) => ({ ...d, me: previous }))
      setToast(err instanceof MaisonError ? err.message : 'Choix non enregistré, réessaie.')
      reload()
    }
  }

  function whoamiLaterClick() {
    setWhoamiLater(true)
    try {
      localStorage.setItem(WHOAMI_KEY, '1')
    } catch {
      // Stockage indisponible : la question reviendra au prochain chargement.
    }
  }

  function openTask(occ) {
    setDialog({ type: 'task', task: occ.task, occurrence: occ })
  }

  function newTask(start = today < range.from || today > range.to ? range.from : today, time = null) {
    setDialog({ type: 'task', task: null, defaultStart: start, defaultTime: time })
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

  function skip(occ) {
    setDialog(null)
    changeMark(occ, 'skipped')
  }

  function personSaved(person) {
    setData((d) => ({
      ...d,
      people: d.people.some((p) => p.id === person.id)
        ? d.people.map((p) => (p.id === person.id ? { ...p, ...person } : p))
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
    if (filter === id) setFilter(null)
  }

  function move(step) {
    setAnchor((a) => (view === 'day' ? addDays(a, step) : view === 'week' ? addDays(a, step * 7) : addMonths(a, step)))
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
      view === 'day'
        ? dayTitle(anchor, today)
        : view === 'week'
          ? `${formatDay(range.from, { day: 'numeric', month: 'short' })} – ${formatDay(range.to, { day: 'numeric', month: 'short', year: 'numeric' })}`
          : formatDay(anchor, { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())
    const isCurrent = today >= range.from && today <= range.to && (view !== 'month' || anchor.slice(0, 7) === today.slice(0, 7))
    const step = { day: ['Jour précédent', 'Jour suivant'], week: ['Semaine précédente', 'Semaine suivante'], month: ['Mois précédent', 'Mois suivant'] }[view]
    const me = meId ? peopleById.get(meId) : null
    // Personnes que ce compte peut choisir (pas déjà liées à un autre compte).
    const unclaimed = people.filter((p) => !p.account || p.account === data.me.account)
    const large = view === 'day'

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
            {people.length > 0 && (
              <button type="button" onClick={() => setDialog({ type: 'shifts' })} className={secondaryButton}>
                💼 Horaires
              </button>
            )}
            <button type="button" onClick={() => newTask()} className={primaryButton}>
              + Nouvelle tâche
            </button>
          </div>
        </header>

        {!meId && !whoamiLater && unclaimed.length > 0 && (
          <WhoAmI people={unclaimed} account={data.me.account} onPick={claimMe} onLater={whoamiLaterClick} />
        )}

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
                {person.id === meId ? `${person.name} (moi)` : person.name}
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
                <ul className={`mt-2 grid gap-2 ${large ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                  {(showAllOverdue ? overdue : overdue.slice(0, OVERDUE_SHOWN)).map((occ) => (
                    <TaskItem
                      key={`${occ.task.id}|${occ.origin}`}
                      occ={occ}
                      peopleById={peopleById}
                      onToggle={toggleDone}
                      onOpen={openTask}
                      onPostpone={large ? (o) => moveOccurrence(o, addDays(today, 1)) : undefined}
                      large={large}
                      showDate
                    />
                  ))}
                </ul>
                {overdue.length > OVERDUE_SHOWN && (
                  <button
                    type="button"
                    onClick={() => setShowAllOverdue((v) => !v)}
                    aria-expanded={showAllOverdue}
                    className={`mt-2 min-h-10 rounded-lg px-2 text-sm font-medium text-amber-900 underline dark:text-amber-200 ${focusRing}`}
                  >
                    {showAllOverdue ? 'Réduire' : `Voir les ${overdue.length - OVERDUE_SHOWN} autres`}
                  </button>
                )}
              </section>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <IconButton label={step[0]} onClick={() => move(-1)}>
                  ‹
                </IconButton>
                <IconButton label={step[1]} onClick={() => move(1)}>
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
                  ['day', 'Jour'],
                  ['week', 'Semaine'],
                  ['month', 'Mois'],
                ].map(([value, text]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={view === value}
                    onClick={() => setView(value)}
                    className={`min-h-9 rounded-lg px-3 text-sm font-medium transition sm:px-4 ${focusRing} ${
                      view === value ? 'bg-[var(--accent)] text-white dark:text-[#070b14]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {view === 'day' || view === 'week' ? (
              <>
                {view === 'day' ? (
                  <DaySummary list={byDay.get(anchor) ?? []} me={me} />
                ) : (
                  <WeekLoad occurrences={occurrences} people={people} activeFilter={activeFilter} />
                )}
                <div className="mt-4">
                  <TimeGrid
                    days={view === 'day' ? [anchor] : daysBetween(range.from, range.to)}
                    today={today}
                    byDay={byDay}
                    shifts={data.shifts}
                    people={people}
                    peopleById={peopleById}
                    activeFilter={activeFilter}
                    large={large}
                    onToggle={toggleDone}
                    onOpen={openTask}
                    onPlace={placeOccurrence}
                    onAdd={(day, time) => newTask(day, time)}
                    renderUntimed={(occ, handle) => (
                      <TaskItem
                        key={`${occ.task.id}|${occ.origin}`}
                        occ={occ}
                        peopleById={peopleById}
                        onToggle={toggleDone}
                        onOpen={openTask}
                        onPostpone={large ? (o) => moveOccurrence(o, addDays(o.date < today ? today : o.date, 1)) : undefined}
                        large={large}
                        compact={!large}
                        handle={handle}
                      />
                    )}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Astuce : glisse une tâche par sa poignée ⠿ vers une autre heure{view === 'week' ? ' ou un autre jour' : ''} ;
                  touche un créneau vide pour y ajouter une tâche.
                </p>
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
                  setView(isSmallScreen() ? 'day' : 'week')
                }}
              />
            )}
          </>
        )}

        {dialog?.type === 'task' && (
          <TaskDialog
            task={dialog.task}
            defaultStart={dialog.defaultStart}
            defaultTime={dialog.defaultTime}
            defaultAssignee={activeFilter !== 'all' ? activeFilter : null}
            occurrence={dialog.occurrence}
            today={today}
            people={people}
            busyWith={
              dialog.occurrence
                ? busyAssignees(dialog.occurrence, segmentsOn(data.shifts, dialog.occurrence.date))
                    .map((id) => peopleById.get(id)?.name)
                    .filter(Boolean)
                : []
            }
            onClose={() => setDialog(null)}
            onSaved={taskSaved}
            onDeleted={taskDeleted}
            onSkip={skip}
            onMove={placeOccurrence}
          />
        )}
        {dialog?.type === 'shifts' && (
          <ShiftsDialog
            people={people}
            defaultPersonId={activeFilter !== 'all' ? activeFilter : (meId ?? people[0]?.id)}
            today={today}
            onClose={() => setDialog(null)}
            onSaved={(message) => {
              setToast(message)
              reload()
            }}
          />
        )}
        {dialog?.type === 'people' && (
          <PeopleDialog
            people={people}
            account={data.me.account}
            meId={meId}
            onClaim={claimMe}
            onClose={() => setDialog(null)}
            onSaved={personSaved}
            onDeleted={personDeleted}
          />
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

/**
 * Une occurrence : case « fait », titre (ouvre la tâche), personnes, répétition, durée.
 * `large` (vue jour) : grosse case et bouton « Demain » (`onPostpone`) pour reporter d'un geste ;
 * `handle` : poignée de glisser-déposer (frise horaire) ; `compact` : colonne étroite (vue semaine).
 */
function TaskItem({ occ, peopleById, onToggle, onOpen, onPostpone, handle = null, large = false, compact = false, showDate = false }) {
  const { task, mark } = occ
  const done = mark?.status === 'done'
  const skipped = mark?.status === 'skipped'
  const assigned = occ.assignees.map((id) => peopleById.get(id)).filter(Boolean)
  const doer = done && mark.personId ? peopleById.get(mark.personId) : null
  const color = assigned[0]?.color ?? NEUTRAL_COLOR
  const category = categoryOf(task.category)
  const when = formatDay(occ.date, { weekday: 'long', day: 'numeric', month: 'long' })
  const moved = occ.date !== occ.origin

  return (
    <li
      className={`flex min-w-0 items-start rounded-xl border border-[var(--border-color)] border-l-4 bg-[var(--bg-elevated)] transition ${
        large ? 'items-center gap-3 p-3' : compact ? 'gap-1 p-1' : 'gap-2 p-2'
      } ${done || skipped ? 'opacity-60' : ''}`}
      style={{ borderLeftColor: color }}
    >
      {handle}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`${task.title}, ${when} : ${done ? 'fait' : skipped ? 'sautée' : 'à faire'}`}
        onClick={() => onToggle(occ)}
        className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 font-bold transition ${focusRing} ${
          large ? 'h-11 w-11 text-xl' : compact ? 'mt-0.5 h-5 w-5 text-[10px]' : 'mt-0.5 h-7 w-7 text-sm'
        }`}
        style={done ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color }}
      >
        {done ? '✓' : ''}
      </button>
      <button type="button" onClick={() => onOpen(occ)} className={`min-w-0 flex-1 rounded text-left ${focusRing}`}>
        <span
          className={`block font-medium leading-snug ${large ? 'break-words text-base' : compact ? 'line-clamp-2 text-xs' : 'break-words text-sm'} ${
            done || skipped ? 'line-through' : ''
          }`}
        >
          <span aria-hidden="true">{category.emoji} </span>
          {task.title}
        </span>
        <span
          className={`mt-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)] ${compact ? 'hidden' : 'flex'}`}
        >
          {showDate && <span className="capitalize">{formatDay(occ.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
          {doer ? (
            <span className="inline-flex items-center gap-1">
              <PersonAvatar person={doer} size={18} /> fait
            </span>
          ) : (
            <AvatarStack people={assigned} size={20} />
          )}
          {assigned.length > 0 && <span className="sr-only">Pour {assigned.map((p) => p.name).join(', ')}.</span>}
          {skipped && <span>sautée</span>}
          {moved && <span>reportée (prévue {formatDay(occ.origin, { weekday: 'short', day: 'numeric' })})</span>}
          {task.repeat !== 'none' && (
            <span title={task.repeat === 'after' ? 'Revient après la dernière fois' : task.rotate ? 'Répétée, chacun son tour' : 'Répétée'}>
              ↻{task.rotate ? ' tour' : ''}
            </span>
          )}
          {task.duration && <span>{formatMinutes(task.duration)}</span>}
        </span>
      </button>
      {onPostpone && !mark && (
        <button
          type="button"
          onClick={() => onPostpone(occ)}
          aria-label={`Reporter « ${task.title} » à demain`}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] ${focusRing}`}
        >
          Demain ↷
        </button>
      )}
    </li>
  )
}

/** Résumé de la journée (vue jour) : reste à faire, temps estimé, déjà fait. */
function DaySummary({ list, me }) {
  const todo = list.filter((occ) => !occ.mark)
  const finished = list.length - todo.length
  const minutes = todo.reduce((sum, occ) => sum + (occ.task.duration ?? 0), 0)
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-[var(--text-secondary)]">
      {me && <PersonAvatar person={me} size={22} />}
      <span>
        {list.length === 0
          ? 'Rien de prévu ce jour-là : touche un créneau pour ajouter une tâche.'
          : todo.length === 0
            ? 'Tout est fait, bravo !'
            : `${todo.length} à faire${minutes > 0 ? ` · environ ${formatMinutes(minutes)}` : ''}`}
        {finished > 0 && todo.length > 0 && ` · ${finished} déjà fait${finished > 1 ? 'es' : 'e'}`}
      </span>
    </p>
  )
}

/** Compte pas encore lié : « Qui es-tu ? » pour voir d'abord ses tâches et signer ses coches. */
function WhoAmI({ people, account, onPick, onLater }) {
  return (
    <section aria-labelledby="whoami-title" className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
      <h2 id="whoami-title" className="text-sm font-bold">
        Qui es-tu ?
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Le compte « {account} » s’ouvrira sur tes tâches, et tes coches seront à ton nom.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {people.map((person) => (
          <button
            key={person.id}
            type="button"
            onClick={() => onPick(person.id)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-medium transition hover:bg-[var(--bg-primary)] ${focusRing}`}
            style={{ borderColor: person.color }}
          >
            <PersonAvatar person={person} size={32} />
            {person.name}
          </button>
        ))}
        <button type="button" onClick={onLater} className={`min-h-11 rounded-xl px-3 text-sm text-[var(--text-muted)] underline ${focusRing}`}>
          Plus tard
        </button>
      </div>
    </section>
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
                    key={`${occ.task.id}|${occ.origin}`}
                    className={`h-2 w-2 rounded-full ${occ.mark ? 'opacity-30' : ''}`}
                    style={{ background: peopleById.get(occ.assignees[0])?.color ?? NEUTRAL_COLOR }}
                  />
                ))}
              </span>
              {/* Grand écran : titres. */}
              <span className="hidden flex-col gap-0.5 sm:flex" aria-hidden="true">
                {list.slice(0, 3).map((occ) => (
                  <span
                    key={`${occ.task.id}|${occ.origin}`}
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
