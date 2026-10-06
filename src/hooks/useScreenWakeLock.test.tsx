// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useScreenWakeLock } from './useScreenWakeLock'

function mockWakeLock() {
  const release = vi.fn(() => Promise.resolve())
  const request = vi.fn(() => Promise.resolve({ release, addEventListener: vi.fn() }))
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
  return { request, release }
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('useScreenWakeLock', () => {
  it('garde l’écran allumé pendant la partie et le libère ensuite', async () => {
    const { request, release } = mockWakeLock()
    const { rerender } = renderHook(({ active }) => useScreenWakeLock(active), { initialProps: { active: true } })

    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))
    // Laisse la promesse du verrou se résoudre avant de le relâcher.
    await Promise.resolve()
    rerender({ active: false })
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('ne demande rien hors partie', () => {
    const { request } = mockWakeLock()
    renderHook(() => useScreenWakeLock(false))
    expect(request).not.toHaveBeenCalled()
  })

  it('ne plante pas sans API Wake Lock', () => {
    expect(() => renderHook(() => useScreenWakeLock(true))).not.toThrow()
  })
})
