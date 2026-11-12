import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DispoError, listCourts, listSlots, saveSlots, updateAvatar } from './api'
import BestSlots from './BestSlots'
import CourtSlots from './CourtSlots'
import { courtMatches, weekParam } from './courts'
import PhotoInput from './PhotoInput'
import WeekGrid from './WeekGrid'
import {
  addDays,
  applyOverlay,
  buildWeekData,
  changesFromOverlay,
  commonRuns,
  expandWeek,
  myRecurringKeys,
  skipOpsOfRule,
  startOfWeek,
  toggleOps,
  weekDays,
  weeklyPattern,
  weekRange,
} from './slots'
import { Avatar, Spinner, card, focusRing, secondaryButton } from './ui'

const SAVE_DELAY_MS = 400
const REFRESH_MS = 30_000
const COURTS_REFRESH_MS = 5 * 60_000
/** Semaines dont on cherche les terrains : la courante et les 8 suivantes (dispo-courts.php). */
const COURTS_WEEKS_AHEAD = 8

const monthDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

function weekTitle(weekStart) {
  const end = addDays(weekStart, 6)
  return `${monthDay.format(weekStart)} – ${monthDay.format(end)} ${end.getFullYear()}`
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

/**
 * Données de la semaine affichée (créneaux, règles hebdomadaires, exceptions) + enregistrement
 * des miennes. Mes changements s'affichent tout de suite (`overlay` : `slot:`, `weekly:`, `skip:`)
 * et partent groupés après une courte pause ; une fois enregistrés, la semaine est relue. Les
 * autres apparaissent par relecture toutes les 30 s (onglet visible).
 */
function useWeekAvailability(weekStart, meId) {
  // Réponses étiquetées par semaine : une lecture lente de la semaine quittée est ignorée.
  const [server, setServer] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [overlay, setOverlay] = useState(() => new Map())
  const [saveState, setSaveState] = useState('idle')
  const queue = useRef(new Map())
  const busy = useRef(false)
  const timer = useRef(null)
  const weekRef = useRef(weekStart)
  const flushRef = useRef(null)
  const week = weekStart.getTime()

  const refresh = useCallback(async () => {
    const start = weekRef.current
    const { from, to } = weekRange(start)
    const rows = await listSlots(from, to)
    setServer({ week: start.getTime(), data: buildWeekData(rows) })
  }, [])

  const load = useCallback(() => {
    const start = weekRef.current.getTime()
    refresh().catch((error) => setLoadError({ week: start, error }))
  }, [refresh])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    if (busy.current || queue.current.size === 0) return
    const batch = [...queue.current]
    queue.current = new Map()
    busy.current = true
    setSaveState('saving')
    try {
      await saveSlots(meId, changesFromOverlay(batch))
      await refresh()
      setSaveState('saved')
    } catch (error) {
      queue.current = new Map()
      setSaveState(error instanceof DispoError && error.kind === 'network' ? 'error-network' : 'error')
      await refresh().catch(() => {})
    } finally {
      busy.current = false
      // Ce qui a été coché pendant l'envoi reste affiché et part au tour suivant.
      setOverlay(new Map(queue.current))
      if (queue.current.size > 0) timer.current = setTimeout(() => flushRef.current?.(), SAVE_DELAY_MS)
    }
  }, [meId, refresh])

  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  const applyOps = useCallback(
    (ops) => {
      if (ops.length === 0) return
      const apply = (map) => {
        for (const [op, on] of ops) {
          // Poser ou retirer une règle efface ses exceptions : les exceptions en attente aussi.
          if (op.startsWith('weekly:')) for (const skip of skipOpsOfRule(map, op.slice(7))) map.delete(skip)
          map.set(op, on)
        }
        return map
      }
      apply(queue.current)
      setOverlay((previous) => apply(new Map(previous)))
      setSaveState('pending')
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DELAY_MS)
    },
    [flush],
  )

  useEffect(() => {
    weekRef.current = weekStart
    load()
  }, [weekStart, load])

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState !== 'visible' || busy.current || queue.current.size > 0) return
      refresh().catch(() => {})
    }
    const onVisibility = () => (document.visibilityState === 'hidden' ? flush() : poll())
    const interval = setInterval(poll, REFRESH_MS)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', poll)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', poll)
    }
  }, [refresh, flush])

  useEffect(() => () => flush(), [flush])

  const current = server?.week === week ? server.data : null
  const data = useMemo(() => (current ? applyOverlay(current, meId, overlay) : null), [current, overlay, meId])

  const retry = () => {
    setLoadError(null)
    load()
  }

  return { data, loadError: loadError?.week === week ? loadError.error : null, saveState, applyOps, retry }
}

