import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes spécifiques aux postes — Phase 7 (série 2).
 * 9 dilemmes : 2 gardien, 2 défenseur, 3 milieu, 2 attaquant.
 * Thèmes distincts des 16 dilemmes de positions.ts (phase 5).
 */
export const postes2Dilemmas: DilemmaDefinition[] = [
  // ── GARDIEN ──────────────────────────────────────────────

  dilemma({
    id: 'p7_pos_gk_tireur_attitre',
    title: 'Le gardien qui tire les penaltys',
    body: 'Aux tirs d’après-séance, tu ne trembles jamais : dix penaltys, dix buts, semaine après semaine. Les tireurs attitrés, eux, en ont raté trois ce mois-ci. Le staff te propose l’impensable : devenir le tireur officiel de l’équipe. Un gardien buteur, le public adorerait — et chaque échec serait un aller-retour de quatre-vingts mètres sous les sifflets, avec ton but exposé au contre.',
    category: 'training',
    tags: ['gardien', 'penalty', 'role'],
    rarity: 'rare',
    weight: 4,
    ageMin: 19,
    ageMax: 38,
    positions: ['gk'],
    unique: true,
    choices: [
      choice({
        id: 'accepter',
        label: 'Devenir le tireur attitré, assumer l’étiquette',
        stance: 'high_risk',
        riskPreview: 'Une légende possible, un ridicule possible.',
        immediate: [
          fx.skillCheck(
            'stat',
            'sangFroid',
            52,
            [
              fx.resource('popularite', 8),
              fx.resource('reputationSportive', 6),
              fx.relation('fans', 6),
            ],
            [fx.resource('reputationSportive', -5), fx.resource('moral', -6)],
          ),
        ],
        hidden: [fx.hidden('grandsMatchs', 3), fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Rester dans ta surface : chacun son métier',
        stance: 'professional',
        riskPreview: 'Zéro risque, et une occasion unique qui s’envole.',
        immediate: [
          fx.relation('teammates', 4),
          fx.resource('discipline', 3),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('ambition', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_pos_gk_libero',
    title: 'Gardien-libéro sous un coach radical',
    body: 'Le nouveau coach ne jure que par un pressing tout-terrain — et il exige de son gardien qu’il vive à trente mètres de sa ligne, en vrai libéro. Tes relances vont devenir décisives, tes courses arrières aussi. Un ballon mal jugé et c’est le lob depuis le rond central, en mondovision. Adhérer à fond à ce football extrême, ou négocier une version moins suicidaire ?',
    category: 'coach',
    tags: ['gardien', 'tactique', 'libero'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 18,
    ageMax: 36,
    positions: ['gk'],
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'adherer',
        label: 'Jouer libéro à fond, quitte à prendre un lob',
        stance: 'ambitious',
        riskPreview: 'Un gardien moderne naît — parfois dans la douleur.',
        immediate: [
          fx.relation('coach', 6),
          fx.stat('placement', 1),
          fx.stat('tactique', 1),
          fx.chance(0.35, [fx.resource('reputationSportive', -6), fx.resource('moral', -4)]),
        ],
        hidden: [fx.hidden('adaptabilite', 3)],
      }),
      choice({
        id: 'negocier',
        label: 'Négocier une position intermédiaire, moins exposée',
        stance: 'prudent',
        riskPreview: 'Un compromis à arracher à un homme entier.',
        immediate: [
          fx.skillCheck(
            'resource',
            'confianceEntraineur',
            50,
            [fx.relation('coach', 3), fx.resource('moral', 4)],
            [fx.relation('coach', -6), fx.resource('discipline', -3)],
          ),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('adaptabilite', -1)],
      }),
    ],
  }),

  // ── DÉFENSEUR ────────────────────────────────────────────

  dilemma({
    id: 'p7_pos_def_capitaine_defense_trois',
    title: 'Patron d’une défense à trois inédite',
    body: 'Le coach bascule dans un système à trois défenseurs que le club n’a jamais joué — et te nomme patron de cette ligne. À toi de placer les deux autres, de couvrir les pistons, d’absorber les erreurs de jeunesse du système. Tu peux imposer des heures de vidéo et de mise en place à tes partenaires, ou faire confiance aux matchs pour régler la machine, au prix de quelques naufrages.',
    category: 'coach',
    tags: ['defenseur', 'leadership', 'tactique'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 21,
    ageMax: 37,
    positions: ['cb', 'fb'],
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'driller',
        label: 'Imposer vidéo et mises en place, soir après soir',
        stance: 'collective',
        riskPreview: 'La ligne progresse vite, le groupe grince un peu.',
        immediate: [
          fx.stat('tactique', 2),
          fx.stat('leadership', 1),
          fx.resource('fatigue', 6),
          fx.relation('teammates', -3),
        ],
        delayed: [
          fx.delayed(1, [fx.resource('cohesionVestiaire', 5), fx.resource('reputationSportive', 4)]),
        ],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
      choice({
        id: 'matchs',
        label: 'Laisser les matchs régler la machine',
        stance: 'resilient',
        riskPreview: 'L’apprentissage grandeur nature, naufrages compris.',
        immediate: [
          fx.relation('teammates', 3),
          fx.chance(0.4, [
            fx.resource('reputationSportive', -5),
            fx.resource('confianceEntraineur', -4),
          ]),
        ],
        hidden: [fx.hidden('adaptabilite', 2), fx.hidden('constance', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_pos_def_faire_craquer_vedette',
    title: 'Consigne : faire craquer leur vedette',
    body: 'Causerie d’avant-match. Le staff l’assume sans détour : l’attaquant vedette adverse est un sanguin, et ta mission est de le faire sortir de son match — mots choisis, contacts appuyés, tout ce que l’arbitre tolère. Ce n’est pas le football que tu aimes, mais c’est peut-être celui qui fait gagner. Jusqu’où acceptes-tu de salir ton match pour plomber le sien ?',
    category: 'match',
    tags: ['defenseur', 'provocation', 'consigne'],
    rarity: 'common',
    weight: 11,
    ageMin: 18,
    ageMax: 38,
    positions: ['cb', 'fb'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'fond',
        label: 'Appliquer la consigne jusqu’à la ligne rouge',
        stance: 'loyal',
        riskPreview: 'S’il craque, tu es un soldat ; si tu craques, un voyou.',
        immediate: [
          fx.skillCheck(
            'stat',
            'sangFroid',
            50,
            [fx.resource('confianceEntraineur', 6), fx.relation('coach', 4)],
            [fx.resource('discipline', -8), fx.resource('reputationSportive', -4)],
          ),
        ],
        hidden: [fx.hidden('loyaute', 2), fx.hidden('professionnalisme', -1)],
      }),
      choice({
        id: 'propre',
        label: 'Le harceler proprement, sans jamais dépasser',
        stance: 'professional',
        riskPreview: 'La version défendable — peut-être trop douce.',
        immediate: [
          fx.resource('discipline', 2),
          fx.resource('confianceEntraineur', 3),
          fx.chance(0.3, [fx.relation('coach', -4)]),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser : tu défends, tu ne détruis pas',
        stance: 'ethical',
        riskPreview: 'Tes principes saufs, le staff qui prend note.',
        immediate: [
          fx.relation('coach', -6),
          fx.resource('moral', 4),
          fx.resource('discipline', 2),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  // ── MILIEU ───────────────────────────────────────────────

  dilemma({
    id: 'p7_pos_mid_metronome',
    title: 'Métronome : renoncer aux buts',
    body: 'Le staff a sorti les chiffres : quand tu restes bas, que tu touches cent ballons et que tu dictes le tempo, l’équipe ne perd presque jamais. Le coach te veut métronome à plein temps — fini les projections, fini les buts, ce frisson qui te porte depuis tes débuts. Accepter de disparaître des statistiques pour faire gagner les autres, ou garder tes échappées vers la surface ?',
    category: 'training',
    tags: ['milieu', 'role', 'tempo'],
    rarity: 'common',
    weight: 10,
    ageMin: 20,
    ageMax: 37,
    positions: ['cdm', 'cm', 'cam'],
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'accepter',
        label: 'Devenir le métronome, tirer un trait sur les buts',
        stance: 'collective',
        riskPreview: 'L’équipe gagne, ton nom s’efface des feuilles de stats.',
        immediate: [
          fx.stat('passe', 2),
          fx.stat('vision', 1),
          fx.resource('moral', -4),
          fx.relation('coach', 5),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'garder',
        label: 'Garder tes courses vers la surface',
        stance: 'ambitious',
        riskPreview: 'Ton frisson préservé, la formule gagnante contrariée.',
        immediate: [
          fx.relation('coach', -5),
          fx.skillCheck(
            'stat',
            'tir',
            52,
            [fx.resource('reputationSportive', 5), fx.resource('moral', 5)],
            [fx.resource('confianceEntraineur', -5), fx.resource('cohesionVestiaire', -3)],
          ),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_pos_mid_ombre_mediatique',
    title: 'Précieux sur le terrain, invisible à la télé',
    body: 'Un consultant connu vient de résumer ta saison d’une formule qui tourne partout : « il court beaucoup, mais je ne vois pas ce qu’il apporte ». Ton coach, lui, sait que tu bouches chaque trou du milieu, et tes coéquipiers aussi. Mais les trophées individuels, les sélections, les gros contrats vont à ceux qu’on voit. Continuer ton travail de l’ombre, ou t’offrir enfin des statistiques ?',
    category: 'match',
    tags: ['milieu', 'image', 'sacrifice'],
    rarity: 'common',
    weight: 11,
    ageMin: 20,
    ageMax: 36,
    positions: ['cdm', 'cm', 'cam'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'ombre',
        label: 'Rester l’ouvrier de l’ombre, tant pis pour la télé',
        stance: 'resilient',
        riskPreview: 'Le respect des tiens, l’indifférence du reste.',
        immediate: [
          fx.relation('coach', 5),
          fx.relation('teammates', 4),
          fx.resource('popularite', -3),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'briller',
        label: 'Changer ton jeu pour exister dans les débats',
        stance: 'media_savvy',
        riskPreview: 'Des statistiques enfin — et des trous dans le milieu.',
        immediate: [
          fx.resource('popularite', 5),
          fx.relation('media', 4),
          fx.chance(0.35, [fx.resource('cohesionVestiaire', -5), fx.relation('coach', -5)]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('constance', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_pos_mid_depannage_aile',
    title: 'Dépanner sur l’aile, au pied levé',
    body: 'Trois blessés sur les côtés en une semaine : le coach n’a plus d’ailier valide. Il te regarde en fin de séance : « Tu me dépannes sur l’aile samedi ? » Un poste qui n’est pas le tien, des repères à inventer en trois jours, et la certitude d’être jugé comme un ailier. Rendre service peut t’ouvrir des portes — ou t’installer durablement loin de ton vrai poste.',
    category: 'coach',
    tags: ['milieu', 'repositionnement', 'depannage'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 18,
    ageMax: 35,
    positions: ['cdm', 'cm', 'cam'],
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'depanner',
        label: 'Accepter le dépannage sans discuter',
        stance: 'collective',
        riskPreview: 'Un service rendu qui peut devenir une étiquette.',
        immediate: [
          fx.relation('coach', 6),
          fx.flag('position_switch'),
          fx.skillCheck(
            'hidden',
            'adaptabilite',
            48,
            [fx.resource('reputationSportive', 4), fx.stat('dribble', 1)],
            [fx.resource('moral', -4), fx.resource('reputationSportive', -3)],
          ),
        ],
        hidden: [fx.hidden('adaptabilite', 3)],
      }),
      choice({
        id: 'limites',
        label: 'Dépanner, mais deux matchs pas plus',
        stance: 'professional',
        riskPreview: 'Ton poste protégé, ta bonne volonté discutée.',
        immediate: [
          fx.relation('coach', 2),
          fx.resource('moral', 3),
          fx.chance(0.25, [fx.relation('coach', -5)]),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  // ── ATTAQUANT ────────────────────────────────────────────

  dilemma({
    id: 'p7_pos_att_penalty_offert',
    title: 'Ton penalty pour {coequipier}',
    body: 'Penalty pour ton équipe, et c’est toi le tireur désigné. Mais à dix mètres, tu vois {coequipier} : douze matchs sans marquer, la confiance en miettes, le stade qui murmure à chacune de ses touches. Un but ce soir pourrait le relancer pour des mois. Le score est encore serré. Lui offrir ce ballon, c’est beau — et c’est risquer le résultat sur ses nerfs fragiles.',
    category: 'match',
    tags: ['attaquant', 'penalty', 'npc'],
    rarity: 'common',
    weight: 12,
    ageMin: 18,
    ageMax: 39,
    positions: ['winger', 'st'],
    cooldownSeasons: 3,
    echoes: [
      {
        flag: 'penalty_refuse',
        text: '{years} saisons plus tôt, tu avais déjà laissé filer un penalty décisif.',
      },
    ],
    choices: [
      choice({
        id: 'offrir',
        label: 'Lui glisser le ballon : « il est pour toi »',
        stance: 'collective',
        riskPreview: 'Un geste immense — sur des épaules tremblantes.',
        immediate: [
          fx.relation('teammates', 8),
          fx.resource('cohesionVestiaire', 5),
          fx.chance(0.4, [fx.resource('moral', -4), fx.resource('confianceEntraineur', -4)]),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'tirer',
        label: 'Le tirer toi-même : le tireur, c’est toi',
        stance: 'professional',
        riskPreview: 'Le devoir avant le beau geste, et un ami qui attend.',
        immediate: [
          fx.relation('teammates', -3),
          fx.skillCheck(
            'stat',
            'finition',
            50,
            [fx.resource('moral', 4), fx.resource('reputationSportive', 3)],
            [fx.resource('moral', -5), fx.resource('reputationSportive', -3)],
          ),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('loyaute', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_pos_att_neuf_fixation',
    title: 'D’ailier à neuf de fixation',
    body: 'Ton coach a perdu son avant-centre pour de longs mois et il ne veut pas recruter. Son idée : toi, l’ailier de vitesse, reconverti en neuf de fixation. Jouer dos au but, encaisser les charges des centraux, dévier, peser. Tout ce que tu n’as jamais fait. « Six mois là-dedans et tu seras un attaquant complet », promet-il. Ou six mois à souffrir loin de tes espaces.',
    category: 'coach',
    tags: ['attaquant', 'repositionnement', 'ailier'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 19,
    ageMax: 34,
    positions: ['winger'],
    unique: true,
    choices: [
      choice({
        id: 'apprendre',
        label: 'Apprendre le métier de neuf, dos au but',
        stance: 'ambitious',
        riskPreview: 'Un attaquant complet au bout — si le corps tient.',
        immediate: [
          fx.flag('position_switch'),
          fx.relation('coach', 5),
          fx.stat('puissance', 2),
          fx.resource('fatigue', 5),
          fx.resource('moral', -3),
        ],
        delayed: [
          fx.delayed(1, [fx.stat('finition', 2), fx.resource('reputationSportive', 3)]),
        ],
        hidden: [fx.hidden('adaptabilite', 4)],
      }),
      choice({
        id: 'refuser',
        label: 'Rester ailier : ta vitesse est ton identité',
        stance: 'individualist',
        riskPreview: 'Ton jeu préservé, un coach qui devra bricoler.',
        immediate: [fx.relation('coach', -6), fx.resource('moral', 3)],
        hidden: [fx.hidden('constance', 2), fx.hidden('adaptabilite', -2)],
      }),
    ],
  }),
]
