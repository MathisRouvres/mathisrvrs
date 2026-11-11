import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DispoError, listSlots, saveSlots, updateAvatar } from './api'
import BestSlots from './BestSlots'
import PhotoInput from './PhotoInput'
import WeekGrid from './WeekGrid'
import { addDays, buildAvailability, commonRuns, startOfWeek, weekDays, weekRange } from './slots'
import { Avatar, Spinner, card, focusRing, secondaryButton } from './ui'

const SAVE_DELAY_MS = 400
const REFRESH_MS = 30_000

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
 * Créneaux de la semaine affichée + enregistrement des miens. Les cases cochées s'affichent
 * tout de suite (`overlay`) et partent groupées après une courte pause ; une fois enregistrées,
 * la semaine est relue. Les autres apparaissent par relecture toutes les 30 s (onglet visible).
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
    setServer({ week: start.getTime(), data: buildAvailability(rows) })
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
      await saveSlots(
        meId,
        batch.filter(([, on]) => on).map(([key]) => key),
        batch.filter(([, on]) => !on).map(([key]) => key),
      )
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

  const setSlot = useCallback(
    (key, on) => {
      queue.current.set(key, on)
      setOverlay((previous) => new Map(previous).set(key, on))
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
  const availability = useMemo(() => {
    if (!current) return null
    const merged = new Map([...current].map(([key, ids]) => [key, new Set(ids)]))
    for (const [key, on] of overlay) {
      const ids = merged.get(key) ?? new Set()
      if (on) ids.add(meId)
      else ids.delete(meId)
      merged.set(key, ids)
    }
    return merged
  }, [current, overlay, meId])

  const retry = () => {
    setLoadError(null)
    load()
  }

  return { availability, loadError: loadError?.week === week ? loadError.error : null, saveState, setSlot, retry }
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
  const { availability, loadError, saveState, setSlot, retry } = useWeekAvailability(weekStart, me.id)
  const runs = useMemo(() => (availability ? commonRuns(availability, days, now) : []), [availability, days, now])
  const isCurrentWeek = startOfWeek(now).getTime() === weekStart.getTime()

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
          </div>
        </div>
        <button type="button" onClick={onSwitch} className={secondaryButton}>
          Changer de profil
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section className={`${card} px-2 sm:px-4`} aria-labelledby="dispo-week">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 id="dispo-week" className="font-display text-base font-bold tabular-nums">
              {weekTitle(weekStart)}
            </h2>
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

          {availability ? (
            <WeekGrid
              days={days}
              now={now}
              meId={me.id}
              availability={availability}
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
        <span className="h-3.5 w-3.5 rounded bg-emerald-500/40" aria-hidden="true" /> Autres dispo (nombre)
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded ring-2 ring-inset ring-amber-400" aria-hidden="true" /> 4+ ensemble
      </li>
      <li className="hidden sm:block">Astuce : cliquer-glisser pour cocher plusieurs créneaux.</li>
    </ul>
  )
}
