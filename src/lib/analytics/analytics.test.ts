import { describe, expect, it } from 'vitest'
import { classifyPath } from './classify'
import { createTracker, type EventRow } from './tracker'

describe('classifyPath', () => {
  it('range chaque route dans sa section', () => {
    expect(classifyPath('/')).toEqual({ path: '/', section: 'portfolio', game: null })
    expect(classifyPath('/games/')).toEqual({ path: '/games', section: 'games', game: null })
    expect(classifyPath('/spin')).toEqual({ path: '/spin', section: 'spin', game: null })
    expect(classifyPath('/dispo/')).toEqual({ path: '/dispo', section: 'dispo', game: null })
    expect(classifyPath('/catan/')).toEqual({ path: '/catan', section: 'hexland', game: null })
    expect(classifyPath('/carri%C3%A8re')).toEqual({ path: '/carriere', section: 'carriere', game: null })
  })

  it('identifie le jeu de soirée ouvert', () => {
    expect(classifyPath('/games/soiree')).toEqual({ path: '/games/soiree', section: 'soiree', game: null })
    expect(classifyPath('/games/soiree/loup-garou')).toEqual({
      path: '/games/soiree/loup-garou',
      section: 'soiree',
      game: 'soiree:loup-garou',
    })
  })

  it('ne garde jamais un code de partie MonoVomy', () => {
    expect(classifyPath('/monovomy/join/ABCD12')).toEqual({ path: '/monovomy', section: 'monovomy', game: null })
  })

  it('ignore le dashboard et regroupe les adresses inconnues', () => {
    expect(classifyPath('/stats')).toBeNull()
    expect(classifyPath('/n-importe-quoi')).toEqual({ path: '/(autre)', section: 'portfolio', game: null })
  })
})

function setup(options: { visible?: boolean } = {}) {
  let time = 1_000_000
  let ids = 0
  let visible = options.visible ?? true
  const sent: EventRow[][] = []
  const timers: Array<() => void> = []
  const store = new Map<string, string>()
  const tracker = createTracker({
    send: (rows) => sent.push(rows),
    now: () => time,
    isVisible: () => visible,
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
    device: 'mobile',
    referrer: 'google.com',
    randomId: () => `id-${String(++ids).padStart(6, '0')}`,
    schedule: (fn) => void timers.push(fn),
  })
  return {
    tracker,
    store,
    rows: () => sent.flat(),
    advance: (ms: number) => {
      time += ms
    },
    setVisible: (v: boolean) => {
      visible = v
    },
    runTimers: () => timers.splice(0).forEach((fn) => fn()),
  }
}

describe('createTracker', () => {
  it('compte une page vue avec la provenance une seule fois, envoyée en différé', () => {
    const t = setup()
    t.tracker.navigate('/games')
    t.tracker.navigate('/games/')
    expect(t.rows()).toHaveLength(0)
    t.runTimers()
    t.tracker.navigate('/spin')
    t.tracker.flush()
    expect(t.rows().map((r) => [r.event, r.path, r.referrer])).toEqual([
      ['page_view', '/games', 'google.com'],
      ['page_view', '/spin', null],
    ])
    expect(t.rows()[0]).toMatchObject({ device: 'mobile', section: 'games', visitor_id: 'id-000001' })
  })

  it('mesure le temps passé page visible seulement', () => {
    const t = setup()
    t.tracker.navigate('/games/soiree/mimes')
    t.advance(10_000)
    t.setVisible(false)
    t.tracker.hide()
    t.advance(60_000) // onglet masqué : non compté
    t.setVisible(true)
    t.tracker.show()
    t.advance(5_000)
    t.tracker.navigate('/games/soiree')
    t.tracker.flush()
    const times = t.rows().filter((r) => r.event === 'page_time')
    expect(times.map((r) => [r.game, r.duration_ms])).toEqual([
      ['soiree:mimes', 10_000],
      ['soiree:mimes', 5_000],
    ])
  })

  it('ouvre une nouvelle session après 30 min d’absence', () => {
    const t = setup()
    t.tracker.navigate('/')
    t.setVisible(false)
    t.tracker.hide()
    t.advance(31 * 60_000)
    t.setVisible(true)
    t.tracker.show()
    t.tracker.flush()
    const views = t.rows().filter((r) => r.event === 'page_view')
    expect(views).toHaveLength(2)
    expect(views[0]!.session_id).not.toBe(views[1]!.session_id)
    expect(views[0]!.visitor_id).toBe(views[1]!.visitor_id)
  })

  it('rattache les événements de jeu à la page courante', () => {
    const t = setup()
    t.tracker.navigate('/monovomy/join/ABCD')
    t.tracker.track('room_join', 'monovomy:online')
    t.tracker.flush()
    expect(t.rows()[1]).toMatchObject({ event: 'room_join', path: '/monovomy', section: 'monovomy', game: 'monovomy:online' })
  })

  it('ne compte ni le dashboard ni un navigateur exclu', () => {
    const t = setup()
    t.tracker.navigate('/stats')
    t.tracker.flush()
    expect(t.rows()).toHaveLength(0)
    t.store.set('mr-analytics-optout', '1')
    t.tracker.navigate('/')
    t.tracker.flush()
    expect(t.rows()).toHaveLength(0)
  })
})
