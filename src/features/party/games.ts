import type { Level } from './engine'
import { neverHaveI } from './content/neverHaveI'
import { tenBut } from './content/tenBut'
import { whoCould } from './content/whoCould'
import { wouldYouRather } from './content/wouldYouRather'
import { truthOrDare } from './content/truthOrDare'
import { impostorWords } from './content/impostor'

export const PARTY_BASE_PATH = '/games/soiree'

interface GameBase {
  slug: string
  title: string
  emoji: string
  tagline: string
  /** Classes Tailwind du dégradé de la carte. */
  gradient: string
  minPlayers: number
  rules: string[]
}

export interface DeckGame extends GameBase {
  kind: 'deck'
  /** Début de phrase affiché au-dessus de chaque carte. */
  prefix: string
  cards: Record<Level, string[]>
}

export interface ChoiceGame extends GameBase {
  kind: 'choice'
  prefix: string
  cards: Record<Level, [string, string][]>
}

export interface TruthOrDareGame extends GameBase {
  kind: 'truth-or-dare'
  cards: typeof truthOrDare
}

export interface ImpostorGame extends GameBase {
  kind: 'impostor'
  cards: typeof impostorWords
}

export type PartyGame = DeckGame | ChoiceGame | TruthOrDareGame | ImpostorGame

export const PARTY_GAMES: PartyGame[] = [
  {
    kind: 'deck',
    slug: 'je-n-ai-jamais',
    title: 'J’ai déjà / Je n’ai jamais',
    emoji: '🙊',
    tagline: 'Les aveux tombent, les masques aussi.',
    gradient: 'from-fuchsia-500 to-pink-600',
    minPlayers: 2,
    prefix: 'Je n’ai jamais…',
    rules: [
      'Lisez la carte à voix haute.',
      'Ceux qui l’ont déjà fait lèvent la main (ou boivent une gorgée, avec modération).',
      'Le groupe a le droit de demander l’histoire.',
    ],
    cards: neverHaveI,
  },
  {
    kind: 'deck',
    slug: 'c-est-un-10-mais',
    title: 'C’est un 10 mais…',
    emoji: '🔟',
    tagline: 'La personne parfaite… ou presque.',
    gradient: 'from-amber-400 to-orange-600',
    minPlayers: 2,
    prefix: 'C’est un 10 mais…',
    rules: [
      'Imaginez une personne parfaite, notée 10/10.',
      'Lisez son défaut : chacun annonce sa nouvelle note.',
      'Défendez votre note, les débats sont encouragés.',
    ],
    cards: tenBut,
  },
  {
    kind: 'deck',
    slug: 'qui-pourrait',
    title: 'Qui pourrait…',
    emoji: '👉',
    tagline: 'À trois, tout le monde pointe du doigt.',
    gradient: 'from-sky-500 to-indigo-600',
    minPlayers: 3,
    prefix: 'Qui pourrait le plus…',
    rules: [
      'Lisez la carte à voix haute.',
      'Comptez jusqu’à trois : chacun pointe la personne qui correspond le mieux.',
      'La personne la plus désignée se justifie (ou boit, avec modération).',
    ],
    cards: whoCould,
  },
  {
    kind: 'impostor',
    slug: 'imposteur',
    title: 'Imposteur',
    emoji: '🕵️',
    tagline: 'Tout le monde a le mot… sauf un.',
    gradient: 'from-rose-600 to-red-800',
    minPlayers: 3,
    rules: [
      'Passez le téléphone : chacun découvre son rôle en secret.',
      'Les joueurs reçoivent le même mot, l’imposteur ne reçoit rien.',
      'Chacun à son tour dit un seul mot en rapport avec le mot secret.',
      'Votez pour démasquer l’imposteur. S’il est trouvé, il peut encore gagner en devinant le mot.',
    ],
    cards: impostorWords,
  },
  {
    kind: 'choice',
    slug: 'tu-preferes',
    title: 'Tu préfères…',
    emoji: '⚖️',
    tagline: 'Deux options, aucune bonne réponse.',
    gradient: 'from-emerald-500 to-teal-700',
    minPlayers: 2,
    prefix: 'Tu préfères…',
    rules: [
      'Lisez les deux options.',
      'Chacun choisit son camp en même temps, à main levée.',
      'La minorité doit défendre son choix.',
    ],
    cards: wouldYouRather,
  },
  {
    kind: 'truth-or-dare',
    slug: 'action-ou-verite',
    title: 'Action ou Vérité',
    emoji: '🎲',
    tagline: 'Le classique, en trois niveaux.',
    gradient: 'from-violet-500 to-purple-800',
    minPlayers: 2,
    rules: [
      'Ajoutez les joueurs : le jeu désigne qui joue.',
      'Le joueur choisit Action ou Vérité, puis relève le défi.',
      'Toute action qui implique quelqu’un se fait avec son accord. On peut toujours passer.',
    ],
    cards: truthOrDare,
  },
]

export function findGame(slug: string | undefined): PartyGame | undefined {
  return PARTY_GAMES.find((g) => g.slug === slug)
}
