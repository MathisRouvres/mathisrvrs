/**
 * Petit synthé Web Audio partagé (aucun asset). Sur iOS, le contexte audio naît
 * suspendu : il faut appeler `unlockAudio()` pendant un geste de l'utilisateur
 * (un tap) pour que les sons joués plus tard, depuis un minuteur, soient audibles.
 */
let ctx = null

function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) {
      try {
        ctx = new AC()
      } catch {
        return null
      }
    }
  }
  return ctx
}

/** À appeler dans un gestionnaire de tap : débloque l'audio pour la suite. */
export function unlockAudio() {
  const c = audio()
  if (!c) return
  try {
    if (c.state === 'suspended') c.resume()
    // Un son muet joué pendant le geste suffit à « réveiller » Safari iOS.
    const buffer = c.createBuffer(1, 1, 22050)
    const source = c.createBufferSource()
    source.buffer = buffer
    source.connect(c.destination)
    source.start(0)
  } catch {
    /* ignore */
  }
}

/** Joue une note brève : fréquence (Hz), durée (s), forme d'onde, volume. */
export function blip(freq, dur, type = 'sine', gain = 0.05) {
  const c = audio()
  if (!c) return
  try {
    if (c.state === 'suspended') c.resume()
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    osc.connect(g)
    g.connect(c.destination)
    const t = c.currentTime
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.start(t)
    osc.stop(t + dur)
  } catch {
    /* ignore */
  }
}
