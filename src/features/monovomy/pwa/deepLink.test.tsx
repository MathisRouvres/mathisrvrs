import { describe, it, expect } from 'vitest'
import { parseMonovomyRoute, sanitizeCode, buildInviteUrl } from './deepLink'

describe('sanitizeCode', () => {
  it('met en majuscules et retire les caractères non alphanumériques', () => {
    expect(sanitizeCode('ab-2c!')).toBe('AB2C')
  })
  it('tronque à 8 caractères', () => {
    expect(sanitizeCode('ABCDEFGHIJ')).toBe('ABCDEFGH')
  })
  it('gère les entrées vides / nulles', () => {
    expect(sanitizeCode('')).toBe('')
    expect(sanitizeCode(undefined as unknown as string)).toBe('')
  })
})

describe('parseMonovomyRoute', () => {
  it('reconnaît un deep link de join et normalise le code', () => {
    expect(parseMonovomyRoute('/monovomy/join/ABCD12')).toEqual({ type: 'join', code: 'ABCD12' })
    expect(parseMonovomyRoute('/monovomy/join/ab2c')).toEqual({ type: 'join', code: 'AB2C' })
  })
  it('ignore un segment supplémentaire après le code', () => {
    expect(parseMonovomyRoute('/monovomy/join/ABCD12/extra')).toEqual({ type: 'join', code: 'ABCD12' })
  })
  it('renvoie home pour la racine MonoVomy', () => {
    expect(parseMonovomyRoute('/monovomy')).toEqual({ type: 'home' })
  })
  it('renvoie null hors scope MonoVomy', () => {
    expect(parseMonovomyRoute('/')).toBeNull()
    expect(parseMonovomyRoute('/carriere')).toBeNull()
    expect(parseMonovomyRoute('/monovomyautre')).toBeNull()
  })
  it('join sans code renvoie un code vide (demandera la saisie)', () => {
    expect(parseMonovomyRoute('/monovomy/join/')).toEqual({ type: 'join', code: '' })
  })
})

describe('buildInviteUrl', () => {
  it('construit une URL de join partageable', () => {
    expect(buildInviteUrl('ab2c', 'https://mathis-rvrs.fr')).toBe('https://mathis-rvrs.fr/monovomy/join/AB2C')
  })
})