/**
 * Terrains libres des clubs pour la semaine affichée, relus toutes les 5 min (le serveur les
 * garde 5 min en cache). `enabled` = faux pour une semaine passée ou trop lointaine.
 */
function useCourts(weekStart, enabled) {
  // Réponse étiquetée par semaine, comme useWeekAvailability.
  const [state, setState] = useState(null)
  const week = weekStart.getTime()

  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    const load = () => {
      if (document.visibilityState !== 'visible') return
      listCourts(weekParam(weekStart), controller.signal)
        .then((clubs) => setState({ week, clubs, error: null }))
        .catch((error) => {
          if (controller.signal.aborted) return
          // Un échec de relecture garde les terrains déjà affichés.
          setState((previous) => ({ week, clubs: previous?.week === week ? previous.clubs : null, error }))
        })
    }
    load()
    const timer = setInterval(load, COURTS_REFRESH_MS)
    document.addEventListener('visibilitychange', load)
    return () => {
      controller.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [weekStart, week, enabled])

  const current = enabled && state?.week === week ? state : null
  return { clubs: current?.clubs ?? null, error: current?.error ?? null }
}

const SAVE_LABELS = {
  idle: '',
  pending: 'Modifications en attente…',
  saving: 'Enregistrement…',
  saved: 'Enregistré',
  error: 'Une modification a été refusée. Le calendrier a été rechargé.',
  'error-network': 'Pas de connexion : modification non enregistrée.',
}

