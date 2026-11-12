import { useEffect, useId, useRef, useState } from 'react'
import { centeredCrop, clampCrop, minCropSize, resizeCrop } from './avatar'
import { focusRing, primaryButton, secondaryButton } from './ui'

const PREVIEW = 72

/**
 * Fenêtre de recadrage : la photo avec un cadre carré à placer. Glisser (souris ou doigt) sur
 * la photo déplace le cadre ; le curseur change sa taille ; au clavier, flèches pour déplacer,
 * + et − pour la taille. Le rond montre ce qui apparaîtra comme photo de profil.
 * `onConfirm(crop)` reçoit le cadre en pixels de l'image d'origine.
 */
export default function PhotoCropper({ image, url, busy, error, onCancel, onConfirm }) {
  const id = useId()
  const dialog = useRef(null)
  const frame = useRef(null)
  const drag = useRef(null)
  const { naturalWidth: width, naturalHeight: height } = image
  const [crop, setCrop] = useState(() => centeredCrop(width, height))
  // Pixels affichés par pixel d'origine ; 0 tant que la photo n'est pas mesurée.
  const [scale, setScale] = useState(0)
  const side = Math.min(width, height)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    const node = frame.current
    if (!node) return undefined
    const observer = new ResizeObserver(() => setScale(node.clientWidth / width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [width])

  function handlePointerDown(event) {
    if (event.button !== 0 || busy) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, crop }
  }

  function handlePointerMove(event) {
    const start = drag.current
    if (!start || !scale) return
    const dx = (event.clientX - start.x) / scale
    const dy = (event.clientY - start.y) / scale
    setCrop(clampCrop({ ...start.crop, x: start.crop.x + dx, y: start.crop.y + dy }, width, height))
  }

  function handlePointerUp() {
    drag.current = null
  }

  function handleKeyDown(event) {
    const step = Math.max(1, Math.round(crop.size * 0.05))
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      setCrop(clampCrop({ ...crop, x: crop.x + move[0], y: crop.y + move[1] }, width, height))
    } else if (event.key === '+' || event.key === '-') {
      event.preventDefault()
      setCrop(resizeCrop(crop, crop.size * (event.key === '+' ? 1.1 : 0.9), width, height))
    }
  }

  const box = { left: crop.x * scale, top: crop.y * scale, width: crop.size * scale, height: crop.size * scale }
  const previewScale = PREVIEW / crop.size

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
      className="m-auto w-[min(100%-2rem,28rem)] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/60"
    >
      <h2 id={`${id}-title`} className="font-display text-lg font-bold">
        Cadrer la photo
      </h2>
      <p id={`${id}-help`} className="mt-1 text-xs text-[var(--text-secondary)]">
        Fais glisser la photo pour placer le carré. Au clavier : flèches pour déplacer, + et − pour la taille.
      </p>

      <div
        ref={frame}
        tabIndex={0}
        role="group"
        aria-label="Cadre de la photo"
        aria-describedby={`${id}-help`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={`relative mx-auto mt-4 cursor-move touch-none select-none overflow-hidden rounded-lg ${focusRing}`}
        style={{ aspectRatio: `${width} / ${height}`, width: '100%', maxWidth: `min(24rem, calc(55vh * ${width / height}))` }}
      >
        <img src={url} alt="" draggable={false} className="pointer-events-none block h-full w-full" />
        {scale > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
            style={box}
          >
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/80" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div
          aria-hidden="true"
          className="shrink-0 rounded-full border border-[var(--border-color)]"
          style={{
            width: PREVIEW,
            height: PREVIEW,
            backgroundImage: `url(${url})`,
            backgroundSize: `${width * previewScale}px ${height * previewScale}px`,
            backgroundPosition: `${-crop.x * previewScale}px ${-crop.y * previewScale}px`,
          }}
        />
        <label className="min-w-0 flex-1 text-sm font-medium">
          Taille du cadre
          <input
            type="range"
            min={minCropSize(width, height)}
            max={side}
            value={crop.size}
            disabled={busy}
            onChange={(event) => setCrop(resizeCrop(crop, Number(event.target.value), width, height))}
            className="mt-2 block w-full accent-[var(--accent)]"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={busy} className={secondaryButton}>
          Annuler
        </button>
        <button type="button" onClick={() => onConfirm(crop)} disabled={busy} className={primaryButton}>
          {busy ? 'Enregistrement…' : 'Valider'}
        </button>
      </div>
    </dialog>
  )
}
