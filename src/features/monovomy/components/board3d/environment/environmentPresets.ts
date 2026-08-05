import type {
  BoardEnvironmentId,
  BoardEnvironmentPreset,
  PartyAmbiance,
} from './environmentTypes'

/**
 * Les trois environnements du plateau.
 *
 * Chacun décrit UNIQUEMENT du visuel : palette, éclairage, disposition des
 * places, atmosphère. Aucun preset ne touche aux règles, aux prix, aux cases ni
 * à la position des pions — changer de décor en pleine partie ne recrée rien et
 * ne fait dévier aucun client.
 *
 * L'intensité de soirée (`partyIntensity`, pilotée par le moteur) reste la
 * source de vérité des couleurs de lumière : le preset la MODULE, il ne la
 * remplace pas. Un warm-up reste calme dans les trois décors, une finale reste
 * saturée dans les trois.
 */

export const CLUB_PRIVATE: BoardEnvironmentPreset = {
  id: 'club_private',
  name: 'Club privé',
  description: 'Carré VIP : banquette velours, liserés violets, dorures discrètes.',
  className: 'mv-env--club',
  lighting: {
    ambientIntensity: 0.92,
    accentIntensity: 1,
    spotlightEnabled: true,
    beamCount: 2,
    beamOpacity: 0.035,
    beamRadius: 1.7,
    rimIntensity: 1,
    exposure: 1,
    vignette: 1,
    bloom: 1,
  },
  palette: {
    floorInner: '#1b1029',
    floorOuter: '#08050f',
    tableTop: '#241318',
    tableEdge: '#4a2f22',
    tableBody: '#1b100e',
    seat: '#2f1740',
    seatTrim: '#c9a13a',
    seatPlate: '#171021',
    domeZenith: '#3a2a5e',
    domeUpper: '#1a1030',
    domeHorizon: '#0a0616',
    domeGround: '#030106',
    prop: '#93a4b1',
    propTrim: '#c9a13a',
  },
  playerLayout: {
    type: 'lounge',
    radius: 12.55,
    compactRadius: 7.45,
    furnitureRadius: 16.4,
  },
  atmosphere: { smoke: 0, bokeh: 56, haze: 0.16 },
}

export const APARTMENT_PARTY: BoardEnvironmentPreset = {
  id: 'apartment_party',
  name: 'Appartement',
  description: 'Salon de nuit : table basse, canapé, baie vitrée sur la ville.',
  className: 'mv-env--apartment',
  lighting: {
    ambientIntensity: 1.25,
    accentIntensity: 0.82,
    spotlightEnabled: false,
    beamCount: 0,
    beamOpacity: 0,
    beamRadius: 0,
    rimIntensity: 0.78,
    exposure: 0.97,
    vignette: 0.72,
    bloom: 0.8,
  },
  palette: {
    floorInner: '#241d2c',
    floorOuter: '#0d0a14',
    tableTop: '#2b2130',
    tableEdge: '#5b4436',
    tableBody: '#241a1a',
    seat: '#2c3350',
    seatTrim: '#8fa2d8',
    seatPlate: '#1d1b28',
    domeZenith: '#2c2244',
    domeUpper: '#191228',
    domeHorizon: '#0e0a18',
    domeGround: '#06040c',
    prop: '#a9b6c4',
    propTrim: '#e08a4a',
    fog: '#140f22',
    bg: '#0c0916',
  },
  playerLayout: {
    type: 'circle',
    radius: 12.55,
    compactRadius: 7.45,
    furnitureRadius: 16.1,
  },
  atmosphere: { smoke: 0, bokeh: 34, haze: 0.1 },
}

export const UNDERGROUND: BoardEnvironmentPreset = {
  id: 'underground',
  name: 'Warehouse',
  description: 'Hangar aménagé : béton, structures métalliques, magenta et orange.',
  className: 'mv-env--underground',
  lighting: {
    ambientIntensity: 0.74,
    accentIntensity: 1.18,
    spotlightEnabled: true,
    beamCount: 4,
    beamOpacity: 0.03,
    beamRadius: 1.35,
    rimIntensity: 1.12,
    exposure: 1.04,
    vignette: 1.12,
    bloom: 1.15,
  },
  palette: {
    floorInner: '#191720',
    floorOuter: '#07060a',
    tableTop: '#1c1a20',
    tableEdge: '#3a3742',
    tableBody: '#141319',
    seat: '#26242e',
    seatTrim: '#f97316',
    seatPlate: '#131218',
    domeZenith: '#2a1220',
    domeUpper: '#160a14',
    domeHorizon: '#0a050a',
    domeGround: '#040206',
    prop: '#8b8b96',
    propTrim: '#f97316',
  },
  playerLayout: {
    type: 'table',
    radius: 12.55,
    compactRadius: 7.45,
    furnitureRadius: 16.8,
  },
  atmosphere: { smoke: 1, bokeh: 40, haze: 0.26 },
}

export const BOARD_ENVIRONMENTS: readonly BoardEnvironmentPreset[] = [
  CLUB_PRIVATE,
  APARTMENT_PARTY,
  UNDERGROUND,
]

/** Décor par défaut, et repli de tout identifiant inconnu. */
export const DEFAULT_ENVIRONMENT_ID: BoardEnvironmentId = 'club_private'

const BY_ID = new Map<string, BoardEnvironmentPreset>(
  BOARD_ENVIRONMENTS.map((p) => [p.id, p]),
)

/** Vrai si l'identifiant correspond à un environnement livré. */
export function isEnvironmentId(id: unknown): id is BoardEnvironmentId {
  return typeof id === 'string' && BY_ID.has(id)
}

/**
 * Preset d'un identifiant. Tout ce qui n'est pas connu — ancienne préférence,
 * valeur venue du réseau, localStorage bricolé — retombe sur le club privé.
 */
export function resolveEnvironment(id: unknown): BoardEnvironmentPreset {
  const found = typeof id === 'string' ? BY_ID.get(id) : undefined
  return found ?? CLUB_PRIVATE
}

/**
 * Fusionne l'ambiance de soirée (moteur) avec la modulation du décor.
 *
 * Le résultat est un objet neuf à chaque appel mais aux mêmes clés que
 * `ambianceFor` : tout ce qui consomme une ambiance (AmbianceLights, CenterStage,
 * NeonFrame, Effects) fonctionne sans savoir qu'un décor existe.
 */
export function environmentAmbiance(
  preset: BoardEnvironmentPreset,
  ambiance: PartyAmbiance,
): PartyAmbiance {
  const L = preset.lighting
  return {
    ...ambiance,
    lightA: ambiance.lightA,
    lightB: ambiance.lightB,
    i1: ambiance.i1 * L.accentIntensity,
    i2: ambiance.i2 * L.accentIntensity,
    ambient: ambiance.ambient * L.ambientIntensity,
    bloom: ambiance.bloom * L.bloom,
    fog: preset.palette.fog ?? ambiance.fog,
    bg: preset.palette.bg ?? ambiance.bg,
    rim: { color: ambiance.rim.color, intensity: ambiance.rim.intensity * L.rimIntensity },
    exposure: ambiance.exposure * L.exposure,
    vignette: Math.min(1, ambiance.vignette * L.vignette),
  }
}
