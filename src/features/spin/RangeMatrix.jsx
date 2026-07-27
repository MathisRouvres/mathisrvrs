import { useMemo } from 'react'
import { RANKS, handLabel, COLOR_HEX, FOLD_HEX, resolveColorHex } from './scenarios'

/** Normalise un libellé d'action/couleur pour l'appariement. */
function norm(s) {
  return String(s || '').trim().toLowerCase()
}

/**
 * Construit action(normalisée) → { hex, label } à partir de la légende de la grille.
 * La couleur d'origine (nom renvoyé par la transcription) est convertie en hex.
 */
function buildActionColors(legend = []) {
  const map = new Map()
  for (const entry of legend) {
    map.set(norm(entry.label), { hex: resolveColorHex(entry.color), label: entry.label })
  }
  return map
}

function cellColor(action, actionColors) {
  const key = norm(action)
  if (!key || key === 'fold') return FOLD_HEX
  const hit = actionColors.get(key)
  if (hit?.hex) return hit.hex
  // Repli heuristique si la couleur de légende est absente/inconnue.
  if (key.includes('shove') || key.includes('all')) return COLOR_HEX.green
  if (key.includes('3bet') || key.includes('3-bet')) return COLOR_HEX.cyan
  if (key.includes('iso')) return COLOR_HEX.blue
  if (key.includes('limp')) return COLOR_HEX.purple
  if (key.includes('call')) return COLOR_HEX.red
  if (key.includes('open') || key.includes('raise')) return COLOR_HEX.orange
  return FOLD_HEX
}

/** Contraste texte lisible sur un fond hex. */
function textOn(hex) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return '#1a1a1a'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1a1a1a' : '#ffffff'
}

/**
 * Grille de range native 13×13.
 * @param {{ range: { legend?: Array, cells?: Object } | null }} props
 */
export default function RangeMatrix({ range }) {
  const actionColors = useMemo(() => buildActionColors(range?.legend), [range])
  const cells = range?.cells || {}

  if (!range || Object.keys(cells).length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-sm text-[var(--text-secondary)]">
        Range indisponible
      </div>
    )
  }

  return (
    <div className="w-full">
      <div
        className="grid w-full select-none gap-[2px] rounded-xl bg-[var(--bg-elevated)] p-[2px]"
        style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
      >
        {RANKS.map((_, r) =>
          RANKS.map((__, c) => {
            const hand = handLabel(r, c)
            const cell = cells[hand] || {}
            const bg = cellColor(cell.action, actionColors)
            const fg = textOn(bg)
            return (
              <div
                key={hand}
                title={`${hand} · ${cell.action ?? 'fold'}${cell.threshold != null ? ` · ${cell.threshold}bb` : ''}`}
                className="flex aspect-square flex-col items-center justify-center rounded-[3px] leading-none"
                style={{ backgroundColor: bg, color: fg }}
              >
                <span className="text-[clamp(6px,1.4vw,12px)] font-semibold">{hand}</span>
                {cell.threshold != null && (
                  <span className="text-[clamp(5px,1.1vw,10px)] opacity-90">{cell.threshold}</span>
                )}
              </div>
            )
          }),
        )}
      </div>

      <Legend legend={range.legend} />
    </div>
  )
}

function Legend({ legend }) {
  if (!legend?.length) return null
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
      {legend.map((entry, i) => {
        const hex = resolveColorHex(entry.color) || FOLD_HEX
        return (
          <div key={`${entry.label}-${i}`} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="inline-block h-3.5 w-3.5 rounded-[3px] border border-black/10" style={{ backgroundColor: hex }} />
            <span className="font-medium text-[var(--text-primary)]">{entry.label}</span>
            {entry.pct != null && <span>{entry.pct}%</span>}
          </div>
        )
      })}
    </div>
  )
}
