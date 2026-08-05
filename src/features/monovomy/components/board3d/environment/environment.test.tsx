import { describe, expect, it, beforeEach } from 'vitest'
import {
  BOARD_ENVIRONMENTS,
  DEFAULT_ENVIRONMENT_ID,
  environmentAmbiance,
  isEnvironmentId,
  resolveEnvironment,
} from './environmentPresets'
import { seatLayout, MAX_SEATS } from './seatLayout'
import { AMBIANCE } from '../ambiance'

/**
 * Le décor est une peau : ce qui doit être garanti, c'est qu'il ne peut ni
 * casser l'affichage (identifiant inconnu), ni empiéter sur le plateau
 * (rayon des places), ni prétendre représenter des joueurs qui n'existent pas.
 */

function stubStorage() {
  const store: Record<string, string> = {}
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
    },
    window: { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} },
  })
  return store
}

const player = (id: string, over: Record<string, unknown> = {}) => ({
  id, name: id, cash: 100, eliminated: false, inJail: false, avatar: '🍹', ...over,
})

const stateOf = (n: number, currentPlayerIndex = 0) => ({
  players: Array.from({ length: n }, (_, i) => player(`p${i}`)),
  currentPlayerIndex,
})

const LAYOUT = { radius: 12.55, compactRadius: 7.45 }

describe('presets de décor', () => {
  it('livre trois environnements distincts', () => {
    expect(BOARD_ENVIRONMENTS).toHaveLength(3)
    const ids = BOARD_ENVIRONMENTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('retombe sur le club privé pour tout identifiant inconnu', () => {
    for (const bad of ['rooftop', '', null, undefined, 42, {}]) {
      expect(resolveEnvironment(bad).id).toBe(DEFAULT_ENVIRONMENT_ID)
    }
    expect(isEnvironmentId('rooftop')).toBe(false)
    expect(isEnvironmentId('underground')).toBe(true)
  })

  it('garde les places hors du plateau (socle compris : 6,75)', () => {
    for (const p of BOARD_ENVIRONMENTS) {
      expect(p.playerLayout.compactRadius).toBeGreaterThan(6.75)
      expect(p.playerLayout.radius).toBeGreaterThan(p.playerLayout.compactRadius)
      // Le mobilier reste au-delà du bord de table (13,6).
      expect(p.playerLayout.furnitureRadius).toBeGreaterThan(13.6)
    }
  })
})

describe('ambiance modulée par le décor', () => {
  it('module sans jamais remplacer le ton donné par le moteur', () => {
    const base = AMBIANCE.finale
    const club = environmentAmbiance(resolveEnvironment('club_private'), base)
    const appart = environmentAmbiance(resolveEnvironment('apartment_party'), base)
    // Les couleurs de soirée restent celles de l'intensité.
    expect(club.lightA).toBe(base.lightA)
    expect(appart.lightA).toBe(base.lightA)
    // L'appartement reste plus calme : plus ambiant, moins de contre-jour.
    expect(appart.ambient).toBeGreaterThan(club.ambient)
    expect(appart.rim.intensity).toBeLessThan(club.rim.intensity)
    // Le vignettage ne peut pas déborder.
    for (const p of BOARD_ENVIRONMENTS) {
      expect(environmentAmbiance(p, base).vignette).toBeLessThanOrEqual(1)
    }
  })

  it('ne mute pas l’ambiance du moteur', () => {
    const base = { ...AMBIANCE.party, rim: { ...AMBIANCE.party.rim } }
    const snapshot = JSON.stringify(base)
    environmentAmbiance(resolveEnvironment('underground'), base)
    expect(JSON.stringify(base)).toBe(snapshot)
  })
})

describe('places des joueurs', () => {
  beforeEach(() => { stubStorage() })

  it('n’ouvre que le nombre de places réellement occupées', () => {
    for (let n = 3; n <= MAX_SEATS; n++) {
      expect(seatLayout(stateOf(n), LAYOUT)).toHaveLength(n)
    }
  })

  it('répartit les places sur tout le cercle, sans chevauchement', () => {
    for (const n of [3, 5, 8]) {
      const seats = seatLayout(stateOf(n), LAYOUT)
      // Première place face à la caméra au repos (+z) : x ≈ 0, z = rayon.
      expect(seats[0].x).toBeCloseTo(0, 6)
      expect(seats[0].z).toBeCloseTo(LAYOUT.radius, 6)
      // Écart angulaire régulier.
      for (let i = 1; i < n; i++) {
        expect(seats[i].angle - seats[i - 1].angle).toBeCloseTo((Math.PI * 2) / n, 6)
      }
      // Distance entre deux plaques voisines : jamais nulle, jamais inférieure à
      // la largeur d'une plaque (2,35).
      const d = Math.hypot(seats[1].x - seats[0].x, seats[1].z - seats[0].z)
      expect(d).toBeGreaterThan(2.35)
    }
  })

  it('utilise le rayon compact quand le cadrage est serré', () => {
    const seats = seatLayout(stateOf(4), { ...LAYOUT, compact: true })
    for (const s of seats) {
      expect(Math.hypot(s.x, s.z)).toBeCloseTo(LAYOUT.compactRadius, 6)
    }
  })

  it('plafonne à huit places', () => {
    expect(seatLayout(stateOf(12), LAYOUT)).toHaveLength(MAX_SEATS)
  })

  it('éteint la place d’un éliminé sans la supprimer', () => {
    const state = stateOf(4, 1)
    state.players[2] = player('p2', { eliminated: true })
    const seats = seatLayout(state, LAYOUT)
    expect(seats).toHaveLength(4)
    expect(seats[2].eliminated).toBe(true)
    expect(seats[2].active).toBe(false)
    expect(seats[1].active).toBe(true)
  })

  it('n’affiche un voyant de connexion que pour les places réellement observées', () => {
    const state = stateOf(3)
    const seats = seatLayout(state, { ...LAYOUT, presence: { p1: false } })
    expect(seats[0].connected).toBeNull()
    expect(seats[1].connected).toBe(false)
    expect(seats[2].connected).toBeNull()
  })

  it('donne une couleur stable et distincte par place', () => {
    const seats = seatLayout(stateOf(8), LAYOUT)
    expect(new Set(seats.map((s) => s.color)).size).toBe(8)
  })
})
