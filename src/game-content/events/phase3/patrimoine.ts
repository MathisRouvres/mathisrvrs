import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes de dépenses / patrimoine (Phase 3) — emplacement 2.
 * Arbitrages de train de vie, entourage, famille, épargne et générosité.
 */
export const patrimoineDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p3_patrimoine_train_de_vie',
    title: 'La tentation du grand train de vie',
    body: 'Tes premiers vrais revenus donnent des idées : voiture, montre, sorties. Le plaisir est immédiat, mais chaque hausse de niveau de vie pèsera sur ton patrimoine saison après saison. Rester sobre te frustre un peu mais protège l’avenir.',
    category: 'lifestyle',
    tags: ['train_de_vie', 'depenses', 'patrimoine'],
    rarity: 'common',
    weight: 8,
    ageMin: 19,
    ageMax: 34,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'depenser',
        label: 'S’offrir le grand train de vie',
        stance: 'emotional',
        riskPreview: 'Plaisir immédiat, dépenses durables en hausse.',
        immediate: [fx.cash(-30000), fx.res('moral', 5), fx.res('bienEtre', 3)],
        hidden: [fx.hidden('constance', -1)],
      }),
      choice({
        id: 'sobre',
        label: 'Rester sobre et prévoyant',
        stance: 'prudent',
        riskPreview: 'Patrimoine protégé, plaisir différé.',
        immediate: [fx.res('financesPersonnelles', 5), fx.res('moral', -2)],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_patrimoine_famille',
    title: 'La famille compte sur toi',
    body: 'Un proche traverse une passe difficile et te demande un vrai coup de pouce financier. Refuser protège tes finances mais te met à dos une partie des tiens ; accepter les soulage et resserre les liens, au prix d’une belle somme.',
    category: 'money',
    tags: ['famille', 'depenses'],
    rarity: 'common',
    weight: 8,
    ageMin: 18,
    ageMax: 39,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'aider',
        label: 'Aider généreusement les tiens',
        stance: 'emotional',
        riskPreview: 'Liens resserrés, somme conséquente donnée.',
        immediate: [fx.cash(-25000), fx.rel('family', 10)],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Protéger d’abord ton avenir',
        stance: 'financial',
        riskPreview: 'Épargne préservée, tensions familiales.',
        immediate: [fx.res('financesPersonnelles', 4), fx.rel('family', -8)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_patrimoine_epargne',
    title: 'Mettre de côté ou profiter',
    body: 'Ton conseiller te presse de placer une part de tes gains sur une épargne sûre, au rendement modeste mais garanti. Une voix intérieure préférerait profiter maintenant, tant que la carrière sourit. La discipline paie rarement dans l’instant.',
    category: 'money',
    tags: ['epargne', 'patrimoine'],
    rarity: 'common',
    weight: 8,
    ageMin: 19,
    ageMax: 39,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'epargner',
        label: 'Placer sur une épargne sûre',
        stance: 'prudent',
        riskPreview: 'Rendement modeste mais garanti.',
        immediate: [
          fx.makeInvestment({
            investmentId: 'epargne_securisee',
            label: 'Épargne sécurisée',
            cost: 20000,
            sector: 'epargne',
          }),
          fx.res('financesPersonnelles', 3),
        ],
        delayed: [fx.delayed(2, [fx.chance(0.97, [fx.cash(3000)])])],
        hidden: [fx.hidden('constance', 2)],
      }),
      choice({
        id: 'profiter',
        label: 'Profiter tant que ça dure',
        stance: 'emotional',
        riskPreview: 'Plaisir maintenant, filet plus mince.',
        immediate: [fx.res('moral', 4), fx.res('financesPersonnelles', -3)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_patrimoine_entourage',
    title: 'Un entourage de plus en plus lourd',
    body: 'Cousins, amis d’enfance, conseillers en tout genre : ton entourage s’élargit et ses coûts avec. Certains sont précieux, d’autres profitent. Faire le ménage soulage tes finances mais blesse ; tout garder coûte cher et brouille les repères.',
    category: 'lifestyle',
    tags: ['entourage', 'depenses'],
    rarity: 'uncommon',
    weight: 7,
    ageMin: 20,
    ageMax: 38,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'trier',
        label: 'Faire le ménage dans l’entourage',
        stance: 'financial',
        riskPreview: 'Finances allégées, quelques rancunes.',
        immediate: [fx.res('financesPersonnelles', 5), fx.rel('friends', -6)],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'garder',
        label: 'Tout le monde reste',
        stance: 'loyal',
        riskPreview: 'Fidélité coûteuse, dépenses qui filent.',
        immediate: [fx.cash(-18000), fx.rel('friends', 5)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_patrimoine_don',
    title: 'Un geste pour ta ville',
    body: 'Ta ville d’origine lance une collecte pour rénover le stade où tu as tout appris. Un don marquant coûterait cher mais te vaudrait une reconnaissance sincère. Le calcul froid dirait non ; le cœur, lui, hésite à peine.',
    category: 'money',
    tags: ['don', 'image', 'depenses'],
    rarity: 'common',
    weight: 7,
    ageMin: 20,
    ageMax: 39,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'donner',
        label: 'Faire un don marquant',
        stance: 'ethical',
        riskPreview: 'Reconnaissance sincère, belle somme donnée.',
        immediate: [fx.cash(-22000), fx.res('popularite', 5), fx.rel('fans', 8)],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'sobre',
        label: 'Un geste discret et mesuré',
        stance: 'prudent',
        riskPreview: 'Finances ménagées, impact plus discret.',
        immediate: [fx.cash(-4000), fx.res('financesPersonnelles', 1)],
      }),
    ],
  }),
]
