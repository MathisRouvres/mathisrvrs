import { useEffect, useRef, useState } from 'react'
import { SLOTS_PER_DAY, isPastSlot, slotKey, slotLabel, slotStart } from './slots'
import { Avatar, focusRing } from './ui'

/** À partir de ce nombre de personnes dispo (soi compris), le créneau est mis en avant. */
export const GROUP_SIZE = 4

const dayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const dayNumber = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' })
const dayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const weekdayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * Grille de la semaine : une colonne par jour, une ligne par créneau de 30 min.
 * Souris : cliquer-glisser coche (ou décoche) plusieurs créneaux d'un coup. Tactile : un
 * appui coche/décoche une case, le défilement reste libre. Clavier : flèches + Entrée/Espace.
 * Chaque case montre la tête (photo ou initiale) des autres personnes dispo.
 *
 * `mode` : `week` (dates de la semaine) ou `weekly` (semaine type : jours sans date).
 * `recurring` : mes créneaux dus à une règle hebdomadaire, marqués ↻.
 */
export default function WeekGrid({ mode = 'week', days, now, meId, availability, recurring, peopleById, onSet }) {
  const weekly = mode === 'weekly'
  const cells = useRef(new Map())
  const paint = useRef(null)
  const skipClick = useRef(false)
  const [focus, setFocus] = useState({ day: 0, slot: 0 })

  useEffect(() => {
    const stop = () => {
      paint.current = null
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  function cellInfo(dayIndex, slotIndex) {
    const start = slotStart(days[dayIndex], slotIndex)
    const key = slotKey(start)
    const ids = availability.get(key) ?? new Set()
    return { key, start, ids, mine: ids.has(meId), past: isPastSlot(start, now) }
  }

  function set(dayIndex, slotIndex, value) {
    const cell = cellInfo(dayIndex, slotIndex)
    if (cell.past || cell.mine === value) return
    onSet(cell.key, value)
  }

  function toggle(dayIndex, slotIndex) {
    set(dayIndex, slotIndex, !cellInfo(dayIndex, slotIndex).mine)
  }

  function handlePointerDown(event, dayIndex, slotIndex) {
    if (event.pointerType === 'touch' || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    skipClick.current = true
    setFocus({ day: dayIndex, slot: slotIndex })
    const cell = cellInfo(dayIndex, slotIndex)
    if (cell.past) return
    paint.current = { value: !cell.mine, day: dayIndex, slot: slotIndex }
    set(dayIndex, slotIndex, paint.current.value)
  }

  // Rectangle entre la case de départ et la case survolée : une souris rapide qui saute
  // des cases les coche quand même.
  function handlePointerEnter(dayIndex, slotIndex) {
    const anchor = paint.current
    if (!anchor) return
    for (let day = Math.min(anchor.day, dayIndex); day <= Math.max(anchor.day, dayIndex); day++) {
      for (let slot = Math.min(anchor.slot, slotIndex); slot <= Math.max(anchor.slot, slotIndex); slot++) {
        set(day, slot, anchor.value)
      }
    }
  }

  function handleClick(dayIndex, slotIndex) {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    setFocus({ day: dayIndex, slot: slotIndex })
    toggle(dayIndex, slotIndex)
  }

  function handleKeyDown(event, dayIndex, slotIndex) {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    const day = Math.min(6, Math.max(0, dayIndex + move[0]))
    const slot = Math.min(SLOTS_PER_DAY - 1, Math.max(0, slotIndex + move[1]))
    setFocus({ day, slot })
    cells.current.get(`${day}-${slot}`)?.focus()
  }

  return (
    <div
      role="group"
      aria-label={weekly ? 'Créneaux de ma semaine type' : 'Créneaux de la semaine'}
      className="grid select-none grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]"
    >
      <div className="sticky top-0 z-10 bg-[var(--bg-elevated)]" />
      {days.map((day) => {
        const today = sameDay(day, now)
        return (
          <div
            key={day.toISOString()}
            className="sticky top-0 z-10 flex flex-col items-center bg-[var(--bg-elevated)] pb-2 pt-1 text-center"
          >
            <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{dayShort.format(day)}</span>
            {!weekly && (
              <span
                className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                  today ? 'bg-[var(--accent)] text-white dark:text-[#070b14]' : ''
                }`}
              >
                {dayNumber.format(day)}
              </span>
            )}
          </div>
        )
      })}

      {Array.from({ length: SLOTS_PER_DAY }, (_, slotIndex) => (
        <Row key={slotIndex} slotIndex={slotIndex}>
          {days.map((day, dayIndex) => {
            const { key, start, ids, mine, past } = cellInfo(dayIndex, slotIndex)
            const otherPeople = [...ids].filter((id) => id !== meId).map((id) => peopleById.get(id)).filter(Boolean)
            const others = otherPeople.length
            const group = ids.size >= GROUP_SIZE
            const repeats = mine && recurring.has(key)
            const names = [...(mine ? ['toi'] : []), ...otherPeople.map((p) => p.name)]
            const when = weekly ? `Chaque ${weekdayLong.format(start)}` : dayLong.format(start)
            const label = `${when}, ${slotLabel(slotIndex)} : ${mine ? 'tu es dispo' : 'tu n’es pas dispo'}${
              repeats ? ' (chaque semaine)' : ''
            }${others > 0 ? `, aussi dispo : ${otherPeople.map((p) => p.name).join(', ')}` : ''}${past ? ' (passé)' : ''}`
            const isFocused = focus.day === dayIndex && focus.slot === slotIndex
            return (
              <button
                key={dayIndex}
                ref={(node) => {
                  if (node) cells.current.set(`${dayIndex}-${slotIndex}`, node)
                  else cells.current.delete(`${dayIndex}-${slotIndex}`)
                }}
                type="button"
                tabIndex={isFocused ? 0 : -1}
                aria-pressed={mine}
                aria-disabled={past || undefined}
                aria-label={label}
                title={names.length ? `${slotLabel(slotIndex)} · ${names.join(', ')}` : undefined}
                onPointerDown={(event) => handlePointerDown(event, dayIndex, slotIndex)}
                onPointerEnter={() => handlePointerEnter(dayIndex, slotIndex)}
                onClick={() => handleClick(dayIndex, slotIndex)}
                onKeyDown={(event) => handleKeyDown(event, dayIndex, slotIndex)}
                className={`relative m-px flex h-8 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition-colors focus-visible:z-[1] ${focusRing} ${cellClass(
                  { mine, others, past },
                )} ${group ? 'ring-2 ring-inset ring-amber-400' : ''}`}
              >
                {repeats && (
                  <span aria-hidden="true" className="absolute left-0.5 top-0 text-[9px] leading-none opacity-80">
                    ↻
                  </span>
                )}
                {others > 0 && <Faces people={otherPeople} />}
              </button>
            )
          })}
        </Row>
      ))}
    </div>
  )
}

/** Têtes des autres personnes dispo : 2 sur mobile, 4 sur grand écran, puis « +n ». */
function Faces({ people }) {
  return (
    <span aria-hidden="true" className="flex items-center">
      {people.slice(0, 4).map((person, index) => (
        <Avatar
          key={person.id}
          person={person}
          size={16}
          className={`ring-1 ring-white/80 dark:ring-black/40 ${index > 0 ? '-ml-1' : ''} ${index >= 2 ? 'hidden sm:inline-flex' : ''}`}
        />
      ))}
      {people.length > 2 && (
        <span className="ml-0.5 text-[9px] font-bold leading-none sm:hidden">+{people.length - 2}</span>
      )}
      {people.length > 4 && (
        <span className="ml-0.5 hidden text-[9px] font-bold leading-none sm:inline">+{people.length - 4}</span>
      )}
    </span>
  )
}

function Row({ slotIndex, children }) {
  const fullHour = slotIndex % 2 === 0
  return (
    <>
      <div
        className={`${slotIndex === 0 ? '' : '-mt-2'} pr-1.5 text-right text-[10px] tabular-nums text-[var(--text-muted)] sm:pr-2 sm:text-xs ${
          fullHour ? '' : 'invisible'
        }`}
        aria-hidden="true"
      >
        {slotLabel(slotIndex)}
      </div>
      {children}
    </>
  )
}

function cellClass({ mine, others, past }) {
  let color = 'bg-[var(--bg-primary)]'
  if (mine) color = 'bg-[var(--accent)] text-white dark:text-[#070b14]'
  else if (others >= 3) color = 'bg-emerald-500/45 text-emerald-950 dark:text-emerald-50'
  else if (others === 2) color = 'bg-emerald-500/30 text-emerald-900 dark:text-emerald-100'
  else if (others === 1) color = 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
  // Passé : visible (historique) mais estompé et non modifiable.
  return past ? `${color} cursor-not-allowed opacity-35` : `${color} cursor-pointer hover:opacity-75`
}
