import type {
  CareerNpcs,
  CareerState,
  NpcPersonality,
  NpcState,
  RivalState,
} from '../types/career'
import type { DilemmaDefinition } from '../dilemmas/types'
import { createRng, type SeededRng } from '../random/createRng'
import { clamp } from './clamp'
import { countries, getCountryById } from '../../game-content/countries'
import { getClubById } from '../../game-content/clubs'

const PERSONALITIES: NpcPersonality[] = [
  'exigeant',
  'paternel',
  'calculateur',
  'loyal',
  'impulsif',
  'ambitieux',
  'cynique',
  'idealiste',
]

const GOALS: Record<NpcState['id'], string[]> = {
  coach: [
    'prouver que sa méthode fonctionne',
    'gagner un titre avant de partir',
    'former un joueur qui le dépassera',
  ],
  teammate: [
    'devenir titulaire indiscutable',
    'protéger le vestiaire',
    'réussir sans trahir personne',
  ],
  rival: [
    'te dépasser sur tous les terrains',
    'prouver qu’il aurait dû être choisi à ta place',
    'construire une carrière plus grande que la tienne',
  ],
  agent: [
    'maximiser chaque contrat',
    'placer ses joueurs dans les plus grands clubs',
    'devenir incontournable dans le milieu',
  ],
  journalist: [
    'décrocher la confidence que personne d’autre n’a',
    'construire sa carrière sur la tienne',
    'raconter une histoire vraie, quitte à déranger',
  ],
}

function pickName(
  rng: SeededRng,
  countryId: string,
): { firstName: string; lastName: string } {
  const country = getCountryById(countryId) ?? rng.pick(countries)
  return {
    firstName: rng.pick(country.firstNames),
    lastName: rng.pick(country.lastNames),
  }
}

function baseNpc(
  rng: SeededRng,
  id: NpcState['id'],
  countryId: string,
  relation: number,
): NpcState {
  const { firstName, lastName } = pickName(rng, countryId)
  return {
    id,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    personality: rng.pick(PERSONALITIES),
    relation: clamp(relation + rng.randomInt(-8, 8), 5, 90),
    goal: rng.pick(GOALS[id]),
    memory: {},
  }
}

/**
 * Génère les personnages récurrents depuis la seed — jamais choisis par
 * l’utilisateur. Le rival partage l’âge et un poste concurrent.
 */
export function createNpcs(input: {
  seed: string
  countryId: string
  preciseRole: string
  age: number
}): CareerNpcs {
  const rng = createRng(`${input.seed}:npcs`)
  const otherCountry = rng.pick(
    countries.filter((c) => c.id !== input.countryId),
  )

  const rivalBase = baseNpc(rng, 'rival', otherCountry.id, 35)
  const rivalClubCountry = rng.chance(0.5) ? otherCountry : (getCountryById(input.countryId) ?? otherCountry)
  const rival: RivalState = {
    ...rivalBase,
    id: 'rival',
    age: input.age + rng.randomInt(-1, 1),
    positionId: input.preciseRole,
    level: clamp(40 + rng.randomInt(-4, 6), 30, 60),
    clubId: rng.pick(rivalClubCountry.clubIds),
    reputation: clamp(20 + rng.randomInt(-5, 10), 5, 45),
    trophies: 0,
  }

  return {
    coach: baseNpc(rng, 'coach', input.countryId, 55),
    teammate: baseNpc(rng, 'teammate', input.countryId, 60),
    rival,
    agent: baseNpc(rng, 'agent', rng.pick(countries).id, 50),
    journalist: baseNpc(rng, 'journalist', input.countryId, 40),
  }
}

/**
 * Saison du rival — carrière parallèle simulée : niveau évolutif,
 * clubs, trophées, réputation. Déterministe via seed + saison.
 */
