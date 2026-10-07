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
import { fiveSeconds } from './content/fiveSeconds'
import { yesNoQuestions } from './content/yesNo'
import { quizQuestions, type QuizQuestion } from './content/quiz'
import { wheelForfeits, type WheelForfeit } from './content/wheel'
import { suspects, type Suspect } from './content/guessWho'

export { PARTY_BASE_PATH } from './paths'

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

export interface FiveSecondsGame extends GameBase {
  kind: 'five-seconds'
  prefix: string
  cards: Record<Level, string[]>
}

export interface YesNoGame extends GameBase {
  kind: 'yes-no'
  cards: Record<Level, string[]>
}

export interface QuizGame extends GameBase {
  kind: 'quiz'
  cards: Record<Level, QuizQuestion[]>
}

/** Jeu de la bouteille : pioche Actions et Vérités existantes. */
export interface BottleGame extends GameBase {
  kind: 'bottle'
}

export interface BusGame extends GameBase {
  kind: 'bus'
}

/** Patate chaude : catégories du jeu des 5 secondes, mèche à durée secrète. */
export interface HotPotatoGame extends GameBase {
  kind: 'hot-potato'
  prefix: string
  cards: Record<Level, string[]>
}

export interface DealerGame extends GameBase {
  kind: 'dealer'
}

export interface PyramidGame extends GameBase {
  kind: 'pyramid'
}

export interface WheelGame extends GameBase {
  kind: 'wheel'
  cards: Record<Level, WheelForfeit[]>
}

/** Qui est-ce ? à deux : même plateau sur deux téléphones grâce à un code. */
export interface GuessWhoGame extends GameBase {
  kind: 'guess-who'
  cards: Record<Level, Suspect[]>
}

