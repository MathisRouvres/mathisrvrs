import { describe, expect, it } from 'vitest'
import type { Occurrence, Task } from './recurrence'
import {
  busyAssignees,
  formatTime,
  hourRange,
  layoutLanes,
  occurrenceSpan,
  parsePlanning,
  planningText,
  segmentsOn,
  snap,
  toMinutes,
  toTime,
} from './schedule'

function occ(time: string | null, duration: number | null, assignees: string[]): Occurrence {
  const task = { id: 't', title: 'T', duration, assignees } as Task
  return { task, date: '2026-11-17', origin: '2026-11-17', time, index: 0, assignees, mark: null }
}

describe('heures', () => {
  it('convertit, arrondit au quart d’heure et affiche', () => {
    expect(toMinutes('08:30')).toBe(510)
    expect(toTime(510)).toBe('08:30')
    expect(toTime(-10)).toBe('00:00')
    expect(toTime(2000)).toBe('23:59')
    expect(snap(518)).toBe(525)
    expect(formatTime('08:00')).toBe('8h')
    expect(formatTime('14:05')).toBe('14h05')
  })

  it('durée par défaut de 30 min, rien sans heure', () => {
    expect(occurrenceSpan(occ('09:00', null, []))).toEqual({ start: 540, end: 570 })
    expect(occurrenceSpan(occ('23:50', 60, []))).toEqual({ start: 1430, end: 1440 })
    expect(occurrenceSpan(occ(null, 60, []))).toBeNull()
  })

  it('frise de 7h à 22h, élargie aux tâches, et aux horaires de travail dans 6h – 23h', () => {
    expect(hourRange([])).toEqual({ from: 420, to: 1320 })
    expect(hourRange([330, 1410])).toEqual({ from: 300, to: 1440 })
    // Nuit de travail 21h – 6h : 0h et 24h ramenés à 6h et 23h.
    expect(hourRange([], [0, 360, 1260, 1440])).toEqual({ from: 360, to: 1380 })
  })
})

describe('horaires de travail', () => {
  const shifts = [
    { personId: 'isis', day: '2026-11-16', start: '21:00', end: '06:00' },
    { personId: 'isis', day: '2026-11-17', start: '08:00', end: '12:00' },
    { personId: 'isis', day: '2026-11-17', start: '14:00', end: '18:00' },
  ]

  it('découpe les horaires de nuit sur deux jours', () => {
    expect(segmentsOn(shifts, '2026-11-17').map((s) => [s.start, s.end])).toEqual([
      [0, 360],
      [480, 720],
      [840, 1080],
    ])
    expect(segmentsOn(shifts, '2026-11-16').map((s) => [s.start, s.end])).toEqual([[1260, 1440]])
  })

  it('signale une tâche pendant le travail d’une personne chargée de la tâche seulement', () => {
    const segments = segmentsOn(shifts, '2026-11-17')
    expect(busyAssignees(occ('11:45', 30, ['isis', 'mathis']), segments)).toEqual(['isis'])
    expect(busyAssignees(occ('12:00', 120, ['isis']), segments)).toEqual([])
    expect(busyAssignees(occ('09:00', 30, ['mathis']), segments)).toEqual([])
    expect(busyAssignees(occ(null, 30, ['isis']), segments)).toEqual([])
  })
})

describe('colonnes de la frise', () => {
  it('met côte à côte les blocs qui se chevauchent', () => {
    const lanes = layoutLanes([
      { start: 0, end: 60 },
      { start: 30, end: 90 },
      { start: 60, end: 120 },
      { start: 200, end: 230 },
    ])
    expect(lanes).toEqual([
      { lane: 0, lanes: 2 },
      { lane: 1, lanes: 2 },
      { lane: 0, lanes: 2 },
      { lane: 0, lanes: 1 },
    ])
  })
})

describe('planning collé en texte', () => {
  it('lit dates françaises ou ISO, plusieurs créneaux, repos et horaires de nuit', () => {
    const text = [
      '# Semaine 47',
      'lun 16/11 8h-16h30',
      'Mardi 17/11 : 08:00 - 12:00 / 14h-18h',
      '2026-11-18 repos',
      '19.11.2026 21h à 6h',
      '',
    ].join('\n')
    const { days, errors } = parsePlanning(text, '2026-11-17')
    expect(errors).toEqual([])
    expect([...days]).toEqual([
      ['2026-11-16', [{ start: '08:00', end: '16:30' }]],
      [
        '2026-11-17',
        [
          { start: '08:00', end: '12:00' },
          { start: '14:00', end: '18:00' },
        ],
      ],
      ['2026-11-18', []],
      ['2026-11-19', [{ start: '21:00', end: '06:00' }]],
    ])
    expect(planningText(days).split('\n')[2]).toBe('2026-11-18 repos')
  })

  it('choisit l’année la plus proche quand elle manque', () => {
    expect([...parsePlanning('05/01 9h-17h', '2026-12-20').days.keys()]).toEqual(['2027-01-05'])
    expect([...parsePlanning('28/12 9h-17h', '2027-01-03').days.keys()]).toEqual(['2026-12-28'])
  })

  it('signale les lignes illisibles sans bloquer les autres', () => {
    const { days, errors } = parsePlanning('bonjour\n17/11 n’importe quoi\n18/11 25h-26h\n31/02 8h-9h\n19/11 9h-17h', '2026-11-17')
    // 17/11 illisible : absent (ne doit pas devenir un jour de repos qui effacerait ses horaires).
    expect([...days.keys()]).toEqual(['2026-11-18', '2026-11-19'])
    expect(errors).toHaveLength(4)
  })
})
