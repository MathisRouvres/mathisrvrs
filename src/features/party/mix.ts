/**
 * Mode Mix façon Picolo : pioche dans les paquets des autres jeux et adresse
 * chaque carte à des joueurs nommés. Fonctions pures, hasard injectable.
 */
import type { Level, Rng } from './engine'
import { neverHaveI } from './content/neverHaveI'
import { whoCould } from './content/whoCould'
import { wouldYouRather } from './content/wouldYouRather'
import { truths } from './content/truths'
import { dares } from './content/dares'
import { quickDares } from './content/quickDares'
import { tenBut } from './content/tenBut'
import { whoOfUs } from './content/whoOfUs'
import { deepTalk } from './content/deepTalk'

export const MIN_MIX_PLAYERS = 2

export interface MixCard {
  label: string
  text: string
}

interface Penalty {
  /** Pour un groupe : « Ceux qui… lèvent la main ». */
  group: string
  /** Pour une personne, à la 3e personne. */
  one: string
  /** Pour une personne, tutoyée. */
  you: string
  /** Pour un duo. */
  pair: string
}

const PENALTY: Record<Level, Penalty> = {
  soft: {
    group: 'lèvent la main et racontent',
    one: 'fait un gage choisi par le groupe',
    you: 'fais un gage choisi par le groupe',
    pair: 'faites un gage ensemble',
  },
  spicy: {
    group: 'boivent une gorgée',
    one: 'boit deux gorgées',
    you: 'bois deux gorgées',
    pair: 'buvez une gorgée tous les deux',
  },
  hot: {
    group: 'boivent une gorgée',
    one: 'retire un accessoire ou boit deux gorgées',
    you: 'retires un accessoire ou tu bois deux gorgées',
    pair: 'retirez chacun un accessoire ou buvez une gorgée',
  },
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)] as T
}

/** Deux joueurs distincts. */
function twoPlayers(players: readonly string[], rng: Rng): [string, string] {
  const a = Math.floor(rng() * players.length)
  let b = Math.floor(rng() * (players.length - 1))
  if (b >= a) b++
  return [players[a] ?? '', players[b] ?? '']
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

type Source = (level: Level, p: [string, string], pen: Penalty, rng: Rng) => MixCard

const SOURCES: { weight: number; build: Source }[] = [
  {
    weight: 4,
    build: (l, _p, pen, rng) => ({
      label: 'Je n’ai jamais',
      text: `Je n’ai jamais ${pick(neverHaveI[l], rng)}. Ceux qui l’ont déjà fait ${pen.group}.`,
    }),
  },
  {
    weight: 3,
    build: (l, _p, pen, rng) => ({
      label: 'Qui pourrait',
      text: `Qui pourrait le plus ${pick(whoCould[l], rng)} ? À trois, tout le monde pointe. La personne la plus désignée ${pen.one}.`,
    }),
  },
  {
    weight: 3,
    build: (l, [a], pen, rng) => {
      const [x, y] = pick(wouldYouRather[l], rng)
      return {
        label: 'Tu préfères',
        text: `${a}, tu préfères ${x} ou ${y} ? Tous ceux qui auraient choisi l’inverse ${pen.group}.`,
      }
    },
  },
  {
    weight: 3,
    build: (l, [a], pen, rng) => ({
      label: 'Vérité',
      text: `${a}, vérité : ${pick(truths[l], rng)} Si tu refuses, tu ${pen.you}.`,
    }),
  },
  {
    weight: 3,
    build: (l, [a], pen, rng) => ({
      label: 'Action',
      text: `${a}, action : ${pick(dares[l], rng)} Si tu refuses, tu ${pen.you}.`,
    }),
  },
  {
    weight: 3,
    build: (l, _p, _pen, rng) => ({ label: 'Défi pour tous', text: pick(quickDares[l], rng) }),
  },
  {
    weight: 2,
    build: (l, [a], _pen, rng) => ({
      label: 'C’est un 10 mais…',
      text: `C’est un 10 mais… ${pick(tenBut[l], rng)}. ${a}, quelle note donnes-tu ? Défends-la !`,
    }),
  },
  {
    weight: 2,
    build: (l, [a, b], pen, rng) => ({
      label: 'Qui de vous deux',
      text: `${a} et ${b}, qui de vous deux ${pick(whoOfUs[l], rng)} ? Pointez en même temps. Si vous n’êtes pas d’accord, vous ${pen.pair}.`,
    }),
  },
  {
    weight: 1,
    build: (l, [a], _pen, rng) => ({ label: 'Question', text: `${a}, ${lowerFirst(pick(deepTalk[l], rng))}` }),
  },
  {
    weight: 1,
    build: (_l, [a, b], pen) => ({
      label: 'Duel',
      text: `${a} contre ${b} : pierre-feuille-ciseaux en deux manches gagnantes. Le perdant ${pen.one}.`,
    }),
  },
]

const TOTAL_WEIGHT = SOURCES.reduce((sum, s) => sum + s.weight, 0)

/** Tire une carte Mix adressée aux joueurs donnés (au moins deux). */
export function buildMixCard(level: Level, players: readonly string[], rng: Rng = Math.random): MixCard {
  if (players.length < MIN_MIX_PLAYERS) {
    throw new Error(`Il faut au moins ${MIN_MIX_PLAYERS} joueurs`)
  }
  let roll = rng() * TOTAL_WEIGHT
  const source = SOURCES.find((s) => (roll -= s.weight) < 0) ?? SOURCES[0]!
  return source.build(level, twoPlayers(players, rng), PENALTY[level], rng)
}
