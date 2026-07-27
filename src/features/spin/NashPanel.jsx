import { RANKS, handLabel } from './scenarios'
import nash from './data/nash.json'

/** Contraste texte sur fond hex. */
function textOn(hex) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return '#1a1a1a'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#1a1a1a' : '#ffffff'
}

/** Gradient couleur selon la valeur (max BB pour shove). */
function valueColor(v) {
  if (v === '20+') return '#1b7a3d'
  const n = parseFloat(v)
  if (Number.isNaN(n)) return '#c9a882'
  if (n >= 10) return '#4caf50'
  if (n >= 7) return '#a9c93a'
  if (n >= 5) return '#f6e400'
  if (n >= 4) return '#ee8b2b'
  if (n >= 3.3) return '#e79a9a'
  return '#5b9bd5'
}

/** Couleur structurelle : paire / suited / offsuit. */
function structColor(r, c) {
  if (r === c) return '#5b9bd5' // paire
  if (r < c) return '#7fce7f' // suited
  return '#edb87f' // offsuit
}

function NumberGrid({ cells, mode }) {
  return (
    <div
      className="grid w-full select-none gap-[2px] rounded-xl bg-[var(--bg-elevated)] p-[2px]"
      style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
    >
      {RANKS.map((_, r) =>
        RANKS.map((__, c) => {
          const hand = handLabel(r, c)
          const v = cells[hand]
          const bg = mode === 'struct' ? structColor(r, c) : valueColor(v)
          const fg = textOn(bg)
          return (
            <div
              key={hand}
              title={`${hand} · ${v ?? ''}`}
              className="flex aspect-square flex-col items-center justify-center rounded-[3px] leading-none"
              style={{ backgroundColor: bg, color: fg }}
            >
              <span className="text-[clamp(5px,1.1vw,10px)] font-semibold opacity-80">{hand}</span>
              <span className="text-[clamp(6px,1.5vw,12px)] font-bold">{v}</span>
            </div>
          )
        }),
      )}
    </div>
  )
}

/** Référence Nash Push/Fold : open-shove + Heads-Up pusher/caller. */
export default function NashPanel() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 text-base font-semibold">Open-Shove Nash</h3>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          Nombre = stack effectif max (BB) pour shove profitable. <b>20+</b> = toujours.
        </p>
        <div className="mx-auto max-w-xl">
          <NumberGrid cells={nash.openShove.cells} mode="value" />
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-base font-semibold">Heads-Up Push / Fold Nash</h3>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          Stack max (BB) pour push / call. <span className="text-[#4a8f4a]">■</span> suited ·{' '}
          <span className="text-[#c98a4a]">■</span> offsuit · <span className="text-[#5b9bd5]">■</span> paire.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Pusher</p>
            <NumberGrid cells={nash.hu.pusher} mode="struct" />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Caller</p>
            <NumberGrid cells={nash.hu.caller} mode="struct" />
          </div>
        </div>
      </section>
    </div>
  )
}