export function simulateRivalSeason(
  rival: RivalState,
  seed: string,
  seasonIndex: number,
  playerReputation: number,
): { rival: RivalState; milestone: string | null } {
  const rng = createRng(`${seed}:rival:${seasonIndex}`)
  const age = rival.age + 1

  // Courbe simple : progression jeune, plateau, déclin après 30.
  const growth =
    age < 22 ? rng.randomInt(2, 5) : age < 27 ? rng.randomInt(0, 3) : age < 31 ? rng.randomInt(-1, 2) : rng.randomInt(-4, -1)
  const level = clamp(rival.level + growth, 25, 94)

  let reputation = clamp(
    rival.reputation + Math.round((level - 55) / 8) + rng.randomInt(-3, 5),
    5,
    99,
  )

  let clubId = rival.clubId
  let milestone: string | null = null

  // Changement de club occasionnel, vers un club à sa mesure.
  if (rng.chance(0.18)) {
    const pool = countries.flatMap((c) => c.clubIds)
    const candidates = pool.filter((id) => {
      const club = getClubById(id)
      return (
        club &&
        !club.isAcademy &&
        id !== clubId &&
        Math.abs(club.competitionLevel - level) < 18
      )
    })
    if (candidates.length > 0) {
      clubId = rng.pick(candidates)
      const name = getClubById(clubId)?.name ?? 'un nouveau club'
      milestone = `Ton rival ${rival.displayName} signe à ${name}.`
    }
  }

  let trophies = rival.trophies
  if (level > 62 && rng.chance(0.22)) {
    trophies += 1
    reputation = clamp(reputation + 4, 5, 99)
    milestone = `Ton rival ${rival.displayName} soulève un trophée — ${trophies} au total.`
  }

  // La rivalité vit : l'écart de réputation nourrit la tension.
  const relation = clamp(
    rival.relation + (reputation > playerReputation ? -2 : 1) + rng.randomInt(-2, 2),
    0,
    100,
  )

  return {
    rival: { ...rival, age, level, reputation, clubId, trophies, relation },
    milestone,
  }
}

const NPC_TOKENS: Record<string, (npcs: CareerNpcs) => string> = {
  '{rival}': (n) => n.rival.displayName,
  '{coach}': (n) => n.coach.displayName,
  '{coequipier}': (n) => n.teammate.displayName,
  '{teammate}': (n) => n.teammate.displayName,
  '{agent}': (n) => n.agent.displayName,
  '{journaliste}': (n) => n.journalist.displayName,
  '{club_rival}': (n) =>
    getClubById(n.rival.clubId ?? '')?.name ?? 'son club',
}

export const KNOWN_NPC_TOKENS = Object.keys(NPC_TOKENS)

/** Remplace les jetons {rival}, {coach}… par les identités générées. */
export function interpolateNpcText(text: string, npcs: CareerNpcs): string {
  let out = text
  for (const [token, resolve] of Object.entries(NPC_TOKENS)) {
    if (out.includes(token)) {
      out = out.split(token).join(resolve(npcs))
    }
  }
  return out
}

/** Applique l’interpolation PNJ à un dilemme complet (affichage). */
export function interpolateDilemma(
  dilemma: DilemmaDefinition,
  npcs: CareerNpcs,
): DilemmaDefinition {
  return {
    ...dilemma,
    title: interpolateNpcText(dilemma.title, npcs),
    body: interpolateNpcText(dilemma.body, npcs),
    choices: dilemma.choices.map((c) => ({
      ...c,
      label: interpolateNpcText(c.label, npcs),
      riskPreview: interpolateNpcText(c.riskPreview, npcs),
    })),
  }
}

/**
 * Écho du passé : si le dilemme est lié à un ancien choix (flag posé),
 * renvoie la mention à afficher. {years} = saisons écoulées depuis le flag.
 */
export function getPastEcho(
  dilemma: DilemmaDefinition,
  state: CareerState,
): string | null {
  for (const echo of dilemma.echoes ?? []) {
    const value = state.flags[echo.flag]
    if (value === undefined || value === false) continue
    let text = echo.text
    const stamped = state.flags[`flagSeason:${echo.flag}`]
    if (typeof stamped === 'number') {
      const years = Math.max(1, state.seasonIndex - stamped)
      text = text
        .split('{years}')
        .join(String(years))
    } else if (text.includes('{years}')) {
      text = text.split('{years} saisons plus tôt').join('Il y a quelques saisons')
      text = text.split('{years}').join('quelques')
    }
    return interpolateNpcText(text, state.npcs)
  }
  return null
}
