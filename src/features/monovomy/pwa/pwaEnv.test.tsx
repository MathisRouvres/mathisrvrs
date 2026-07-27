// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  installRecentlyDismissed,
  markInstallDismissed,
  clearInstallDismissed,
  readLastProfile,
  saveLastProfile,
  isMonovomyPath,
  INSTALL_DISMISS_COOLDOWN_MS,
} from './pwaEnv'

beforeEach(() => {
  localStorage.clear()
})

describe('installRecentlyDismissed', () => {
  it('faux quand jamais refusé', () => {
    expect(installRecentlyDismissed()).toBe(false)
  })
  it('vrai juste après un refus', () => {
    const now = 1_000_000_000
    markInstallDismissed(now)
    expect(installRecentlyDismissed(now + 1000)).toBe(true)
  })
  it('faux une fois le cooldown écoulé', () => {
    const now = 1_000_000_000
    markInstallDismissed(now)
    expect(installRecentlyDismissed(now + INSTALL_DISMISS_COOLDOWN_MS + 1)).toBe(false)
  })
  it('clearInstallDismissed réinitialise', () => {
    const now = 1_000_000_000
    markInstallDismissed(now)
    clearInstallDismissed()
    expect(installRecentlyDismissed(now + 1000)).toBe(false)
  })
})

describe('lastProfile', () => {
  it('round-trip pseudo + drinkMode', () => {
    saveLastProfile({ name: 'Léa', drinkMode: 'soft' })
    expect(readLastProfile()).toEqual({ name: 'Léa', drinkMode: 'soft' })
  })
  it('null si absent', () => {
    expect(readLastProfile()).toBeNull()
  })
})

describe('isMonovomyPath', () => {
  it('vrai sur les routes MonoVomy', () => {
    expect(isMonovomyPath('/monovomy')).toBe(true)
    expect(isMonovomyPath('/monovomy/join/ABCD12')).toBe(true)
  })
  it('faux ailleurs', () => {
    expect(isMonovomyPath('/')).toBe(false)
    expect(isMonovomyPath('/monovomyautre')).toBe(false)
  })
})
