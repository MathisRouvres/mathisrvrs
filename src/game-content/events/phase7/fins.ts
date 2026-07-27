import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Fins alternatives — 6 dilemmes career_end qui peuvent changer la fin
 * de carrière : entraîneur-joueur, exil doré, adieu international,
 * refus de la retraite, reconversion médiatique, baroud d’honneur.
 * Chaque dilemme pose wants_retirement sur au moins un choix ou
 * modifie fortement la trajectoire (retirement_path, effets lourds).
 */
export const finsAlternativesDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p7_end_entraineur_joueur',
    title: 'Entraîneur-joueur au club de tes débuts',
    body: 'Le club qui t’a formé traverse une saison noire : entraîneur parti, vestiaire à la dérive, tribunes qui se vident. Le président t’appelle en personne : il te veut comme entraîneur-joueur, dès janvier. Jouer encore, apprendre le métier d’après, et sauver la maison qui t’a tout appris — trois vies en une, dans un stade où chaque couloir connaît ton nom. Ton club actuel, lui, t’offre le confort d’une fin tranquille.',
    category: 'career_end',
    tags: ['fin_alternative', 'formation'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 32,
    ageMax: 39,
    unique: true,
    echoes: [
      { flag: 'home_return', text: 'Tu étais déjà revenu au club de tes débuts il y a {years} saisons. Cette maison ne t’a jamais lâché.' },
    ],
    choices: [
      choice({
        id: 'double_role',
        label: 'Accepter le double rôle, sauver la maison',
        stance: 'loyal',
        riskPreview: 'Deux métiers de front, aucun filet.',
        immediate: [
          fx.flag('retirement_path'),
          fx.stat('leadership', 3),
          fx.stat('tactique', 2),
          fx.resource('moral', 5),
          fx.resource('fatigue', 10),
          fx.cash(-20000),
        ],
        delayed: [
          fx.delayed(1, [
            fx.skillCheck(
              'stat',
              'leadership',
              55,
              [fx.resource('reputationSportive', 8), fx.resource('popularite', 6)],
              [fx.resource('moral', -6), fx.resource('reputationSportive', -4)],
            ),
          ]),
        ],
        hidden: [fx.hidden('adaptabilite', 4), fx.hidden('loyaute', 4)],
      }),
      choice({
        id: 'confort',
        label: 'Rester finir tranquillement dans ton club',
        stance: 'prudent',
        riskPreview: 'Une fin douce, une dette du cœur impayée.',
        immediate: [
          fx.resource('bienEtre', 5),
          fx.resource('sante', 3),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('loyaute', -3)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_end_exotique',
    title: 'L’offre dorée de l’Archipel du Sel',
    body: 'La ligue dorée de l’Archipel du Sel a fait ses calculs : ton nom remplit encore des stades. L’offre : deux saisons, salaire triplé, capitanat garanti — et un niveau sportif qui ne te fera plus jamais progresser. {agent} parle d’une retraite dorée pour trois générations. Tes supporters, eux, rêvent de te voir raccrocher sous leurs couleurs. Entre l’or, l’honneur et un compromis à inventer, il faut trancher.',
    category: 'career_end',
    tags: ['fin_alternative', 'exil'],
    rarity: 'rare',
    weight: 4,
    ageMin: 31,
    ageMax: 38,
    unique: true,
    choices: [
      choice({
        id: 'or',
        label: 'Signer deux saisons, sécuriser trois générations',
        stance: 'financial',
        riskPreview: 'La fortune assurée, la fin de l’histoire d’amour.',
        immediate: [
          fx.cash(90000),
          fx.resource('financesPersonnelles', 15),
          fx.resource('reputationSportive', -8),
          fx.relation('fans', -8),
        ],
        delayed: [fx.delayed(1, [fx.resource('forme', -5), fx.resource('moral', -4)])],
        hidden: [fx.hidden('ambition', -3)],
      }),
      choice({
        id: 'honneur',
        label: 'Finir dignement sous tes couleurs',
        stance: 'loyal',
        riskPreview: 'L’honneur sauf, l’or refusé ne repassera pas.',
        immediate: [
          fx.flag('retirement_path'),
          fx.relation('fans', 8),
          fx.resource('reputationSportive', 4),
          fx.resource('moral', 4),
        ],
        delayed: [fx.delayed(1, [fx.resource('moral', -3)])],
        hidden: [fx.hidden('loyaute', 4), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'pige',
        label: 'Une seule saison là-bas, clause de retour',
        stance: 'prudent',
        riskPreview: 'Le compromis du milieu, qui peut déplaire partout.',
        immediate: [
          fx.cash(45000),
          fx.resource('reputationSportive', -4),
          fx.relation('fans', -4),
        ],
        delayed: [
          fx.delayed(1, [fx.flag('retirement_path'), fx.resource('popularite', 3)]),
        ],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_end_selection_adieu',
    title: 'Une dernière danse en sélection',
    body: 'La fédération te propose une sortie de légende : un match d’adieu officiel, stade de la capitale, ton numéro à l’honneur, tout un pays debout. Mais le sélectionneur t’appelle en privé : si tu restes disponible sans cérémonie, il te garde dans ses plans pour le prochain tournoi. L’adieu grandiose ferme la porte pour toujours. L’attente silencieuse peut finir sur un banc, sans hommage ni tournoi.',
    category: 'career_end',
    tags: ['fin_alternative', 'selection'],
    rarity: 'rare',
    weight: 4,
    ageMin: 32,
    ageMax: 39,
    unique: true,
    prerequisites: [{ type: 'hasFlag', key: 'national_regular' }],
    echoes: [
      { flag: 'national_regular', text: '{years} saisons que tu portes ce groupe. La sélection te doit une sortie à ta mesure.' },
    ],
    choices: [
      choice({
        id: 'ceremonie',
        label: 'Accepter le match d’adieu, refermer en beauté',
        stance: 'emotional',
        riskPreview: 'Un hommage inoubliable, puis le vide.',
        immediate: [
          fx.flag('retirement_path'),
          fx.resource('popularite', 10),
          fx.relation('fans', 10),
          fx.resource('bienEtre', 6),
          fx.resource('moral', 6),
        ],
        delayed: [fx.delayed(1, [fx.resource('moral', -4)])],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'disponible',
        label: 'Rester disponible, viser un dernier tournoi',
        stance: 'ambitious',
        riskPreview: 'Un rêve encore ouvert, un hommage envolé.',
        immediate: [fx.resource('moral', 3), fx.resource('fatigue', 4)],
        delayed: [
          fx.delayed(1, [
            fx.skillCheck(
              'resource',
              'forme',
              55,
              [fx.resource('reputationSportive', 6), fx.resource('moral', 5)],
              [fx.resource('moral', -6), fx.resource('popularite', -4)],
            ),
          ]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('grandsMatchs', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_end_corps_brise',
    title: 'Le corps dit stop, pas toi',
    body: 'Le verdict médical tient en une phrase : continuer, c’est hypothéquer le reste de ta vie. L’assurance propose une sortie financière propre, le club une reconversion immédiate dans l’encadrement. Mais un médecin indépendant défend un protocole expérimental, et un club modeste est prêt à t’offrir un temps de jeu sur mesure. Tout le monde a décidé pour toi. Reste à savoir si tu signes.',
    category: 'career_end',
    tags: ['fin_alternative', 'corps'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 26,
    ageMax: 38,
    unique: true,
    prerequisites: [{ type: 'hasFlag', key: 'career_crisis' }],
    echoes: [
      { flag: 'career_crisis', text: 'La crise qui a failli tout emporter il y a {years} saisons n’est jamais vraiment partie.' },
      { flag: 'chronic_injury', text: 'Cette douleur chronique t’accompagne depuis {years} saisons. Elle a fini par avoir voix au chapitre.' },
    ],
    choices: [
      choice({
        id: 'protocole',
        label: 'Refuser la retraite, suivre le protocole',
        stance: 'resilient',
        riskPreview: 'Jouer encore, contre l’avis de tous.',
        immediate: [
          fx.resource('moral', 6),
          fx.resource('sante', -5),
          fx.cash(-30000),
        ],
        delayed: [
          fx.delayed(1, [
            fx.skillCheck(
              'hidden',
              'resistancePression',
              55,
              [
                fx.resource('forme', 6),
                fx.resource('reputationSportive', 6),
                fx.resource('bienEtre', 4),
              ],
              [fx.resource('sante', -10), fx.flag('wants_retirement')],
            ),
          ]),
        ],
        hidden: [fx.hidden('resistancePression', 3), fx.hidden('fragilitePhysique', 2)],
      }),
      choice({
        id: 'sortie_propre',
        label: 'Accepter la fin, signer la sortie propre',
        stance: 'professional',
        riskPreview: 'La raison l’emporte, le deuil commence.',
        immediate: [
          fx.flag('wants_retirement'),
          fx.cash(40000),
          fx.resource('bienEtre', 6),
          fx.resource('sante', 4),
          fx.resource('moral', -6),
        ],
        hidden: [fx.hidden('adaptabilite', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_end_consultant',
    title: 'Le micro ou le silence',
    body: 'La fin approche et deux avenirs se disputent ta signature. La grande chaîne sportive t’offre un fauteuil de consultant aux côtés de {journaliste} : lumière, salaire confortable, et ton avis chaque week-end dans tous les salons du pays. L’autre voie n’a pas de contrat : disparaître des radars, une maison face à la mer, plus un seul micro. Deux façons d’exister après le ballon. Aucune ne se rattrape.',
    category: 'career_end',
    tags: ['fin_alternative', 'reconversion'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 33,
    ageMax: 39,
    unique: true,
    echoes: [
      { flag: 'retirement_path', text: 'L’après, tu le prépares depuis {years} saisons. Le moment est venu de choisir sa forme.' },
    ],
    choices: [
      choice({
        id: 'micro',
        label: 'Prendre le fauteuil aux côtés de {journaliste}',
        stance: 'media_savvy',
        riskPreview: 'La lumière continue, les anciens frères jugés.',
        immediate: [
          fx.flag('wants_retirement'),
          fx.relation('media', 8),
          fx.resource('popularite', 8),
          fx.cash(25000),
          fx.relation('teammates', -4),
        ],
        hidden: [fx.hidden('adaptabilite', 3)],
      }),
      choice({
        id: 'radars',
        label: 'Disparaître des radars, face à la mer',
        stance: 'emotional',
        riskPreview: 'La paix totale, l’oubli qui va avec.',
        immediate: [
          fx.flag('wants_retirement'),
          fx.resource('bienEtre', 10),
          fx.relation('family', 8),
          fx.resource('popularite', -8),
          fx.relation('media', -6),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_end_remontee',
    title: 'Un dernier étage à remonter',
    body: 'Un géant déchu du championnat vient de sombrer à l’étage inférieur. Sa direction ne veut qu’un homme pour mener la remontée : toi, brassard au bras, dans des stades pleins qui n’ont rien oublié. Salaire réduit, pression immense, dernier défi. En face, ton club te propose une saison d’adieu paisible dans l’élite, hommages garantis. La légende s’écrit rarement dans le confort.',
    category: 'career_end',
    tags: ['fin_alternative', 'baroud'],
    rarity: 'rare',
    weight: 4,
    ageMin: 33,
    ageMax: 39,
    unique: true,
    echoes: [
      { flag: 'derby_hero', text: 'Le héros du derby d’il y a {years} saisons sait ce qu’un stade debout peut donner.' },
      { flag: 'capitaine_un_soir', text: 'Un soir, il y a {years} saisons, un brassard tombé dans tes mains t’avait révélé.' },
    ],
    choices: [
      choice({
        id: 'baroud',
        label: 'Prendre le brassard du géant déchu',
        stance: 'ambitious',
        riskPreview: 'Une légende possible, un naufrage aussi.',
        immediate: [
          fx.flag('retirement_path'),
          fx.stat('leadership', 3),
          fx.cash(-25000),
          fx.resource('fatigue', 8),
        ],
        delayed: [
          fx.delayed(1, [
            fx.skillCheck(
              'stat',
              'leadership',
              60,
              [
                fx.resource('reputationSportive', 10),
                fx.resource('popularite', 10),
                fx.relation('fans', 12),
                fx.flag('wants_retirement'),
              ],
              [fx.resource('moral', -8), fx.resource('reputationSportive', -4)],
            ),
          ]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'paisible',
        label: 'Choisir la saison d’adieu dans l’élite',
        stance: 'prudent',
        riskPreview: 'Des hommages garantis, une question pour toujours.',
        immediate: [
          fx.flag('wants_retirement'),
          fx.resource('bienEtre', 6),
          fx.resource('popularite', 4),
          fx.relation('fans', 5),
          fx.resource('moral', -2),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('ambition', -2)],
      }),
    ],
  }),
]
