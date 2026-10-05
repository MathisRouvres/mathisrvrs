import type { Level } from './engine'
import { neverHaveI } from './content/neverHaveI'
import { tenBut } from './content/tenBut'
import { whoCould } from './content/whoCould'
import { wouldYouRather } from './content/wouldYouRather'
import { truthOrDare } from './content/truthOrDare'
import { impostorWords } from './content/impostor'
import { paranoia } from './content/paranoia'
import { deepTalk } from './content/deepTalk'
import { quickDares } from './content/quickDares'
import { whoOfUs } from './content/whoOfUs'
import { headsUpWords } from './content/headsUp'
import { mimes } from './content/mimes'
import { tabooCards, type TabooCard } from './content/taboo'
import { petitBacCategories } from './content/petitBac'
import { undercoverPairs } from './content/undercover'

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
  /** Jeu sans niveaux de contenu : le sélecteur Soft / Épicé / Hot est masqué. */
  noLevels?: boolean
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

export interface UndercoverGame extends GameBase {
  kind: 'undercover'
  cards: Record<Level, [string, string][]>
}

/** Jeux au chrono en équipes. */
export interface WordsTimedGame extends GameBase {
  kind: 'timed'
  variant: 'headsUp' | 'mimes'
  cards: Record<Level, string[]>
}

export interface TabooTimedGame extends GameBase {
  kind: 'timed'
  variant: 'taboo'
  cards: Record<Level, TabooCard[]>
}

export interface PetitBacGame extends GameBase {
  kind: 'petit-bac'
  cards: Record<Level, string[]>
}

export interface WerewolfGame extends GameBase {
  kind: 'werewolf'
}

/** Mix façon Picolo : pioche dans les paquets des autres jeux. */
export interface MixPartyGame extends GameBase {
  kind: 'mix'
}

export interface KingsPartyGame extends GameBase {
  kind: 'kings'
}

export type PartyGame =
  | DeckGame
  | ChoiceGame
  | TruthOrDareGame
  | ImpostorGame
  | UndercoverGame
  | WordsTimedGame
  | TabooTimedGame
  | PetitBacGame
  | WerewolfGame
  | MixPartyGame
  | KingsPartyGame

