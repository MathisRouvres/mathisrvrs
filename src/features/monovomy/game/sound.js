/** SFX synthétisés (Web Audio) — aucun asset, coupables via le bouton son. */
import { blip as synthBlip } from '../../../lib/synth'

let muted = false
try { muted = localStorage.getItem('mv_muted') === '1' } catch { /* ignore */ }

function blip(freq, dur, type = 'sine', gain = 0.05) {
  if (!muted) synthBlip(freq, dur, type, gain)
}

export const sound = {
  isMuted: () => muted,
  setMuted(value) {
    muted = value
    try { localStorage.setItem('mv_muted', value ? '1' : '0') } catch { /* ignore */ }
  },
  play(name) {
    switch (name) {
      case 'roll':
        // Cliquetis du dé qui roule sur le plateau.
        for (let i = 0; i < 7; i += 1) {
          setTimeout(() => blip(150 + Math.random() * 260, 0.05, 'square', 0.035), i * 120)
        }
        break
      case 'land': blip(180, 0.14, 'triangle', 0.06); setTimeout(() => blip(120, 0.1, 'sine', 0.05), 60); break
      case 'buy': blip(523, 0.1); setTimeout(() => blip(784, 0.12), 90); break
      case 'sip': blip(160, 0.18, 'sawtooth', 0.045); break
      case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.16), i * 110)); break
      default: break
    }
  },
}
