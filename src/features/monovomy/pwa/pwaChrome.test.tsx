// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { applyMonovomyPwaChrome } from './pwaChrome'

beforeEach(() => {
  document.head.innerHTML = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/og-image.svg" />
  `
})

describe('applyMonovomyPwaChrome', () => {
  it('bascule le manifest vers MonoVomy puis le restaure (isolation portfolio)', () => {
    const restore = applyMonovomyPwaChrome()
    const link = document.head.querySelector('link[rel="manifest"]')
    expect(link?.getAttribute('href')).toBe('/monovomy.webmanifest')

    restore()
    const restored = document.head.querySelector('link[rel="manifest"]')
    expect(restored?.getAttribute('href')).toBe('/manifest.webmanifest')
  })

  it('ajoute viewport-fit=cover puis restaure la valeur portfolio', () => {
    const restore = applyMonovomyPwaChrome()
    const vp = document.head.querySelector('meta[name="viewport"]')
    expect(vp?.getAttribute('content')).toContain('viewport-fit=cover')

    restore()
    expect(document.head.querySelector('meta[name="viewport"]')?.getAttribute('content')).toBe(
      'width=device-width, initial-scale=1.0',
    )
  })

  it('injecte les métas apple/theme puis les retire à la restauration', () => {
    const restore = applyMonovomyPwaChrome()
    expect(document.head.querySelector('meta[name="apple-mobile-web-app-capable"]')).not.toBeNull()
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0a0613')

    restore()
    expect(document.head.querySelector('meta[name="apple-mobile-web-app-capable"]')).toBeNull()
    expect(document.head.querySelector('meta[name="theme-color"]')).toBeNull()
  })

  it('restaure l’apple-touch-icon portfolio', () => {
    const restore = applyMonovomyPwaChrome()
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe(
      '/monovomy-icons/apple-touch-icon-180.png',
    )
    restore()
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/og-image.svg')
  })
})
