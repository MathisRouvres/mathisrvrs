import { useId, useState } from 'react'

/**
 * Compétences & attributs (§5) — repliable. ~6 barres dépendant du poste.
 * Met en évidence brièvement les attributs modifiés après un choix (statDeltas).
 */
export default function AttributesPanel({
  attributes,
  statDeltas = [],
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()

  const deltaById = new Map(statDeltas.map((d) => [d.id, d.delta]))

  return (
    <section className="cg-attrs">
      <button
        type="button"
        className="cg-attrs__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cg-attrs__toggle-label">
          <span aria-hidden="true">📊</span> Compétences &amp; attributs
        </span>
        <span className="cg-attrs__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="cg-attrs__body" id={bodyId}>
          {attributes.map((attr) => {
            const delta = deltaById.get(attr.id) ?? 0
            const fraction = Math.max(0, Math.min(100, (attr.value / 99) * 100))
            return (
              <div
                key={attr.id}
                className={`cg-attr${delta !== 0 ? ' is-changed' : ''}`}
              >
                <span className="cg-attr__label">{attr.label}</span>
                <span className="cg-attr__val">
                  {attr.value}
                  {delta !== 0 && (
                    <span
                      className={`cg-attr__delta cg-attr__delta--${delta > 0 ? 'up' : 'down'}`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </span>
                <span
                  className="cg-attr__bar"
                  role="img"
                  aria-label={`${attr.label} ${attr.value} sur 99`}
                >
                  <span
                    className="cg-attr__fill"
                    style={{ width: `${fraction}%` }}
                  />
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
