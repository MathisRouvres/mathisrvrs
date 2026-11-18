import { useRef, useState } from 'react'
import { categoryOf } from './catalog'
import { addDays, formatDay } from './recurrence'
import {
  DAY_MINUTES,
  SNAP_MINUTES,
  busyAssignees,
  formatTime,
  hourRange,
  layoutLanes,
  occurrenceSpan,
  segmentsOn,
  snap,
  toMinutes,
  toTime,
} from './schedule'
import { focusRing } from '../dispo/ui'
import { NEUTRAL_COLOR } from './ui'

/** Pixels par minute : 60 px par heure. */
const PX = 1
/** Hauteur minimale d'un bloc (tâche courte) en pixels. */
const MIN_BLOCK = 26
/** Distance (px) à partir de laquelle un appui sur la poignée devient un glisser. */
const DRAG_THRESHOLD = 4
/** Heure donnée à une tâche sans heure déplacée au clavier. */
const KEYBOARD_START = 9 * 60

/**
 * Frise horaire d'un ou plusieurs jours : rangée « Sans heure », puis les heures avec les horaires
 * de travail en fond et les tâches placées à leur heure. Les tâches se glissent-déposent (souris ou
 * doigt, par la poignée ⠿) vers une autre heure, un autre jour ou « Sans heure » ; au clavier, la
 * poignée accepte les flèches (haut/bas : 15 min, gauche/droite : un jour).
 *
 * `onPlace(occ, day, time | null)` enregistre le déplacement ; `renderUntimed(occ, handle)` dessine
 * une tâche sans heure (TaskItem) avec sa poignée.
 */
