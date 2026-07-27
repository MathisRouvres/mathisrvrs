import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes liés à l’âge — phase 7.
 * 15 dilemmes à fenêtres d’âge étroites : chaque tranche de carrière
 * a ses passages obligés, du premier contrat au dernier.
 */
export const agesDilemmas: DilemmaDefinition[] = [
  // ————————————————— 16–18 ans —————————————————

  dilemma({
    id: 'p7_age_premier_contrat_parents',
    title: 'Ton premier contrat, sous leurs yeux',
    body: 'La salle de réunion sent le café tiède. Ton premier contrat professionnel est posé sur la table, et tes parents, endimanchés, retiennent leur souffle. {agent} te glisse à l’oreille qu’en repoussant la signature d’une semaine, il obtiendra une bien meilleure prime. Ta mère regarde déjà le stylo. Signer maintenant, c’est leur offrir ce moment. Attendre, c’est entrer dans le jeu froid des négociations.',
    category: 'contract',
    tags: ['age', 'famille', 'contrat'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 16,
    ageMax: 18,
    cooldownSeasons: 0,
    unique: true,
    choices: [
      choice({
        id: 'signer',
        label: 'Signer maintenant, devant eux',
        stance: 'emotional',
        riskPreview: 'Un moment pour toujours, une prime peut-être en dessous.',
        immediate: [
          fx.cash(3000),
          fx.relation('family', 8),
          fx.resource('moral', 5),
        ],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'attendre',
        label: 'Laisser {agent} renégocier une semaine',
        stance: 'professional',
        riskPreview: 'Meilleure prime probable, moment de famille abîmé.',
        immediate: [
          fx.cash(9000),
          fx.relation('family', -5),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('ambition', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_bac_ou_foot',
    title: 'Le bac ou le ballon',
    body: 'Les épreuves du bac tombent en pleine fin de saison, au moment où le centre te promet enfin du temps de jeu. Tes professeurs parlent d’avenir à sécuriser, ton éducateur d’une fenêtre qui ne se rouvrira pas. Tu ne peux pas être partout : chaque heure de révision est une heure de terrain en moins, et inversement. Il faut trancher, maintenant.',
    category: 'lifestyle',
    tags: ['age', 'etudes', 'jeunesse'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 16,
    ageMax: 18,
    cooldownSeasons: 0,
    unique: true,
    choices: [
      choice({
        id: 'reviser',
        label: 'Réviser sérieusement, quitte à lever le pied',
        stance: 'prudent',
        riskPreview: 'Un filet de sécurité, une saison au ralenti.',
        immediate: [
          fx.resource('forme', -4),
          fx.resource('confianceEntraineur', -3),
          fx.relation('family', 6),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('professionnalisme', 1)],
      }),
      choice({
        id: 'foot',
        label: 'Tout miser sur le terrain',
        stance: 'high_risk',
        riskPreview: 'La fenêtre saisie, aucun plan B derrière.',
        immediate: [
          fx.resource('forme', 4),
          fx.resource('confianceEntraineur', 5),
          fx.relation('family', -6),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'les_deux',
        label: 'Mener les deux de front, dormir plus tard',
        stance: 'resilient',
        riskPreview: 'Tout tenir à la fois, jusqu’à un certain point.',
        immediate: [
          fx.resource('fatigue', 8),
          fx.chance(0.5, [fx.resource('moral', -4)]),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_convocation_deuil',
    title: 'Convoqué chez les pros, le cœur ailleurs',
    body: 'La convocation tombe un mardi : samedi, tu seras dans le groupe professionnel pour la première fois. Le même jour, à trois heures de route, ta famille enterre ton grand-père, celui qui t’accompagnait à tous tes matchs d’enfant. {coach} dit qu’il comprendra, mais son regard dit autre chose. Aucun choix ne sera léger. Certains moments ne repassent jamais — des deux côtés.',
    category: 'family',
    tags: ['age', 'deuil', 'jeunesse'],
    rarity: 'rare',
    weight: 4,
    ageMin: 16,
    ageMax: 18,
    cooldownSeasons: 0,
    unique: true,
    choices: [
      choice({
        id: 'famille',
        label: 'Être avec les tiens, tant pis pour le groupe',
        stance: 'emotional',
        riskPreview: 'Un adieu digne, une première fois envolée.',
        immediate: [
          fx.relation('family', 10),
          fx.resource('bienEtre', 5),
          fx.resource('confianceEntraineur', -6),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'jouer',
        label: 'Honorer la convocation, faire ton deuil plus tard',
        stance: 'professional',
        riskPreview: 'La carrière avance, quelque chose reste en suspens.',
        immediate: [
          fx.resource('confianceEntraineur', 8),
          fx.relation('family', -6),
          fx.resource('moral', -5),
        ],
        delayed: [fx.delayed(1, [fx.resource('bienEtre', -4)])],
        hidden: [fx.hidden('resistancePression', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_premiere_interview',
    title: 'Première fois face caméra',
    body: 'Zone mixte, lumière crue, micro tendu : {journaliste} veut ta toute première interview télé. Derrière la caméra, l’attaché de presse du club agite la fiche des trois phrases apprises par cœur. Tu sens que réciter te protégera, mais que personne ne s’en souviendra. Parler vrai, c’est exister d’un coup — ou offrir à la télé ta première maladresse en boucle.',
    category: 'media',
    tags: ['age', 'medias', 'jeunesse'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 16,
    ageMax: 18,
    cooldownSeasons: 0,
    unique: true,
    choices: [
      choice({
        id: 'naturel',
        label: 'Parler avec tes mots, sans filet',
        stance: 'high_risk',
        riskPreview: 'Une personnalité qui naît, ou un extrait qui tourne.',
        immediate: [
          fx.skillCheck(
            'stat',
            'sangFroid',
            45,
            [fx.resource('popularite', 6), fx.relation('media', 6)],
            [
              fx.relation('media', -4),
              fx.resource('popularite', -3),
              fx.resource('moral', -3),
            ],
          ),
        ],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'fiche',
        label: 'Réciter les phrases du club, sobre et carré',
        stance: 'media_savvy',
        riskPreview: 'Zéro vague, zéro souvenir.',
        immediate: [
          fx.resource('discipline', 3),
          fx.relation('media', 2),
          fx.resource('popularite', -2),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('constance', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_grand_club_17ans',
    title: 'Le grand club frappe à la porte',
    body: 'Tu as dix-sept ans et un club immense veut t’arracher à ton centre de formation. {agent} parle d’installations irréelles, d’une prime qui changerait la vie de tes parents. Ton directeur de centre, lui, rappelle qu’ici tu joues, là-bas tu attendras derrière des internationaux. Partir trop tôt a brisé des carrières. Rester trop longtemps aussi. Tout le monde attend ta réponse avant vendredi.',
    category: 'contract',
    tags: ['age', 'transfert', 'jeunesse'],
    rarity: 'rare',
    weight: 4,
    ageMin: 16,
    ageMax: 18,
    cooldownSeasons: 0,
    unique: true,
    choices: [
      choice({
        id: 'partir',
        label: 'Signer là-bas, brûler les étapes',
        stance: 'ambitious',
        riskPreview: 'Un cadre en or, une place à conquérir de zéro.',
        immediate: [
          fx.cash(15000),
          fx.resource('reputationSportive', 5),
          fx.relation('coach', -8),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.45, [
              fx.resource('moral', -6),
              fx.resource('confianceEntraineur', -5),
            ]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'rester',
        label: 'Finir ta formation où tout a commencé',
        stance: 'loyal',
        riskPreview: 'Du temps de jeu garanti, une occasion peut-être unique.',
        immediate: [
          fx.relation('coach', 8),
          fx.resource('cohesionVestiaire', 4),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('ambition', -1)],
      }),
    ],
  }),

  // ————————————————— 19–22 ans —————————————————

  dilemma({
    id: 'p7_age_quitter_domicile',
    title: 'Tes cartons dans l’entrée',
    body: 'Le club te propose un appartement à cinq minutes du centre d’entraînement. Fini les réveils à l’aube, les trajets, le bruit des petits frères pendant tes siestes. Ta mère dit que c’est une bonne nouvelle, mais elle a déjà cuisiné ton plat préféré trois soirs de suite. Partir, c’est gagner du sommeil et perdre un ancrage. Rester, c’est l’inverse.',
    category: 'family',
    tags: ['age', 'famille', 'independance'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 19,
    ageMax: 22,
    cooldownSeasons: 0,
    unique: true,
    choices: [
      choice({
        id: 'partir',
        label: 'Prendre l’appartement près du centre',
        stance: 'individualist',
        riskPreview: 'Une vie d’adulte qui commence, un vide au dîner.',
        immediate: [
          fx.resource('bienEtre', 5),
          fx.resource('forme', 3),
          fx.relation('family', -6),
        ],
        hidden: [fx.hidden('adaptabilite', 3)],
      }),
      choice({
        id: 'rester',
        label: 'Rester encore un an chez tes parents',
        stance: 'loyal',
        riskPreview: 'Un cocon préservé, des trajets qui usent.',
        immediate: [
          fx.relation('family', 8),
          fx.resource('bienEtre', 3),
          fx.resource('fatigue', 4),
        ],
        hidden: [fx.hidden('loyaute', 2), fx.hidden('adaptabilite', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_premiers_revenus',
    title: 'Ton premier vrai salaire est tombé',
    body: 'Le virement est tombé cette nuit. Tu as relu le montant trois fois : plus que ce que ton père gagne en une année. Le vestiaire a ses codes — voiture, montre, tournée générale. Ton banquier parle placements, ta mère ne demande jamais rien, ce qui veut tout dire. Cet argent peut construire, réparer ou s’évaporer. Première grande décision loin des terrains.',
    category: 'money',
    tags: ['age', 'argent', 'jeunesse'],
    rarity: 'uncommon',
    weight: 11,
    ageMin: 19,
    ageMax: 22,
    cooldownSeasons: 0,
    unique: true,
    choices: [
      choice({
        id: 'epargner',
        label: 'Bloquer presque tout sur un compte',
        stance: 'prudent',
        riskPreview: 'Un avenir sécurisé, une jeunesse en veilleuse.',
        immediate: [
          fx.resource('financesPersonnelles', 8),
          fx.resource('moral', -2),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('professionnalisme', 1)],
      }),
      choice({
        id: 'famille',
        label: 'Rembourser les sacrifices de tes parents',
        stance: 'emotional',
        riskPreview: 'Une dette d’enfance soldée, ton compte à plat.',
        immediate: [
          fx.cash(-12000),
          fx.relation('family', 10),
          fx.resource('moral', 4),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'plaisir',
        label: 'Voiture, sneakers, grand restaurant',
        stance: 'individualist',
        riskPreview: 'Le statut assumé, l’étiquette qui va avec.',
        immediate: [
          fx.cash(-15000),
          fx.resource('moral', 7),
          fx.resource('popularite', 3),
          fx.resource('discipline', -3),
        ],
        hidden: [fx.hidden('professionnalisme', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_corps_change',
    title: 'Ton corps n’est plus celui d’hier',
    body: 'En deux saisons, ton corps a changé : huit kilos de muscle, des appuis plus lourds, des sensations différentes dans les petits espaces. Le préparateur veut déconstruire ta course pour la rebâtir — des semaines à te sentir maladroit, en pleine concurrence pour une place. Ton instinct te souffle de compenser, comme tu l’as toujours fait. Ton genou, parfois, souffle autre chose.',
    category: 'training',
    tags: ['age', 'corps', 'progression'],
    rarity: 'common',
    weight: 12,
    ageMin: 19,
    ageMax: 22,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'rebatir',
        label: 'Reconstruire tes appuis avec le staff',
        stance: 'professional',
        riskPreview: 'Un corps durable, des semaines de flottement.',
        immediate: [fx.resource('forme', -4), fx.stat('vitesse', -1)],
        delayed: [
          fx.delayed(1, [
            fx.stat('puissance', 2),
            fx.stat('vitesse', 1),
            fx.resource('forme', 4),
          ]),
        ],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
      choice({
        id: 'instinct',
        label: 'Continuer comme avant, ton instinct sait',
        stance: 'high_risk',
        riskPreview: 'Aucune coupure dans ta saison, un corps qui triche.',
        immediate: [
          fx.resource('forme', 2),
          fx.chance(0.35, [fx.resource('sante', -8)]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 2), fx.hidden('constance', 1)],
      }),
    ],
  }),

  // ————————————————— 24–28 ans —————————————————

  dilemma({
    id: 'p7_age_poids_cadre',
    title: 'Cadre, que tu le veuilles ou non',
    body: 'Personne ne l’a annoncé officiellement, mais tout a changé : les jeunes te regardent après les défaites, {coach} te consulte sur la causerie, la presse veut ta réaction avant celle du capitaine. Le statut de cadre pèse chaque jour un peu plus lourd. Tu peux l’endosser pleinement, avec la charge mentale qui l’accompagne, ou protéger ton énergie et laisser ce rôle à d’autres.',
    category: 'mental',
    tags: ['age', 'statut', 'leadership'],
    rarity: 'common',
    weight: 12,
    ageMin: 24,
    ageMax: 28,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'endosser',
        label: 'Endosser le rôle, porter le groupe',
        stance: 'collective',
        riskPreview: 'Un vestiaire derrière toi, une énergie qui file.',
        immediate: [
          fx.stat('leadership', 2),
          fx.resource('cohesionVestiaire', 5),
          fx.relation('teammates', 5),
          fx.resource('fatigue', 5),
          fx.resource('bienEtre', -3),
        ],
        hidden: [fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'bulle',
        label: 'Protéger ta bulle, déléguer le poids',
        stance: 'individualist',
        riskPreview: 'Ton niveau préservé, un rôle qui t’échappe.',
        immediate: [
          fx.resource('bienEtre', 5),
          fx.resource('forme', 2),
          fx.relation('teammates', -4),
          fx.resource('confianceEntraineur', -3),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_fonder_famille',
    title: 'Un enfant, en pleine ascension',
    body: 'Ta compagne pose la question sans détour : un enfant, maintenant. Ta carrière décolle enfin — saison charnière, regards des grands clubs, chaque détail compte. Elle a mis sa propre vie entre parenthèses pour suivre la tienne, de ville en ville. Attendre encore, c’est peut-être attendre toujours. Accepter, c’est ajouter des nuits blanches à une saison qui n’en tolère aucune.',
    category: 'family',
    tags: ['age', 'famille', 'couple'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 24,
    ageMax: 28,
    cooldownSeasons: 0,
    unique: true,
    choices: [
      choice({
        id: 'fonder',
        label: 'Fonder cette famille sans attendre',
        stance: 'emotional',
        riskPreview: 'Une vie qui s’agrandit, des nuits qui raccourcissent.',
        immediate: [
          fx.relation('partner', 10),
          fx.resource('bienEtre', 6),
          fx.resource('fatigue', 4),
        ],
        delayed: [fx.delayed(1, [fx.resource('moral', 4)])],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'attendre',
        label: 'Attendre d’avoir atteint le sommet',
        stance: 'ambitious',
        riskPreview: 'La carrière d’abord, un compte à rebours ailleurs.',
        immediate: [
          fx.relation('partner', -8),
          fx.resource('forme', 3),
          fx.resource('confianceEntraineur', 3),
        ],
        delayed: [
          fx.delayed(2, [
            fx.chance(0.35, [
              fx.relation('partner', -6),
              fx.resource('moral', -5),
            ]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
    ],
  }),

  // ————————————————— 30–33 ans —————————————————

  dilemma({
    id: 'p7_age_premier_vous',
    title: 'Le stagiaire t’a dit « vous »',
    body: 'Un stagiaire du centre t’a tenu la porte ce matin et t’a dit « vous ». Il a bafouillé, demandé une photo pour son père — son père, qui te regardait jouer « quand il était jeune ». Le vestiaire a ri. Toi, un peu moins. Le miroir est brutal : pour eux, tu es déjà un ancien. Reste à décider ce que tu fais de ce statut.',
    category: 'mental',
    tags: ['age', 'statut', 'transmission'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 30,
    ageMax: 33,
    cooldownSeasons: 0,
    unique: true,
    choices: [
      choice({
        id: 'accueillir',
        label: 'L’inviter à bosser avec toi après la séance',
        stance: 'collective',
        riskPreview: 'Un rôle d’ancien assumé, du temps donné aux autres.',
        immediate: [
          fx.relation('teammates', 6),
          fx.resource('cohesionVestiaire', 4),
          fx.resource('fatigue', 3),
        ],
        delayed: [fx.delayed(1, [fx.stat('leadership', 1)])],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'esquiver',
        label: 'Sourire, esquiver, rester un joueur parmi d’autres',
        stance: 'resilient',
        riskPreview: 'Le musée attendra, mais lui ne t’oubliera pas.',
        immediate: [
          fx.resource('moral', 4),
          fx.resource('forme', 2),
          fx.relation('teammates', -3),
        ],
        hidden: [fx.hidden('ambition', 2), fx.hidden('constance', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_jouer_intelligence',
    title: 'Un mètre de moins, un temps d’avance',
    body: 'Les données du staff sont formelles : ta pointe de vitesse a baissé, et elle ne reviendra pas. Passé trente ans, deux routes s’ouvrent. Réinventer ton jeu — placement, tempo, une touche de balle — comme les grands anciens l’ont fait. Ou traquer chaque dixième perdu à coups de protocoles pointus et coûteux, pour rester le joueur que tu as toujours été.',
    category: 'training',
    tags: ['age', 'reconversion', 'corps'],
    rarity: 'common',
    weight: 12,
    ageMin: 30,
    ageMax: 33,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'intelligence',
        label: 'Réinventer ton jeu : placement et tempo',
        stance: 'professional',
        riskPreview: 'Une seconde carrière qui s’ouvre, un style qui s’éteint.',
        immediate: [
          fx.stat('vitesse', -2),
          fx.stat('placement', 2),
          fx.stat('tactique', 2),
          fx.resource('reputationSportive', -2),
        ],
        hidden: [fx.hidden('adaptabilite', 3)],
      }),
      choice({
        id: 'vitesse',
        label: 'Traquer chaque dixième, protocoles à l’appui',
        stance: 'high_risk',
        riskPreview: 'Ton jeu intact encore un temps, à quel prix ?',
        immediate: [
          fx.stat('vitesse', 1),
          fx.resource('fatigue', 8),
          fx.resource('sante', -4),
          fx.cash(-8000),
        ],
        hidden: [fx.hidden('fragilitePhysique', 2), fx.hidden('ambition', 2)],
      }),
    ],
  }),

  // ————————————————— 34–39 ans —————————————————

  dilemma({
    id: 'p7_age_corps_du_matin',
    title: 'Le corps du matin',
    body: 'Chaque matin, ton corps présente l’addition : cheville raide, dos verrouillé, vingt minutes avant de marcher normalement. Sur le terrain, à l’échauffement, tout finit par rentrer dans l’ordre — pour l’instant. Le staff médical ne sait rien de tes réveils. En parler, c’est risquer des rotations, une étiquette. Te taire, c’est parier chaque semaine sur un corps qui négocie de plus en plus cher.',
    category: 'lifestyle',
    tags: ['age', 'corps', 'fin_carriere'],
    rarity: 'common',
    weight: 12,
    ageMin: 34,
    ageMax: 38,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'parler',
        label: 'Tout dire au staff médical',
        stance: 'professional',
        riskPreview: 'Un corps suivi de près, un doute semé dans les têtes.',
        immediate: [
          fx.resource('sante', 5),
          fx.resource('forme', 2),
          fx.chance(0.4, [fx.resource('confianceEntraineur', -5)]),
        ],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'taire',
        label: 'Serrer les dents, ne rien montrer',
        stance: 'resilient',
        riskPreview: 'Ta place protégée, ton corps en sursis.',
        immediate: [
          fx.resource('confianceEntraineur', 3),
          fx.resource('fatigue', 6),
          fx.chance(0.3, [fx.resource('sante', -8)]),
        ],
        hidden: [
          fx.hidden('resistancePression', 2),
          fx.hidden('fragilitePhysique', 2),
        ],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_transmettre',
    title: 'Celui qui prendra ta place',
    body: 'Le directeur sportif te le demande sans détour : encadrer le gamin qui joue à ton poste, lui apprendre tes courses, tes raccourcis, tes secrets d’ancien. Tout le monde sait comment cette histoire finit — c’est lui qui prendra ta place, plus tôt si tu l’aides bien. Transmettre, c’est peut-être précipiter ta sortie. Garder tes secrets, c’est trahir quelque chose de plus grand.',
    category: 'training',
    tags: ['age', 'transmission', 'fin_carriere'],
    rarity: 'common',
    weight: 11,
    ageMin: 34,
    ageMax: 38,
    cooldownSeasons: 4,
    echoes: [
      {
        flag: 'capitaine_un_soir',
        text: '{years} saisons plus tôt, un coach posait le brassard devant toi pour la première fois.',
      },
    ],
    choices: [
      choice({
        id: 'transmettre',
        label: 'Tout lui donner, même tes secrets',
        stance: 'collective',
        riskPreview: 'Un héritage qui vit, une place qui se libère plus vite.',
        immediate: [
          fx.relation('teammates', 7),
          fx.resource('cohesionVestiaire', 5),
          fx.resource('confianceEntraineur', 4),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.4, [
              fx.resource('reputationSportive', -4),
              fx.resource('moral', -4),
            ]),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'garder',
        label: 'L’aider poliment, garder l’essentiel pour toi',
        stance: 'individualist',
        riskPreview: 'Ta place défendue, une occasion de compter manquée.',
        immediate: [
          fx.resource('forme', 2),
          fx.resource('reputationSportive', 2),
          fx.relation('teammates', -4),
        ],
        hidden: [fx.hidden('ambition', 2), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_age_dernier_contrat',
    title: 'Le dernier contrat',
    body: '{agent} étale trois offres sur la table, puis se tait. Le club de tes débuts, qui offre une fin d’histoire et un salaire divisé. Un championnat lointain, qui paie ce que ton corps vaut encore. Le haut niveau, qui propose un banc et un rôle de sage. C’est le dernier contrat — celui qui décide du dernier souvenir que tu laisseras.',
    category: 'contract',
    tags: ['age', 'fin_carriere', 'contrat'],
    rarity: 'rare',
    weight: 4,
    ageMin: 35,
    ageMax: 39,
    cooldownSeasons: 0,
    unique: true,
    echoes: [
      {
        flag: 'seen:p7_age_premier_contrat_parents',
        text: 'Il y a {years} saisons, tes parents retenaient leur souffle devant ton premier contrat.',
      },
      {
        flag: 'contract_signed',
        text: 'Tu as signé bien des contrats depuis le premier, il y a {years} saisons. Celui-ci ferme la boucle.',
      },
    ],
    choices: [
      choice({
        id: 'retour',
        label: 'Boucler la boucle au club de tes débuts',
        stance: 'emotional',
        riskPreview: 'Une sortie en héros local, un salaire divisé par trois.',
        immediate: [
          fx.relation('fans', 10),
          fx.resource('moral', 8),
          fx.resource('popularite', 5),
          fx.resource('financesPersonnelles', -5),
        ],
        hidden: [fx.hidden('loyaute', 4)],
      }),
      choice({
        id: 'lointain',
        label: 'Signer loin, pour le dernier gros chèque',
        stance: 'financial',
        riskPreview: 'Ta famille à l’abri, une fin loin des regards.',
        immediate: [
          fx.cash(60000),
          fx.resource('popularite', -4),
          fx.relation('fans', -6),
          fx.relation('family', -4),
        ],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'sommet',
        label: 'Rester au sommet, accepter le banc',
        stance: 'resilient',
        riskPreview: 'Le très haut niveau jusqu’au bout, depuis le banc.',
        immediate: [
          fx.resource('reputationSportive', 4),
          fx.resource('confianceEntraineur', 3),
          fx.resource('moral', -4),
          fx.resource('forme', -2),
        ],
        hidden: [
          fx.hidden('professionnalisme', 3),
          fx.hidden('resistancePression', 2),
        ],
      }),
    ],
  }),
]
