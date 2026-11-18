import { describe, expect, it } from 'vitest'
import {
  addMonths,
  assigneesAt,
  describeRepeat,
  expand,
  isDateKey,
  isoWeekday,
  monthGrid,
  nextAfter,
  occurrenceDates,
  startOfWeek,
  type Task,
} from './recurrence'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Poubelles',
    notes: '',
    category: 'menage',
    start: '2026-11-16', // lundi
    time: null,
    repeat: 'none',
    every: 1,
    weekdays: [],
    until: null,
    duration: null,
    assignees: [],
    rotate: false,
    ...overrides,
  }
}

const dates = (t: Task, from: string, to: string) => occurrenceDates(t, from, to).map((o) => o.date)

describe('dates', () => {
  it('jours ISO et début de semaine (lundi)', () => {
    expect(isoWeekday('2026-11-16')).toBe(1)
    expect(isoWeekday('2026-11-22')).toBe(7)
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16')
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16')
  })

  it('clés valides seulement', () => {
    expect(isDateKey('2026-02-28')).toBe(true)
    expect(isDateKey('2026-02-29')).toBe(false)
    expect(isDateKey('2028-02-29')).toBe(true)
    expect(isDateKey('2026-13-01')).toBe(false)
    expect(isDateKey('16/11/2026')).toBe(false)
  })

  it('mois suivants et grille complète du lundi au dimanche', () => {
    expect(addMonths('2026-11-16', 2)).toBe('2027-01-01')
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01')
    const grid = monthGrid('2026-11-16')
    expect(grid[0]).toBe('2026-10-26')
    expect(grid.at(-1)).toBe('2026-12-06')
    expect(grid.length % 7).toBe(0)
  })

  it('traverse le changement d’heure sans sauter de jour', () => {
    const t = task({ start: '2026-10-20', repeat: 'daily' })
    expect(dates(t, '2026-10-24', '2026-10-27')).toEqual(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'])
  })
})

describe('occurrences', () => {
  it('tâche unique : seulement à sa date', () => {
    expect(dates(task(), '2026-11-01', '2026-11-30')).toEqual(['2026-11-16'])
    expect(dates(task(), '2026-11-17', '2026-11-30')).toEqual([])
  })

  it('tous les 2 jours, rang compté depuis le début', () => {
    const t = task({ repeat: 'daily', every: 2 })
    expect(occurrenceDates(t, '2026-11-19', '2026-11-23')).toEqual([
      { date: '2026-11-20', index: 2 },
      { date: '2026-11-22', index: 3 },
    ])
  })

  it('chaque semaine le lundi et le jeudi', () => {
    const t = task({ repeat: 'weekly', weekdays: [1, 4] })
    expect(dates(t, '2026-11-16', '2026-11-29')).toEqual(['2026-11-16', '2026-11-19', '2026-11-23', '2026-11-26'])
  })

  it('hebdomadaire sans jours choisis : jour de la date de début', () => {
    const t = task({ start: '2026-11-18', repeat: 'weekly' })
    expect(dates(t, '2026-11-16', '2026-12-06')).toEqual(['2026-11-18', '2026-11-25', '2026-12-02'])
  })

  it('toutes les 2 semaines, jours avant le début ignorés', () => {
    const t = task({ start: '2026-11-18', repeat: 'weekly', every: 2, weekdays: [1, 5] })
    expect(occurrenceDates(t, '2026-11-16', '2026-12-06')).toEqual([
      { date: '2026-11-20', index: 0 },
      { date: '2026-11-30', index: 1 },
      { date: '2026-12-04', index: 2 },
    ])
  })

  it('mensuelle le 31 : ramenée au dernier jour des mois courts', () => {
    const t = task({ start: '2026-01-31', repeat: 'monthly' })
    expect(dates(t, '2026-02-01', '2026-04-30')).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('annuelle et date de fin incluse', () => {
    const t = task({ start: '2026-03-15', repeat: 'yearly', until: '2028-03-15' })
    expect(dates(t, '2026-01-01', '2030-12-31')).toEqual(['2026-03-15', '2027-03-15', '2028-03-15'])
  })

  it('rien avant le début', () => {
    expect(dates(task({ repeat: 'daily' }), '2026-11-01', '2026-11-15')).toEqual([])
  })
})

describe('tour de rôle', () => {
  it('alterne les personnes selon le rang', () => {
    const t = task({ repeat: 'weekly', assignees: ['a', 'b', 'c'], rotate: true })
    expect([0, 1, 2, 3].map((i) => assigneesAt(t, i))).toEqual([['a'], ['b'], ['c'], ['a']])
  })

  it('sans tour de rôle : tout le monde', () => {
    expect(assigneesAt(task({ repeat: 'weekly', assignees: ['a', 'b'] }), 3)).toEqual(['a', 'b'])
  })

  it('expand trie et relie les marques', () => {
    const t1 = task({ id: 'x', title: 'Vaisselle', repeat: 'daily', assignees: ['a', 'b'], rotate: true })
    const t2 = task({ id: 'y', title: 'Aspirateur', start: '2026-11-17' })
    const list = expand(
      [t1, t2],
      [{ taskId: 'x', date: '2026-11-17', status: 'done', personId: 'b' }],
      '2026-11-16',
      '2026-11-17',
    )
    expect(list.map((o) => [o.date, o.task.title, o.assignees, o.mark?.status ?? null])).toEqual([
      ['2026-11-16', 'Vaisselle', ['a'], null],
      ['2026-11-17', 'Aspirateur', [], null],
      ['2026-11-17', 'Vaisselle', ['b'], 'done'],
    ])
  })
})

describe('describeRepeat', () => {
  it('phrases lisibles', () => {
    expect(describeRepeat(task())).toBe('Une seule fois')
    expect(describeRepeat(task({ repeat: 'daily', every: 3 }))).toBe('Tous les 3 jours')
    expect(describeRepeat(task({ repeat: 'weekly', weekdays: [4, 1] }))).toBe('Chaque semaine, le lundi et jeudi')
    expect(describeRepeat(task({ repeat: 'monthly', every: 2, start: '2026-11-05' }))).toBe('Tous les 2 mois, le 5')
    expect(describeRepeat(task({ repeat: 'weekly', until: '2026-12-31' }))).toMatch(
      /^Chaque semaine, le lundi, jusqu’au 31 déc/,
    )
  })
})

describe('reports', () => {
  const weekly = task({ repeat: 'weekly', weekdays: [1] })

  it('heure : celle du déplacement, sinon celle de la tâche ; sans heure en premier dans la journée', () => {
    const timed = task({ id: 't2', title: 'Aspirateur', time: '18:00', repeat: 'weekly', weekdays: [1] })
    const moves = [{ taskId: 't2', date: '2026-11-16', to: '2026-11-16', at: '09:30' }]
    expect(expand([timed, weekly], [], '2026-11-16', '2026-11-23', { moves }).map((o) => [o.date, o.time, o.task.id])).toEqual([
      ['2026-11-16', null, 't1'],
      ['2026-11-16', '09:30', 't2'],
      ['2026-11-23', null, 't1'],
      ['2026-11-23', '18:00', 't2'],
    ])
  })

  it('déplace une occurrence dans la période, ses marques restent sur la date prévue', () => {
    const marks = [{ taskId: 't1', date: '2026-11-16', status: 'done' as const, personId: null }]
    const moves = [{ taskId: 't1', date: '2026-11-16', to: '2026-11-18' }]
    const occ = expand([weekly], marks, '2026-11-16', '2026-11-22', { moves })
    expect(occ).toHaveLength(1)
    expect(occ[0]).toMatchObject({ date: '2026-11-18', origin: '2026-11-16', index: 0 })
    expect(occ[0].mark?.status).toBe('done')
  })

  it('fait entrer une date reportée depuis une autre semaine, et sortir celle reportée ailleurs', () => {
    const moves = [
      { taskId: 't1', date: '2026-11-16', to: '2026-11-24' },
      { taskId: 't1', date: '2026-11-30', to: '2026-12-01' },
    ]
    const week = expand([weekly], [], '2026-11-23', '2026-11-29', { moves })
    expect(week.map((o) => [o.origin, o.date])).toEqual([
      ['2026-11-23', '2026-11-23'],
      ['2026-11-16', '2026-11-24'],
    ])
    expect(week[1].index).toBe(0)
    expect(expand([weekly], [], '2026-11-16', '2026-11-22', { moves })).toEqual([])
  })

  it('ignore un report dont la date prévue ne correspond à aucune occurrence', () => {
    const moves = [{ taskId: 't1', date: '2026-11-17', to: '2026-11-25' }]
    expect(expand([weekly], [], '2026-11-23', '2026-11-29', { moves }).map((o) => o.date)).toEqual(['2026-11-23'])
  })
})

describe('après la dernière fois', () => {
  const after = task({ repeat: 'after', every: 14, assignees: ['a', 'b'], rotate: true })

  it('commence à start, puis every jours après le jour coché', () => {
    expect(nextAfter(after, undefined)).toEqual({ date: '2026-11-16', index: 0 })
    // Faite avec 3 jours de retard : la suivante part du jour où elle a été faite.
    const chain = { taskId: 't1', date: '2026-11-16', doneOn: '2026-11-19', count: 1 }
    expect(nextAfter(after, chain)).toEqual({ date: '2026-12-03', index: 1 })
  })

  it('jamais avant le lendemain de la date prévue ni avant start, et s’arrête à until', () => {
    const early = { taskId: 't1', date: '2026-12-31', doneOn: '2026-11-01', count: 3 }
    expect(nextAfter(after, early)?.date).toBe('2027-01-01')
    const restarted = task({ repeat: 'after', every: 2, start: '2027-03-01' })
    expect(nextAfter(restarted, { taskId: 't1', date: '2026-11-16', doneOn: '2026-11-16', count: 1 })?.date).toBe('2027-03-01')
    expect(nextAfter({ ...after, until: '2026-11-30' }, { taskId: 't1', date: '2026-11-16', doneOn: '2026-11-19', count: 1 })).toBeNull()
  })

  it('montre l’historique coché et la prochaine date, avec le tour de rôle', () => {
    const marks = [{ taskId: 't1', date: '2026-11-16', status: 'done' as const, personId: 'a', doneOn: '2026-11-19' }]
    const chains = [{ taskId: 't1', date: '2026-11-16', doneOn: '2026-11-19', count: 1 }]
    const occ = expand([after], marks, '2026-11-16', '2026-12-06', { chains })
    expect(occ.map((o) => [o.date, o.assignees, o.mark?.status ?? null])).toEqual([
      ['2026-11-16', ['a'], 'done'],
      ['2026-12-03', ['b'], null],
    ])
    expect(describeRepeat(after)).toBe('14 jours après la dernière fois')
  })

  it('une prochaine date en retard reste visible tant qu’elle n’est pas cochée', () => {
    const chains = [{ taskId: 't1', date: '2026-08-01', doneOn: '2026-08-01', count: 4 }]
    const late = expand([{ ...after, start: '2026-06-01' }], [], '2000-01-01', '2026-11-01', { chains })
    expect(late.map((o) => [o.date, o.index])).toEqual([['2026-08-15', 4]])
  })
})