export default function TimeGrid({
  days,
  today,
  byDay,
  shifts,
  people,
  peopleById,
  activeFilter,
  large = false,
  onToggle,
  onOpen,
  onPlace,
  onAdd,
  renderUntimed,
}) {
  const [drag, setDrag] = useState(null)
  const dragRef = useRef(null)

  const columns = days.map((day) => {
    const list = byDay.get(day) ?? []
    const segments = segmentsOn(shifts, day)
    return {
      day,
      untimed: list.filter((occ) => !occ.time),
      timed: list.filter((occ) => occ.time),
      segments,
      shown: activeFilter === 'all' ? segments : segments.filter((s) => s.personId === activeFilter),
    }
  })
  const range = hourRange(
    columns.flatMap((c) =>
      c.timed.flatMap((occ) => {
        const span = occurrenceSpan(occ)
        return [span.start, span.end]
      }),
    ),
    columns.flatMap((c) => c.shown.flatMap((s) => [s.start, s.end])),
  )
  const height = (range.to - range.from) * PX
  const hours = []
  for (let m = range.from; m <= range.to; m += 60) hours.push(m)

  // ── Glisser-déposer (Pointer Events : souris, doigt, stylet) ───────────────

  function targetAt(x, y, offset) {
    const zone = document.elementFromPoint(x, y)?.closest('[data-drop-day]')
    if (!zone) return null
    const day = zone.getAttribute('data-drop-day')
    if (zone.getAttribute('data-drop-kind') === 'untimed') return { day, minutes: null }
    const top = zone.getBoundingClientRect().top
    const minutes = snap(range.from + (y - offset - top) / PX)
    return { day, minutes: Math.min(range.to - SNAP_MINUTES, Math.max(range.from, minutes)) }
  }

  function handleProps(occ) {
    return {
      onPointerDown(event) {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        // Bloc horaire : garder l'écart entre le doigt et le haut du bloc (pas de saut au départ).
        const block = event.currentTarget.closest('[data-block]')
        const offset = block ? event.clientY - block.getBoundingClientRect().top : 0
        dragRef.current = { occ, x0: event.clientX, y0: event.clientY, offset, moved: false, target: null }
      },
      onPointerMove(event) {
        const state = dragRef.current
        if (!state || state.occ !== occ) return
        if (!state.moved && Math.hypot(event.clientX - state.x0, event.clientY - state.y0) < DRAG_THRESHOLD) return
        state.moved = true
        state.target = targetAt(event.clientX, event.clientY, state.offset)
        // Défilement de la page quand on approche du bord.
        if (event.clientY < 56) window.scrollBy(0, -14)
        else if (event.clientY > window.innerHeight - 56) window.scrollBy(0, 14)
        setDrag({ occ, x: event.clientX, y: event.clientY, target: state.target })
      },
      onPointerUp() {
        const state = dragRef.current
        dragRef.current = null
        setDrag(null)
        if (!state?.moved || !state.target) return
        const { day, minutes } = state.target
        onPlace(occ, day, minutes === null ? null : toTime(minutes))
      },
      onPointerCancel() {
        dragRef.current = null
        setDrag(null)
      },
      onKeyDown(event) {
        const base = occ.time ? toMinutes(occ.time) : null
        let next = null
        if (event.key === 'ArrowUp') next = { day: occ.date, time: toTime(Math.max(0, (base ?? KEYBOARD_START + SNAP_MINUTES) - SNAP_MINUTES)) }
        else if (event.key === 'ArrowDown') next = { day: occ.date, time: toTime(Math.min(DAY_MINUTES - SNAP_MINUTES, base === null ? KEYBOARD_START : base + SNAP_MINUTES)) }
        else if (event.key === 'ArrowLeft') next = { day: addDays(occ.date, -1), time: occ.time }
        else if (event.key === 'ArrowRight') next = { day: addDays(occ.date, 1), time: occ.time }
        if (!next) return
        event.preventDefault()
        onPlace(occ, next.day, next.time)
      },
    }
  }

  const handle = (occ) => <DragHandle occ={occ} props={handleProps(occ)} large={large} />

  // ── Rendu ──────────────────────────────────────────────────────────────────

  const multi = days.length > 1
  const template = `3rem repeat(${days.length}, minmax(${multi ? '7.5rem' : '0'}, 1fr))`
  const nowMinutes = (() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })()

  return (
    <div className={multi ? '-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0' : ''}>
      <div className={`grid gap-x-1.5 ${multi ? 'min-w-[56rem]' : ''}`} style={{ gridTemplateColumns: template }}>
        {multi && (
          <>
            <div aria-hidden="true" />
            {columns.map(({ day }) => {
              const isToday = day === today
              return (
                <div key={day} className="flex items-center justify-between gap-1 px-1 pb-1.5">
                  <span className="text-sm font-semibold capitalize">
                    {formatDay(day, { weekday: 'short' })}{' '}
                    <span className={isToday ? 'rounded-full bg-[var(--accent)] px-1.5 text-white dark:text-[#070b14]' : ''}>
                      {Number(day.slice(8))}
                    </span>
                    {isToday && <span className="sr-only"> (aujourd’hui)</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdd(day, null)}
                    aria-label={`Ajouter une tâche le ${formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)] ${focusRing}`}
                  >
                    +
                  </button>
                </div>
              )
            })}
          </>
        )}

        {/* Rangée « Sans heure ». */}
        <div className="pt-2 text-right text-[11px] leading-tight text-[var(--text-muted)]">Sans heure</div>
        {columns.map(({ day, untimed }) => {
          const over = drag?.target?.day === day && drag.target.minutes === null
          return (
            <section
              key={day}
              data-drop-day={day}
              data-drop-kind="untimed"
              aria-label={`${formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}, sans heure`}
              className={`mb-2 flex min-h-11 flex-col gap-1.5 rounded-xl border border-dashed p-1.5 transition ${
                over ? 'border-[var(--accent)] bg-[var(--bg-elevated)]' : 'border-[var(--border-color)]'
              }`}
            >
              {untimed.length === 0 ? (
                <span className="m-auto text-[11px] text-[var(--text-muted)]">{drag ? 'Déposer ici' : '—'}</span>
              ) : (
                <ul className="flex flex-col gap-1.5">{untimed.map((occ) => renderUntimed(occ, handle(occ)))}</ul>
              )}
            </section>
          )
        })}

        {/* Heures. */}
        <div className="relative" style={{ height }} aria-hidden="true">
          {hours.map((m) => (
            <span key={m} className="absolute right-1 -translate-y-1/2 text-[11px] text-[var(--text-muted)]" style={{ top: (m - range.from) * PX }}>
              {formatTime(toTime(m === DAY_MINUTES ? DAY_MINUTES - 1 : m)).replace('23h59', '24h')}
            </span>
          ))}
        </div>
        {columns.map((column) => (
          <DayColumn
            key={column.day}
            column={column}
            range={range}
            height={height}
            today={today}
            nowMinutes={nowMinutes}
            people={people}
            peopleById={peopleById}
            large={large}
            drag={drag}
            handle={handle}
            onToggle={onToggle}
            onOpen={onOpen}
            onAdd={onAdd}
          />
        ))}
      </div>

      {drag && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 max-w-56 -translate-x-1/2 -translate-y-full truncate rounded-lg bg-[var(--text-primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--bg-primary)] shadow-lg"
          style={{ left: drag.x, top: drag.y - 8 }}
        >
          {drag.occ.task.title}
          {drag.target &&
            ` → ${formatDay(drag.target.day, { weekday: 'short', day: 'numeric' })}${
              drag.target.minutes === null ? ', sans heure' : `, ${formatTime(toTime(drag.target.minutes))}`
            }`}
        </div>
      )}
    </div>
  )
}

