/**
 * Types de l'environnement du plateau.
 *
 * Un environnement est une PEAU : il décrit ce qu'on pose autour du plateau et
 * comment on l'éclaire. Il n'entre jamais dans l'état de jeu — le moteur, le
 * PRNG et le réseau ignorent son existence. Deux joueurs d'une même partie
 * peuvent regarder deux décors différents sans que rien ne diverge.
 */

export type BoardEnvironmentId = 'club_private' | 'apartment_party' | 'underground'

/** Disposition des places autour du plateau. */
export type PlayerLayoutType = 'circle' | 'lounge' | 'table'

export type BoardEnvironmentLighting = {
  /** Multiplicateur de la lumière ambiante de l'ambiance courante. */
  ambientIntensity: number
  /** Multiplicateur des deux sources latérales colorées. */
  accentIntensity: number
  /** Faisceaux tombant du hors-champ. */
  spotlightEnabled: boolean
  /** Nombre de faisceaux (0 si `spotlightEnabled` est faux). */
  beamCount: number
  /** Opacité d'un faisceau. Volontairement basse : jamais d'aplat opaque. */
  beamOpacity: number
  /** Rayon du faisceau au sol. Plus fin = moins envahissant. */
  beamRadius: number
  /** Multiplicateur du contre-jour (rim) qui détache pions et tranches de cases. */
  rimIntensity: number
  /** Multiplicateur de l'exposition ACES. */
  exposure: number
  /** Multiplicateur du vignettage (sol 3D + voile DOM). */
  vignette: number
  /** Multiplicateur du bloom. */
  bloom: number
}

export type BoardEnvironmentPalette = {
  /** Sol de la pièce, au centre puis au bord. */
  floorInner: string
  floorOuter: string
  /** Dessus de table, chanfrein, corps. */
  tableTop: string
  tableEdge: string
  tableBody: string
  /** Mobilier des places et son liseré. */
  seat: string
  seatTrim: string
  /** Plaque posée sur le bord de table devant chaque place. */
  seatPlate: string
  /** Dôme : zénith → sol. */
  domeZenith: string
  domeUpper: string
  domeHorizon: string
  domeGround: string
  /** Objets de décor (verres, snacks, caisses). */
  prop: string
  propTrim: string
  /** Surcharges facultatives de l'ambiance de soirée. */
  fog?: string
  bg?: string
}

export type BoardEnvironmentPlayerLayout = {
  type: PlayerLayoutType
  /** Rayon des plaques joueurs sur le bord de table. */
  radius: number
  /** Rayon utilisé en cadrage compact (téléphone) : le rail des titres est masqué. */
  compactRadius: number
  /** Rayon du mobilier des places, au sol. */
  furnitureRadius: number
}

export type BoardEnvironmentAtmosphere = {
  /** Densité de fumée (0 = aucune). Multipliée par l'intensité de soirée. */
  smoke: number
  /** Nombre de lueurs floues d'arrière-plan. */
  bokeh: number
  /** Opacité de la brume au ras du sol. */
  haze: number
}

export type BoardEnvironmentPreset = {
  id: BoardEnvironmentId
  name: string
  description: string
  /** Classe posée sur la racine du plateau : les calques DOM (plaques joueurs,
   *  voile de vignettage) s'accordent au décor sans logique conditionnelle. */
  className: string
  lighting: BoardEnvironmentLighting
  palette: BoardEnvironmentPalette
  playerLayout: BoardEnvironmentPlayerLayout
  atmosphere: BoardEnvironmentAtmosphere
}

/** Ambiance de soirée telle que la produit `ambianceFor` (moteur → visuel). */
export type PartyAmbiance = {
  lightA: string
  lightB: string
  i1: number
  i2: number
  ambient: number
  speed: number
  pulse: number
  bloom: number
  fog: string
  bg: string
  rim: { color: string; intensity: number }
  exposure: number
  vignette: number
}
