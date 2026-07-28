import { describe, expect, it } from 'vitest'
// @ts-expect-error -- module JS sans déclarations de types
import { framing, GRACE_MS, IDLE_MS } from './cameraDirection.js'

describe('framing — reprise en main du cadrage', () => {
  it('se tait tant que le joueur a le doigt sur le plateau', () => {
    expect(framing({ dragging: true, silence: 10_000 })).toEqual({ canFrame: false, canFollow: false })
  })

  it('recadre avant de suivre : le suivi demande un silence plus long', () => {
    const juste = framing({ silence: GRACE_MS + 1 })
    expect(juste.canFrame).toBe(true)
    expect(juste.canFollow, 'suivre le pion déplace l’image sans qu’on l’ait demandé').toBe(false)

    expect(framing({ silence: IDLE_MS + 1 })).toEqual({ canFrame: true, canFollow: true })
  })

  it('ne bouge pas juste après un geste', () => {
    expect(framing({ silence: 100 })).toEqual({ canFrame: false, canFollow: false })
  })

  it('revient au pion sans délai à la sortie de la caméra libre', () => {
    // Couper la caméra libre EST la demande de revenir au pion : ni le silence
    // requis, ni un doigt encore posé ne doivent la retarder.
    expect(framing({ resumed: true, silence: 0 })).toEqual({ canFrame: true, canFollow: true })
    expect(framing({ resumed: true, dragging: true, silence: 0 })).toEqual({ canFrame: true, canFollow: true })
  })

  it('cadre par défaut quand aucun geste n’a jamais eu lieu', () => {
    expect(framing()).toEqual({ canFrame: true, canFollow: true })
  })
})
