import { listBoardMaps } from '../content'

/**
 * Miniature réelle d'une map : dessinée depuis `visual.positions`, donc valable
 * pour n'importe quelle forme (anneau carré, boucle en 8, future map).
 * Le tracé relie les cases dans l'ordre du chemin logique.
 */
function MapThumb({ map }) {
  const byId = new Map(map.visual.positions.map((p) => [p.tileId, p]))
  const points = map.path.map((tileId) => byId.get(tileId)).filter(Boolean)
  if (points.length === 0) return null

  const height = 100 / (map.visual.aspectRatio || 1)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
  // Le pont passe au-dessus : on le redessine par-dessus le tracé principal.
  const upper = points.filter((p) => p.segment === 'upper_bridge')

  return (
    <svg
      className="mv-mapthumb"
      viewBox={`-6 -6 112 ${height + 12}`}
      role="img"
      aria-label={`Aperçu du plateau ${map.name}`}
      focusable="false"
    >
      <path className="mv-mapthumb__track" d={path} />
      {upper.length > 1 && (
        <path
          className="mv-mapthumb__bridge"
          d={upper.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
        />
      )}
      {points.map((p) => (
        <circle
          key={p.tileId}
          className={`mv-mapthumb__tile ${p.tileId === map.startTileId ? 'is-start' : ''}`}
          cx={p.x}
          cy={p.y}
          r={p.tileId === map.startTileId ? 3.4 : 1.9}
        />
      ))}
    </svg>
  )
}

/**
 * Sélection du plateau. Alimentée par le registre : ajouter une map la fait
 * apparaître ici sans toucher au composant.
 *
 * `canEdit = false` (client non-hôte) → cartes non interactives + mention
 * « Choisi par l'hôte ».
 */
export default function MvMapPicker({ value, onSelect, canEdit = true, playerCount = null }) {
  const maps = listBoardMaps()
  const selected = maps.some((m) => m.id === value) ? value : maps[0]?.id

  return (
    <section className="mv-card">
      <h2 className="mv-card__title">
        <span className="mv-card__ic">🗺️</span> Choisir le plateau
        {!canEdit && <small className="mv-card__hint">Choisi par l’hôte</small>}
      </h2>
      <ul className="mv-mapgrid" role={canEdit ? 'radiogroup' : 'list'} aria-label="Plateaux disponibles">
        {maps.map((map) => {
          const isActive = map.id === selected
          const fits = playerCount == null || (playerCount >= map.minPlayers && playerCount <= map.maxPlayers)
          return (
            <li key={map.id}>
              <button
                type="button"
                role={canEdit ? 'radio' : undefined}
                aria-checked={canEdit ? isActive : undefined}
                aria-current={!canEdit && isActive ? 'true' : undefined}
                disabled={!canEdit}
                className={`mv-mapcard ${isActive ? 'is-active' : ''} ${fits ? '' : 'is-warn'}`}
                onClick={canEdit ? () => onSelect?.(map.id) : undefined}
              >
                <MapThumb map={map} />
                <span className="mv-mapcard__name">{map.name}</span>
                <span className="mv-mapcard__desc">{map.shortDescription}</span>
                <span className="mv-mapcard__meta">
                  <span>{map.path.length} cases</span>
                  <span>
                    {map.minPlayers}–{map.maxPlayers} joueurs
                  </span>
                  <span>≈ {map.estimatedMinutes} min</span>
                </span>
                {!fits && (
                  <span className="mv-mapcard__warn">
                    Prévu pour {map.minPlayers} à {map.maxPlayers} joueurs
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
