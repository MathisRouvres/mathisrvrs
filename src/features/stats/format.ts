/** Libellés et mises en forme du dashboard `/stats`. */

const SECTION_LABELS: Record<string, string> = {
  portfolio: 'Portfolio',
  games: 'Accueil des jeux',
  soiree: 'Jeux de soirée',
  monovomy: 'MonoVomy',
  carriere: 'Mode carrière',
  spin: 'Spin & Go',
  hexland: 'HEXLAND',
  dispo: 'Dispos',
}

export function sectionLabel(section: string): string {
  return SECTION_LABELS[section] ?? section
}

/** `loup-garou` → « Loup garou » ; le catalogue complet n'est pas chargé ici. */
function prettySlug(slug: string): string {
  const text = slug
    .replace(/-/g, ' ')
    .replace(/\b([cdjlmnst]) (?=[aeiouyh])/g, "$1'")
    .trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function gameLabel(game: string): { title: string; group: string } {
  if (game === 'hexland') return { title: 'HEXLAND', group: 'Jeu 3D' }
  if (game === 'monovomy:local') return { title: 'MonoVomy · un téléphone', group: 'MonoVomy' }
  if (game === 'monovomy:online') return { title: 'MonoVomy · en ligne', group: 'MonoVomy' }
  if (game === 'soiree') return { title: 'Parties à plusieurs téléphones', group: 'Jeux de soirée' }
  if (game.startsWith('soiree:')) return { title: prettySlug(game.slice('soiree:'.length)), group: 'Jeux de soirée' }
  return { title: game, group: '' }
}

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Page vue',
  game_start: 'Partie lancée',
  room_create: 'Partie à plusieurs créée',
  room_join: 'Partie à plusieurs rejointe',
}

export function eventLabel(event: string): string {
  return EVENT_LABELS[event] ?? event
}

const DEVICE_LABELS: Record<string, string> = { mobile: 'Téléphone', tablet: 'Tablette', desktop: 'Ordinateur' }

export function deviceLabel(device: string): string {
  return DEVICE_LABELS[device] ?? device
}

const number = new Intl.NumberFormat('fr-FR')

export function formatNumber(value: number): string {
  return number.format(value)
}

/** 45 s · 3 min · 1 h 05 */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${String(minutes % 60).padStart(2, '0')}`
}

/** Évolution par rapport à la période précédente, ou null si rien à comparer. */
export function delta(current: number, previous: number): { text: string; trend: 'up' | 'down' | 'flat' } | null {
  if (!previous) return null
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return { text: '=', trend: 'flat' }
  return { text: `${change > 0 ? '+' : '−'}${Math.abs(change)} %`, trend: change > 0 ? 'up' : 'down' }
}

const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const shortDayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** `2026-10-15` → « jeu. 15 oct. » (date calendaire, sans décalage horaire). */
export function formatDay(day: string, short = false): string {
  const date = new Date(`${day.slice(0, 10)}T12:00:00Z`)
  return (short ? shortDayFormat : dayFormat).format(date)
}

export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** Matrice 7 jours (lundi d'abord) × 24 heures. */
export function buildHeatmap(cells: Array<{ dow: number; hour: number; n: number }>) {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  let max = 0
  for (const { dow, hour, n } of cells) {
    const row = grid[dow - 1]
    if (!row || hour < 0 || hour > 23) continue
    row[hour] = n
    max = Math.max(max, n)
  }
  const byHour = Array.from({ length: 24 }, (_, h) => grid.reduce((sum, row) => sum + (row[h] ?? 0), 0))
  return { grid, max, byHour }
}

const relative = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

/** « il y a 5 minutes », puis la date au-delà de 24 h. */
export function formatWhen(iso: string, now = Date.now()): string {
  const at = new Date(iso).getTime()
  const minutes = Math.round((now - at) / 60_000)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return relative.format(-minutes, 'minute')
  if (minutes < 24 * 60) return relative.format(-Math.round(minutes / 60), 'hour')
  return timeFormat.format(at)
}
