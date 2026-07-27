import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes argent / sponsors — emplacement 2.
 * 4 dilemmes : 3 money, 1 sponsors.
 */
export const argentDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p5_money_invest_proche',
    title: 'Le projet en or de ton cousin',
    body: 'Ton cousin débarque avec un dossier sous le bras : un complexe de padel sur la Côte Brumeuse, « rendement garanti », des partenaires déjà « quasiment signés ». Il lui manque ta mise pour boucler le tour de table. C’est de la famille, et il t’a soutenu quand tu n’étais personne. Mais tu as déjà entendu des vestiaires entiers raconter comment ce genre d’histoire se termine.',
    category: 'money',
    tags: ['investissement', 'famille'],
    rarity: 'common',
    weight: 12,
    ageMin: 19,
    ageMax: 36,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'investir',
        label: 'Mettre la somme, faire confiance à la famille',
        stance: 'emotional',
        riskPreview: 'Famille soutenue, mise peut-être envolée.',
        immediate: [
          fx.flag('risky_investment'),
          fx.cash(-40000),
          fx.relation('family', 8),
        ],
        delayed: [
          fx.delayed(2, [
            fx.chance(0.35, [fx.cash(60000), fx.resource('financesPersonnelles', 8)]),
            fx.chance(0.4, [fx.resource('moral', -8), fx.relation('family', -8)]),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser poliment, protéger ton épargne',
        stance: 'financial',
        riskPreview: 'Épargne intacte, repas de famille glacials.',
        immediate: [
          fx.relation('family', -8),
          fx.resource('financesPersonnelles', 5),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_money_pret_coequipier',
    title: 'Il te demande 25 000 en liquide',
    body: 'Un coéquipier t’attrape après l’entraînement, la voix basse : il a besoin de 25 000, vite, sans passer par le club ni par sa banque. Il ne dit pas pourquoi et jure de rembourser avant la fin de la saison. Vous avez traversé des vestiaires entiers ensemble. Refuser, c’est peut-être l’abandonner dans quelque chose de grave. Accepter, c’est attacher ton argent à un secret que tu ne connais pas.',
    category: 'money',
    tags: ['pret', 'vestiaire', 'secret'],
    rarity: 'common',
    weight: 12,
    ageMin: 18,
    ageMax: 37,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'preter',
        label: 'Prêter la somme sans poser de questions',
        stance: 'loyal',
        riskPreview: 'Ami soulagé, remboursement incertain.',
        immediate: [
          fx.cash(-25000),
          fx.relation('teammates', 8),
          fx.debt('money_pret_coequipier', 'Le coéquipier doit rembourser 25 000', 1),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.55, [fx.cash(25000), fx.resource('moral', 5)]),
            fx.chance(0.3, [fx.relation('teammates', -6), fx.resource('moral', -6)]),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser mais proposer ton aide autrement',
        stance: 'ethical',
        riskPreview: 'Argent protégé, lien abîmé.',
        immediate: [
          fx.relation('teammates', -5),
          fx.resource('cohesionVestiaire', -3),
          fx.resource('financesPersonnelles', 4),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_money_sponsor_image',
    title: 'Le sponsor veut écrire ton personnage',
    body: 'Une marque de la Capitale Miroir propose un contrat impressionnant. En échange, elle veut tout piloter : tes tenues en interview, tes publications, tes prises de position — validées ligne par ligne par son agence. « Ton image nous appartient pendant trois ans », résume leur directrice sans sourciller. L’argent changerait ta vie. Le miroir qu’on te tend n’aurait plus grand-chose de toi.',
    category: 'sponsors',
    tags: ['sponsor', 'image'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 19,
    ageMax: 34,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'signer',
        label: 'Signer, encaisser, sourire sur commande',
        stance: 'financial',
        riskPreview: 'Compte rempli, image sous tutelle.',
        immediate: [
          fx.cash(55000),
          fx.relation('sponsors', 10),
          fx.resource('bienEtre', -5),
          fx.resource('moral', -3),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.35, [fx.relation('fans', -8), fx.resource('popularite', -5)]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser et garder la main sur ton image',
        stance: 'ethical',
        riskPreview: 'Liberté gardée, gros chèque envolé.',
        immediate: [
          fx.flag('sponsor_refuse'),
          fx.resource('moral', 4),
          fx.resource('bienEtre', 4),
          fx.relation('sponsors', -8),
        ],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_money_train_de_vie',
    title: 'La vie à crédit des soirs de victoire',
    body: 'Voitures de coéquipiers, montres qui circulent dans le vestiaire, additions à cinq chiffres les soirs de victoire : ton train de vie a doucement grimpé jusqu’à dépasser ce que tu gagnes vraiment. Ton conseiller t’a envoyé un tableau alarmant que tu n’as toujours pas ouvert. Continuer, c’est tenir ton rang dans le groupe. Freiner, c’est passer pour le radin — et regarder les autres vivre.',
    category: 'money',
    tags: ['train_de_vie', 'discipline'],
    rarity: 'common',
    weight: 12,
    ageMin: 18,
    ageMax: 33,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'continuer',
        label: 'Tenir ton rang, on verra plus tard',
        stance: 'emotional',
        riskPreview: 'Statut assuré, tableau toujours pas ouvert.',
        immediate: [
          fx.cash(-18000),
          fx.relation('teammates', 5),
          fx.resource('moral', 4),
          fx.resource('financesPersonnelles', -8),
        ],
        delayed: [
          fx.delayed(2, [
            fx.chance(0.5, [
              fx.resource('financesPersonnelles', -10),
              fx.resource('bienEtre', -6),
            ]),
          ]),
        ],
        hidden: [fx.hidden('constance', -2)],
      }),
      choice({
        id: 'discipline',
        label: 'Ouvrir le tableau et serrer la vis',
        stance: 'financial',
        riskPreview: 'Comptes assainis, étiquette de radin.',
        immediate: [
          fx.resource('financesPersonnelles', 8),
          fx.resource('discipline', 4),
          fx.relation('teammates', -4),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('constance', 2)],
      }),
    ],
  }),
]
