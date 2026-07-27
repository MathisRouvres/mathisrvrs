import { useState } from 'react'
import MvModal from './MvModal'
import MvRules from './MvRules'

function seen(key) {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}
function mark(key) {
  try { localStorage.setItem(key, '1') } catch { /* ignore */ }
}

export default function MvHome({ onPick }) {
  // Onboarding : ouvre les règles au tout premier passage (une seule fois).
  const [showRules, setShowRules] = useState(() => {
    if (seen('mv_onboarded')) return false
    mark('mv_onboarded')
    return true
  })

  return (
    <div className="mv-home">
      <section className="mv-hero">
        <p className="mv-eyebrow">Le Monopoly à boire</p>
        <h1 className="mv-hero__title">
          <span className="mv-mono">MONO</span>
          <span className="mv-vomy">VOMY</span>
        </h1>
        <p className="mv-hero__sub">Choisis ton mode de jeu</p>
      </section>

      <div className="mv-modes">
        <button type="button" className="mv-modecard" onClick={() => onPick('local')}>
          <span className="mv-modecard__ic">📱</span>
          <span className="mv-modecard__title">Local (hot-seat)</span>
          <span className="mv-modecard__desc">Un seul téléphone qui tourne entre potes.</span>
        </button>
        <button type="button" className="mv-modecard" onClick={() => onPick('online')}>
          <span className="mv-modecard__ic">🌐</span>
          <span className="mv-modecard__title">En ligne</span>
          <span className="mv-modecard__desc">Chacun son téléphone, en temps réel.</span>
        </button>
      </div>

      <div className="mv-actions">
        <button type="button" className="mv-btn mv-btn--ghost" onClick={() => setShowRules(true)}>
          📖 Comment jouer
        </button>
      </div>

      {showRules && (
        <MvModal title="Comment jouer" onClose={() => setShowRules(false)}>
          <MvRules />
        </MvModal>
      )}
    </div>
  )
}
