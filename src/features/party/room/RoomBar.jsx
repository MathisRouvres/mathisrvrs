import { useId, useState } from 'react'
import { btnGhost, btnPrimary } from '../components/buttons'
import { inviteLink } from './doc'
import QrCode from './QrCode'

const STATUS = {
  online: { label: 'Connecté.', dot: 'bg-emerald-500' },
  connecting: { label: 'Connexion…', dot: 'bg-amber-400 motion-safe:animate-pulse' },
  offline: { label: 'Hors ligne, reconnexion…', dot: 'bg-rose-500 motion-safe:animate-pulse' },
}

/**
 * Bandeau de la partie à plusieurs téléphones : code, connexion, invitation
 * (QR code, lien), téléphones présents, jouer ou regarder, quitter.
 */
export default function RoomBar({ store, snapshot, onLeave }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const status = STATUS[snapshot.status]
  const link = inviteLink(window.location.origin, store.code)
  const online = snapshot.members.filter((m) => m.online).length
  const me = snapshot.members.find((m) => m.id === store.clientId)

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Jeux de soirée', text: `Rejoins la partie ${store.code}`, url: link })
        return
      }
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Partage annulé ou presse-papiers refusé : le lien reste lisible sous le QR code.
    }
  }

  return (
    <section aria-label="Partie à plusieurs téléphones" className="glass-card rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm">
          <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.dot}`} />
          <span className="sr-only">{status.label} </span>
          <span className="truncate">
            Partie <strong className="font-display tracking-widest">{store.code}</strong>
            <span className="text-[var(--text-secondary)]">
              {' '}
              · {online} téléphone{online > 1 ? 's' : ''}
            </span>
          </span>
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((o) => !o)}
          className="min-h-11 shrink-0 rounded-xl border border-[var(--border-color)] px-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
        >
          {open ? 'Fermer' : 'Inviter'}
        </button>
      </div>
      {snapshot.status !== 'online' && (
        <p role="status" className="mt-2 text-xs text-[var(--text-secondary)]">
          {status.label} Tes actions partiront dès le retour du réseau.
        </p>
      )}

      {open && (
        <div id={`${id}-panel`} className="mt-4 flex flex-col items-center gap-4">
          <QrCode value={link} size={200} label={`QR code pour rejoindre la partie ${store.code}`} />
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Scanne le QR code, ou ouvre les jeux de soirée et entre le code{' '}
            <strong className="font-display tracking-widest text-[var(--text-primary)]">{store.code}</strong>.
          </p>
          <p className="w-full break-all rounded-xl bg-[var(--bg-primary)] px-3 py-2 text-center text-xs text-[var(--text-muted)]">
            {link}
          </p>
          <button type="button" className={`${btnPrimary} w-full`} onClick={share}>
            {copied ? 'Lien copié !' : 'Partager le lien'}
          </button>

          <div className="w-full">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Téléphones</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {snapshot.members.map((m) => (
                <li
                  key={m.id}
                  className={`flex items-center gap-1.5 rounded-full border border-[var(--border-color)] px-3 py-1 text-sm ${
                    m.online ? '' : 'opacity-50'
                  }`}
                >
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${m.online ? 'bg-emerald-500' : 'bg-[var(--text-muted)]'}`} />
                  {m.displayName}
                  {m.id === store.clientId && <span className="text-[var(--text-muted)]">(toi)</span>}
                  {m.spectator && <span className="text-[var(--text-muted)]">· regarde</span>}
                  {!m.online && <span className="sr-only">, déconnecté</span>}
                </li>
              ))}
            </ul>
          </div>

          {me && (
            <label className="flex w-full cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="font-semibold">Je joue</span>
                <span className="block text-sm text-[var(--text-secondary)]">
                  Décoche pour regarder ou mener la partie (meneur du Loup-Garou).
                </span>
              </span>
              <input
                type="checkbox"
                checked={!me.spectator}
                onChange={(e) => store.setPlaying(e.target.checked)}
                className="h-6 w-6 shrink-0 accent-[var(--accent)]"
              />
            </label>
          )}

          <button type="button" className={`${btnGhost} w-full`} onClick={onLeave}>
            Quitter la partie
          </button>
        </div>
      )}
    </section>
  )
}
