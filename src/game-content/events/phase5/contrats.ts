import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes contrats / transferts / agent — emplacement 2.
 * 8 dilemmes : 3 transfer, 3 contract, 2 agent.
 */
export const contratDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p5_ctr_grand_club_banc',
    title: 'L’appel du grand club',
    body: 'Un club du haut du tableau de la Capitale Miroir te veut. Salaire doublé, stade immense, coupe continentale — mais un international confirmé occupe déjà ton poste. Ici, tu es titulaire, aimé, central dans le projet. Là-bas, tu seras d’abord un pari assis sur le banc. Ton agent te presse : ces fenêtres ne s’ouvrent pas deux fois. Ton coach, lui, te promet une saison bâtie autour de toi.',
    category: 'transfer',
    tags: ['transfert', 'ambition', 'temps_de_jeu'],
    rarity: 'common',
    weight: 14,
    ageMin: 18,
    ageMax: 31,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'signer',
        label: 'Signer et aller te battre pour la place',
        stance: 'ambitious',
        riskPreview: 'Statut à conquérir, banc possible.',
        immediate: [
          fx.flag('transfer_accepted'),
          fx.cash(30000),
          fx.resource('reputationSportive', 5),
          fx.resource('moral', 3),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.45, [fx.resource('forme', -6), fx.resource('moral', -5)]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'rester',
        label: 'Rester là où tu es titulaire',
        stance: 'loyal',
        riskPreview: 'Statut préservé, occasion peut-être unique.',
        immediate: [
          fx.relation('fans', 6),
          fx.resource('confianceEntraineur', 6),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'garanties',
        label: 'Accepter, mais exiger du temps de jeu garanti',
        stance: 'prudent',
        riskPreview: 'Garantie sur papier, promesses parfois oubliées.',
        immediate: [
          fx.flag('transfer_accepted'),
          fx.cash(18000),
          fx.resource('reputationSportive', 3),
          fx.debt('ctr_temps_jeu', 'Le temps de jeu promis reste à honorer', 1),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.4, [
              fx.resource('confianceEntraineur', -6),
              fx.resource('moral', -4),
            ]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 2), fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_ctr_rival_double_salaire',
    title: 'Le rival te tend un contrat',
    body: 'Le grand rival de ta ville — celui que ton public déteste plus que tout — propose de doubler ton salaire. L’offre est sérieuse, le projet sportif solide, et ton club actuel traîne à te prolonger depuis des mois. Mais tu connais le prix : ton nom brûlé dans les tribunes qui te chantaient, ta famille prise à partie au marché. L’argent est réel. La haine le sera aussi.',
    category: 'transfer',
    tags: ['transfert', 'rivalite', 'trahison'],
    rarity: 'rare',
    weight: 4,
    ageMin: 20,
    ageMax: 33,
    cooldownSeasons: 5,
    unique: true,
    choices: [
      choice({
        id: 'trahir',
        label: 'Signer chez le rival, assumer la haine',
        stance: 'financial',
        riskPreview: 'Compte en banque plein, tribunes en feu.',
        immediate: [
          fx.flag('transfer_accepted'),
          fx.cash(60000),
          fx.relation('fans', -20),
          fx.resource('popularite', -10),
          fx.resource('moral', -4),
        ],
        delayed: [
          fx.delayed(1, [
            fx.resource('financesPersonnelles', 8),
            fx.chance(0.4, [fx.relation('media', -5)]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('loyaute', -4)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser et le faire savoir publiquement',
        stance: 'loyal',
        riskPreview: 'Idole des tribunes, compte inchangé.',
        immediate: [
          fx.relation('fans', 12),
          fx.resource('popularite', 6),
          fx.resource('moral', 3),
          fx.resource('financesPersonnelles', -4),
        ],
        hidden: [fx.hidden('loyaute', 4), fx.hidden('ambition', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_ctr_pret_division_inferieure',
    title: 'Un prêt pour exister',
    body: 'Tu n’as presque pas joué cette saison. Un club des Hauts Plateaux, en division inférieure, propose de te prendre en prêt : titulaire garanti, projet construit autour de toi. Ton club accepte de te laisser partir six mois. Descendre d’un étage pour jouer, c’est avaler ta fierté et disparaître des radars. Rester, c’est t’entraîner fort en espérant une ouverture qui n’arrivera peut-être jamais.',
    category: 'transfer',
    tags: ['pret', 'temps_de_jeu', 'jeunesse'],
    rarity: 'common',
    weight: 13,
    ageMin: 17,
    ageMax: 23,
    cooldownSeasons: 3,
    prerequisites: [{ type: 'maxMinutesLastSeason', value: 900 }],
    choices: [
      choice({
        id: 'pret',
        label: 'Accepter le prêt et aller jouer',
        stance: 'ambitious',
        riskPreview: 'Du temps de jeu assuré, visibilité en berne.',
        immediate: [
          fx.flag('transfer_accepted'),
          fx.resource('moral', 5),
          fx.resource('reputationSportive', -4),
        ],
        delayed: [
          fx.delayed(1, [
            fx.stat('technique', 2),
            fx.stat('endurance', 1),
            fx.resource('confianceEntraineur', 5),
          ]),
        ],
        hidden: [fx.hidden('adaptabilite', 3), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'rester',
        label: 'Rester et te battre à l’entraînement',
        stance: 'prudent',
        riskPreview: 'Fierté intacte, banc probable.',
        immediate: [
          fx.resource('moral', -5),
          fx.resource('confianceEntraineur', 3),
          fx.chance(0.3, [fx.resource('forme', 4), fx.resource('reputationSportive', 3)]),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_ctr_prolonger_tot',
    title: 'Prolonger maintenant ou jouer la montre',
    body: 'Ton contrat expire dans dix-huit mois. Le directeur sportif pose une prolongation sur la table : salaire correct, pas mirobolant, sécurité immédiate. Ton agent te souffle d’attendre : une grosse saison et les offres pleuvront, ou tu partiras libre en position de force. Mais une blessure, une méforme, un nouveau coach, et la belle stratégie s’effondre. Le directeur veut une réponse avant la fin du mois.',
    category: 'contract',
    tags: ['prolongation', 'securite', 'pari'],
    rarity: 'common',
    weight: 14,
    ageMin: 18,
    ageMax: 36,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'prolonger',
        label: 'Signer la prolongation, sécuriser ta place',
        stance: 'prudent',
        riskPreview: 'Sécurité immédiate, gros coup envolé.',
        immediate: [
          fx.flag('contract_extended'),
          fx.cash(20000),
          fx.resource('moral', 4),
          fx.resource('confianceEntraineur', 5),
        ],
        hidden: [fx.hidden('ambition', -2), fx.hidden('constance', 2)],
      }),
      choice({
        id: 'attendre',
        label: 'Jouer la montre et miser sur ta saison',
        stance: 'high_risk',
        riskPreview: 'Jackpot possible, filet retiré.',
        immediate: [
          fx.resource('confianceEntraineur', -5),
          fx.resource('moral', -2),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.5, [fx.cash(45000), fx.resource('reputationSportive', 5)]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_ctr_clause_depart',
    title: 'La clause ou le salaire',
    body: 'Négociation finale de ton nouveau contrat. Le club te laisse un choix : un salaire plus élevé, mais aucune porte de sortie avant quatre ans ; ou un salaire réduit contre une clause de départ raisonnable, activable si un grand club se présente. Ton agent parle d’avenir, ta famille parle de stabilité. Le stylo est posé sur la table et le directeur sportif regarde sa montre.',
    category: 'contract',
    tags: ['clause', 'negociation'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 19,
    ageMax: 32,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'clause',
        label: 'Sacrifier du salaire pour la clause de départ',
        stance: 'ambitious',
        riskPreview: 'Porte ouverte, fiche de paie allégée.',
        immediate: [
          fx.flag('contract_signed'),
          fx.cash(8000),
          fx.resource('moral', 3),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'salaire',
        label: 'Prendre le gros salaire, verrouillé quatre ans',
        stance: 'financial',
        riskPreview: 'Confort assuré, horizon verrouillé.',
        immediate: [
          fx.flag('contract_signed'),
          fx.cash(35000),
          fx.resource('financesPersonnelles', 6),
        ],
        delayed: [
          fx.delayed(2, [fx.chance(0.4, [fx.resource('moral', -6)])]),
        ],
        hidden: [fx.hidden('ambition', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_ctr_renegociation_saison',
    title: 'Renégocier en pleine saison',
    body: 'Tu enchaînes les bons matchs et tu découvres que deux recrues moins utilisées gagnent le double de ton salaire. Ton agent propose de frapper fort : demander une revalorisation immédiate, en pleine saison, quitte à laisser filtrer ton mécontentement dans la presse. Le club déteste ce genre de méthode. Mais c’est peut-être le seul moment où le rapport de force penche de ton côté.',
    category: 'contract',
    tags: ['salaire', 'bras_de_fer'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 20,
    ageMax: 34,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'forcer',
        label: 'Exiger la revalorisation maintenant',
        stance: 'individualist',
        riskPreview: 'Salaire aligné ou direction braquée.',
        immediate: [
          fx.skillCheck(
            'resource',
            'reputationSportive',
            55,
            [fx.cash(25000), fx.flag('contract_extended'), fx.resource('moral', 5)],
            [
              fx.relation('coach', -8),
              fx.resource('cohesionVestiaire', -5),
              fx.relation('media', -4),
            ],
          ),
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'patienter',
        label: 'Attendre l’intersaison pour négocier',
        stance: 'prudent',
        riskPreview: 'Image préservée, argent différé.',
        immediate: [fx.resource('discipline', 3), fx.resource('moral', -3)],
        delayed: [fx.delayed(1, [fx.chance(0.6, [fx.cash(15000)])])],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_ctr_agent_interet',
    title: 'Ton agent a son propre plan',
    body: 'Ton agent insiste depuis des semaines pour un transfert vers un club de la Baie Lumen. Le projet sportif te parle moyennement, mais il jure que c’est l’étape parfaite. Puis tu apprends par un coéquipier que ce club verse aux agents des commissions parmi les plus grosses du championnat. Coïncidence ? Il t’a bien conseillé jusqu’ici. Mais qui sert-il vraiment sur ce coup-là ?',
    category: 'agent',
    tags: ['agent', 'confiance', 'transfert'],
    rarity: 'common',
    weight: 12,
    ageMin: 18,
    ageMax: 32,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'suivre',
        label: 'Lui faire confiance et accepter le transfert',
        stance: 'loyal',
        riskPreview: 'Étape peut-être parfaite, doute qui reste.',
        immediate: [
          fx.flag('transfer_accepted'),
          fx.cash(22000),
          fx.resource('moral', -3),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.45, [
              fx.resource('confianceEntraineur', -6),
              fx.resource('forme', -4),
            ]),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser et lui poser la question en face',
        stance: 'ethical',
        riskPreview: 'Contrôle repris, relation refroidie.',
        immediate: [fx.resource('moral', 3), fx.resource('discipline', 2)],
        delayed: [
          fx.delayed(1, [fx.chance(0.4, [fx.resource('reputationSportive', -3)])]),
        ],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_ctr_agent_requin',
    title: 'Le requin veut ta carrière',
    body: 'L’agent le plus redouté du championnat propose de te prendre dans son écurie. Ses clients signent les plus gros contrats du pays ; ses méthodes laissent des cadavres dans les couloirs des clubs. Ton agent actuel, lui, t’accompagne depuis tes seize ans — loyal, mais dépassé quand les sommes deviennent sérieuses. Changer maintenant, c’est trahir quelqu’un. Ne pas changer, c’est peut-être plafonner.',
    category: 'agent',
    tags: ['agent', 'loyaute', 'ambition'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 19,
    ageMax: 33,
    cooldownSeasons: 5,
    choices: [
      choice({
        id: 'requin',
        label: 'Signer avec le requin, viser le sommet',
        stance: 'individualist',
        riskPreview: 'Gros contrats en vue, méthodes qui éclaboussent.',
        immediate: [
          fx.flag('agent_all_in'),
          fx.relation('friends', -6),
          fx.resource('moral', -3),
        ],
        delayed: [
          fx.delayed(1, [
            fx.cash(30000),
            fx.chance(0.35, [fx.relation('media', -6)]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 4), fx.hidden('loyaute', -3)],
      }),
      choice({
        id: 'fidele',
        label: 'Rester fidèle à celui qui t’a lancé',
        stance: 'loyal',
        riskPreview: 'Confiance intacte, plafond incertain.',
        immediate: [
          fx.resource('moral', 4),
          fx.relation('friends', 5),
          fx.resource('bienEtre', 3),
        ],
        hidden: [fx.hidden('loyaute', 4), fx.hidden('ambition', -2)],
      }),
    ],
  }),
]
