import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * L'animation `mv-rise` embarque un `translate(-50%)` : elle n'a de sens que pour
 * les éléments centrés par `left: 50%`. Appliquée ailleurs, et comme elle joue en
 * `fill-mode: both`, elle laisse la carte décalée d'une demi-largeur APRÈS
 * l'animation — les feuilles du dock sortaient ainsi de l'écran. Les éléments
 * centrés par le flux doivent utiliser `mv-rise-up`.
 */
const css = readFileSync(fileURLToPath(new URL('./monovomy-theme.css', import.meta.url)), 'utf8')

/** Blocs de déclarations sans imbrication : `sélecteur { … }`. */
function ruleBlocks(source: string) {
  const out: { selector: string; body: string }[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) out.push({ selector: m[1].trim(), body: m[2] })
  return out
}

describe('monovomy-theme.css — animations d’apparition', () => {
  it('réserve mv-rise aux éléments centrés par left: 50%', () => {
    const fautifs = ruleBlocks(css)
      .filter((r) => /animation:\s*mv-rise\s/.test(r.body))
      .filter((r) => !/left:\s*50%/.test(r.body))
      .map((r) => r.selector)

    expect(fautifs, 'ces sélecteurs doivent utiliser mv-rise-up').toEqual([])
  })

  it('définit bien les deux animations', () => {
    expect(css).toContain('@keyframes mv-rise ')
    expect(css).toContain('@keyframes mv-rise-up ')
    // Le décalage horizontal ne doit exister que dans la variante centrée.
    const up = css.match(/@keyframes mv-rise-up \{[^}]*\}[^}]*\}/)?.[0] ?? ''
    expect(up).not.toContain('-50%')
  })
})
