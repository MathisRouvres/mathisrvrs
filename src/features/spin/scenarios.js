/**
 * Manifeste de navigation des ranges Spin & Go.
 * Découple l'affichage (labels, ordre, stacks) de la data brute
 * (`data/spin-ranges.json`, clé = nom de sheet Excel).
 */

/** Ordre canonique des mains dans une grille 13×13. */
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

/**
 * Étiquette d'une case à partir de ses index ligne/colonne.
 * Diagonale = paire, triangle haut-droit = suited, bas-gauche = offsuit.
 */
export function handLabel(rowIdx, colIdx) {
  const r = RANKS[rowIdx]
  const c = RANKS[colIdx]
  if (rowIdx === colIdx) return `${r}${r}`
  if (rowIdx < colIdx) return `${r}${c}s`
  return `${c}${r}o`
}

/**
 * Couleur → hex, pour reproduire la légende d'origine du fichier Excel.
 * L'agent de transcription renvoie le nom de couleur par catégorie de légende.
 */
export const COLOR_HEX = {
  red: '#e23b2e',
  orange: '#ee8b2b',
  brown: '#a9762f',
  green: '#4caf50',
  olive: '#9aa050',
  khaki: '#b3a05a',
  yellow: '#f6e400',
  tan: '#d9b38c',
  beige: '#e2c9a6',
  pink: '#e79a9a',
  cyan: '#22b8cf',
  teal: '#20a4a4',
  blue: '#5b9bd5',
  purple: '#9b6fc0',
  gray: '#8a8a8a',
  grey: '#8a8a8a',
  white: '#f2f2f2',
}

/** Couleur du fond « fold » par défaut si non fournie par la légende. */
export const FOLD_HEX = '#c9a882'

/**
 * Résout un nom de couleur (parfois composé, ex. "cyan/teal", "blue border")
 * en hex. Retourne null si aucun token connu.
 */
export function resolveColorHex(name) {
  const s = String(name || '').trim().toLowerCase()
  if (COLOR_HEX[s]) return COLOR_HEX[s]
  for (const tok of s.split(/[^a-z]+/)) {
    if (COLOR_HEX[tok]) return COLOR_HEX[tok]
  }
  return null
}

/**
 * Arbre de navigation : format → scénario → stacks.
 * `sheets[stack]` = clé exacte dans spin-ranges.json.
 */
export const SCENARIOS = [
  // ── 3-WAY ──
  {
    format: '3WAY',
    group: 'Bouton',
    id: 'BTN',
    label: 'Bouton — Open',
    sheets: { 25: 'BTN-25BB', 20: 'BTN-20BB', 15: 'BTN-15BB', 10: 'BTN-10BB' },
  },
  {
    format: '3WAY',
    group: 'Small Blind',
    id: 'SBvsBTNLIMP',
    label: 'SB vs BTN Limp',
    sheets: {
      25: 'SBvsBTNLIMP-25BB',
      20: 'SBvsBTNLIMP-20BB',
      15: 'SBvsBTNLIMP-15BB',
      10: 'SBvsBTNLIMP-10BB',
    },
  },
  {
    format: '3WAY',
    group: 'Small Blind',
    id: 'SBvsBTNOPEN',
    label: 'SB vs BTN Open',
    sheets: {
      25: 'SBvsBTNOPEN-25BB',
      20: 'SBvsBTNOPEN-20BB',
      15: 'SBvsBTNOPEN-15BB',
      10: 'SBvsBTNOPEN-10BB',
    },
  },
  {
    format: '3WAY',
    group: 'Small Blind',
    id: 'SBvsBTNSHOVE',
    label: 'SB vs BTN Shove',
    sheets: {
      25: 'SBvsBTNSHOVE-25BB',
      15: 'SBvsBTNSHOVE-15BB',
      10: 'SBvsBTNSHOVE-10BB',
      6: 'SBvsBTNSHOVE-6BB',
    },
  },
  {
    format: '3WAY',
    group: 'Small Blind',
    id: 'SBvsBB',
    label: 'SB vs BB',
    sheets: { 25: 'SBvsBB-25BB', 20: 'SBvsBB-20BB', 15: 'SBvsBB-15BB', 10: 'SBvsBB-10BB' },
  },
  {
    format: '3WAY',
    group: 'Big Blind',
    id: 'BBvsBTNLIMP',
    label: 'BB vs BTN Limp',
    sheets: {
      25: 'BBvsBTN-LIMP-25BB',
      20: 'BBvsBTN-LIMP-20BB',
      15: 'BBvsBTN-LIMP-15BB',
      10: 'BBvsBTN-LIMP-10BB',
    },
  },
  {
    format: '3WAY',
    group: 'Big Blind',
    id: 'BBvsBTNSHOVE',
    label: 'BB vs BTN Shove',
    sheets: {
      25: 'BBvsBTNSHOVE-25BB',
      15: 'BBvsBTNSHOVE-15BB',
      10: 'BBvsBTNSHOVE-10BB',
      6: 'BBvsBTNSHOVE-6BB',
    },
  },
  {
    format: '3WAY',
    group: 'Big Blind',
    id: 'BBvsSBLIMP',
    label: 'BB vs SB Limp',
    sheets: { 20: 'BBvsSB-LIMP-20BB', 15: 'BBvsSB-LIMP-15BB', 10: 'BBvsSB-LIMP-10BB' },
  },
  // ── HEADS-UP ──
  {
    format: 'HU',
    group: 'Small Blind',
    id: 'SBHU',
    label: 'SB (open/limp)',
    sheets: { 20: 'SB-HU-20BB', 15: 'SB-HU-15BB', 10: 'SB-HU-10BB', 6: 'SB-HU-6BB' },
  },
  {
    format: 'HU',
    group: 'Big Blind',
    id: 'BBvsLIMPHU',
    label: 'BB vs Limp',
    sheets: {
      20: 'BBvsLIMP-HU-20BB',
      15: 'BBvsLIMP-HU-15BB',
      10: 'BBvsLIMP-HU-10BB',
      8: 'BBvsLIMP-HU-8BB',
      6: 'BBvsLIMP-HU-6BB',
    },
  },
  {
    format: 'HU',
    group: 'Big Blind',
    id: 'BBvsOPENHU',
    label: 'BB vs Open',
    sheets: {
      20: 'BBvsOPEN-HU-20BB',
      15: 'BBvsOPEN-HU-15BB',
      10: 'BBvsOPEN-HU-10BB',
      7: 'BBvsOPEN-HU-7BB',
    },
  },
]

export const FORMATS = [
  { id: '3WAY', label: '3-Way' },
  { id: 'HU', label: 'Heads-Up' },
]

/** Stacks d'un scénario, triés décroissant. */
export function stacksOf(scenario) {
  return Object.keys(scenario.sheets)
    .map(Number)
    .sort((a, b) => b - a)
}
