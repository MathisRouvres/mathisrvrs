import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes vestiaire — emplacement 1.
 * 8 dilemmes : loyautés internes, rivalités, leadership et secrets du groupe.
 */
export const vestiaireDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p5_vest_noctambule',
    title: 'Ton pote collectionne les nuits blanches',
    body: 'Ton meilleur ami du vestiaire enchaîne les sorties nocturnes, même à deux jours des matchs. Sur le terrain, il baisse, et les regards commencent à converger vers lui. Hier soir, tu l’as croisé en ville à trois heures du matin. Le staff pose des questions, certains cadres grondent. Tu tiens son secret entre tes mains, et chaque option ressemble à une trahison de quelqu’un.',
    category: 'teammates',
    tags: ['amitie', 'discipline'],
    rarity: 'common',
    weight: 14,
    ageMin: 17,
    ageMax: 35,
    positions: null,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'couvrir',
        label: 'Le couvrir et ne rien dire à personne',
        stance: 'loyal',
        riskPreview: 'Amitié sauve, dérive qui continue.',
        immediate: [
          fx.relation('teammates', 3),
          fx.resource('moral', -2),
          fx.chance(0.4, [fx.resource('cohesionVestiaire', -6)]),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'confronter',
        label: 'Le confronter seul à seul, sans témoin',
        stance: 'ethical',
        riskPreview: 'Électrochoc possible, amitié sous tension.',
        immediate: [
          fx.skillCheck(
            'stat',
            'leadership',
            48,
            [fx.relation('teammates', 6), fx.resource('cohesionVestiaire', 4)],
            [fx.relation('teammates', -5), fx.resource('moral', -3)],
          ),
        ],
        hidden: [fx.hidden('loyaute', 2), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'staff',
        label: 'Alerter discrètement le staff',
        stance: 'prudent',
        riskPreview: 'Problème traité, confiance trahie.',
        immediate: [
          fx.relation('coach', 5),
          fx.relation('teammates', -6),
          fx.resource('discipline', 3),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.5, [fx.relation('teammates', 5), fx.resource('moral', 3)]),
          ]),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_vest_prime_collective',
    title: 'La prime qui fracture le groupe',
    body: 'La direction refuse de verser la prime de qualification promise en début de saison. Les cadres organisent la riposte, jusqu’à évoquer un entraînement bloqué devant les caméras. On fait circuler une lettre commune, et ta signature est attendue. Refuser, c’est passer pour le joueur de la direction. Signer, c’est risquer une amende et froisser ceux qui décident de ta prolongation. Le vestiaire compte ses soutiens un par un.',
    category: 'teammates',
    tags: ['argent', 'solidarite'],
    rarity: 'common',
    weight: 13,
    ageMin: 18,
    ageMax: 37,
    positions: null,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'signer',
        label: 'Signer la lettre avec le groupe',
        stance: 'loyal',
        riskPreview: 'Groupe soudé, direction refroidie.',
        immediate: [
          fx.relation('teammates', 7),
          fx.resource('cohesionVestiaire', 6),
          fx.chance(0.35, [fx.cash(-8000), fx.resource('discipline', -3)]),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'retrait',
        label: 'Rester en dehors du bras de fer',
        stance: 'financial',
        riskPreview: 'Direction ménagée, vestiaire qui juge.',
        immediate: [
          fx.relation('teammates', -7),
          fx.resource('cohesionVestiaire', -4),
          fx.resource('discipline', 3),
        ],
        delayed: [fx.delayed(1, [fx.chance(0.4, [fx.cash(12000)])])],
        hidden: [fx.hidden('loyaute', -3), fx.hidden('ambition', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_vest_bizutage',
    title: 'Le bizutage vire au malaise',
    body: 'Le rituel d’intégration du nouveau, dix-sept ans à peine, dérape. Les anciens le font chanter debout sur une chaise, d’accord, mais ce soir on parle de raser sa tête et de poster la vidéo. Le gamin rit jaune, cherche un regard ami. Le tien. S’interposer, c’est défier les anciens devant tout le monde. Laisser faire, c’est apprendre au gamin que personne ne viendra jamais.',
    category: 'teammates',
    tags: ['bizutage', 'courage'],
    rarity: 'common',
    weight: 12,
    ageMin: 19,
    ageMax: 36,
    positions: null,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'interposer',
        label: 'T’interposer devant les anciens',
        stance: 'ethical',
        riskPreview: 'Gamin protégé, anciens défiés.',
        immediate: [
          fx.flag('defended_teammate'),
          fx.relation('teammates', -4),
          fx.resource('moral', 3),
        ],
        delayed: [
          fx.delayed(1, [
            fx.relation('teammates', 6),
            fx.resource('cohesionVestiaire', 4),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'tradition',
        label: 'Laisser la tradition suivre son cours',
        stance: 'prudent',
        riskPreview: 'Anciens satisfaits, image en jeu si ça fuite.',
        immediate: [
          fx.relation('teammates', 3),
          fx.chance(0.3, [fx.resource('popularite', -6), fx.relation('media', -4)]),
        ],
        hidden: [fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_vest_coup_franc',
    title: 'Il veut tes coups francs',
    body: 'Tu as gagné le droit de tirer les coups francs à force de les travailler après les séances. Mais le vieux numéro dix, monument du club, vit mal de céder ce rôle à plus jeune que lui. Devant le groupe, il te demande de « respecter l’ordre des choses ». Vingt paires d’yeux se tournent vers toi. Ce ballon posé, c’est ton statut ou la paix du vestiaire.',
    category: 'teammates',
    tags: ['statut', 'hierarchie'],
    rarity: 'common',
    weight: 13,
    ageMin: 17,
    ageMax: 33,
    positions: null,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'garder',
        label: 'Garder le ballon, tu l’as mérité',
        stance: 'individualist',
        riskPreview: 'Statut assumé, monument vexé.',
        immediate: [
          fx.skillCheck(
            'stat',
            'tir',
            50,
            [fx.resource('reputationSportive', 5), fx.resource('moral', 4)],
            [fx.relation('teammates', -6), fx.resource('moral', -3)],
          ),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'ceder',
        label: 'Lui laisser le ballon devant le groupe',
        stance: 'loyal',
        riskPreview: 'Vestiaire apaisé, terrain concédé.',
        immediate: [
          fx.relation('teammates', 6),
          fx.resource('cohesionVestiaire', 4),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('loyaute', 2), fx.hidden('ambition', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_vest_crise_perso',
    title: 'Son monde s’écroule en silence',
    body: 'Ton voisin de vestiaire n’est plus que l’ombre de lui-même. Un soir, après la séance, il craque. Séparation, procédure pour la garde de sa fille, nuits sans sommeil. Il te supplie de ne rien dire, persuadé qu’une place se perd plus vite qu’une réputation se répare. Mais tu le vois couler à chaque entraînement, et le staff s’interroge déjà sur son niveau.',
    category: 'teammates',
    tags: ['crise', 'confiance'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 18,
    ageMax: 38,
    positions: null,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'epauler',
        label: 'Porter son secret et l’épauler toi-même',
        stance: 'emotional',
        riskPreview: 'Confiance honorée, fardeau lourd à deux.',
        immediate: [
          fx.relation('teammates', 6),
          fx.resource('fatigue', 4),
          fx.resource('bienEtre', -3),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.35, [
              fx.resource('cohesionVestiaire', -5),
              fx.resource('moral', -4),
            ]),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 4)],
      }),
      choice({
        id: 'cellule',
        label: 'Prévenir la cellule d’accompagnement du club',
        stance: 'ethical',
        riskPreview: 'Aide professionnelle, promesse brisée.',
        immediate: [fx.relation('teammates', -5), fx.resource('moral', -2)],
        delayed: [
          fx.delayed(1, [
            fx.relation('teammates', 7),
            fx.resource('cohesionVestiaire', 5),
          ]),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('loyaute', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_vest_rival_poste',
    title: 'La recrue vise ta place',
    body: 'Le club a recruté à ton poste. Même profil, même ambition, deux ans de moins. Dès la première séance, il t’a cherché, tacles appuyés et petites phrases aux journalistes sur « la concurrence qui va faire du bien ». Le vestiaire observe le duel en se demandant qui craquera. Tu peux en faire une guerre personnelle, ou un carburant froid qui te pousse sans te consumer.',
    category: 'rivalry',
    tags: ['concurrence', 'poste'],
    rarity: 'common',
    weight: 13,
    ageMin: 18,
    ageMax: 34,
    positions: null,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'guerre',
        label: 'Répondre coup pour coup, séance après séance',
        stance: 'individualist',
        riskPreview: 'Duel assumé, vestiaire sous tension.',
        immediate: [
          fx.flag('rival_feud'),
          fx.resource('cohesionVestiaire', -5),
          fx.skillCheck(
            'hidden',
            'resistancePression',
            50,
            [fx.resource('reputationSportive', 5), fx.resource('confianceEntraineur', 4)],
            [fx.resource('moral', -6), fx.resource('forme', -3)],
          ),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'carburant',
        label: 'L’ignorer et bosser deux fois plus',
        stance: 'ambitious',
        riskPreview: 'Progression froide, provocations sans réponse.',
        immediate: [
          fx.stat('endurance', 1),
          fx.stat('placement', 1),
          fx.resource('fatigue', 6),
          fx.resource('moral', -2),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_vest_ombre_du_brassard',
    title: 'Le capitaine n’a pas digéré',
    body: 'Depuis ce soir où tu as porté le brassard à sa place, le capitaine a changé. Passes qui n’arrivent plus, remarques sèches devant le groupe, ton nom oublié quand il cite les cadres en interview. Il a senti le vent tourner et te voit désormais comme une menace. Le vestiaire commence à remarquer ce froid. Une explication s’impose, mais chacune a son prix.',
    category: 'rivalry',
    tags: ['capitaine', 'statut'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 19,
    ageMax: 36,
    positions: null,
    cooldownSeasons: 4,
    unique: true,
    prerequisites: [{ type: 'hasFlag', key: 'capitaine_un_soir' }],
    choices: [
      choice({
        id: 'apaiser',
        label: 'Lui assurer que sa place n’est pas menacée',
        stance: 'loyal',
        riskPreview: 'Paix retrouvée, ambitions rangées.',
        immediate: [
          fx.relation('teammates', 5),
          fx.resource('cohesionVestiaire', 4),
          fx.resource('moral', -2),
        ],
        hidden: [fx.hidden('ambition', -2), fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'assumer',
        label: 'Assumer de viser le brassard à terme',
        stance: 'ambitious',
        riskPreview: 'Cap assumé, cadre transformé en adversaire.',
        immediate: [
          fx.relation('teammates', -5),
          fx.resource('reputationSportive', 3),
          fx.stat('leadership', 1),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_vest_silence_apres_naufrage',
    title: 'Cinq à zéro et un vestiaire muet',
    body: 'Cinq à zéro dans le derby. Le retour au vestiaire se fait dans un silence de cimetière. Le coach a claqué la porte sans un mot, le capitaine fixe le sol, et les plus jeunes retiennent leurs larmes. Quelqu’un doit dire quelque chose, maintenant, avant que cette humiliation ne devienne l’histoire de la saison. Tous les regards glissent lentement vers ceux qui pourraient parler. Tu en fais partie.',
    category: 'teammates',
    tags: ['derby', 'leadership'],
    rarity: 'rare',
    weight: 4,
    ageMin: 18,
    ageMax: 38,
    positions: null,
    cooldownSeasons: 5,
    choices: [
      choice({
        id: 'parler',
        label: 'Te lever et prendre la parole',
        stance: 'ambitious',
        riskPreview: 'Voix qui porte ou mots dans le vide.',
        immediate: [
          fx.flag('vestiaire_leader'),
          fx.skillCheck(
            'stat',
            'leadership',
            52,
            [
              fx.resource('cohesionVestiaire', 8),
              fx.relation('teammates', 6),
              fx.stat('leadership', 2),
            ],
            [fx.relation('teammates', -4), fx.resource('moral', -5)],
          ),
        ],
        hidden: [fx.hidden('resistancePression', 3), fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'laisser',
        label: 'Laisser les anciens trouver les mots',
        stance: 'prudent',
        riskPreview: 'Place respectée, silence qui s’installe.',
        immediate: [
          fx.resource('moral', -4),
          fx.resource('cohesionVestiaire', -3),
          fx.resource('discipline', 2),
        ],
        hidden: [fx.hidden('constance', 1), fx.hidden('ambition', -2)],
      }),
    ],
  }),
]
