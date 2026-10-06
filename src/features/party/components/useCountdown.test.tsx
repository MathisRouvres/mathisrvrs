// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { chime, setPartySound, useCountdown } from './useCountdown'
import { blip, unlockAudio } from '../../../lib/synth'

vi.mock('../../../lib/synth', () => ({ blip: vi.fn(), unlockAudio: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  setPartySound(true)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useCountdown', () => {
  it('débloque l’audio au lancement, bipe les dernières secondes puis termine', () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useCountdown(onDone, { ticks: 3 }))

    act(() => result.current.start(5))
    expect(unlockAudio).toHaveBeenCalledTimes(1)
    act(() => {
      vi.advanceTimersByTime(5200)
    })

    expect(blip).toHaveBeenCalledTimes(3)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(result.current.running).toBe(false)
  })

  it('reste muet par défaut, pour ne rien trahir d’un chrono secret', () => {
    const { result } = renderHook(() => useCountdown(() => {}))
    act(() => result.current.start(5))
    act(() => {
      vi.advanceTimersByTime(5200)
    })
    expect(blip).not.toHaveBeenCalled()
  })
})

describe('chime', () => {
  it('sonne la fin du chrono, sauf si le son est coupé', () => {
    chime('end')
    vi.runAllTimers()
    expect(blip).toHaveBeenCalledTimes(3)

    vi.clearAllMocks()
    setPartySound(false)
    chime('end')
    chime('tick')
    vi.runAllTimers()
    expect(blip).not.toHaveBeenCalled()
  })
})