export default function Calendar({ me, people, onSwitch, onAvatarChange }) {
  const now = useNow()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const [mode, setMode] = useState('week')
  const { data, loadError, saveState, applyOps, retry } = useWeekAvailability(weekStart, me.id)
  const availability = useMemo(() => (data ? expandWeek(data, days) : null), [data, days])
  const pattern = useMemo(() => (data ? weeklyPattern(data, days) : null), [data, days])
  const recurring = useMemo(() => (data ? myRecurringKeys(data, me.id, days) : new Set()), [data, me.id, days])
  const runs = useMemo(() => (availability ? commonRuns(availability, days, now) : []), [availability, days, now])
  const thisWeek = startOfWeek(now)
  const isCurrentWeek = thisWeek.getTime() === weekStart.getTime()
  const courtsEnabled = weekStart >= thisWeek && weekStart <= addDays(thisWeek, 7 * COURTS_WEEKS_AHEAD)
  const courts = useCourts(weekStart, courtsEnabled)
  const matches = useMemo(
    () => (courts.clubs && availability ? courtMatches(courts.clubs, availability, now) : []),
    [courts.clubs, availability, now],
  )
  const weekly = mode === 'weekly'

  function setSlot(key, on) {
    if (data) applyOps(toggleOps(data, me.id, new Date(key), on, mode))
  }

  async function changeAvatar(dataUrl) {
    await updateAvatar(me.id, dataUrl)
    onAvatarChange(dataUrl)
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-2 pb-16 sm:px-4">
      <header className="flex flex-wrap items-center justify-between gap-3 px-2 py-5 sm:px-0">
        <div className="flex min-w-0 items-center gap-3">
          <PhotoInput onChange={changeAvatar} className="group relative block rounded-full">
            <Avatar person={me} size={48} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[10px] shadow group-hover:border-[var(--accent)]">
              📷
            </span>
            <span className="sr-only">{me.avatar ? 'Changer ma photo' : 'Ajouter une photo'}</span>
          </PhotoInput>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold sm:text-2xl">Salut {me.name} 👋</h1>
            <p className="text-xs text-[var(--text-secondary)]">Coche les créneaux où tu es dispo.</p>
            <PhotoInput
              onChange={changeAvatar}
              className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-lg text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
            >
              <span aria-hidden="true">📷</span> {me.avatar ? 'Changer ma photo' : 'Ajouter ma photo'}
            </PhotoInput>
          </div>
        </div>
        <button type="button" onClick={onSwitch} className={secondaryButton}>
          Changer de profil
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section className={`${card} px-2 sm:px-4`} aria-labelledby="dispo-week">
          <ModeSwitch mode={mode} onChange={setMode} />

          <div className="mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2 px-1">
            <h2 id="dispo-week" className="font-display text-base font-bold tabular-nums">
              {weekly ? 'Ma semaine type' : weekTitle(weekStart)}
            </h2>
            {weekly ? (
              <p className="w-full text-xs text-[var(--text-secondary)]">
                Ce que tu coches ici vaut <strong>chaque semaine</strong>. Pour une semaine précise, décoche
                le créneau dans « Cette semaine » : la règle reste.
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                <NavButton label="Semaine précédente" onClick={() => setWeekStart((w) => addDays(w, -7))}>
                  ‹
                </NavButton>
                <button
                  type="button"
                  disabled={isCurrentWeek}
                  onClick={() => setWeekStart(startOfWeek(new Date()))}
                  className={`${secondaryButton} min-h-9 px-3 text-xs`}
                >
                  Aujourd’hui
                </button>
                <NavButton label="Semaine suivante" onClick={() => setWeekStart((w) => addDays(w, 7))}>
                  ›
                </NavButton>
              </div>
            )}
          </div>

          <p aria-live="polite" className="mb-2 min-h-4 px-1 text-xs">
            <span
              className={
                saveState.startsWith('error') ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'
              }
            >
              {SAVE_LABELS[saveState]}
            </span>
          </p>

          {availability && pattern ? (
            <WeekGrid
              mode={mode}
              days={days}
              now={weekly ? NEVER_PAST : now}
              meId={me.id}
              availability={weekly ? pattern : availability}
              recurring={weekly ? EMPTY : recurring}
              peopleById={peopleById}
              onSet={setSlot}
            />
          ) : loadError ? (
            <div role="alert" className="py-12 text-center">
              <p className="text-sm text-[var(--text-secondary)]">{loadError.message}</p>
              <button type="button" onClick={retry} className={`${secondaryButton} mt-4`}>
                Réessayer
              </button>
            </div>
          ) : (
            <Spinner />
          )}

          <Legend />
        </section>

        <aside className="space-y-4">
          {courtsEnabled && (
            <CourtSlots
              clubs={availability ? courts.clubs : null}
              matches={matches}
              error={courts.error}
              meId={me.id}
              peopleById={peopleById}
            />
          )}
          <BestSlots runs={runs} meId={me.id} peopleById={peopleById} />
          <section className={card} aria-labelledby="dispo-people">
            <h2 id="dispo-people" className="font-display text-base font-bold">
              Participants · {people.length}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {people.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center gap-2 rounded-full border border-[var(--border-color)] py-1 pl-1 pr-3 text-sm"
                >
                  <Avatar person={person} size={24} />
                  {person.name}
                  {person.id === me.id && <span className="text-xs text-[var(--text-muted)]">(toi)</span>}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

/** En mode « semaine type », aucune case n'est passée ni « aujourd'hui ». */
const NEVER_PAST = new Date(0)
const EMPTY = new Set()

function ModeSwitch({ mode, onChange }) {
  const options = [
    { value: 'week', label: 'Cette semaine' },
    { value: 'weekly', label: '↻ Chaque semaine' },
  ]
  return (
    <div
      role="group"
      aria-label="Ce que je coche"
      className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${focusRing} ${
            mode === option.value
              ? 'bg-[var(--accent)] text-white shadow-sm dark:text-[#070b14]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function NavButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-lg transition hover:border-[var(--accent)] ${focusRing}`}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}

function Legend() {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-[var(--text-secondary)]">
      <li className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded bg-[var(--accent)]" aria-hidden="true" /> Toi
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded bg-emerald-500/40" aria-hidden="true" /> Autres dispo (photo ou initiale)
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true">↻</span> Chaque semaine
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded ring-2 ring-inset ring-amber-400" aria-hidden="true" /> 4+ ensemble
      </li>
      <li className="hidden sm:block">Astuce : cliquer-glisser pour cocher plusieurs créneaux.</li>
    </ul>
  )
}
