import type { CardRank, Level } from '../engine'

export interface KingsRule {
  title: string
  text: Record<Level, string>
}

/**
 * Jeu du Roi : une règle par valeur de carte. Soft se joue sans alcool (gages),
 * Épicé avec des gorgées, Hot avec des gages coquins. Toujours avec modération.
 */
export const KINGS_RULES: Record<CardRank, KingsRule> = {
  A: {
    title: 'Cascade',
    text: {
      soft: 'Tout le monde tape sur la table en rythme. Personne ne s’arrête avant son voisin de gauche. Le premier qui s’arrête fait un gage.',
      spicy: 'Tout le monde boit en même temps. Personne ne s’arrête avant son voisin de gauche : le tireur s’arrête quand il veut.',
      hot: 'Chacun fait un compliment coquin à son voisin de droite, à la chaîne. Celui qui sèche retire un accessoire ou boit une gorgée.',
    },
  },
  '2': {
    title: 'Pour toi',
    text: {
      soft: 'Choisis quelqu’un : il ou elle fait un gage choisi par le groupe.',
      spicy: 'Distribue deux gorgées à la personne de ton choix.',
      hot: 'Choisis quelqu’un : il ou elle retire un accessoire ou boit deux gorgées.',
    },
  },
  '3': {
    title: 'Pour moi',
    text: {
      soft: 'Tu fais un gage choisi par le groupe.',
      spicy: 'Tu bois trois gorgées.',
      hot: 'Tu retires un accessoire ou tu révèles un petit secret coquin.',
    },
  },
  '4': {
    title: 'Au sol',
    text: {
      soft: 'Le dernier à toucher le sol avec la main fait un gage.',
      spicy: 'Le dernier à toucher le sol avec la main boit deux gorgées.',
      hot: 'Le dernier à toucher le sol fait un compliment sensuel à la personne de son choix.',
    },
  },
  '5': {
    title: 'Pouce',
    text: {
      soft: 'Jusqu’au prochain 5, pose discrètement ton pouce sur la table quand tu veux : le dernier à t’imiter fait un gage.',
      spicy: 'Jusqu’au prochain 5, pose discrètement ton pouce sur la table quand tu veux : le dernier à t’imiter boit.',
      hot: 'Jusqu’au prochain 5, pose discrètement ton pouce sur la table quand tu veux : le dernier à t’imiter retire un accessoire.',
    },
  },
  '6': {
    title: 'Au ciel',
    text: {
      soft: 'Le dernier à lever la main au ciel fait un gage.',
      spicy: 'Le dernier à lever la main au ciel boit deux gorgées.',
      hot: 'Le dernier à lever la main au ciel murmure un secret coquin à son voisin.',
    },
  },
  '7': {
    title: 'Catégorie',
    text: {
      soft: 'Choisis une catégorie (pays, animaux, marques…). Chacun cite un élément à son tour. Le premier qui sèche ou répète fait un gage.',
      spicy: 'Choisis une catégorie (cocktails, applis de rencontre, excuses bidon…). Le premier qui sèche ou répète boit.',
      hot: 'Choisis une catégorie coquine (surnoms, endroits pour s’embrasser…). Le premier qui sèche ou répète retire un accessoire.',
    },
  },
  '8': {
    title: 'Compagnon',
    text: {
      soft: 'Choisis un compagnon : jusqu’au prochain 8, chaque gage que tu fais, il ou elle le fait aussi.',
      spicy: 'Choisis un compagnon de boisson : jusqu’au prochain 8, quand tu bois, il ou elle boit aussi.',
      hot: 'Choisis un compagnon : jusqu’au prochain 8, chaque gage coquin que tu reçois, vous le faites à deux.',
    },
  },
  '9': {
    title: 'Rimes',
    text: {
      soft: 'Dis un mot. À tour de rôle, chacun dit un mot qui rime. Le premier qui sèche fait un gage.',
      spicy: 'Dis un mot. À tour de rôle, chacun dit un mot qui rime. Le premier qui sèche boit.',
      hot: 'Dis un mot coquin. À tour de rôle, chacun dit un mot qui rime. Le premier qui sèche retire un accessoire.',
    },
  },
  '10': {
    title: 'Je n’ai jamais',
    text: {
      soft: 'Dis « Je n’ai jamais… » : tous ceux qui l’ont déjà fait lèvent la main et racontent.',
      spicy: 'Dis « Je n’ai jamais… » : tous ceux qui l’ont déjà fait boivent une gorgée.',
      hot: 'Dis un « Je n’ai jamais… » coquin : ceux qui l’ont déjà fait boivent une gorgée ou retirent un accessoire.',
    },
  },
  J: {
    title: 'Règle',
    text: {
      soft: 'Invente une règle valable jusqu’à la fin de la partie (ex. interdit de dire « oui »). Qui l’oublie fait un gage.',
      spicy: 'Invente une règle valable jusqu’à la fin de la partie (ex. boire de la main gauche). Qui l’oublie boit.',
      hot: 'Invente une règle coquine valable jusqu’à la fin de la partie (ex. appeler tout le monde « mon cœur »). Qui l’oublie retire un accessoire.',
    },
  },
  Q: {
    title: 'Maître des questions',
    text: {
      soft: 'Jusqu’à la prochaine Dame, quiconque répond à une de tes questions fait un gage.',
      spicy: 'Jusqu’à la prochaine Dame, quiconque répond à une de tes questions boit une gorgée.',
      hot: 'Jusqu’à la prochaine Dame, quiconque répond à une de tes questions te fait un compliment sensuel.',
    },
  },
  K: {
    title: 'Coupe du roi',
    text: {
      soft: 'Invente un gage et ajoute-le à la coupe du roi. Celui qui tire le dernier Roi devra en choisir un.',
      spicy: 'Verse un peu de ta boisson dans la coupe du roi, au centre de la table.',
      hot: 'Invente un gage coquin et ajoute-le à la coupe du roi. Celui qui tire le dernier Roi devra le relever.',
    },
  },
}

/** Quatrième Roi tiré. */
export const LAST_KING: Record<Level, string> = {
  soft: 'Dernier Roi ! Le groupe lit tous les gages de la coupe : tu en choisis un et tu le fais.',
  spicy: 'Dernier Roi ! Tu bois la coupe du roi… ou une gorgée si elle est trop remplie. Avec modération.',
  hot: 'Dernier Roi ! Tu relèves le gage coquin de ton choix parmi ceux de la coupe, avec l’accord de chacun.',
}