const GAMES: PartyGame[] = [
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
  {
    kind: 'deck',
    slug: 'paranoia',
    title: 'Paranoïa',
    emoji: '🤫',
    tagline: 'Une question chuchotée, un prénom à voix haute.',
    gradient: 'from-slate-600 to-zinc-900',
    minPlayers: 3,
    prefix: 'Chuchote à ton voisin : qui ici…',
    rules: [
      'Lis la carte en secret et chuchote-la à ton voisin.',
      'Il répond à voix haute par le prénom de quelqu’un du groupe.',
      'La personne citée tire à pile ou face : pile, la question est révélée.',
      'Le téléphone passe ensuite au voisin.',
    ],
    cards: paranoia,
  },
  {
    kind: 'deck',
    slug: 'qui-de-nous-deux',
    title: 'Qui de nous deux ?',
    emoji: '👫',
    tagline: 'Dos à dos, chacun pointe l’autre… ou soi.',
    gradient: 'from-pink-500 to-orange-500',
    minPlayers: 2,
    prefix: 'Qui de nous deux…',
    rules: [
      'Deux joueurs se mettent dos à dos (en couple, entre amis ou par paires).',
      'À chaque carte, les deux pointent en même temps celui qui correspond le mieux.',
      'Désaccord ? Chacun défend sa version devant le groupe.',
    ],
    cards: whoOfUs,
  },
  {
    kind: 'deck',
    slug: 'defis-express',
    title: 'Défis express',
    emoji: '⚡',
    tagline: 'Des mini-défis pour tout le groupe, tout de suite.',
    gradient: 'from-yellow-400 to-lime-600',
    minPlayers: 3,
    prefix: 'Défi',
    rules: [
      'Lisez la carte à voix haute : elle s’applique à tout le groupe.',
      'Les règles temporaires durent jusqu’à la carte suivante.',
      'Tout contact se fait avec l’accord de chacun. On peut toujours passer.',
    ],
    cards: quickDares,
  },
  {
    kind: 'deck',
    slug: 'questions-profondes',
    title: 'Questions profondes',
    emoji: '💬',
    tagline: 'Pour enfin vraiment se connaître.',
    gradient: 'from-cyan-500 to-blue-700',
    minPlayers: 2,
    prefix: 'Question',
    rules: [
      'Posez la question au groupe ou à la personne de votre choix.',
      'Prenez le temps de répondre sincèrement, sans jugement.',
      'On a toujours le droit de passer.',
    ],
    cards: deepTalk,
  },
  {
    kind: 'mix',
    slug: 'mix',
    title: 'Mix de soirée',
    emoji: '🍹',
    tagline: 'Façon Picolo : toutes les cartes, avec vos prénoms.',
    gradient: 'from-fuchsia-500 to-amber-500',
    minPlayers: 2,
    rules: [
      'Ajoutez les prénoms : chaque carte vise un ou plusieurs joueurs.',
      'Les cartes mélangent tous les jeux : vérités, actions, votes, duels, défis de groupe.',
      'Celui qui refuse prend la pénalité. Avec modération, on peut toujours passer.',
    ],
  },
  {
    kind: 'timed',
    variant: 'headsUp',
    slug: 'devine-tete',
    title: 'Devine-tête',
    emoji: '🤯',
    tagline: 'Le téléphone sur le front, ton équipe te fait deviner.',
    gradient: 'from-red-500 to-amber-500',
    minPlayers: 4,
    rules: [
      'Formez deux équipes. Un joueur pose le téléphone sur son front, écran vers son équipe.',
      'Son équipe lui fait deviner le mot sans le prononcer.',
      'Trouvé : +1. Trop dur : passez. Les équipes jouent à tour de rôle.',
    ],
    cards: headsUpWords,
  },
  {
    kind: 'timed',
    variant: 'mimes',
    slug: 'mimes',
    title: 'Mimes',
    emoji: '🎭',
    tagline: 'Fais deviner sans un mot, ni un bruit.',
    gradient: 'from-indigo-500 to-violet-700',
    minPlayers: 4,
    rules: [
      'Formez deux équipes. Le mimeur lit le mot en secret.',
      'Il le fait deviner à son équipe par gestes uniquement : ni parole, ni bruit, ni lettres.',
      'Trouvé : +1. Les équipes jouent à tour de rôle.',
    ],
    cards: mimes,
  },
  {
    kind: 'timed',
    variant: 'taboo',
    slug: 'mot-interdit',
    title: 'Mot interdit',
    emoji: '🚫',
    tagline: 'Fais deviner le mot sans dire les mots interdits.',
    gradient: 'from-orange-500 to-red-700',
    minPlayers: 4,
    rules: [
      'Formez deux équipes. Le joueur fait deviner le mot à son équipe.',
      'Interdit de dire le mot, les 5 mots interdits, ou de mimer.',
      'Trouvé : +1. Mot interdit prononcé : l’équipe adverse buzze, −1.',
    ],
    cards: tabooCards,
  },
  {
    kind: 'petit-bac',
    slug: 'petit-bac',
    title: 'Petit Bac',
    emoji: '📝',
    tagline: 'Une lettre, des catégories, stylos à la main.',
    gradient: 'from-teal-500 to-emerald-700',
    minPlayers: 2,
    rules: [
      'Chacun prend une feuille et un stylo.',
      'Une lettre et des catégories sont tirées : trouvez un mot par catégorie qui commence par cette lettre.',
      'Le premier qui a tout rempli crie « STOP ! ». Mot unique : 2 points, mot en double : 1 point.',
    ],
    cards: petitBacCategories,
  },
  {
    kind: 'undercover',
    slug: 'undercover',
    title: 'Undercover',
    emoji: '🥸',
    tagline: 'Chacun a un mot… mais pas tout à fait le même.',
    gradient: 'from-stone-500 to-neutral-800',
    minPlayers: 3,
    rules: [
      'Passez le téléphone : chacun découvre son mot en secret.',
      'Les civils ont tous le même mot ; les undercovers ont un mot proche et ne le savent pas.',
      'Chacun décrit son mot en un seul mot, à tour de rôle, puis le groupe vote pour démasquer les undercovers.',
    ],
    cards: undercoverPairs,
  },
  {
    kind: 'werewolf',
    slug: 'loup-garou',
    title: 'Loup-Garou',
    emoji: '🐺',
    tagline: 'Le classique : un meneur, des loups, un village.',
    gradient: 'from-indigo-900 to-slate-900',
    minPlayers: 6,
    noLevels: true,
    rules: [
      'Un meneur qui ne joue pas distribue les rôles en passant le téléphone.',
      'La nuit, chacun ferme les yeux et les rôles se réveillent à l’appel du meneur.',
      'Le jour, le village débat et vote pour éliminer un suspect.',
      'Le village gagne s’il élimine tous les loups ; les loups gagnent s’ils égalent les villageois.',
    ],
  },
  {
    kind: 'kings',
    slug: 'jeu-du-roi',
    title: 'Jeu du Roi',
    emoji: '👑',
    tagline: '52 cartes, une règle par carte, une coupe au milieu.',
    gradient: 'from-yellow-500 to-amber-700',
    minPlayers: 2,
    rules: [
      'Posez une coupe au centre. Chacun tire une carte à son tour.',
      'Chaque valeur a sa règle (cascade, catégorie, compagnon…).',
      'Celui qui tire le quatrième Roi relève la coupe du roi.',
    ],
  },
]

/** Ordre d'affichage sur l'accueil : les grands classiques d'abord. */
const HUB_ORDER = [
  'loup-garou',
  'undercover',
  'mot-interdit',
  'devine-tete',
  'je-n-ai-jamais',
  'action-ou-verite',
  'jeu-du-roi',
  'mix',
  'imposteur',
  'mimes',
  'petit-bac',
  'tu-preferes',
  'qui-pourrait',
  'paranoia',
  'c-est-un-10-mais',
  'qui-de-nous-deux',
  'defis-express',
  'questions-profondes',
]

const rank = (slug: string) => {
  const i = HUB_ORDER.indexOf(slug)
  return i === -1 ? HUB_ORDER.length : i
}

export const PARTY_GAMES: PartyGame[] = [...GAMES].sort((a, b) => rank(a.slug) - rank(b.slug))

export function findGame(slug: string | undefined): PartyGame | undefined {
  return PARTY_GAMES.find((g) => g.slug === slug)
}
