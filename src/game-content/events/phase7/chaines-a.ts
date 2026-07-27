import { dilemma, choice, chainEpisode, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Chaînes narratives phase 7 (lot A) — 4 histoires, 16 événements.
 * douleur (4) : start → ep2 (+1) → ep3 (+1/+2) → ep4 (+2).
 * froid (5) : start → ep2 (+1) → [presse] ep3 (+1) → ep5 (+1/+2)
 *             ou [terrain] ep4 (+2).
 * amitie (4) : start → [couvrir] ep2 (+2) → ep3 (+2)
 *              ou [verite] ep4 (+2).
 * agent (3) : start → ep2 (+1) → ep3 (+1).
 * Flags posés : chronic_injury, chronic_managed, career_crisis,
 * coach_war, friendship_deep, agent_crisis.
 * Flags lus en écho : coach_feud, defended_teammate, agent_all_in.
 */
export const chainesADilemmas: DilemmaDefinition[] = [
  // ——— Chaîne 1 : la blessure chronique ———
  dilemma({
    id: 'p7_chain_douleur_start',
    title: 'La douleur que tu tais',
    body: 'Depuis six semaines, ton tendon d’Achille te lance à chaque accélération. Le médecin du club est clair : huit semaines d’arrêt et un protocole complet, sinon la douleur reviendra plus fort. Mais la saison bascule maintenant : ta place de titulaire, la course au titre, tout se joue ce mois-ci. Le staff te laisse décider. Ton corps demande du temps, ta carrière n’en donne pas.',
    category: 'injury',
    tags: ['blessure', 'corps', 'chronique'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 18,
    ageMax: 34,
    unique: true,
    choices: [
      choice({
        id: 'precipiter',
        label: 'Écourter les soins et rejouer tout de suite',
        stance: 'high_risk',
        riskPreview: 'Ta place sauvée, ton tendon en sursis.',
        immediate: [
          fx.resource('forme', 4),
          fx.resource('confianceEntraineur', 5),
          fx.resource('sante', -6),
          fx.flag('chronic_injury'),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_douleur_ep2')])],
        hidden: [fx.hidden('fragilitePhysique', 3), fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'soigner',
        label: 'Suivre le protocole complet, quitte à disparaître',
        stance: 'prudent',
        riskPreview: 'Corps réparé, place de titulaire en jeu.',
        immediate: [
          fx.resource('sante', 8),
          fx.resource('forme', -5),
          fx.resource('confianceEntraineur', -4),
          fx.resource('reputationSportive', -3),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('constance', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_douleur_ep2',
    previousEventId: 'p7_chain_douleur_start',
    title: 'Le tendon se rappelle à toi',
    body: 'Une saison a passé et la douleur est revenue s’installer, sourde, chaque matin d’après-match. Tu la caches au staff derrière des étirements et des grimaces contrôlées. Le médecin du club n’est pas dupe : il propose un grand bilan, avec le risque d’une longue indisponibilité si les images sont mauvaises. Les infiltrations, elles, permettent de tenir. Personne n’en saurait rien. Jusqu’à quand ?',
    tags: ['blessure', 'chronique'],
    echoes: [
      {
        flag: 'chronic_injury',
        text: 'Cette douleur vient de la blessure que tu avais décidé de précipiter, il y a {years} saisons.',
      },
    ],
    choices: [
      choice({
        id: 'infiltrations',
        label: 'Masquer la douleur à coups d’infiltrations',
        stance: 'high_risk',
        riskPreview: 'Tu joues, mais le corps encaisse en silence.',
        immediate: [
          fx.resource('forme', 3),
          fx.resource('sante', -6),
          fx.resource('fatigue', 5),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_douleur_ep3')])],
        hidden: [
          fx.hidden('fragilitePhysique', 3),
          fx.hidden('professionnalisme', -2),
        ],
      }),
      choice({
        id: 'bilan',
        label: 'Accepter le grand bilan médical',
        stance: 'prudent',
        riskPreview: 'La vérité sur ton corps, quelle qu’elle soit.',
        immediate: [
          fx.resource('sante', 4),
          fx.resource('confianceEntraineur', -3),
          fx.resource('moral', -4),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_douleur_ep3')])],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_douleur_ep3',
    previousEventId: 'p7_chain_douleur_ep2',
    title: 'Le verdict du spécialiste',
    body: 'Le spécialiste pose les images sur la table et ne maquille rien : le tendon est usé, la douleur ne partira plus jamais vraiment. Trois routes s’ouvrent. Apprendre à vivre avec, en aménageant tout : entraînements, minutes, calendrier. Tenter l’opération, longue et incertaine à ton âge. Ou continuer comme avant, en faisant semblant, tant que le corps veut bien suivre. Il attend ta réponse.',
    tags: ['blessure', 'chronique', 'verdict'],
    rarity: 'rare',
    echoes: [
      {
        flag: 'chronic_injury',
        text: '{years} saisons que ce tendon te lance, depuis ce retour que tu avais voulu précipiter.',
      },
    ],
    choices: [
      choice({
        id: 'gestion',
        label: 'Bâtir ta carrière autour de la douleur',
        stance: 'resilient',
        riskPreview: 'Moins de minutes, mais des saisons en plus.',
        immediate: [
          fx.flag('chronic_managed'),
          fx.resource('sante', 5),
          fx.resource('bienEtre', 4),
          fx.resource('forme', -3),
          fx.resource('reputationSportive', -2),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'operation',
        label: 'Tenter l’opération, six mois loin des terrains',
        stance: 'prudent',
        riskPreview: 'Tout réparer, ou tout perdre sur une table.',
        immediate: [
          fx.cash(-15000),
          fx.resource('forme', -8),
          fx.resource('moral', -4),
          fx.skillCheck(
            'resource',
            'sante',
            50,
            [fx.resource('sante', 10), fx.flag('chronic_managed')],
            [fx.resource('sante', -5), fx.flag('career_crisis')],
          ),
        ],
        hidden: [fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'nier',
        label: 'Continuer comme si de rien n’était',
        stance: 'ambitious',
        riskPreview: 'Le haut niveau tout de suite, la suite au corps.',
        immediate: [
          fx.resource('forme', 3),
          fx.resource('reputationSportive', 3),
          fx.resource('sante', -6),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_douleur_ep4')])],
        hidden: [fx.hidden('fragilitePhysique', 3), fx.hidden('ambition', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_douleur_ep4',
    previousEventId: 'p7_chain_douleur_ep3',
    title: 'Le corps dit stop',
    body: 'C’est arrivé sans contact, à l’échauffement : une décharge, puis plus rien. Le tendon a lâché devant tout le monde. Les examens confirment ce que tu savais déjà au fond de toi : de longs mois d’arrêt, un retour incertain, une carrière qui vacille. Le club parle prudemment de « réévaluation ». À toi de choisir comment traverser la plus grande crise de ta vie de joueur.',
    tags: ['blessure', 'crise'],
    rarity: 'rare',
    echoes: [
      {
        flag: 'chronic_injury',
        text: 'Tout part de ce retour précipité, il y a {years} saisons. Ton tendon n’a jamais oublié.',
      },
    ],
    choices: [
      choice({
        id: 'reconstruire',
        label: 'Une saison blanche pour tout reconstruire',
        stance: 'resilient',
        riskPreview: 'Disparaître longtemps pour revenir vraiment.',
        immediate: [
          fx.flag('career_crisis'),
          fx.resource('reputationSportive', -6),
          fx.resource('moral', -4),
          fx.resource('bienEtre', 3),
        ],
        delayed: [
          fx.delayed(1, [
            fx.resource('sante', 10),
            fx.resource('forme', 6),
            fx.flag('chronic_managed'),
          ]),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('resistancePression', 3)],
      }),
      choice({
        id: 'forcer',
        label: 'Revenir dans trois mois, coûte que coûte',
        stance: 'high_risk',
        riskPreview: 'Un retour express, sur un fil très fin.',
        immediate: [
          fx.flag('career_crisis'),
          fx.resource('confianceEntraineur', 4),
          fx.resource('sante', -8),
          fx.chance(0.5, [fx.resource('forme', -8), fx.resource('moral', -6)]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 4), fx.hidden('ambition', 2)],
      }),
    ],
  }),

  // ——— Chaîne 2 : la guerre froide avec {coach} ———
  dilemma({
    id: 'p7_chain_froid_start',
    title: 'Le plan de {coach} te sacrifie',
    body: 'Nouveau système, nouvelles consignes : dans le plan de {coach}, ton rôle se résume désormais à courir pour les autres. En réunion vidéo, devant tout le groupe, il te cite comme exemple de « ceux qui se croient au-dessus du projet ». Les regards se tournent vers toi. Tu peux répondre maintenant, devant témoins, ou baisser la tête et appliquer. Chaque option a un prix.',
    category: 'coach',
    tags: ['coach', 'conflit', 'vestiaire'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 19,
    ageMax: 35,
    unique: true,
    echoes: [
      {
        flag: 'coach_feud',
        text: 'Un air de déjà-vu : il y a {years} saisons, un autre bras de fer avec un coach avait marqué ta carrière.',
      },
    ],
    choices: [
      choice({
        id: 'defier',
        label: 'Contester le plan devant tout le groupe',
        stance: 'individualist',
        riskPreview: 'Le respect de certains, la rancune d’un seul.',
        immediate: [
          fx.flag('coach_war'),
          fx.relation('coach', -8),
          fx.relation('teammates', 4),
          fx.resource('moral', 4),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_froid_ep2')])],
        hidden: [fx.hidden('ambition', 2), fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'encaisser',
        label: 'Encaisser en silence et appliquer le plan',
        stance: 'professional',
        riskPreview: 'La paix du groupe, ta fierté en travers.',
        immediate: [
          fx.relation('coach', 4),
          fx.resource('discipline', 4),
          fx.resource('moral', -5),
        ],
        hidden: [
          fx.hidden('professionnalisme', 3),
          fx.hidden('resistancePression', 2),
        ],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_froid_ep2',
    previousEventId: 'p7_chain_froid_start',
    title: 'La liste tombe, ton nom n’y est plus',
    body: 'Une saison que la guerre froide dure. Ce matin, la feuille du derby contre {club_rival} est affichée : ton nom n’y figure pas, sans un mot d’explication. Le vestiaire évite ton regard. À la sortie de l’entraînement, {journaliste} t’attend, micro discret : « Une réaction sur ta mise à l’écart ? » Une phrase peut tout embraser. Le silence peut tout enterrer.',
    tags: ['coach', 'conflit', 'media'],
    echoes: [
      {
        flag: 'coach_war',
        text: 'Depuis ta sortie contre {coach} il y a {years} saisons, chaque feuille de match est un message.',
      },
    ],
    choices: [
      choice({
        id: 'presse',
        label: 'Lâcher une phrase assassine à {journaliste}',
        stance: 'media_savvy',
        riskPreview: 'L’opinion avec toi, le staff contre toi.',
        immediate: [
          fx.relation('media', 5),
          fx.resource('popularite', 4),
          fx.relation('coach', -7),
          fx.resource('discipline', -4),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_froid_ep3')])],
        hidden: [fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'terrain',
        label: 'Répondre à l’entraînement, sans un mot',
        stance: 'professional',
        riskPreview: 'Une réponse lente, que personne ne filme.',
        immediate: [
          fx.resource('discipline', 4),
          fx.resource('forme', 3),
          fx.resource('moral', -4),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_froid_ep4')])],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('constance', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_froid_ep3',
    previousEventId: 'p7_chain_froid_ep2',
    title: 'L’hiver au bout du banc',
    body: 'Ta phrase a fait la une, et {coach} a répondu à sa façon : entraînements décalés avec la réserve, vestiaire séparé, plus une minute de jeu. La direction couvre son entraîneur. Officiellement, tu n’es pas puni ; officieusement, tu n’existes plus. Ton téléphone chauffe : ton entourage pousse au départ, quelques cadres du vestiaire te conseillent des excuses. Résister, partir ou plier ?',
    tags: ['coach', 'placard'],
    rarity: 'rare',
    echoes: [
      {
        flag: 'coach_war',
        text: 'Ta phrase dans la presse a transformé le froid avec {coach} en guerre ouverte.',
      },
    ],
    choices: [
      choice({
        id: 'depart',
        label: 'Exiger ton départ au prochain mercato',
        stance: 'ambitious',
        riskPreview: 'La sortie de secours, avec une étiquette.',
        immediate: [
          fx.resource('moral', 4),
          fx.relation('coach', -5),
          fx.resource('reputationSportive', -3),
          fx.chance(0.4, [fx.relation('fans', -5)]),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_froid_ep5')])],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'excuses',
        label: 'Présenter des excuses publiques à {coach}',
        stance: 'prudent',
        riskPreview: 'La porte se rouvre, ton image se plie.',
        immediate: [
          fx.removeFlag('coach_war'),
          fx.relation('coach', 6),
          fx.resource('discipline', 4),
          fx.resource('popularite', -4),
          fx.resource('moral', -5),
        ],
        hidden: [
          fx.hidden('professionnalisme', 2),
          fx.hidden('resistancePression', -2),
        ],
      }),
      choice({
        id: 'resister',
        label: 'T’entraîner à l’écart sans rien lâcher',
        stance: 'resilient',
        riskPreview: 'Un duel d’usure dont personne ne sort intact.',
        immediate: [
          fx.resource('forme', 3),
          fx.relation('teammates', 4),
          fx.resource('confianceEntraineur', -4),
          fx.resource('moral', -3),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_froid_ep5')])],
        hidden: [fx.hidden('resistancePression', 3), fx.hidden('constance', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_froid_ep4',
    previousEventId: 'p7_chain_froid_ep2',
    title: 'La main tendue de {coach}',
    body: 'Des mois sans un mot, et des semaines où tu as répondu de la seule façon inattaquable : le travail. Ce matin, {coach} te convoque. Pas d’excuses, mais presque : « J’ai été dur. L’équipe a besoin de toi pour la fin de saison. » Il tend la main au-dessus du bureau. La saisir efface beaucoup, mais pas tout. La refuser rallume tout.',
    tags: ['coach', 'reconciliation'],
    echoes: [
      {
        flag: 'coach_war',
        text: 'La guerre froide avec {coach} dure depuis {years} saisons. Personne n’a encore cédé.',
      },
    ],
    choices: [
      choice({
        id: 'treve',
        label: 'Serrer la main, repartir de zéro',
        stance: 'collective',
        riskPreview: 'L’équipe d’abord, ta rancune au placard.',
        immediate: [
          fx.removeFlag('coach_war'),
          fx.relation('coach', 8),
          fx.resource('cohesionVestiaire', 5),
          fx.resource('moral', 4),
          fx.resource('reputationSportive', -2),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'glace',
        label: 'Rester froid : trop tard pour les excuses',
        stance: 'individualist',
        riskPreview: 'Ta fierté intacte, ton avenir ici en pointillé.',
        immediate: [
          fx.relation('coach', -6),
          fx.resource('confianceEntraineur', -5),
          fx.resource('moral', 3),
        ],
        delayed: [
          fx.delayed(1, [fx.chance(0.5, [fx.resource('confianceEntraineur', -6)])]),
        ],
        hidden: [
          fx.hidden('resistancePression', 2),
          fx.hidden('adaptabilite', -2),
        ],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_froid_ep5',
    previousEventId: 'p7_chain_froid_ep3',
    title: 'Le club doit choisir un camp',
    body: 'Les résultats ont plongé et la guerre froide n’est plus un secret : {journaliste} titre « Lui ou moi », et la direction convoque les deux camps cette semaine. Les cadres sont partagés, les supporters aussi. Tu as les moyens de faire pencher la balance en interne — ou de partir la tête haute avant que le club ne tranche à ta place.',
    tags: ['coach', 'crise'],
    rarity: 'rare',
    echoes: [
      {
        flag: 'coach_war',
        text: '{years} saisons de guerre froide avec {coach}. Cette semaine, le club tranche.',
      },
    ],
    choices: [
      choice({
        id: 'balance',
        label: 'Faire pencher la balance pour son départ',
        stance: 'media_savvy',
        riskPreview: 'Tu gagnes tout, ou tu perds ta place.',
        immediate: [
          fx.skillCheck(
            'resource',
            'popularite',
            55,
            [
              fx.removeFlag('coach_war'),
              fx.resource('reputationSportive', 5),
              fx.resource('moral', 6),
            ],
            [
              fx.resource('confianceEntraineur', -8),
              fx.resource('reputationSportive', -4),
            ],
          ),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('loyaute', -2)],
      }),
      choice({
        id: 'valises',
        label: 'Partir la tête haute au mercato',
        stance: 'prudent',
        riskPreview: 'Une page se tourne, des supporters se braquent.',
        immediate: [
          fx.removeFlag('coach_war'),
          fx.resource('moral', 4),
          fx.resource('bienEtre', 5),
          fx.relation('fans', -5),
          fx.resource('reputationSportive', -2),
        ],
        hidden: [fx.hidden('adaptabilite', 3)],
      }),
    ],
  }),

  // ——— Chaîne 3 : l'amitié du vestiaire avec {coequipier} ———
  dilemma({
    id: 'p7_chain_amitie_start',
    title: 'La nuit blanche de {coequipier}',
    body: 'Veille de déplacement. À l’aube, {coequipier}, dix-huit ans, frappe à ta porte de chambre, les yeux rouges : il a passé la nuit dehors, et le staff fait le tour des chambres dans dix minutes. Il te supplie de dire qu’il a veillé avec toi, vidéo et récupération. Mentir au staff peut te coûter cher. Le lâcher peut briser sa carrière avant qu’elle commence.',
    category: 'teammates',
    tags: ['vestiaire', 'amitie'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 19,
    ageMax: 29,
    unique: true,
    echoes: [
      {
        flag: 'defended_teammate',
        text: 'Protéger les plus jeunes du vestiaire : tu l’as déjà fait, il y a {years} saisons.',
      },
    ],
    choices: [
      choice({
        id: 'couvrir',
        label: 'Le couvrir : il a veillé avec toi',
        stance: 'loyal',
        riskPreview: 'Un mensonge de plus, un frère de plus.',
        immediate: [
          fx.flag('friendship_deep'),
          fx.relation('teammates', 5),
          fx.resource('discipline', -3),
          fx.chance(0.3, [fx.resource('confianceEntraineur', -6)]),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_amitie_ep2')])],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'verite',
        label: 'Refuser de mentir au staff pour lui',
        stance: 'ethical',
        riskPreview: 'Ta droiture saluée, un gamin livré seul.',
        immediate: [
          fx.resource('confianceEntraineur', 4),
          fx.resource('discipline', 3),
          fx.relation('teammates', -4),
          fx.resource('moral', -3),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_amitie_ep4')])],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_amitie_ep2',
    previousEventId: 'p7_chain_amitie_start',
    title: '{coequipier} pousse ton nom',
    body: 'Les saisons ont passé et le gamin que tu avais couvert est devenu un cadre respecté du vestiaire. Le capitaine part, le groupe doit voter. {coequipier} fait campagne pour toi, chambre après chambre, contre un ancien qui estimait le brassard acquis. « Il m’a protégé quand je n’étais personne », répète-t-il. Le vote a lieu demain. À toi de décider quoi faire de cette dette d’honneur.',
    tags: ['vestiaire', 'amitie', 'capitanat'],
    echoes: [
      {
        flag: 'friendship_deep',
        text: '{coequipier} n’a pas oublié ton geste : {years} saisons plus tard, il te renvoie l’ascenseur.',
      },
    ],
    choices: [
      choice({
        id: 'brassard',
        label: 'Accepter le brassard qu’il t’offre',
        stance: 'ambitious',
        riskPreview: 'Le brassard au bras, un ancien sur le dos.',
        immediate: [
          fx.stat('leadership', 2),
          fx.resource('reputationSportive', 4),
          fx.relation('teammates', -3),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_amitie_ep3')])],
        hidden: [fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'decliner',
        label: 'Décliner et pousser son nom à lui',
        stance: 'collective',
        riskPreview: 'Le vestiaire uni, ton heure repoussée.',
        immediate: [
          fx.relation('teammates', 6),
          fx.resource('cohesionVestiaire', 5),
          fx.resource('confianceEntraineur', -3),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_amitie_ep3')])],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('ambition', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_amitie_ep3',
    previousEventId: 'p7_chain_amitie_ep2',
    title: 'Il monte au créneau pour toi',
    body: 'Trois défaites, une presse déchaînée, et ton nom en première ligne des coupables. En pleine conférence, {coequipier} interrompt une question de {journaliste} : « Cet homme a sauvé ma carrière quand personne ne regardait. L’attaquer, c’est m’attaquer moi. » La salle se fige, les caméras se tournent vers toi. Ce qu’il vient de faire ne se rembourse pas. Reste à savoir comment le recevoir.',
    tags: ['vestiaire', 'amitie', 'media'],
    rarity: 'rare',
    echoes: [
      {
        flag: 'friendship_deep',
        text: 'La nuit couverte il y a {years} saisons a forgé un lien que le temps n’a pas usé.',
      },
    ],
    choices: [
      choice({
        id: 'etreindre',
        label: 'L’étreindre devant les caméras',
        stance: 'emotional',
        riskPreview: 'Une image forte, que le staff peut mal lire.',
        immediate: [
          fx.relation('fans', 6),
          fx.resource('popularite', 5),
          fx.resource('moral', 6),
          fx.chance(0.3, [fx.relation('coach', -4)]),
        ],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'sobre',
        label: 'Le remercier sobrement, recentrer sur le terrain',
        stance: 'professional',
        riskPreview: 'Le feu retombe, l’émotion aussi.',
        immediate: [
          fx.resource('reputationSportive', 4),
          fx.resource('discipline', 3),
          fx.resource('moral', 3),
          fx.relation('fans', -3),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('constance', 1)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_amitie_ep4',
    previousEventId: 'p7_chain_amitie_start',
    title: '{coequipier} règle ses comptes',
    body: 'Il a fini par partir, grandir ailleurs, devenir un nom qui compte. Cette semaine, avant de retrouver ton équipe, {coequipier} raconte ses débuts à {journaliste} : « Une nuit, j’ai supplié qu’on me couvre. On m’a laissé couler. » Ton nom n’est pas cité ; tout le vestiaire l’a reconnu. Le match approche, et avec lui la poignée de mains devant les caméras.',
    tags: ['vestiaire', 'rancune'],
    echoes: [
      {
        flag: 'seen:p7_chain_amitie_start',
        text: 'Cette nuit-là, tu avais refusé de couvrir {coequipier}. Lui n’a rien oublié.',
      },
    ],
    choices: [
      choice({
        id: 'abces',
        label: 'Crever l’abcès avant la poignée de mains',
        stance: 'emotional',
        riskPreview: 'Une explication franche, sans issue garantie.',
        immediate: [
          fx.skillCheck(
            'hidden',
            'loyaute',
            40,
            [fx.relation('friends', 6), fx.resource('moral', 5)],
            [fx.resource('moral', -4), fx.resource('popularite', -2)],
          ),
        ],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'assumer',
        label: 'Assumer ton choix, hier comme aujourd’hui',
        stance: 'ethical',
        riskPreview: 'Ta ligne est claire, l’amitié reste morte.',
        immediate: [
          fx.resource('discipline', 3),
          fx.resource('reputationSportive', 3),
          fx.relation('friends', -5),
          fx.resource('moral', -3),
        ],
        hidden: [
          fx.hidden('professionnalisme', 2),
          fx.hidden('resistancePression', 2),
        ],
      }),
    ],
  }),

  // ——— Chaîne 4 : {agent} malhonnête ———
  dilemma({
    id: 'p7_chain_agent_start',
    title: 'Les silences de {agent}',
    body: 'Un virement au libellé étrange, un sponsor qui jure avoir versé plus que ce que tu as touché, et {agent} qui répond à côté, chaque fois, avec ce sourire qui clôt les discussions. Ta famille s’inquiète, ton banquier aussi. Vérifier, c’est insinuer que l’homme qui t’a tout ouvert te vole. Ne rien faire, c’est parier ta carrière sur sa parole.',
    category: 'agent',
    tags: ['agent', 'confiance', 'argent'],
    rarity: 'uncommon',
    weight: 5,
    ageMin: 20,
    ageMax: 34,
    unique: true,
    echoes: [
      {
        flag: 'agent_all_in',
        text: 'Tu avais tout misé sur {agent} il y a {years} saisons. Depuis, tu ne vérifies plus rien.',
      },
    ],
    choices: [
      choice({
        id: 'confiance',
        label: 'Lui laisser le bénéfice du doute, comme toujours',
        stance: 'emotional',
        riskPreview: 'La confiance rend la vie douce, et aveugle.',
        immediate: [
          fx.flag('agent_crisis'),
          fx.resource('moral', 3),
          fx.resource('bienEtre', 3),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_agent_ep2')])],
        hidden: [fx.hidden('loyaute', 2), fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'verifier',
        label: 'Faire auditer tes contrats par un avocat',
        stance: 'financial',
        riskPreview: 'Ta tranquillité a un prix, ta méfiance aussi.',
        immediate: [
          fx.cash(-8000),
          fx.resource('financesPersonnelles', 4),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('constance', 1)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_agent_ep2',
    previousEventId: 'p7_chain_agent_start',
    title: 'La commission fantôme',
    body: 'L’appel arrive un soir : {journaliste} détient des documents montrant que {agent} a touché une double commission cachée sur ton dernier transfert. Publication en fin de semaine, avec ou sans ta version. {agent} jure au téléphone que c’est un montage de ses concurrents, la voix un peu trop rapide. Tu as quatre jours pour choisir qui tu crois — et qui tu protèges.',
    tags: ['agent', 'scandale'],
    echoes: [
      {
        flag: 'agent_crisis',
        text: 'Les signaux étaient là depuis {years} saisons. Tu avais choisi de ne pas regarder.',
      },
    ],
    choices: [
      choice({
        id: 'couvrir',
        label: 'Le couvrir publiquement, une fois encore',
        stance: 'loyal',
        riskPreview: 'Ta parole engagée sur la sienne.',
        immediate: [
          fx.relation('media', -5),
          fx.resource('moral', -3),
          fx.chance(0.5, [fx.resource('reputationSportive', -6)]),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_agent_ep3')])],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'comptes',
        label: 'Exiger les comptes avant de le défendre',
        stance: 'professional',
        riskPreview: 'La vérité d’abord, l’amitié peut-être après.',
        immediate: [
          fx.resource('reputationSportive', 2),
          fx.resource('moral', -4),
          fx.resource('bienEtre', -3),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_agent_ep3')])],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_agent_ep3',
    previousEventId: 'p7_chain_agent_ep2',
    title: 'L’heure des comptes avec {agent}',
    body: 'Les preuves sont tombées, accablantes : la commission cachée existe, signée de sa main. {agent} avoue à moitié, propose de rembourser en silence, invoque quinze ans de routes partagées. Ton avocat pousse une rupture propre et discrète ; {journaliste} attend toujours sa réponse ; une partie de toi se souvient d’où il t’a sorti. Cette fois, il faut trancher, et chaque sortie laisse des traces.',
    tags: ['agent', 'rupture'],
    rarity: 'rare',
    echoes: [
      {
        flag: 'agent_crisis',
        text: '{years} saisons à fermer les yeux sur les affaires de {agent}. L’addition arrive.',
      },
    ],
    choices: [
      choice({
        id: 'rupture',
        label: 'Rompre proprement : accord discret, page tournée',
        stance: 'financial',
        riskPreview: 'Une sortie propre, un scandale enterré à moitié.',
        immediate: [
          fx.cash(20000),
          fx.resource('bienEtre', 4),
          fx.resource('moral', 3),
          fx.chance(0.3, [fx.relation('media', -4)]),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('constance', 2)],
      }),
      choice({
        id: 'justice',
        label: 'Porter l’affaire en justice, au grand jour',
        stance: 'ethical',
        riskPreview: 'Un procès long, sous les projecteurs.',
        immediate: [
          fx.cash(-15000),
          fx.relation('media', 5),
          fx.resource('reputationSportive', 3),
          fx.resource('moral', -5),
          fx.resource('bienEtre', -4),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.6, [fx.cash(40000), fx.resource('reputationSportive', 4)]),
          ]),
        ],
        hidden: [fx.hidden('resistancePression', 3)],
      }),
      choice({
        id: 'garder',
        label: 'Le garder : sans lui, tu ne serais personne',
        stance: 'high_risk',
        riskPreview: 'La fidélité au-dessus des preuves.',
        immediate: [
          fx.resource('moral', 3),
          fx.relation('family', -5),
          fx.resource('reputationSportive', -4),
        ],
        delayed: [
          fx.delayed(2, [
            fx.chance(0.5, [fx.cash(-30000), fx.resource('popularite', -6)]),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('professionnalisme', -3)],
      }),
    ],
  }),
]
