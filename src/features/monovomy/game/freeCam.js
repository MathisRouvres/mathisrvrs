import { useCallback, useEffect, useState } from 'react'

/**
 * Caméra libre — préférence de CONFORT, propre à l'appareil, pas à la partie.
 *
 * Par défaut, le plateau est mis en scène : la caméra suit le pion actif, se
 * rapproche des dés, recule pendant une enchère. Pratique, mais frustrant dès
 * qu'on veut examiner un coin du plateau — le cadrage reprend la main au bout de
 * quelques secondes.
 *
 * Une fois la caméra libérée, plus aucun recadrage automatique et les butées
 * d'orbite s'ouvrent (déplacement latéral, zoom plus large, vue plus rasante).
 * Le réglage n'est pas transmis au réseau : chacun cadre chez lui comme il veut,
 * sans rien imposer aux autres. Miroir de `useWakeLockConsent`.
 */
const KEY = 'mv_freecam'
const EVENT = 'mv-freecam-change'

export function readFreeCam() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setFreeCam(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: Boolean(on) }))
  }
}

/** Hook réactif : le bouton du plateau et la ligne des réglages restent d'accord. */
export function useFreeCam() {
  const [free, setFree] = useState(readFreeCam)

  useEffect(() => {
    const onChange = (e) => setFree(Boolean(e.detail))
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const toggle = useCallback(() => setFreeCam(!readFreeCam()), [])
  return { free, toggle }
}