/** Une colonne de jour : lignes des heures, horaires de travail, tâches placées, aperçu du dépôt. */
function DayColumn({ column, range, height, today, nowMinutes, people, peopleById, large, drag, handle, onToggle, onOpen, onAdd }) {
  const { day, timed, segments, shown } = column
  const workers = people.filter((p) => shown.some((s) => s.personId === p.id))
  const gutter = workers.length > 0 ? workers.length * 6 + 4 : 2
  const spans = timed.map((occ) => occurrenceSpan(occ))
  const lanes = layoutLanes(spans.map((s) => ({ start: s.start, end: Math.max(s.end, s.start + MIN_BLOCK / PX) })))
  const preview = drag?.target?.day === day && drag.target.minutes !== null ? drag.target.minutes : null
  const previewHeight = Math.max(MIN_BLOCK, (drag?.occ.task.duration ?? 30) * PX)

  function addAt(event) {
    if (event.target !== event.currentTarget) return
    const minutes = snap(range.from + (event.clientY - event.currentTarget.getBoundingClientRect().top) / PX, 30)
    onAdd(day, toTime(Math.min(range.to - 30, Math.max(range.from, minutes))))
  }

  return (
    <div
      data-drop-day={day}
      onClick={addAt}
      className={`relative cursor-copy rounded-xl border ${
        day === today ? 'border-[var(--accent)]' : 'border-[var(--border-color)]'
      } bg-[var(--bg-elevated)]`}
      style={{
        height,
        backgroundImage: `repeating-linear-gradient(to bottom, var(--border-color) 0, var(--border-color) 1px, transparent 1px, transparent ${60 * PX}px)`,
        backgroundPositionY: `${((60 - (range.from % 60)) % 60) * PX}px`,
      }}
    >
      {/* Horaires de travail : fond teinté + barre de couleur par personne. */}
      {shown.map((segment, i) => {
        const person = peopleById.get(segment.personId)
        const color = person?.color ?? NEUTRAL_COLOR
        const index = workers.findIndex((p) => p.id === segment.personId)
        const top = (Math.max(segment.start, range.from) - range.from) * PX
        const h = (Math.min(segment.end, range.to) - Math.max(segment.start, range.from)) * PX
        if (h <= 0) return null
        const label = `${person?.name ?? 'Travail'} travaille ${formatTime(segment.shift.start)}–${formatTime(segment.shift.end)}`
        return (
          <div key={`${segment.personId}-${i}`} className="pointer-events-none absolute inset-x-0" style={{ top, height: h }}>
            <div className="absolute inset-0" style={{ background: `${color}14` }} />
            <div aria-hidden="true" className="absolute inset-y-0 w-1 rounded-full" style={{ left: 2 + index * 6, background: color }} />
            {h >= 18 && (
              <span aria-hidden="true" className="absolute right-1 top-0.5 truncate text-[10px] font-medium" style={{ color, left: gutter }}>
                💼 {large ? label : `${person?.name ?? ''} ${formatTime(segment.shift.start)}–${formatTime(segment.shift.end)}`}
              </span>
            )}
            <span className="sr-only">{label}</span>
          </div>
        )
      })}

      {day === today && nowMinutes >= range.from && nowMinutes <= range.to && (
        <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-red-500" style={{ top: (nowMinutes - range.from) * PX }}>
          <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="sr-only">Maintenant</span>
        </div>
      )}

      {timed.map((occ, i) => (
        <TimedBlock
          key={`${occ.task.id}|${occ.origin}`}
          occ={occ}
          span={spans[i]}
          lane={lanes[i]}
          range={range}
          gutter={gutter}
          large={large}
          busy={busyAssignees(occ, segments).map((id) => peopleById.get(id)?.name).filter(Boolean)}
          peopleById={peopleById}
          dragging={drag?.occ === occ}
          handle={handle(occ)}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}

      {preview !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20 rounded-lg border-2 border-dashed border-[var(--accent)] px-1.5 text-[11px] font-semibold text-[var(--accent)]"
          style={{
            top: (preview - range.from) * PX,
            height: previewHeight,
            left: gutter,
            right: 2,
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          }}
        >
          {formatTime(toTime(preview))}
        </div>
      )}
    </div>
  )
}

function TimedBlock({ occ, span, lane, range, gutter, large, busy, peopleById, dragging, handle, onToggle, onOpen }) {
  const { task, mark } = occ
  const done = mark?.status === 'done'
  const skipped = mark?.status === 'skipped'
  const assigned = occ.assignees.map((id) => peopleById.get(id)).filter(Boolean)
  const color = assigned[0]?.color ?? NEUTRAL_COLOR
  const top = (span.start - range.from) * PX
  const blockHeight = Math.max(MIN_BLOCK, (span.end - span.start) * PX)
  const when = `${formatTime(occ.time)}${task.duration ? `–${formatTime(toTime(span.end))}` : ''}`
  const width = `calc((100% - ${gutter + 2}px) / ${lane.lanes} - 2px)`
  const left = `calc(${gutter}px + (100% - ${gutter + 2}px) * ${lane.lane / lane.lanes})`

  return (
    <div
      data-block
      className={`absolute z-10 flex min-w-0 items-start gap-1 overflow-hidden rounded-lg border-l-4 p-0.5 pr-1 shadow-sm transition ${
        dragging ? 'opacity-40' : done || skipped ? 'opacity-60' : ''
      }`}
      style={{ top, height: blockHeight, left, width, borderLeftColor: color, background: `color-mix(in srgb, ${color} 18%, var(--bg-elevated))` }}
    >
      {handle}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`${task.title}, ${formatDay(occ.date, { weekday: 'long', day: 'numeric', month: 'long' })} à ${formatTime(occ.time)} : ${
          done ? 'fait' : skipped ? 'sautée' : 'à faire'
        }`}
        onClick={() => onToggle(occ)}
        className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full border-2 font-bold transition ${focusRing} ${
          large ? 'h-6 w-6 text-xs' : 'h-5 w-5 text-[10px]'
        }`}
        style={done ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color }}
      >
        {done ? '✓' : ''}
      </button>
      <button type="button" onClick={() => onOpen(occ)} className={`min-w-0 flex-1 rounded text-left leading-tight ${focusRing}`}>
        <span className={`block truncate font-medium ${large ? 'text-sm' : 'text-xs'} ${done || skipped ? 'line-through' : ''}`}>
          {busy.length > 0 && (
            <span title={`Pendant le travail de ${busy.join(', ')}`}>
              <span aria-hidden="true">⚠️ </span>
              <span className="sr-only">Attention, pendant le travail de {busy.join(', ')}. </span>
            </span>
          )}
          <span aria-hidden="true">{categoryOf(task.category).emoji} </span>
          {task.title}
        </span>
        <span className="block truncate text-[11px] text-[var(--text-secondary)]">
          {when}
          {large && busy.length > 0 && (
            <span className="font-semibold text-amber-700 dark:text-amber-300"> · {busy.join(', ')} au travail</span>
          )}
          {large && assigned.length > 0 && <span> · {assigned.map((p) => p.name).join(', ')}</span>}
        </span>
      </button>
    </div>
  )
}

/** Poignée ⠿ : glisser (souris, doigt) ou flèches du clavier. */
function DragHandle({ occ, props, large }) {
  const where = `${formatDay(occ.date, { weekday: 'long', day: 'numeric' })}${occ.time ? ` à ${formatTime(occ.time)}` : ', sans heure'}`
  return (
    <button
      type="button"
      {...props}
      aria-label={`Déplacer « ${occ.task.title} » (${where}). Glisser, ou flèches : haut et bas 15 minutes, gauche et droite un jour.`}
      className={`inline-flex shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] active:cursor-grabbing ${focusRing} ${
        large ? 'h-8 w-6 text-base' : 'h-6 w-4 text-xs'
      }`}
    >
      <span aria-hidden="true">⠿</span>
    </button>
  )
}
