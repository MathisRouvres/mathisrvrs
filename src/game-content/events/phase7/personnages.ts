import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes liés aux personnages récurrents — Phase 7.
 * 15 dilemmes : 3 par personnage ({coach}, {coequipier}, {rival}, {agent}, {journaliste}).
 */
export const personnagesDilemmas: DilemmaDefinition[] = [
  // ── {coach} ──────────────────────────────────────────────

  dilemma({
    id: 'p7_npc_coach_secret',
    title: 'Le secret d’avant-match de {coach}',
    body: 'Veille de quart de finale. {coach} te retient après la causerie, ferme la porte et baisse la voix : si le club perd demain, il sera démis dans la foulée, la décision est déjà signée. Personne d’autre ne sait. Il te demande de garder ça pour toi. Toi, tu penses au vestiaire, qui mérite peut-être de savoir pour qui il va se battre demain soir.',
    category: 'coach',
    tags: ['npc', 'coach', 'secret'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 20,
    ageMax: 38,
    cooldownSeasons: 4,
    echoes: [
      {
        flag: 'coach_ally',
        text: '{years} saisons plus tôt, {coach} avait fait de toi son allié dans le vestiaire.',
      },
    ],
    choices: [
      choice({
        id: 'garder',
        label: 'Garder le secret et jouer ce match pour lui',
        stance: 'loyal',
        riskPreview: 'Un poids énorme à porter seul jusqu’au coup d’envoi.',
        immediate: [fx.relation('coach', 8), fx.resource('moral', -4)],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'cadres',
        label: 'Prévenir discrètement les cadres du vestiaire',
        stance: 'collective',
        riskPreview: 'Le groupe peut se souder — ou le secret peut fuiter.',
        immediate: [
          fx.resource('cohesionVestiaire', 6),
          fx.relation('teammates', 5),
          fx.chance(0.35, [fx.relation('coach', -8), fx.resource('confianceEntraineur', -6)]),
        ],
        hidden: [fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_coach_mensonge',
    title: '{coach} te demande de mentir',
    body: 'Défaite lourde, direction furieuse. Devant la presse, {coach} a affirmé que le changement tactique raté venait du terrain — de toi. Ce soir, il t’appelle : il te demande de confirmer sa version demain en zone mixte, « pour protéger le projet ». Assumer un mensonge qui te salit, le contredire publiquement, ou noyer la question sans trancher ? Chaque option a un prix.',
    category: 'coach',
    tags: ['npc', 'coach', 'mensonge'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 19,
    ageMax: 37,
    cooldownSeasons: 4,
    echoes: [
      {
        flag: 'coach_feud',
        text: '{years} saisons plus tôt, un clash t’avait déjà opposé à {coach} devant le groupe.',
      },
    ],
    choices: [
      choice({
        id: 'couvrir',
        label: 'Confirmer sa version et porter le chapeau',
        stance: 'loyal',
        riskPreview: 'Sa dette envers toi grandit, ton image trinque.',
        immediate: [
          fx.relation('coach', 8),
          fx.resource('reputationSportive', -6),
          fx.resource('moral', -4),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'verite',
        label: 'Rétablir la vérité, calmement, devant la presse',
        stance: 'ethical',
        riskPreview: 'Ton honneur sauvé, ta relation avec lui sacrifiée.',
        immediate: [
          fx.relation('coach', -10),
          fx.relation('media', 5),
          fx.resource('moral', 4),
          fx.flag('coach_feud'),
        ],
        hidden: [fx.hidden('loyaute', -2)],
      }),
      choice({
        id: 'flou',
        label: 'Noyer la question, rester soudés',
        stance: 'media_savvy',
        riskPreview: 'Personne n’est trahi, personne n’est satisfait.',
        immediate: [
          fx.relation('coach', 3),
          fx.relation('media', -4),
          fx.resource('moral', -2),
        ],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_coach_jubile',
    title: 'Le jubilé de {coach}',
    body: 'Le club organise le jubilé de {coach} : quarante ans de banc, un stade plein, et toi au micro pour le discours. Vous avez tout traversé — les engueulades, les titres, les silences. Tu peux dire ce qu’il a vraiment été pour toi, au risque de craquer devant tout le monde, ou dérouler l’hommage convenu qu’on attend de toi ce soir-là.',
    category: 'coach',
    tags: ['npc', 'coach', 'jubile'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 26,
    ageMax: 39,
    unique: true,
    echoes: [
      {
        flag: 'coach_ally',
        text: '{years} saisons plus tôt, {coach} t’avait défendu quand tout le monde doutait de toi.',
      },
      {
        flag: 'coach_feud',
        text: '{years} saisons plus tôt, vous vous étiez déchirés — et vous êtes encore là, tous les deux.',
      },
    ],
    choices: [
      choice({
        id: 'coeur',
        label: 'Dire ce qu’il a vraiment été pour toi',
        stance: 'emotional',
        riskPreview: 'La voix peut se briser devant quarante mille personnes.',
        immediate: [
          fx.relation('coach', 12),
          fx.resource('popularite', 4),
          fx.flag('mentor_debt'),
          fx.chance(0.35, [fx.relation('media', -4)]),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'sobre',
        label: 'Un hommage sobre, maîtrisé, professionnel',
        stance: 'professional',
        riskPreview: 'Un discours impeccable, une occasion manquée.',
        immediate: [
          fx.relation('media', 4),
          fx.resource('reputationSportive', 3),
          fx.relation('coach', -4),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('loyaute', -1)],
      }),
    ],
  }),

  // ── {coequipier} ─────────────────────────────────────────

  dilemma({
    id: 'p7_npc_teammate_mariage',
    title: 'Le mariage de {coequipier}',
    body: 'Samedi, demi-finale de coupe nationale. Vendredi soir, à trois heures de route : le mariage de {coequipier}, ton frère de vestiaire depuis des années. Il t’a placé à la table d’honneur. Le staff a fait passer le message : les titulaires restent au centre. Tu peux t’asseoir à sa table et rentrer dans la nuit, ou protéger ton match et manquer le plus beau soir de sa vie.',
    category: 'teammates',
    tags: ['npc', 'coequipier', 'mariage'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 20,
    ageMax: 36,
    unique: true,
    choices: [
      choice({
        id: 'y_aller',
        label: 'T’asseoir à sa table et rouler de nuit',
        stance: 'loyal',
        riskPreview: 'Une amitié honorée, une préparation sabotée.',
        immediate: [
          fx.relation('teammates', 8),
          fx.resource('fatigue', 8),
          fx.resource('moral', 4),
          fx.chance(0.3, [fx.resource('confianceEntraineur', -6)]),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'rester',
        label: 'Envoyer un mot sincère et préparer ta demi-finale',
        stance: 'professional',
        riskPreview: 'Le métier avant tout — il s’en souviendra.',
        immediate: [
          fx.resource('forme', 3),
          fx.resource('confianceEntraineur', 4),
          fx.relation('teammates', -6),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_teammate_depression',
    title: 'Les silences de {coequipier}',
    body: '{coequipier} n’est plus le même. Les vannes ont cessé, il mange seul, s’éclipse des soins avant tout le monde. L’autre soir, sur le parking, tu l’as vu rester vingt minutes immobile dans sa voiture. Personne au club n’a rien remarqué — ou personne ne veut voir. Il ne t’a rien demandé. C’est peut-être justement pour ça que tu es le seul à pouvoir agir.',
    category: 'teammates',
    tags: ['npc', 'coequipier', 'sante_mentale'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 18,
    ageMax: 38,
    unique: true,
    echoes: [
      {
        flag: 'defended_teammate',
        text: '{years} saisons plus tôt, tu avais déjà pris sa défense quand le vestiaire l’accablait.',
      },
    ],
    choices: [
      choice({
        id: 'accompagner',
        label: 'Être là, chaque jour, sans rien dire à personne',
        stance: 'emotional',
        riskPreview: 'Tu portes son fardeau en silence, sans garantie.',
        immediate: [
          fx.relation('teammates', 6),
          fx.resource('bienEtre', -3),
          fx.flag('friendship_deep'),
        ],
        delayed: [
          fx.delayed(1, [fx.relation('teammates', 6), fx.resource('cohesionVestiaire', 5)]),
        ],
        hidden: [fx.hidden('loyaute', 4)],
      }),
      choice({
        id: 'alerter',
        label: 'Alerter le staff médical, même s’il t’en veut',
        stance: 'ethical',
        riskPreview: 'Il sera pris en charge — et se sentira trahi.',
        immediate: [
          fx.relation('teammates', -5),
          fx.resource('confianceEntraineur', 3),
        ],
        delayed: [fx.delayed(1, [fx.relation('teammates', 8)])],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_teammate_transfert',
    title: '{coequipier} signe chez {club_rival}',
    body: 'L’annonce tombe un mardi : {coequipier} est transféré chez {club_rival}. Ton frère de jeu portera le maillot que ton stade déteste. Les supporters le traitent déjà de traître, les journalistes guettent ta réaction, et son numéro s’affiche sur ton téléphone. Défendre publiquement son choix, c’est te mettre une partie du stade à dos. Te taire, c’est le laisser seul dans la tempête.',
    category: 'teammates',
    tags: ['npc', 'coequipier', 'transfert'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 19,
    ageMax: 38,
    unique: true,
    echoes: [
      {
        flag: 'friendship_deep',
        text: 'Tu l’avais accompagné dans ses saisons les plus sombres, sans jamais en parler à personne.',
      },
    ],
    choices: [
      choice({
        id: 'defendre',
        label: 'Défendre son choix face caméra',
        stance: 'loyal',
        riskPreview: 'L’amitié assumée, une partie du stade contre toi.',
        immediate: [
          fx.relation('friends', 8),
          fx.relation('fans', -6),
          fx.resource('popularite', -3),
        ],
        hidden: [fx.hidden('loyaute', 4)],
      }),
      choice({
        id: 'neutre',
        label: 'Rester neutre en public, le derby avant l’amitié',
        stance: 'media_savvy',
        riskPreview: 'Le stade apaisé, un ami abandonné à la meute.',
        immediate: [
          fx.relation('fans', 4),
          fx.relation('friends', -7),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('loyaute', -3)],
      }),
    ],
  }),

  // ── {rival} ──────────────────────────────────────────────

  dilemma({
    id: 'p7_npc_rival_main_tendue',
    title: 'La main tendue de {rival}',
    body: 'La pire défaite de ta carrière. Humilié devant ton public, sifflé jusqu’au tunnel. Et dans le couloir, une silhouette t’attend : {rival}. Pas de caméra, pas de témoin. Il te tend la main : « Les soirs comme ça, on les connaît tous les deux. » Toute votre histoire tient dans ce geste. L’accepter, c’est changer la nature de votre duel. La refuser, c’est rester fidèle à la rivalité qui t’a construit.',
    category: 'rivalry',
    tags: ['npc', 'rival', 'respect'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 20,
    ageMax: 39,
    cooldownSeasons: 5,
    prerequisites: [{ type: 'minRivalRelation', value: 55 }],
    choices: [
      choice({
        id: 'accepter',
        label: 'Serrer cette main et parler jusqu’à la nuit',
        stance: 'emotional',
        riskPreview: 'Un allié inattendu — et une rage qui s’adoucit.',
        immediate: [fx.resource('moral', 7), fx.resource('bienEtre', 4)],
        hidden: [fx.hidden('constance', 2), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'decliner',
        label: 'Passer : votre duel n’est pas fini',
        stance: 'resilient',
        riskPreview: 'La flamme intacte, la solitude aussi.',
        immediate: [fx.resource('moral', -3)],
        hidden: [fx.hidden('ambition', 3), fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_rival_provocation',
    title: '{rival} te provoque en pleine interview',
    body: 'En interview d’avant-match, {rival} lâche sa punchline : tu serais « un joueur d’entraînement », incapable de répondre présent les grands soirs. La phrase tourne en boucle, tes proches s’agacent, ton vestiaire attend ta réponse. Tu peux répondre par les mots, répondre par le terrain, ou refuser d’alimenter le feuilleton qui fait vendre — mais le silence aussi sera commenté.',
    category: 'rivalry',
    tags: ['npc', 'rival', 'provocation'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 18,
    ageMax: 38,
    cooldownSeasons: 4,
    prerequisites: [{ type: 'maxRivalRelation', value: 40 }],
    echoes: [
      {
        flag: 'rival_feud',
        text: 'La guerre froide entre {rival} et toi couve depuis {years} saisons déjà.',
      },
    ],
    choices: [
      choice({
        id: 'punchline',
        label: 'Répondre par une punchline encore plus cinglante',
        stance: 'media_savvy',
        riskPreview: 'Le public adore, l’escalade est lancée.',
        immediate: [
          fx.resource('popularite', 5),
          fx.relation('media', 4),
          fx.flag('rival_feud'),
          fx.chance(0.3, [fx.resource('discipline', -4)]),
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'terrain',
        label: 'Ne rien dire et cocher la date du match',
        stance: 'resilient',
        riskPreview: 'La seule réponse qui compte se joue à onze.',
        immediate: [
          fx.resource('discipline', 3),
          fx.skillCheck(
            'hidden',
            'grandsMatchs',
            50,
            [fx.resource('reputationSportive', 7), fx.relation('fans', 5)],
            [fx.resource('moral', -5)],
          ),
        ],
        hidden: [fx.hidden('resistancePression', 3)],
      }),
      choice({
        id: 'desamorcer',
        label: 'Désamorcer avec humour, refuser le feuilleton',
        stance: 'professional',
        riskPreview: 'L’incendie éteint, le feuilleton meurt — toi avec, un peu.',
        immediate: [
          fx.relation('media', 3),
          fx.resource('popularite', -3),
          fx.resource('bienEtre', 3),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_rival_documentaire',
    title: 'Un documentaire sur {rival} et toi',
    body: 'Une plateforme veut raconter votre duel : dix ans de carrières parallèles, deux épisodes, caméras dans l’intimité des deux camps. {rival} a déjà dit oui. Le cachet est réel, l’exposition immense — et le montage t’échappera complètement. Refuser, c’est le laisser raconter votre histoire tout seul, avec sa version des faits en guise de vérité. Ton entourage est partagé.',
    category: 'media',
    tags: ['npc', 'rival', 'documentaire'],
    rarity: 'rare',
    weight: 4,
    ageMin: 24,
    ageMax: 39,
    unique: true,
    choices: [
      choice({
        id: 'signer',
        label: 'Signer et ouvrir tes portes aux caméras',
        stance: 'media_savvy',
        riskPreview: 'Une exposition énorme, un montage hors de contrôle.',
        immediate: [
          fx.cash(30000),
          fx.resource('popularite', 8),
          fx.relation('media', 5),
          fx.chance(0.35, [fx.resource('bienEtre', -5), fx.relation('partner', -4)]),
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser et garder ton histoire pour toi',
        stance: 'prudent',
        riskPreview: 'Ta vie protégée, sa version comme seule vérité.',
        immediate: [
          fx.resource('bienEtre', 4),
          fx.resource('popularite', -4),
          fx.chance(0.3, [fx.relation('media', -4)]),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  // ── {agent} ──────────────────────────────────────────────

  dilemma({
    id: 'p7_npc_agent_larmes',
    title: '{agent} pleure dans ta cuisine',
    body: 'Il est vingt-trois heures quand {agent} sonne chez toi. L’homme qui a négocié chacun de tes contrats s’effondre dans ta cuisine : ses trois autres clients l’ont quitté pour une grosse agence, il est au bord de la faillite. Tu es tout ce qui lui reste. Le garder, c’est peut-être freiner ta carrière par fidélité. Le quitter maintenant, c’est l’achever.',
    category: 'agent',
    tags: ['npc', 'agent', 'fidelite'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 21,
    ageMax: 37,
    unique: true,
    echoes: [
      {
        flag: 'agent_all_in',
        text: '{years} saisons plus tôt, {agent} avait tout misé sur toi quand personne n’y croyait.',
      },
    ],
    choices: [
      choice({
        id: 'rester',
        label: 'Rester avec lui, envers et contre tout',
        stance: 'loyal',
        riskPreview: 'Une fidélité rare — et un agent affaibli à la table.',
        immediate: [fx.resource('moral', 4), fx.flag('agent_crisis')],
        delayed: [fx.delayed(1, [fx.chance(0.4, [fx.cash(-15000)])])],
        hidden: [fx.hidden('loyaute', 4)],
      }),
      choice({
        id: 'partir',
        label: 'Rejoindre une grande agence, la mort dans l’âme',
        stance: 'financial',
        riskPreview: 'Ta carrière optimisée, un homme laissé au sol.',
        immediate: [fx.resource('moral', -5)],
        delayed: [fx.delayed(1, [fx.cash(20000), fx.resource('reputationSportive', 3)])],
        hidden: [fx.hidden('loyaute', -4), fx.hidden('ambition', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_agent_montage',
    title: 'Le montage « limite » de {agent}',
    body: '{agent} arrive avec un dossier épais : une société-écran dans l’Archipel du Sel pour loger tes droits à l’image. « Tout le monde le fait, c’est légal… disons gris », sourit-il. À la clé, des sommes considérables économisées chaque saison. Mais si un journaliste remonte la piste un jour, ton nom sera en première page. Il attend ta signature avant vendredi.',
    category: 'agent',
    tags: ['npc', 'agent', 'argent'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 20,
    ageMax: 37,
    cooldownSeasons: 5,
    choices: [
      choice({
        id: 'signer',
        label: 'Signer le montage et empocher la différence',
        stance: 'financial',
        riskPreview: 'Un gain immédiat, une piste qui dort dans un dossier.',
        immediate: [fx.cash(25000)],
        delayed: [
          fx.delayed(2, [
            fx.chance(0.3, [
              fx.resource('reputationSportive', -10),
              fx.relation('media', -8),
              fx.flag('media_crisis'),
            ]),
          ]),
        ],
        hidden: [fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser net : pas de zone grise avec ton nom',
        stance: 'ethical',
        riskPreview: 'La conscience tranquille, l’agent vexé.',
        immediate: [fx.resource('moral', 3)],
        delayed: [fx.delayed(1, [fx.chance(0.3, [fx.cash(-8000)])])],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
      choice({
        id: 'audit',
        label: 'Faire auditer le montage par un avocat indépendant',
        stance: 'prudent',
        riskPreview: 'Un avis fiable, une facture salée, un agent froissé.',
        immediate: [
          fx.cash(-6000),
          fx.chance(0.5, [fx.cash(15000), fx.resource('financesPersonnelles', 3)]),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('constance', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_agent_frere',
    title: '{agent} veut signer ton petit frère',
    body: 'Ton petit frère vient de signer son premier contrat espoir, et {agent} est déjà dans le salon familial, sourire aux lèvres et mandat en main. Il t’a bien géré, c’est vrai. Mais confier deux carrières au même homme, c’est aussi lier vos destins — et tu sais comment il travaille quand tout va mal. Ta mère attend ton avis. Ton frère, lui, est déjà conquis.',
    category: 'agent',
    tags: ['npc', 'agent', 'famille'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 21,
    ageMax: 34,
    unique: true,
    echoes: [
      {
        flag: 'agent_crisis',
        text: 'Tu as vu {agent} au fond du trou, un soir dans ta cuisine, il y a {years} saisons.',
      },
    ],
    choices: [
      choice({
        id: 'benir',
        label: 'Donner ta bénédiction à l’agent',
        stance: 'loyal',
        riskPreview: 'La famille unie derrière un seul homme.',
        immediate: [fx.relation('family', 5), fx.resource('moral', 3)],
        delayed: [
          fx.delayed(2, [
            fx.chance(0.35, [fx.relation('family', -6), fx.resource('moral', -4)]),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'proteger',
        label: 'Orienter ton frère vers une autre agence',
        stance: 'prudent',
        riskPreview: 'Deux destins séparés, un frère furieux ce soir.',
        immediate: [fx.relation('family', -4), fx.resource('bienEtre', 3)],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  // ── {journaliste} ────────────────────────────────────────

  dilemma({
    id: 'p7_npc_journaliste_scandale',
    title: '{journaliste} a des preuves',
    body: '{journaliste} te montre trois documents sur la table d’un café discret : des primes dissimulées par la direction de ton club, des signatures, des dates. L’article sortira, avec ou sans toi. Il te propose de confirmer, en source anonyme, « pour que la vérité soit complète ». Protéger le club qui te fait vivre, ou l’aider à faire tomber des dirigeants que tu sais coupables ?',
    category: 'media',
    tags: ['npc', 'journaliste', 'scandale'],
    rarity: 'rare',
    weight: 4,
    ageMin: 20,
    ageMax: 38,
    unique: true,
    choices: [
      choice({
        id: 'confirmer',
        label: 'Confirmer, en source anonyme',
        stance: 'ethical',
        riskPreview: 'La vérité sortira — l’anonymat n’est jamais garanti.',
        immediate: [
          fx.flag('media_crisis'),
          fx.relation('media', 6),
          fx.resource('moral', 4),
          fx.chance(0.35, [
            fx.resource('confianceEntraineur', -8),
            fx.resource('reputationSportive', -5),
          ]),
        ],
        hidden: [fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'proteger',
        label: 'Ne rien confirmer et prévenir la direction',
        stance: 'loyal',
        riskPreview: 'Le club te devra beaucoup, ta conscience moins.',
        immediate: [
          fx.resource('confianceEntraineur', 6),
          fx.relation('media', -8),
          fx.resource('moral', -4),
        ],
        hidden: [fx.hidden('loyaute', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_journaliste_biographie',
    title: '{journaliste} écrit ta biographie',
    body: '{journaliste} suit ta carrière depuis tes débuts. Il prépare ta biographie — elle se fera, avec ou sans ton accord. Il t’offre de collaborer : des heures d’entretien, tes doutes, tes coulisses, en échange d’un droit de regard. Tu connais sa plume : honnête, mais sans complaisance. Ouvrir ta mémoire à cet homme, ou le laisser écrire de l’extérieur et découvrir le livre comme tout le monde ?',
    category: 'media',
    tags: ['npc', 'journaliste', 'biographie'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 27,
    ageMax: 39,
    unique: true,
    echoes: [
      {
        flag: 'media_storm',
        text: 'La tempête médiatique d’il y a {years} saisons occupera forcément un chapitre.',
      },
    ],
    choices: [
      choice({
        id: 'collaborer',
        label: 'Collaborer : tes mots plutôt que des rumeurs',
        stance: 'media_savvy',
        riskPreview: 'Ton récit maîtrisé — presque entièrement.',
        immediate: [
          fx.relation('media', 6),
          fx.resource('popularite', 5),
          fx.chance(0.3, [fx.relation('partner', -4), fx.resource('bienEtre', -3)]),
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'distance',
        label: 'Refuser : ta vie ne se raconte pas encore',
        stance: 'prudent',
        riskPreview: 'Ta pudeur préservée, sa version sans contrepoids.',
        immediate: [fx.relation('media', -5), fx.resource('bienEtre', 4)],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p7_npc_journaliste_exclusivite',
    title: 'Une exclusivité sur ta blessure',
    body: 'Le club a annoncé « une indisponibilité de plusieurs semaines », sans détail, et les rumeurs enflent : certaines disent ta saison finie. {journaliste} te propose une interview exclusive pour raconter ta blessure, ta rééducation, ta vérité. Le service com du club veut garder le contrôle total. Reprendre ton récit en main, ou laisser l’institution parler pour toi ?',
    category: 'media',
    tags: ['npc', 'journaliste', 'blessure'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 19,
    ageMax: 39,
    cooldownSeasons: 4,
    echoes: [
      {
        flag: 'injury_hidden',
        text: '{years} saisons plus tôt, tu avais caché une blessure pour continuer à jouer.',
      },
    ],
    choices: [
      choice({
        id: 'exclu',
        label: 'Accorder l’exclusivité à {journaliste}',
        stance: 'media_savvy',
        riskPreview: 'Ta version imposée, le club court-circuité.',
        immediate: [
          fx.relation('media', 7),
          fx.resource('popularite', 4),
          fx.relation('coach', -5),
        ],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'club',
        label: 'Laisser le club gérer la communication',
        stance: 'professional',
        riskPreview: 'Aucune vague — et les rumeurs continuent d’enfler.',
        immediate: [
          fx.resource('confianceEntraineur', 5),
          fx.relation('media', -4),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),
]
