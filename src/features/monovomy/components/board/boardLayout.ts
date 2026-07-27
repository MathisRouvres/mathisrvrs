/**
 * Géométrie du plateau 2.5D : mappe les 40 cases sur une grille 11×11
 * (4 côtés de 9 + 4 coins), sens Monopoly classique (Départ en bas à droite).
 */
export interface Cell {
  row: number
  col: number
}

export function cellFor(index: number): Cell {
  const i = ((index % 40) + 40) % 40
  if (i === 0) return { row: 11, col: 11 }
  if (i === 10) return { row: 11, col: 1 }
  if (i === 20) return { row: 1, col: 1 }
  if (i === 30) return { row: 1, col: 11 }
  if (i < 10) return { row: 11, col: 11 - i } // bas, vers la gauche
  if (i < 20) return { row: 21 - i, col: 1 } // gauche, vers le haut
  if (i < 30) return { row: 1, col: i - 19 } // haut, vers la droite
  return { row: i - 29, col: 11 } // droite, vers le bas
}

/** Centre d’une case en pourcentages (0–100) du plateau. */
export function cellCenter(index: number): { x: number; y: number } {
  const cell = cellFor(index)
  return {
    x: ((cell.col - 0.5) / 11) * 100,
    y: ((cell.row - 0.5) / 11) * 100,
  }
}
