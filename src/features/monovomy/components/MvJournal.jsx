/**
 * Journal de partie : barre repliée montrant le dernier événement (+ compteur),
 * dépliable en liste scrollable. Non intrusif, ancré bas d'écran (au-dessus du CTA).
 */
export default function MvJournal({ entries, open, onToggle }) {
  if (!entries.length) return null
  const latest = entries[0]

  return (
    <>
      <button type="button" className="mv-log" onClick={onToggle} aria-expanded={open}>
        <span className="mv-log__ic" aria-hidden="true">{latest.icon}</span>
        <span className="mv-log__text">{latest.text}</span>
        <span className="mv-log__count">{entries.length}</span>
        <span className="mv-log__chev" aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>

      {open && (
        <div className="mv-log__sheet" role="dialog" aria-label="Journal de partie">
          <div className="mv-log__head">
            <span>📜 Journal</span>
            <button type="button" className="mv-log__close" onClick={onToggle} aria-label="Fermer">✕</button>
          </div>
          <ul className="mv-log__list">
            {entries.map((e) => (
              <li key={e.id} className="mv-log__row">
                <span className="mv-log__ic" aria-hidden="true">{e.icon}</span>
                <span>{e.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
