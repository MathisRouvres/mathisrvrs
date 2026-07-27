import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes coach — emplacement 1.
 * 8 dilemmes : autorité, confiance, promesses et rapports de force avec le staff.
 */
export const coachDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p5_coach_seance_humiliation',
    title: 'Détruit devant tout le monde',
    body: 'En pleine séance, le coach arrête tout et te prend pour cible. Pendant cinq longues minutes, il démonte chacun de tes choix devant le groupe, voix qui porte, exemples à l’appui. Certains coéquipiers fixent leurs crampons, gênés. Tu sens la colère monter. Répondre maintenant, c’est déclarer la guerre. Encaisser, c’est peut-être devenir sa cible préférée. Le silence du terrain n’attend que ta réaction.',
    category: 'coach',
    tags: ['autorite', 'humiliation'],
    rarity: 'common',
    weight: 14,
    ageMin: 16,
    ageMax: 38,
    positions: null,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'encaisser',
        label: 'Encaisser sans un mot et finir la séance',
        stance: 'prudent',
        riskPreview: 'Orage évité, statut peut-être fragilisé.',
        immediate: [
          fx.resource('discipline', 4),
          fx.resource('moral', -5),
          fx.relation('coach', 3),
        ],
        hidden: [fx.hidden('resistancePression', 2), fx.hidden('ambition', -1)],
      }),
      choice({
        id: 'repliquer',
        label: 'Répliquer devant tout le groupe',
        stance: 'emotional',
        riskPreview: 'Respect possible, guerre ouverte possible.',
        immediate: [
          fx.flag('coach_feud'),
          fx.relation('coach', -8),
          fx.skillCheck(
            'stat',
            'sangFroid',
            50,
            [fx.relation('teammates', 6), fx.resource('reputationSportive', 4)],
            [fx.resource('discipline', -6), fx.resource('moral', -4)],
          ),
        ],
        hidden: [fx.hidden('resistancePression', 3), fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'prive',
        label: 'Frapper à son bureau le soir même',
        stance: 'ethical',
        riskPreview: 'Explication franche, issue incertaine.',
        immediate: [
          fx.resource('moral', 2),
          fx.skillCheck(
            'hidden',
            'professionnalisme',
            45,
            [fx.relation('coach', 7), fx.resource('moral', 3)],
            [fx.relation('coach', -4), fx.resource('moral', -3)],
          ),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('constance', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_coach_jouer_diminue',
    title: 'Il te veut sur la feuille, même diminué',
    body: 'Ta cuisse te lance depuis dix jours et le staff médical préconise le repos. Mais le coach entre dans la salle de soins. Trois absents, un match charnière, il a besoin de toi, même à soixante-dix pour cent. Il promet une gestion intelligente, des minutes comptées. Le médecin fronce les sourcils sans le contredire. Ton corps dit non. Ta place dans le onze se joue peut-être là.',
    category: 'coach',
    tags: ['corps', 'sacrifice'],
    rarity: 'common',
    weight: 13,
    ageMin: 17,
    ageMax: 38,
    positions: null,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'jouer',
        label: 'Serrer les dents et jouer le match',
        stance: 'loyal',
        riskPreview: 'Coach conquis, cuisse en sursis.',
        immediate: [
          fx.relation('coach', 7),
          fx.resource('fatigue', 8),
          fx.chance(0.35, [fx.resource('sante', -14), fx.resource('forme', -6)]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 3), fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'forfait',
        label: 'Écouter le médecin et déclarer forfait',
        stance: 'prudent',
        riskPreview: 'Corps protégé, coach déçu.',
        immediate: [
          fx.resource('sante', 6),
          fx.relation('coach', -6),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('constance', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_coach_nouveau_cycle',
    title: 'Le nouveau coach ne te calcule pas',
    body: 'Nouveau coach, nouvelles idées, et ton nom nulle part. Depuis son arrivée, il ne t’a pas adressé trois phrases. Aux séances, tu tournes avec les remplaçants, et les schémas affichés au tableau se construisent sans toi. Ton agent s’agite, ta famille s’inquiète. Il reste des mois avant le mercato. Tu peux baisser la tête et bosser en silence, ou aller chercher l’explication que personne ne veut te donner.',
    category: 'coach',
    tags: ['hierarchie', 'nouveau_coach'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 18,
    ageMax: 36,
    positions: null,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'bosser',
        label: 'Bosser en silence et retourner la situation',
        stance: 'ambitious',
        riskPreview: 'Long combat, résultat pas garanti.',
        immediate: [
          fx.resource('discipline', 4),
          fx.resource('moral', -4),
          fx.stat('endurance', 1),
        ],
        delayed: [
          fx.delayed(1, [
            fx.skillCheck(
              'hidden',
              'constance',
              45,
              [fx.relation('coach', 8), fx.resource('reputationSportive', 4)],
              [fx.resource('moral', -5)],
            ),
          ]),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'bureau',
        label: 'Forcer la porte de son bureau',
        stance: 'individualist',
        riskPreview: 'Clarté immédiate, réponse peut-être brutale.',
        immediate: [
          fx.skillCheck(
            'stat',
            'sangFroid',
            52,
            [fx.relation('coach', 6), fx.resource('moral', 4)],
            [fx.relation('coach', -6), fx.resource('discipline', -3)],
          ),
        ],
        hidden: [fx.hidden('ambition', 2), fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_coach_marquage_ingrat',
    title: 'Une mission que personne ne veut',
    body: 'Veille de quart de finale. Le coach t’annonce ton rôle. Suivre le meneur adverse partout, quatre-vingt-dix minutes, sans jamais toucher un ballon propre. Un travail de l’ombre qui ne remplit pas les statistiques et que les observateurs ne retiennent jamais. Tu rêvais d’autre chose pour un soir pareil. Il te regarde droit dans les yeux. Pour lui, accepter cette mission, c’est prouver que tu es un joueur d’équipe.',
    category: 'coach',
    tags: ['tactique', 'sacrifice'],
    rarity: 'common',
    weight: 12,
    ageMin: 17,
    ageMax: 37,
    positions: null,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'accepter',
        label: 'Accepter et étouffer le meneur adverse',
        stance: 'loyal',
        riskPreview: 'Confiance gagnée, éclat personnel sacrifié.',
        immediate: [
          fx.relation('coach', 6),
          fx.stat('defense', 1),
          fx.stat('tactique', 1),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'plaider',
        label: 'Plaider pour un rôle à ta mesure',
        stance: 'ambitious',
        riskPreview: 'Jeu préservé, coach peut-être vexé.',
        immediate: [
          fx.skillCheck(
            'resource',
            'confianceEntraineur',
            55,
            [fx.resource('moral', 5), fx.resource('reputationSportive', 3)],
            [fx.relation('coach', -7), fx.resource('discipline', -3)],
          ),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_coach_oreille_du_staff',
    title: 'Le coach veut des oreilles au vestiaire',
    body: 'Convocation discrète dans son bureau. Le coach sent que le vestiaire lui échappe et te propose un rôle trouble. Lui rapporter ce qui se dit quand la porte se ferme, les moqueries, les frondes qui couvent. En échange, il parle de minutes, de responsabilités, d’avenir. Personne ne saura, jure-t-il. Tu ressors avec sa proposition qui colle aux doigts. Trahir le groupe ou décevoir l’homme qui compose l’équipe.',
    category: 'coach',
    tags: ['loyaute', 'secret'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 18,
    ageMax: 36,
    positions: null,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'refuser',
        label: 'Refuser net, quoi qu’il t’en coûte',
        stance: 'ethical',
        riskPreview: 'Conscience tranquille, faveur perdue.',
        immediate: [fx.relation('coach', -6), fx.resource('moral', 3)],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('professionnalisme', 1)],
      }),
      choice({
        id: 'accepter',
        label: 'Accepter de le renseigner discrètement',
        stance: 'individualist',
        riskPreview: 'Faveur du coach, secret encombrant.',
        immediate: [fx.relation('coach', 8), fx.resource('moral', -3)],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.4, [
              fx.relation('teammates', -12),
              fx.resource('cohesionVestiaire', -8),
            ]),
          ]),
        ],
        hidden: [fx.hidden('loyaute', -4), fx.hidden('ambition', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_coach_promesse_envolee',
    title: 'La promesse s’est envolée',
    body: 'Cet été, il t’avait promis un rôle central. Tu as refusé un transfert sur cette parole. Trois mois plus tard, tu cumules les bouts de matchs et les tribunes, sans explication. À l’entraînement, il te félicite, puis aligne un autre onze. Ton agent te rappelle chaque semaine que tu avais le choix. La parole d’un coach vaut-elle encore quelque chose, et que vaut la tienne si tu ne dis rien ?',
    category: 'coach',
    tags: ['promesse', 'temps_de_jeu'],
    rarity: 'common',
    weight: 13,
    ageMin: 19,
    ageMax: 37,
    positions: null,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'agent',
        label: 'Lâcher ton agent et exiger des comptes',
        stance: 'individualist',
        riskPreview: 'Rapport de force engagé, retour de bâton possible.',
        immediate: [
          fx.relation('coach', -7),
          fx.resource('moral', 4),
          fx.chance(0.3, [fx.relation('media', -4)]),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'terrain',
        label: 'Ravaler ta colère et répondre sur le terrain',
        stance: 'prudent',
        riskPreview: 'Dignité préservée, statu quo qui dure.',
        immediate: [fx.resource('discipline', 4), fx.resource('moral', -5)],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.5, [
              fx.relation('coach', 6),
              fx.resource('reputationSportive', 3),
            ]),
          ]),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_coach_fauteuil_ejectable',
    title: 'Trois défaites et un fauteuil qui brûle',
    body: 'Trois défaites de rang et la rumeur enfle. La direction consulte, les journalistes campent devant le centre d’entraînement, et le nom du prochain coach circule déjà. Le tien, lui, t’a lancé, défendu, construit. Un journaliste te tend un micro. Un mot de soutien peut peser dans la balance, ou te lier à un homme déjà condamné. Le silence, lui, ne pardonne rien mais n’engage personne.',
    category: 'coach',
    tags: ['crise', 'loyaute'],
    rarity: 'rare',
    weight: 4,
    ageMin: 18,
    ageMax: 38,
    positions: null,
    cooldownSeasons: 5,
    choices: [
      choice({
        id: 'soutenir',
        label: 'Le défendre publiquement, au micro',
        stance: 'loyal',
        riskPreview: 'Loyauté affichée, avenir lié au sien.',
        immediate: [
          fx.flag('coach_ally'),
          fx.relation('coach', 10),
          fx.relation('media', 3),
          fx.chance(0.35, [fx.resource('reputationSportive', -4)]),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.45, [
              fx.resource('reputationSportive', 5),
              fx.resource('moral', 4),
            ]),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 4)],
      }),
      choice({
        id: 'silence',
        label: 'Botter en touche et rester neutre',
        stance: 'prudent',
        riskPreview: 'Position sûre, loyauté questionnée.',
        immediate: [fx.relation('coach', -4), fx.resource('moral', -2)],
        hidden: [fx.hidden('loyaute', -3), fx.hidden('ambition', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_coach_main_tendue',
    title: 'Il te tend la main',
    body: 'Depuis votre clash, c’est la guerre froide. Des mois de regards évités, de compositions où ton nom apparaît en dernier. Ce matin, le coach t’attend seul dans le couloir. Il reconnaît, à demi-mot, être allé trop loin, et te propose de repartir de zéro avant le sprint final de la saison. Sa main est tendue. Derrière elle, il y a ta fierté, et tous ceux qui t’ont vu tenir tête.',
    category: 'coach',
    tags: ['reconciliation', 'fierte'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 17,
    ageMax: 38,
    positions: null,
    cooldownSeasons: 4,
    unique: true,
    prerequisites: [{ type: 'hasFlag', key: 'coach_feud' }],
    choices: [
      choice({
        id: 'serrer',
        label: 'Serrer cette main et tourner la page',
        stance: 'loyal',
        riskPreview: 'Paix retrouvée, fierté ravalée.',
        immediate: [
          fx.removeFlag('coach_feud'),
          fx.relation('coach', 8),
          fx.relation('teammates', -3),
          fx.resource('moral', 3),
        ],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Rester debout, sans rien lui devoir',
        stance: 'individualist',
        riskPreview: 'Fierté intacte, guerre qui continue.',
        immediate: [
          fx.relation('coach', -6),
          fx.relation('teammates', 4),
          fx.resource('moral', 2),
        ],
        hidden: [
          fx.hidden('resistancePression', 3),
          fx.hidden('ambition', 2),
          fx.hidden('professionnalisme', -2),
        ],
      }),
    ],
  }),
]
