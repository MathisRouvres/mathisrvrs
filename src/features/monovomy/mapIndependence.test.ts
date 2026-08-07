import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * Garde-fou : plus aucun module de MonoVomy ne doit dépendre en dur du plateau
 * carré. Le plateau vient toujours de l'état (`boardForState`) ou d'une prop.
 */
const ROOT = fileURLToPath(new URL('.', import.meta.url))

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sourceFiles(full, out)
    else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !entry.includes('.test.')) out.push(full)
  }
  return out
}

const FILES = sourceFiles(ROOT)
const relative = (file: string) => file.slice(ROOT.length)

describe('indépendance vis-à-vis du plateau carré', () => {
  /**
   * Seuls l'alias de compatibilité et la map carrée (qui documente son héritage)
   * ont le droit de nommer l'ancien plateau.
   */
  const ALLOWED_SOIREE = new Set([
    'content/index.ts',
    'content/board.soiree.ts',
    'content/maps/classicSquare.ts',
  ])

  it('n’utilise `soireeBoard` que dans l’alias de compatibilité', () => {
    const offenders = FILES.filter((file) => readFileSync(file, 'utf8').includes('soireeBoard'))
      .map(relative)
      .filter((path) => !ALLOWED_SOIREE.has(path))
    expect(offenders).toEqual([])
  })

  it('ne contient plus de modulo 40 hors des données du plateau carré', () => {
    const offenders = FILES.filter((file) => /%\s*40\s*\)?\s*\+\s*40/.test(readFileSync(file, 'utf8')))
      .map(relative)
      // La map carrée a le droit de décrire sa propre grille de 40 cases.
      .filter((path) => path !== 'content/maps/classicSquare.ts')
    expect(offenders).toEqual([])
  })

  it('ne contient plus de grille 11×11 de rendu', () => {
    const offenders = FILES.filter((file) => /repeat\(11,/.test(readFileSync(file, 'utf8'))).map(relative)
    expect(offenders).toEqual([])
  })

  it('n’utilise `BOARD_SIZE` nulle part hors de sa déclaration dépréciée', () => {
    const offenders = FILES.filter((file) => readFileSync(file, 'utf8').includes('BOARD_SIZE'))
      .map(relative)
      .filter((path) => path !== 'engine/constants.ts')
    expect(offenders).toEqual([])
  })
})
