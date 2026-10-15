/**
 * Classement d'une adresse en section du site (et jeu éventuel) pour les stats.
 * Seul le chemin part dans les événements, jamais la query string ; les codes
 * de partie MonoVomy (`/monovomy/join/ABCD`) sont retirés, ce sont des secrets.
 */

export interface PageInfo {
  /** Chemin enregistré, nettoyé. */
  path: string
  /** Section du site : portfolio, games, soiree, monovomy, carriere, spin, hexland. */
  section: string
  /** Jeu ouvert par cette page (`soiree:<slug>`), sinon null. */
  game: string | null
}

const SLUG_RE = /^[a-z0-9-]{1,40}$/

function clean(pathname: string): string {
  let path = pathname.replace(/\/+$/, '') || '/'
  try {
    path = decodeURIComponent(path)
  } catch {
    // adresse mal encodée : on garde la forme brute
  }
  return path.replace(/^\/carrière(?=\/|$)/, '/carriere').toLowerCase()
}

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

/** `null` : page à ne pas compter (le dashboard lui-même). */
export function classifyPath(pathname: string): PageInfo | null {
  const path = clean(pathname)

  if (under(path, '/stats')) return null
  if (path === '/') return { path, section: 'portfolio', game: null }
  if (path === '/games') return { path, section: 'games', game: null }

  if (under(path, '/games/soiree')) {
    const slug = path.slice('/games/soiree/'.length).split('/')[0] ?? ''
    if (SLUG_RE.test(slug)) return { path: `/games/soiree/${slug}`, section: 'soiree', game: `soiree:${slug}` }
    return { path: '/games/soiree', section: 'soiree', game: null }
  }

  if (under(path, '/monovomy')) return { path: '/monovomy', section: 'monovomy', game: null }
  if (under(path, '/carriere')) return { path: path === '/carriere' ? path : '/carriere/dev', section: 'carriere', game: null }
  if (path === '/spin') return { path, section: 'spin', game: null }
  if (under(path, '/catan')) return { path: '/catan', section: 'hexland', game: null }

  // Toute autre adresse affiche le portfolio.
  return { path: '/(autre)', section: 'portfolio', game: null }
}
