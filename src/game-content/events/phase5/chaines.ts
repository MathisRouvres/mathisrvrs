import { dilemma, choice, chainEpisode, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Chaînes narratives — 4 histoires en plusieurs épisodes.
 * Les départs sont des dilemmes de catégorie normale ; les suites
 * utilisent chainEpisode (catégorie narrative_chain, unique, poids faible).
 * mentor : start → ep2 → ep3 ; promesse : start → ep2 ;
 * jeune : start → ep2 ; pari : start → ep2 → ep3.
 */
export const chaineDilemmas: DilemmaDefinition[] = [
  // ——— Chaîne 1 : le mentor déchu ———
  dilemma({
    id: 'p5_chain_mentor_start',
    title: 'L’ancien te prend sous son aile',
    body: 'Une légende déchue du club traîne encore autour du centre d’entraînement : blessures, mauvais choix, fin de carrière en pointillé. Il t’observe depuis des semaines. Un soir, il te propose de travailler ensemble : ses yeux, son vécu, ses réseaux, contre un peu de ton temps. Certains au club murmurent qu’il n’attire que les ennuis. D’autres rappellent qu’il a été le meilleur, ici, avant tout le monde.',
    category: 'teammates',
    tags: ['mentor', 'transmission'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 17,
    ageMax: 28,
    unique: true,
    choices: [
      choice({
        id: 'accepter',
        label: 'Accepter son aide, malgré les rumeurs',
        stance: 'emotional',
        riskPreview: 'Un maître rare, une ombre avec lui.',
        immediate: [
          fx.stat('vision', 2),
          fx.stat('sangFroid', 1),
          fx.resource('confianceEntraineur', -3),
        ],
        hidden: [fx.hidden('potentiel', 2)],
        nextEventIds: ['p5_chain_mentor_ep2'],
      }),
      choice({
        id: 'distance',
        label: 'Garder tes distances poliment',
        stance: 'prudent',
        riskPreview: 'Aucun risque, un savoir perdu.',
        immediate: [fx.resource('discipline', 3), fx.resource('moral', -2)],
        hidden: [fx.hidden('constance', 1)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p5_chain_mentor_ep2',
    previousEventId: 'p5_chain_mentor_start',
    title: 'Le service du mentor',
    body: 'Depuis des mois, ses conseils transforment ton jeu. Puis un soir, il t’attend sur le parking, les traits tirés : les dettes l’étranglent. Il te demande d’appuyer sa candidature au poste d’adjoint auprès de la direction — en taisant ses problèmes de jeu, qui l’excluraient d’office. « Tu me dois bien ça », dit-il sans le dire. Le club te fait confiance. Lui aussi.',
    tags: ['mentor', 'dette'],
    choices: [
      choice({
        id: 'appuyer',
        label: 'Le recommander en taisant ses dettes',
        stance: 'loyal',
        riskPreview: 'Une dette d’honneur payée, une vérité enterrée.',
        immediate: [
          fx.resource('moral', 3),
          fx.chance(0.4, [
            fx.resource('reputationSportive', -5),
            fx.resource('confianceEntraineur', -6),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('professionnalisme', -2)],
        nextEventIds: ['p5_chain_mentor_ep3'],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser de mentir pour lui',
        stance: 'ethical',
        riskPreview: 'Conscience propre, mentor perdu.',
        immediate: [
          fx.resource('moral', -5),
          fx.relation('friends', -6),
          fx.resource('discipline', 3),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p5_chain_mentor_ep3',
    previousEventId: 'p5_chain_mentor_ep2',
    title: 'Le mentor au bord du gouffre',
    body: 'Le club l’a engagé sur ta parole. Trois mois plus tard, un site spécialisé exhume ses dettes de jeu et cherche qui savait. Une journaliste t’appelle : elle a ton nom, elle attend une version. Le mentor te supplie de jouer l’ignorance ; ton conseiller te presse de dire la vérité avant qu’elle n’éclate sans toi. Dans les deux cas, quelqu’un tombera.',
    tags: ['mentor', 'scandale'],
    choices: [
      choice({
        id: 'couvrir',
        label: 'Jouer l’ignorance et le couvrir',
        stance: 'loyal',
        riskPreview: 'Il survit, ton nom reste exposé.',
        immediate: [
          fx.relation('friends', 6),
          fx.chance(0.5, [
            fx.resource('reputationSportive', -7),
            fx.relation('media', -6),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 4), fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'verite',
        label: 'Dire la vérité avant l’article',
        stance: 'ethical',
        riskPreview: 'Ton image sauvée, lui coule.',
        immediate: [
          fx.relation('media', 5),
          fx.resource('reputationSportive', 3),
          fx.relation('friends', -10),
          fx.resource('moral', -6),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('loyaute', -3)],
      }),
    ],
  }),

  // ——— Chaîne 2 : la promesse d'enfance ———
  dilemma({
    id: 'p5_chain_promesse_start',
    title: 'La promesse du terrain vague',
    body: 'Il y a quinze ans, sur le terrain vague du quartier, vous aviez scellé un pacte : lui raconterait ton histoire le jour où tu serais grand. Aujourd’hui, ton ami d’enfance est journaliste dans un média qui périclite, et il ose enfin demander : une interview exclusive, la première vraie, celle que les grands plateaux te réclament depuis des mois. Ton attachée de presse fait la grimace.',
    category: 'media',
    tags: ['amitie', 'promesse'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 20,
    ageMax: 34,
    unique: true,
    choices: [
      choice({
        id: 'exclu',
        label: 'Tenir la promesse, lui donner l’exclu',
        stance: 'loyal',
        riskPreview: 'Un pacte honoré, les grands médias vexés.',
        immediate: [
          fx.relation('friends', 10),
          fx.relation('media', -5),
          fx.resource('popularite', 3),
        ],
        hidden: [fx.hidden('loyaute', 3)],
        nextEventIds: ['p5_chain_promesse_ep2'],
      }),
      choice({
        id: 'plateaux',
        label: 'Réserver l’exclu à un grand plateau',
        stance: 'ambitious',
        riskPreview: 'Exposition maximale, promesse trahie.',
        immediate: [
          fx.resource('popularite', 7),
          fx.relation('media', 5),
          fx.relation('friends', -8),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('ambition', 2), fx.hidden('loyaute', -3)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p5_chain_promesse_ep2',
    previousEventId: 'p5_chain_promesse_start',
    title: 'L’enquête de ton ami',
    body: 'Ton interview a relancé sa carrière : une grande rédaction l’a embauché. Ce soir, il t’appelle, la voix étrange. On lui commande une enquête sur les dérives internes de ton club — et il a déjà des sources. Il te prévient par loyauté, puis pose la question qui tue : compléter le tableau en coulisses, ou enterrer le sujet et passer pour un tendre auprès de sa rédaction ?',
    tags: ['amitie', 'enquete'],
    choices: [
      choice({
        id: 'sources',
        label: 'Parler en coulisses, compléter l’enquête',
        stance: 'high_risk',
        riskPreview: 'La vérité sort, ta trace peut rester.',
        immediate: [
          fx.relation('friends', 7),
          fx.chance(0.35, [
            fx.resource('cohesionVestiaire', -8),
            fx.resource('confianceEntraineur', -5),
          ]),
        ],
        hidden: [fx.hidden('resistancePression', 2), fx.hidden('loyaute', -2)],
      }),
      choice({
        id: 'enterrer',
        label: 'Lui demander d’enterrer le sujet',
        stance: 'loyal',
        riskPreview: 'Vestiaire protégé, ami freiné.',
        immediate: [
          fx.resource('cohesionVestiaire', 4),
          fx.relation('friends', -7),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('loyaute', 2)],
      }),
    ],
  }),

  // ——— Chaîne 3 : le jeune que tu as défendu ———
  dilemma({
    id: 'p5_chain_jeune_start',
    title: 'Le jeune que tu avais défendu',
    body: 'Le gamin que tu avais défendu quand tout le vestiaire le chargeait est devenu l’attaquant le plus cher du continent. Il ne t’a jamais oublié. Son agent — l’un des plus puissants du circuit — te contacte de sa part : il veut te prendre dans son écurie et promet des portes que ton agent actuel n’ouvrira jamais. Ton agent, lui, t’accompagne depuis le premier contrat.',
    category: 'agent',
    tags: ['reconnaissance', 'fidelite'],
    rarity: 'uncommon',
    weight: 5,
    ageMin: 22,
    ageMax: 34,
    unique: true,
    prerequisites: [{ type: 'hasFlag', key: 'defended_teammate' }],
    choices: [
      choice({
        id: 'ecurie',
        label: 'Rejoindre l’écurie du super-agent',
        stance: 'ambitious',
        riskPreview: 'Portes immenses, fidélité sacrifiée.',
        immediate: [
          fx.resource('reputationSportive', 4),
          fx.resource('moral', 3),
          fx.chance(0.3, [fx.resource('popularite', -4)]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('loyaute', -3)],
        nextEventIds: ['p5_chain_jeune_ep2'],
      }),
      choice({
        id: 'fidele',
        label: 'Rester fidèle à ton agent de toujours',
        stance: 'loyal',
        riskPreview: 'Confiance intacte, plafond inchangé.',
        immediate: [
          fx.resource('moral', 4),
          fx.resource('bienEtre', 3),
          fx.resource('reputationSportive', -2),
        ],
        hidden: [fx.hidden('loyaute', 4), fx.hidden('ambition', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p5_chain_jeune_ep2',
    previousEventId: 'p5_chain_jeune_start',
    title: 'L’ascenseur renvoyé',
    body: 'Le nouveau clan tient parole : le club du gamin — un géant de la coupe continentale — dépose une offre pour toi. Il a poussé lui-même en interne, par pure reconnaissance. Le rôle est clair : doublure de luxe dans un effectif de stars, salaire doublé. Là où tu es, tu joues tout, tout le temps. Le gamin t’appelle : « Viens, on finit ce qu’on a commencé. »',
    tags: ['transfert', 'reconnaissance'],
    choices: [
      choice({
        id: 'geant',
        label: 'Rejoindre le géant, même sur le banc',
        stance: 'ambitious',
        riskPreview: 'Sommet du continent, temps de jeu en danger.',
        immediate: [
          fx.cash(50000),
          fx.resource('popularite', 6),
          fx.chance(0.45, [fx.resource('forme', -6), fx.resource('moral', -5)]),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'titulaire',
        label: 'Décliner et rester titulaire chez toi',
        stance: 'prudent',
        riskPreview: 'Temps de jeu garanti, sommet refusé.',
        immediate: [
          fx.resource('forme', 4),
          fx.resource('confianceEntraineur', 5),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('ambition', -2)],
      }),
    ],
  }),

  // ——— Chaîne 4 : l'ombre du pari ———
  dilemma({
    id: 'p5_chain_pari_start',
    title: 'La soirée qui dérape',
    body: 'Le mariage de ta cousine se prolonge en petit comité, dans l’arrière-salle d’un cercle privé. Les portes se ferment, les tables de jeu apparaissent, l’argent circule — rien de tout cela n’est légal. Ton cousin insiste pour que tu restes : « C’est la famille, personne ne parle. » Des inconnus te dévisagent déjà, téléphone à la main. Partir maintenant serait une insulte, rester serait une imprudence.',
    category: 'family',
    tags: ['famille', 'soiree'],
    rarity: 'rare',
    weight: 4,
    ageMin: 19,
    ageMax: 33,
    unique: true,
    choices: [
      choice({
        id: 'rester',
        label: 'Rester par égard pour la famille',
        stance: 'emotional',
        riskPreview: 'La famille est touchée, les murs ont des yeux.',
        immediate: [
          fx.relation('family', 7),
          fx.resource('bienEtre', 3),
          fx.resource('fatigue', 5),
        ],
        hidden: [fx.hidden('professionnalisme', -2)],
        nextEventIds: ['p5_chain_pari_ep2'],
      }),
      choice({
        id: 'partir',
        label: 'Partir avant que ça tourne mal',
        stance: 'prudent',
        riskPreview: 'Image protégée, famille froissée.',
        immediate: [fx.relation('family', -6), fx.resource('discipline', 4)],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p5_chain_pari_ep2',
    previousEventId: 'p5_chain_pari_start',
    title: 'Le message anonyme',
    body: 'Trois semaines plus tard, un numéro inconnu t’envoie quatre photos : toi, attablé au cercle, des billets et des jetons bien visibles. Le message est simple : une somme, un compte à l’étranger, dix jours. Sinon, la presse. Tu n’as pas parié — mais les images racontent ce qu’elles veulent. Prévenir le club, c’est avouer la soirée. Payer, c’est apprendre au maître chanteur que tu paies.',
    tags: ['chantage', 'secret'],
    choices: [
      choice({
        id: 'payer',
        label: 'Payer et espérer que ça s’arrête',
        stance: 'financial',
        riskPreview: 'Silence acheté, pour combien de temps ?',
        immediate: [fx.cash(-40000), fx.resource('moral', -4)],
        hidden: [fx.hidden('resistancePression', -3)],
        nextEventIds: ['p5_chain_pari_ep3'],
      }),
      choice({
        id: 'devancer',
        label: 'Tout révéler toi-même au club',
        stance: 'ethical',
        riskPreview: 'Tempête immédiate, chantage désamorcé.',
        immediate: [
          fx.resource('reputationSportive', -6),
          fx.resource('popularite', -5),
          fx.relation('media', -4),
          fx.resource('discipline', -3),
          fx.resource('bienEtre', 5),
        ],
        hidden: [fx.hidden('resistancePression', 3), fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p5_chain_pari_ep3',
    previousEventId: 'p5_chain_pari_ep2',
    title: 'Le maître chanteur revient',
    body: 'L’argent est parti, le silence a duré deux mois. Nouveau message, même numéro : la somme a doublé, et il y aurait « d’autres images ». C’est la mécanique du chantage : tu es devenu un abonnement. Ton avocat propose une riposte totale — police, plainte, contre-enquête — sans garantir que rien ne fuitera. Chaque saison payée est une saison passée à ses ordres.',
    tags: ['chantage', 'spirale'],
    choices: [
      choice({
        id: 'police',
        label: 'Porter plainte, quoi qu’il en coûte',
        stance: 'ethical',
        riskPreview: 'La machine s’arrête, la fuite reste possible.',
        immediate: [
          fx.resource('bienEtre', 6),
          fx.resource('moral', 4),
          fx.chance(0.35, [fx.resource('popularite', -6), fx.relation('media', -5)]),
        ],
        hidden: [fx.hidden('resistancePression', 4)],
      }),
      choice({
        id: 'payer_encore',
        label: 'Payer encore, gagner du temps',
        stance: 'high_risk',
        riskPreview: 'Répit acheté, spirale engagée.',
        immediate: [fx.cash(-80000), fx.resource('moral', -5)],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.5, [
              fx.resource('reputationSportive', -8),
              fx.resource('popularite', -6),
            ]),
          ]),
        ],
        hidden: [fx.hidden('resistancePression', -3), fx.hidden('constance', -2)],
      }),
    ],
  }),
]
