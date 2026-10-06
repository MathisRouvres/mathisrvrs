/** Types de `freeCam.js` (préférence de caméra libre, propre à l'appareil). */

export function readFreeCam(): boolean

export function setFreeCam(on: boolean): void

export function useFreeCam(): { free: boolean; toggle: () => void }
