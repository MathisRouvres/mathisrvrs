import { useState } from 'react'
import { MonovomyButton } from '../MonovomyShell'

const KEY = 'mv_coach_done'

function seen() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
function markSeen() {
  try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
}

const STEPS = [
  { icon: '🎲', title: 'Lance le dé', text: 'Le gros bouton en bas déclenche ton tour. Un double te fait rejouer !' },
  { icon: '👤', title: 'Ton argent & ta position', text: 'Suis ton cash et où tu es dans le bandeau des joueurs, en haut.' },
  { icon: '🏠', title: 'Gère tes biens', text: 'Tape une case pour ses détails : l’acheter, construire ou hypothéquer.' },
  { icon: '📜', title: 'Le journal', text: 'Retrouve qui a payé ou acheté quoi via le journal, en bas de l’écran.' },
]

/** Coach-marks affichés une seule fois, à la première partie. */
export default function MvCoach() {
  const [step, setStep] = useState(() => (seen() ? -1 : 0))
  if (step < 0 || step >= STEPS.length) return null

  const s = STEPS[step]
  const last = step === STEPS.length - 1
  const finish = () => { markSeen(); setStep(-1) }

  return (
    <div className="mv-coach" role="dialog" aria-label="Prise en main">
      <div className="mv-coach__card">
        <span className="mv-coach__icon" aria-hidden="true">{s.icon}</span>
        <h3 className="mv-coach__title">{s.title}</h3>
        <p className="mv-coach__text">{s.text}</p>
        <div className="mv-coach__dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <i key={i} className={`mv-coach__dot ${i === step ? 'is-on' : ''}`} />
          ))}
        </div>
        <div className="mv-coach__actions">
          <button type="button" className="mv-coach__skip" onClick={finish}>Passer</button>
          <MonovomyButton onClick={() => (last ? finish() : setStep((v) => v + 1))}>
            {last ? 'C’est parti !' : 'Suivant'}
          </MonovomyButton>
        </div>
      </div>
    </div>
  )
}
