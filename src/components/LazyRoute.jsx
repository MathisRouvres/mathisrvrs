import { Component, Suspense } from 'react'

const RELOAD_KEY = 'route-chunk-reload'
const RELOAD_WINDOW_MS = 30_000

/**
 * Un onglet ouvert avant un déploiement référence des fichiers JS qui n'existent
 * plus sur le serveur : le chargement de la section échoue. On recharge alors la
 * page une fois (pour récupérer le nouvel index.html), jamais en boucle.
 */
function isChunkLoadError(error) {
  const message = String(error?.message ?? error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(message)
}

function reloadedRecently() {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_KEY))
    return Number.isFinite(at) && Date.now() - at < RELOAD_WINDOW_MS
  } catch {
    return true
  }
}

function markReload() {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // Stockage indisponible : on ne recharge pas automatiquement.
  }
}

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error) && !reloadedRecently()) {
      markReload()
      window.location.reload()
    }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-4 text-center text-[var(--text-primary)]">
        <p className="font-display text-xl font-bold">Cette page n’a pas pu se charger.</p>
        <p className="text-sm text-[var(--text-secondary)]">Vérifie ta connexion, puis réessaie.</p>
        <button
          type="button"
          onClick={() => {
            markReload()
            window.location.reload()
          }}
          className="min-h-12 rounded-2xl bg-[var(--accent)] px-5 font-semibold text-white dark:text-[#070b14]"
        >
          Recharger
        </button>
      </div>
    )
  }
}

function RouteLoading() {
  return (
    <div
      role="status"
      className="flex min-h-dvh items-center justify-center bg-[var(--bg-primary)] text-sm text-[var(--text-secondary)]"
    >
      <span className="mr-3 inline-block h-5 w-5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
      Chargement…
    </div>
  )
}

/** Section chargée à la demande : écran d'attente + reprise si le fichier manque. */
export default function LazyRoute({ children }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteLoading />}>{children}</Suspense>
    </RouteErrorBoundary>
  )
}