export type PartyGame =
  | GuessWhoGame
  | HotPotatoGame
  | DealerGame
  | PyramidGame
  | WheelGame
  | FiveSecondsGame
  | YesNoGame
  | QuizGame
  | BottleGame
  | BusGame
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
  {
    kind: 'bottle',
    slug: 'bouteille',
    title: 'Jeu de la bouteille',
    emoji: '🍾',
    tagline: 'Elle tourne, elle désigne : action ou vérité.',
    gradient: 'from-emerald-600 to-green-900',
    minPlayers: 2,
    rules: [
      'Ajoutez les joueurs : ils se placent autour de la bouteille.',
      'Faites-la tourner : la personne désignée choisit Action ou Vérité.',
      'Toute action qui implique quelqu’un se fait avec son accord. On peut toujours passer.',
    ],
  },
  {
    kind: 'quiz',
    slug: 'quiz',
    title: 'Quiz culture G',
    emoji: '🧠',
    tagline: 'Deux équipes, des questions, un champion.',
    gradient: 'from-blue-500 to-indigo-700',
    minPlayers: 2,
    rules: [
      'Formez deux équipes qui répondent chacune à leur tour.',
      'Lisez la question, l’équipe répond à voix haute, puis révélez la réponse.',
      'Bonne réponse : +1. Soft : culture générale, Épicé : culture soirée et pop, Hot : culture coquine.',
    ],
    cards: quizQuestions,
  },
  {
    kind: 'bus',
    slug: 'le-bus',
    title: 'Le Bus',
    emoji: '🚌',
    tagline: 'Rouge ou noir, plus ou moins… ne rate pas l’arrêt.',
    gradient: 'from-sky-600 to-blue-900',
    minPlayers: 2,
    rules: [
      'Chaque joueur répond à quatre questions sur les cartes qui sortent : rouge ou noir, plus haut ou plus bas, entre ou dehors, puis l’enseigne.',
      'Une égalité compte comme une erreur.',
      'Une erreur coûte autant que l’étape atteinte (1 à 4). Quatre bonnes réponses : tu descends du bus.',
    ],
  },
  {
    kind: 'five-seconds',
    slug: 'cinq-secondes',
    title: 'Le jeu des 5 secondes',
    emoji: '⏱️',
    tagline: 'Cite 3 réponses… en 5 secondes chrono.',
    gradient: 'from-cyan-400 to-sky-700',
    minPlayers: 2,
    prefix: 'Cite 3…',
    rules: [
      'Lisez la carte au joueur dont c’est le tour, puis lancez le chrono.',
      'Il doit citer 3 réponses en 5 secondes, sans hésiter.',
      'Raté : gage, gorgée ou point pour les autres, selon vos règles.',
    ],
    cards: fiveSeconds,
  },
  {
    kind: 'yes-no',
    slug: 'ni-oui-ni-non',
    title: 'Ni oui ni non',
    emoji: '🤐',
    tagline: 'Tiens le chrono sans jamais dire oui ni non.',
    gradient: 'from-lime-500 to-green-700',
    minPlayers: 2,
    rules: [
      'Un joueur se met sur la sellette, les autres lui posent les questions affichées.',
      'Interdit de dire « oui », « non », ou de hocher la tête.',
      'Il gagne s’il tient jusqu’à la fin du chrono.',
    ],
    cards: yesNoQuestions,
  },
  {
    kind: 'pyramid',
    slug: 'pyramide',
    title: 'La Pyramide',
    emoji: '🔺',
    tagline: 'Quatre cartes en tête, une pyramide, du bluff.',
    gradient: 'from-amber-500 to-orange-700',
    minPlayers: 2,
    rules: [
      'Chacun découvre et mémorise ses 4 cartes en secret, en se passant le téléphone.',
      'La pyramide de 15 cartes se retourne de la base au sommet : l’étage donne la pénalité (1 à 5).',
      'Qui a la valeur retournée la distribue. On peut bluffer : en cas d’accusation, l’appli tranche et le perdant prend le double.',
      'À la fin, chacun récite ses cartes avant la révélation.',
    ],
  },
  {
    kind: 'hot-potato',
    slug: 'patate-chaude',
    title: 'Patate chaude',
    emoji: '💣',
    tagline: 'Un mot, on passe… jusqu’à l’explosion.',
    gradient: 'from-red-600 to-orange-500',
    minPlayers: 3,
    prefix: 'À tour de rôle, cite des…',
    rules: [
      'Allumez la mèche : sa durée est secrète.',
      'Chacun cite un mot de la catégorie, puis passe le téléphone à son voisin.',
      'Celui qui tient le téléphone quand la bombe explose prend la pénalité.',
    ],
    cards: fiveSeconds,
  },
  {
    kind: 'wheel',
    slug: 'roue-des-gages',
    title: 'Roue des gages',
    emoji: '🎡',
    tagline: 'Fais tourner, subis le gage.',
    gradient: 'from-pink-500 to-violet-700',
    minPlayers: 2,
    rules: [
      'Chacun son tour, lance la roue et relève le gage de la case.',
      'Cases bonus : Joker (dispensé), Tu choisis, Rejoue, Tout le monde.',
      'Tout gage qui implique quelqu’un se fait avec son accord. On peut toujours passer.',
    ],
    cards: wheelForfeits,
  },
  {
    kind: 'dealer',
    slug: 'croupier',
    title: 'Le Croupier',
    emoji: '🃏',
    tagline: 'Devine la carte en deux essais.',
    gradient: 'from-emerald-700 to-teal-900',
    minPlayers: 3,
    rules: [
      'Le croupier tient le paquet, le joueur devine la valeur de la carte (As = 1, Roi = 13).',
      'Raté ? Le croupier dit « plus haut » ou « plus bas », second essai.',
      'Trouvé : le croupier prend la pénalité (2 au premier essai, 1 au second). Raté : le joueur prend l’écart (5 maximum).',
      'Trois ratés d’affilée et le croupier passe le paquet.',
    ],
  },
  {
    kind: 'guess-who',
    slug: 'qui-est-ce',
    title: 'Qui est-ce ?',
    emoji: '🗂️',
    tagline: 'Version casier judiciaire : dictateurs, escrocs, gourous.',
    gradient: 'from-zinc-700 to-red-900',
    minPlayers: 2,
    rules: [
      'Un duel à deux : chacun ouvre le jeu sur son téléphone avec le même code et le même niveau. Sinon, un seul téléphone qu’on se passe.',
      'Chacun reçoit un suspect secret parmi 24 personnalités au passé très chargé.',
      'À tour de rôle, posez une question fermée (« Il est mort ? », « Il a été condamné ? », « Il est français ? ») et rabattez d’un tap les suspects éliminés.',
      'Quand tu crois savoir, accuse : bonne réponse, l’autre prend la pénalité ; erreur, c’est pour toi.',
      'Humour noir : les fiches résument des faits publics, sans rien excuser.',
    ],
    cards: suspects,
  },
]

/**
 * Ordre d'affichage : du jeu de soirée le plus joué au moins joué. Classement
 * fixe, estimé d'après la notoriété des jeux en France (pas de comptage réel).
 */
export const HUB_ORDER = [
  'action-ou-verite',
  'je-n-ai-jamais',
  'loup-garou',
  'tu-preferes',
  'mimes',
  'petit-bac',
  'qui-pourrait',
  'bouteille',
  'undercover',
  'quiz',
  'qui-est-ce',
  'mot-interdit',
  'jeu-du-roi',
  'pyramide',
  'le-bus',
  'patate-chaude',
  'devine-tete',
  'cinq-secondes',
  'roue-des-gages',
  'croupier',
  'imposteur',
  'ni-oui-ni-non',
  'paranoia',
  'mix',
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
