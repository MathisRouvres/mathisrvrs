import { dilemma, choice, chainEpisode, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Chaînes narratives B — Phase 7 (mémoire, personnages, chaînes longues).
 * 4 histoires en 15 événements, espacées sur plusieurs saisons via fx.queue :
 * promesse au club (4), rivalité internationale (5), retour au club
 * formateur (3), crise médiatique (3).
 * Flags posés ici : club_promise_kept, club_promise_broken, rival_finale,
 * home_return, media_crisis, arrogant_reputation.
 */
export const chainesBDilemmas: DilemmaDefinition[] = [
  // ——— Chaîne 1 : la promesse au club ———
  dilemma({
    id: 'p7_chain_promesse_club_start',
    title: 'Une promesse devant tout un stade',
    body: 'Le club traverse une saison charnière : résultats en dents de scie, tribunes inquiètes, rumeurs de départ autour de toi. Avant le dernier match à domicile, le président propose un geste fort : prendre le micro au rond central et promettre publiquement de rester, quoi qu’il arrive. Le kop retient son souffle. {agent} te glisse qu’une carrière ne se joue jamais sur une phrase. Le micro arrive vers toi.',
    category: 'contract',
    tags: ['promesse', 'club'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 22,
    ageMax: 30,
    unique: true,
    echoes: [
      {
        flag: 'contract_extended',
        text: 'Tu avais déjà prolongé ici, il y a {years} saisons. Ce club est devenu ta maison.',
      },
    ],
    choices: [
      choice({
        id: 'jurer',
        label: 'Prendre le micro et jurer de rester',
        stance: 'loyal',
        riskPreview: 'Un serment pareil ne s’oublie jamais.',
        immediate: [
          fx.relation('fans', 10),
          fx.resource('popularite', 6),
          fx.resource('moral', 4),
          fx.debt('p7_promesse_club', 'Promesse publique de rester au club', 2),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_promesse_club_ep2_offre', 1)])],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'esquiver',
        label: 'Esquiver avec une formule prudente',
        stance: 'media_savvy',
        riskPreview: 'Liberté préservée, ferveur refroidie.',
        immediate: [
          fx.relation('fans', -6),
          fx.relation('media', 3),
          fx.resource('moral', -2),
        ],
        hidden: [fx.hidden('ambition', 2), fx.hidden('loyaute', -1)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_promesse_club_ep2_offre',
    previousEventId: 'p7_chain_promesse_club_start',
    title: 'L’offre qui teste ta parole',
    body: 'Deux saisons ont passé et le géant de la capitale dépose une offre historique : salaire triplé, coupe continentale, projet bâti autour de toi. {agent} parle de la chance d’une vie. Mais ta promesse tourne encore en boucle sur les réseaux, et le kop a déjà déployé sa banderole : « Un homme, une parole ». Le président attend ta réponse avant lundi.',
    tags: ['promesse', 'transfert'],
    echoes: [
      {
        flag: 'seen:p7_chain_promesse_club_start',
        text: 'Il y a {years} saisons, tu jurais devant le kop de ne jamais partir.',
      },
    ],
    choices: [
      choice({
        id: 'tenir',
        label: 'Tenir parole et refuser le géant',
        stance: 'ethical',
        riskPreview: 'L’histoire retiendra, l’occasion ne reviendra pas.',
        immediate: [
          fx.flag('club_promise_kept'),
          fx.relation('fans', 12),
          fx.resource('popularite', 6),
          fx.resource('reputationSportive', -2),
        ],
        delayed: [
          fx.delayed(1, [
            fx.queue('p7_chain_promesse_club_ep3_legende', 1),
            fx.resource('moral', -4),
          ]),
        ],
        hidden: [fx.hidden('loyaute', 4), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'partir',
        label: 'Rompre la promesse et signer là-bas',
        stance: 'ambitious',
        riskPreview: 'Le sommet t’attend, le kop n’oubliera pas.',
        immediate: [
          fx.flag('club_promise_broken'),
          fx.cash(60000),
          fx.resource('reputationSportive', 7),
          fx.relation('fans', -15),
          fx.resource('popularite', -8),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_promesse_club_ep3_retour', 1)])],
        hidden: [fx.hidden('ambition', 4), fx.hidden('loyaute', -4)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_promesse_club_ep3_legende',
    previousEventId: 'p7_chain_promesse_club_ep2_offre',
    title: 'L’homme d’une seule maison',
    body: 'Le club a traversé la tempête et ton nom est devenu un symbole : brassard cousu, tribune qui scande ton nom, gamins du centre qui réclament ton numéro. {journaliste} prépare un long portrait sur « l’homme qui a refusé le sommet ». Une question revient partout : referais-tu le même choix ? Le club attend une réponse publique et lisse. Toi, tu connais la vraie, plus fragile.',
    tags: ['promesse', 'heritage'],
    rarity: 'rare',
    prerequisites: [{ type: 'hasFlag', key: 'club_promise_kept' }],
    echoes: [
      {
        flag: 'club_promise_kept',
        text: '{years} saisons plus tôt, tu refusais un géant pour tenir parole.',
      },
    ],
    choices: [
      choice({
        id: 'icone',
        label: 'Assumer sans regret, devenir l’icône',
        stance: 'collective',
        riskPreview: 'Une légende locale, un doute enterré.',
        immediate: [
          fx.stat('leadership', 2),
          fx.relation('fans', 8),
          fx.relation('media', -3),
          fx.resource('bienEtre', 3),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'nuance',
        label: 'Avouer à {journaliste} que le doute existe',
        stance: 'emotional',
        riskPreview: 'L’honnêteté touche, la légende se fissure.',
        immediate: [
          fx.relation('media', 6),
          fx.relation('fans', -5),
          fx.resource('bienEtre', 5),
        ],
        hidden: [fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_promesse_club_ep3_retour',
    previousEventId: 'p7_chain_promesse_club_ep2_offre',
    title: 'Retour dans le stade trahi',
    body: 'Le calendrier n’a pas fait de cadeau : première journée retour, déplacement chez ton ancien club. Depuis une semaine, les ultras préparent leur accueil — banderoles sur ta promesse, sifflets répétés, ton nom détourné en chanson. Tes nouveaux coéquipiers observent comment tu portes ça, et {coach} propose même de te laisser au repos ce soir-là. Jouer, c’est affronter un stade entier. Te cacher, c’est leur donner raison.',
    tags: ['promesse', 'hostilite'],
    rarity: 'rare',
    prerequisites: [{ type: 'hasFlag', key: 'club_promise_broken' }],
    echoes: [
      {
        flag: 'club_promise_broken',
        text: 'Ce club n’a pas oublié ta promesse rompue.',
      },
    ],
    choices: [
      choice({
        id: 'jouer_sobre',
        label: 'Jouer, sans un geste vers les tribunes',
        stance: 'professional',
        riskPreview: 'La dignité paie, la haine reste.',
        immediate: [
          fx.resource('discipline', 4),
          fx.skillCheck(
            'stat',
            'sangFroid',
            50,
            [fx.resource('reputationSportive', 5), fx.resource('moral', 4)],
            [fx.resource('moral', -5), fx.resource('forme', -3)],
          ),
        ],
        delayed: [fx.delayed(1, [fx.resource('popularite', -3)])],
        hidden: [fx.hidden('resistancePression', 3)],
      }),
      choice({
        id: 'repos',
        label: 'Accepter le repos proposé par {coach}',
        stance: 'prudent',
        riskPreview: 'L’orage évité, l’étiquette de fuyard collée.',
        immediate: [
          fx.resource('sante', 3),
          fx.resource('moral', -4),
          fx.resource('reputationSportive', -5),
          fx.relation('media', -4),
        ],
        hidden: [fx.hidden('resistancePression', -2)],
      }),
    ],
  }),

  // ——— Chaîne 2 : la rivalité internationale avec {rival} ———
  dilemma({
    id: 'p7_chain_rival_nation_start',
    title: 'Deux noms pour une seule place',
    body: 'La liste de la sélection tombe : toi et {rival}, convoqués au même poste. Même âge, même génération, trajectoires parallèles depuis les équipes de jeunes — la presse du pays en a fait son feuilleton. Au premier entraînement, le sélectionneur est clair : un seul titulaire sortira du rassemblement. {rival} te serre la main un peu trop fort, un peu trop longtemps. Le duel de vos carrières commence.',
    category: 'national_team',
    tags: ['rivalite', 'selection'],
    rarity: 'uncommon',
    weight: 5,
    ageMin: 21,
    ageMax: 30,
    unique: true,
    prerequisites: [{ type: 'minResource', id: 'reputationSportive', value: 40 }],
    choices: [
      choice({
        id: 'jeu_collectif',
        label: 'Gagner ta place par le jeu, avec le groupe',
        stance: 'collective',
        riskPreview: 'Le mérite parle, le feuilleton te dépasse.',
        immediate: [
          fx.relation('teammates', 5),
          fx.resource('cohesionVestiaire', 4),
          fx.resource('popularite', -3),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_rival_nation_ep2_club', 1)])],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
      choice({
        id: 'defi_public',
        label: 'Déclarer en zone mixte que la place est à toi',
        stance: 'media_savvy',
        riskPreview: 'Le pays retient ton nom, {rival} aussi.',
        immediate: [
          fx.resource('popularite', 6),
          fx.relation('media', 4),
          fx.resource('cohesionVestiaire', -4),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_rival_nation_ep2_club', 1)])],
        hidden: [fx.hidden('ambition', 3)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_rival_nation_ep2_club',
    previousEventId: 'p7_chain_rival_nation_start',
    title: '{rival} t’attend au tournant',
    body: 'Le calendrier du championnat fait bien les choses : déplacement chez {club_rival}, l’équipe de {rival}, six jours avant l’annonce de la prochaine liste. Toute la semaine, les journaux ne parlent que de votre duel — le sélectionneur sera en tribune. {rival} a déclaré qu’il jouait « contre onze adversaires, pas contre un homme ». Élégance sincère ou piqûre calculée : à toi de choisir ton match.',
    tags: ['rivalite', 'duel'],
    echoes: [
      {
        flag: 'seen:p7_chain_rival_nation_start',
        text: 'Depuis {years} saisons, {rival} et toi vous disputez la même place en sélection.',
      },
    ],
    choices: [
      choice({
        id: 'duel_terrain',
        label: 'Chercher le duel direct, le dominer',
        stance: 'ambitious',
        riskPreview: 'Le gagnant prend la sélection, le perdant la une.',
        immediate: [
          fx.skillCheck(
            'hidden',
            'grandsMatchs',
            50,
            [fx.resource('reputationSportive', 7), fx.resource('moral', 5)],
            [fx.resource('moral', -6), fx.resource('confianceEntraineur', -3)],
          ),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_rival_nation_ep3_finale', 2)])],
        hidden: [fx.hidden('grandsMatchs', 2)],
      }),
      choice({
        id: 'match_equipe',
        label: 'Jouer pour l’équipe, ignorer le feuilleton',
        stance: 'professional',
        riskPreview: 'Le collectif d’abord, la lumière pour lui.',
        immediate: [
          fx.relation('coach', 5),
          fx.resource('discipline', 4),
          fx.resource('popularite', -3),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_rival_nation_ep3_finale', 2)])],
        hidden: [fx.hidden('constance', 3)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_rival_nation_ep3_finale',
    previousEventId: 'p7_chain_rival_nation_ep2_club',
    title: 'Une finale, vous deux, personne d’autre',
    body: 'Des années de duels ont mené ici : finale de la coupe continentale, ton club contre {club_rival}. Toi contre {rival}, à la une de tous les journaux du pays. Quatre-vingt-dix minutes pour solder une décennie de comparaisons. Dans le tunnel, il évite ton regard. {coequipier} te souffle : « Ce soir, ce n’est pas un match, c’est votre histoire. » Reste à décider laquelle tu veux écrire.',
    tags: ['finale', 'rivalite'],
    rarity: 'rare',
    echoes: [
      {
        flag: 'seen:p7_chain_rival_nation_ep2_club',
        text: 'Votre duel chez {club_rival}, il y a {years} saisons, n’a rien réglé.',
      },
    ],
    choices: [
      choice({
        id: 'jouer_juste',
        label: 'Jouer la finale, pas l’homme',
        stance: 'collective',
        riskPreview: 'Le trophée d’abord ; l’histoire attendra.',
        immediate: [
          fx.flag('rival_finale'),
          fx.resource('cohesionVestiaire', 4),
          fx.skillCheck(
            'stat',
            'sangFroid',
            52,
            [fx.resource('reputationSportive', 8), fx.resource('moral', 6)],
            [fx.resource('moral', -5)],
          ),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_rival_nation_ep4_respect', 1)])],
        hidden: [fx.hidden('grandsMatchs', 3)],
      }),
      choice({
        id: 'duel_personnel',
        label: 'En faire un duel personnel, l’écraser',
        stance: 'individualist',
        riskPreview: 'L’humilier peut te grandir ou te perdre.',
        immediate: [
          fx.flag('rival_finale'),
          fx.skillCheck(
            'hidden',
            'grandsMatchs',
            55,
            [fx.resource('reputationSportive', 9), fx.resource('popularite', 7)],
            [fx.resource('reputationSportive', -5), fx.resource('discipline', -4)],
          ),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_rival_nation_ep4_haine', 1)])],
        hidden: [fx.hidden('ambition', 3), fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_rival_nation_ep4_respect',
    previousEventId: 'p7_chain_rival_nation_ep3_finale',
    title: 'Le geste de {rival}',
    body: 'Au lendemain de la finale, {rival} a demandé ton maillot. Puis, face aux caméras, il a lâché : « Sans lui, je n’aurais jamais atteint ce niveau. » Le pays s’émeut de voir dix ans de guerre fondre en une phrase. Il t’invite maintenant à co-organiser un match caritatif chez {club_rival}. Ton entourage flaire l’opération d’image. Peut-être. Ou peut-être que c’est sincère.',
    tags: ['rivalite', 'respect'],
    prerequisites: [{ type: 'minRivalRelation', value: 40 }],
    exclusions: [{ type: 'hasFlag', key: 'seen:p7_chain_rival_nation_ep4_haine' }],
    echoes: [
      {
        flag: 'rival_finale',
        text: 'La finale contre {rival}, il y a {years} saisons, a changé votre histoire.',
      },
    ],
    choices: [
      choice({
        id: 'accepter_main',
        label: 'Accepter et tourner la page ensemble',
        stance: 'emotional',
        riskPreview: 'Une amitié publique, des supporters déroutés.',
        immediate: [
          fx.resource('popularite', 6),
          fx.relation('media', 5),
          fx.relation('fans', -4),
          fx.resource('bienEtre', 5),
        ],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'respect_distance',
        label: 'Saluer le geste, garder la distance',
        stance: 'professional',
        riskPreview: 'Le respect sans le spectacle, l’élan refroidi.',
        immediate: [
          fx.resource('discipline', 3),
          fx.resource('moral', 3),
          fx.relation('media', -3),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_rival_nation_ep4_haine',
    previousEventId: 'p7_chain_rival_nation_ep3_finale',
    title: '{rival} ne te serrera plus la main',
    body: 'Depuis la finale, {rival} refuse de prononcer ton nom. Dans un entretien fleuve accordé à {journaliste}, il te décrit comme « un joueur qui a choisi la guerre » et jure de ne plus jamais te serrer la main. La sélection se coupe en deux clans, et le sélectionneur exige un apaisement public avant la prochaine liste. Céder, c’est perdre la face. Refuser, c’est peut-être perdre la sélection.',
    tags: ['rivalite', 'haine'],
    prerequisites: [{ type: 'maxRivalRelation', value: 60 }],
    exclusions: [{ type: 'hasFlag', key: 'seen:p7_chain_rival_nation_ep4_respect' }],
    echoes: [
      {
        flag: 'rival_finale',
        text: 'Depuis cette finale contre {rival}, il y a {years} saisons, la guerre est totale.',
      },
    ],
    choices: [
      choice({
        id: 'apaiser',
        label: 'Tendre la main en public, pour la sélection',
        stance: 'collective',
        riskPreview: 'L’équipe respire, ton orgueil encaisse.',
        immediate: [
          fx.resource('cohesionVestiaire', 6),
          fx.relation('media', 4),
          fx.resource('moral', -4),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('ambition', -1)],
      }),
      choice({
        id: 'assumer_guerre',
        label: 'Assumer la guerre, jusqu’au bout',
        stance: 'resilient',
        riskPreview: 'Ton caractère parle ; la liste peut tomber sans toi.',
        immediate: [
          fx.resource('moral', 4),
          fx.resource('popularite', 4),
          fx.chance(0.4, [
            fx.resource('reputationSportive', -5),
            fx.resource('cohesionVestiaire', -5),
          ]),
        ],
        hidden: [fx.hidden('resistancePression', 3), fx.hidden('adaptabilite', -2)],
      }),
    ],
  }),

  // ——— Chaîne 3 : le retour au club formateur ———
  dilemma({
    id: 'p7_chain_formateur_start',
    title: 'L’appel du club formateur',
    body: 'Le numéro s’affiche un soir de novembre : le président de ton club formateur, celui qui t’a accueilli à douze ans avec des crampons trop grands. Le club végète en milieu de tableau, le centre manque de tout, et il te veut, toi, pour finir l’histoire là où elle a commencé. Salaire divisé par trois, aucune garantie sportive. {agent} est contre. Ta mère a déjà pleuré au téléphone.',
    category: 'transfer',
    tags: ['retour', 'racines'],
    rarity: 'uncommon',
    weight: 5,
    ageMin: 29,
    ageMax: 36,
    unique: true,
    choices: [
      choice({
        id: 'rentrer',
        label: 'Rentrer là où tout a commencé',
        stance: 'emotional',
        riskPreview: 'Le cœur y gagne, le palmarès s’arrête là.',
        immediate: [
          fx.flag('home_return'),
          fx.relation('family', 8),
          fx.resource('bienEtre', 6),
          fx.resource('reputationSportive', -5),
          fx.cash(-30000),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_formateur_ep2_readaptation', 1)])],
        hidden: [fx.hidden('loyaute', 4)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser : ton niveau mérite encore mieux',
        stance: 'ambitious',
        riskPreview: 'La carrière continue, la porte du retour se referme.',
        immediate: [
          fx.resource('reputationSportive', 4),
          fx.resource('moral', 3),
          fx.relation('family', -6),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_formateur_ep2_readaptation',
    previousEventId: 'p7_chain_formateur_start',
    title: 'Le vestiaire de ton enfance a rétréci',
    body: 'Retour au quotidien du club formateur : pelouse d’entraînement bosselée, salle de musculation d’un autre temps, des gamins de dix-huit ans qui n’osent pas te tutoyer. Ton corps sent la différence de rythme dès la première semaine. Le staff te propose d’encadrer les jeunes du centre, ceux qui dorment dans le dortoir qui fut le tien. Ton instinct de compétiteur, lui, réclame encore des titres.',
    tags: ['retour', 'transmission'],
    ageMin: 29,
    echoes: [{ flag: 'home_return', text: 'Là où tout a commencé.' }],
    choices: [
      choice({
        id: 'transmettre',
        label: 'Prendre les jeunes sous ton aile',
        stance: 'collective',
        riskPreview: 'Tu construis le futur, tes stats s’effacent.',
        immediate: [
          fx.stat('leadership', 2),
          fx.relation('teammates', 7),
          fx.resource('cohesionVestiaire', 6),
          fx.resource('reputationSportive', -3),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_formateur_ep3_adieux', 1)])],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
      choice({
        id: 'patron',
        label: 'Rester le patron sur le terrain',
        stance: 'individualist',
        riskPreview: 'Le statut se défend, le corps suivra ou pas.',
        immediate: [
          fx.skillCheck(
            'resource',
            'forme',
            50,
            [fx.resource('reputationSportive', 6), fx.resource('moral', 5)],
            [fx.resource('sante', -6), fx.resource('forme', -5)],
          ),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_formateur_ep3_adieux', 1)])],
        hidden: [fx.hidden('constance', 2), fx.hidden('fragilitePhysique', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_formateur_ep3_adieux',
    previousEventId: 'p7_chain_formateur_ep2_readaptation',
    title: 'Le dernier soir dans ton stade',
    body: 'Le club a fait de ce match ton jubilé : stade de ton enfance à guichets fermés, tifo à ton effigie en tribune nord, anciens partenaires venus de tout le pays — {coequipier} a traversé le continent pour être là. Avant l’échauffement, le président te tend le micro pour l’annonce que tout le monde attend : tes adieux. Sauf que ton corps, lui, se sent encore capable d’une saison.',
    tags: ['retour', 'adieux'],
    rarity: 'rare',
    ageMin: 30,
    echoes: [
      {
        flag: 'home_return',
        text: '{years} saisons après ton retour, le stade entier porte ton nom.',
      },
    ],
    choices: [
      choice({
        id: 'adieux',
        label: 'Annoncer tes adieux, en pleine lumière',
        stance: 'emotional',
        riskPreview: 'Une sortie parfaite ne se rejoue jamais.',
        immediate: [
          fx.resource('popularite', 8),
          fx.relation('fans', 10),
          fx.resource('bienEtre', 6),
        ],
        delayed: [fx.delayed(1, [fx.resource('moral', -4)])],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'encore',
        label: 'Repousser l’annonce, jouer encore un an',
        stance: 'resilient',
        riskPreview: 'Une saison de trop guette les plus grands.',
        immediate: [
          fx.resource('moral', 5),
          fx.resource('forme', -3),
          fx.relation('media', -4),
          fx.chance(0.35, [fx.resource('sante', -8)]),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('fragilitePhysique', 2)],
      }),
    ],
  }),

  // ——— Chaîne 4 : la crise médiatique avec {journaliste} ———
  dilemma({
    id: 'p7_chain_mediacrise_start',
    title: 'La phrase de trop',
    body: 'Défaite à domicile, zone mixte électrique. {journaliste} te pousse dans tes retranchements : trois questions sur ton niveau, une insinuation sur ta vie nocturne. La phrase part toute seule : « Ce club me doit plus que je ne lui dois. » À minuit, elle a fait le tour du pays ; au matin, elle est partout. Le club exige une clarification immédiate. {journaliste}, lui, savoure déjà.',
    category: 'media',
    tags: ['crise', 'declaration'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 20,
    ageMax: 34,
    unique: true,
    echoes: [
      {
        flag: 'media_storm',
        text: 'La tempête médiatique d’il y a {years} saisons aurait dû te servir de leçon.',
      },
    ],
    choices: [
      choice({
        id: 'assumer',
        label: 'Assumer, mot pour mot, sans t’excuser',
        stance: 'individualist',
        riskPreview: 'Le caractère impose, l’arrogance colle à la peau.',
        immediate: [
          fx.flag('media_crisis'),
          fx.flag('arrogant_reputation'),
          fx.relation('media', -8),
          fx.relation('fans', -6),
          fx.resource('moral', 4),
        ],
        delayed: [
          fx.delayed(1, [
            fx.queue('p7_chain_mediacrise_ep2_portrait', 1),
            fx.resource('popularite', 4),
          ]),
        ],
        hidden: [fx.hidden('resistancePression', 2), fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'excuses',
        label: 'Publier des excuses dès l’aube',
        stance: 'professional',
        riskPreview: 'L’incendie faiblit, la braise reste.',
        immediate: [
          fx.flag('media_crisis'),
          fx.relation('media', 4),
          fx.relation('fans', 3),
          fx.resource('moral', -4),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_mediacrise_ep2_portrait', 1)])],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('resistancePression', -1)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_mediacrise_ep2_portrait',
    previousEventId: 'p7_chain_mediacrise_start',
    title: 'Le portrait à charge de {journaliste}',
    body: 'Huit pages dans le grand hebdomadaire du pays, signées {journaliste} : « Enquête sur un joueur au-dessus du club ». D’anciens coéquipiers anonymes, tes mots de vestiaire sortis de leur contexte, une photo choisie pour son arrogance. Le vestiaire te regarde autrement, ta famille reçoit des appels. Ton avocat veut attaquer, {agent} préfère négocier le silence en coulisses. Chaque option peut nourrir l’article suivant.',
    tags: ['crise', 'presse'],
    echoes: [
      {
        flag: 'media_crisis',
        text: 'Ta phrase de trop, il y a {years} saisons, nourrit encore les colonnes de {journaliste}.',
      },
    ],
    choices: [
      choice({
        id: 'attaquer',
        label: 'Attaquer l’hebdomadaire en justice',
        stance: 'high_risk',
        riskPreview: 'Faire taire ou amplifier : la justice tranchera.',
        immediate: [
          fx.cash(-25000),
          fx.resource('moral', 3),
          fx.chance(0.5, [fx.relation('media', -8), fx.resource('popularite', -5)]),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_mediacrise_ep3_issue', 1)])],
        hidden: [fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'silence',
        label: 'Laisser passer l’orage en silence',
        stance: 'resilient',
        riskPreview: 'Le silence protège, le récit t’échappe.',
        immediate: [
          fx.resource('discipline', 4),
          fx.resource('moral', -5),
          fx.resource('popularite', -4),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_mediacrise_ep3_issue', 1)])],
        hidden: [fx.hidden('resistancePression', 3), fx.hidden('constance', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_mediacrise_ep3_issue',
    previousEventId: 'p7_chain_mediacrise_ep2_portrait',
    title: 'Réconciliation ou rupture avec la presse',
    body: 'Deux saisons que la crise te colle : sifflets résiduels, questions pièges, méfiance générale. Aujourd’hui, trois portes s’ouvrent en même temps. {journaliste} propose un entretien vérité, sans montage ni question interdite. Le club suggère le silence définitif : plus un mot à la presse, jamais. Et {agent} a préparé une contre-offensive : un documentaire à ta gloire, image maîtrisée, récit réécrit par tes soins.',
    tags: ['crise', 'issue'],
    rarity: 'rare',
    echoes: [
      {
        flag: 'media_crisis',
        text: 'Tout est parti d’une phrase, il y a {years} saisons.',
      },
      {
        flag: 'arrogant_reputation',
        text: 'Ton image d’arrogant, née il y a {years} saisons, attend encore son démenti.',
      },
    ],
    choices: [
      choice({
        id: 'verite',
        label: 'L’entretien vérité avec {journaliste}',
        stance: 'media_savvy',
        riskPreview: 'Tout dire peut tout réparer — ou tout raviver.',
        immediate: [
          fx.skillCheck(
            'stat',
            'sangFroid',
            55,
            [
              fx.relation('media', 10),
              fx.resource('popularite', 8),
              fx.removeFlag('media_crisis'),
            ],
            [fx.relation('media', -6), fx.resource('moral', -5)],
          ),
        ],
        hidden: [fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'rupture',
        label: 'Rompre définitivement avec la presse',
        stance: 'individualist',
        riskPreview: 'Plus jamais trahi, plus jamais raconté.',
        immediate: [
          fx.relation('media', -10),
          fx.resource('bienEtre', 7),
          fx.resource('moral', 4),
          fx.resource('popularite', -6),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('adaptabilite', -2)],
      }),
      choice({
        id: 'documentaire',
        label: 'Le documentaire piloté par {agent}',
        stance: 'financial',
        riskPreview: 'Le récit t’appartient, la facture et le soupçon aussi.',
        immediate: [
          fx.cash(-40000),
          fx.resource('popularite', 7),
          fx.relation('media', -3),
          fx.chance(0.3, [fx.resource('popularite', -5)]),
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
    ],
  }),
]
