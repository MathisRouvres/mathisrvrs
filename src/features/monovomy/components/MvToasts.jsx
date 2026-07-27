/**
 * Pile de notifications cohérentes (Phase 6) : brèves, non bloquantes, en haut,
 * pour les infos sans ancrage spatial (règle activée, reconnexion…). L'argent et
 * les loyers restent gérés par les nombres flottants et le journal.
 */
export default function MvToasts({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="mv-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`mv-toast tone-${t.tone || 'info'}`}>
          <span className="mv-toast__ic" aria-hidden="true">{t.icon}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
