import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes médias & supporters — emplacement 2.
 * 6 dilemmes : 4 'media', 2 'fans'. Pose les flags media_storm et fan_favorite.
 */
export const mediaDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p5_media_interview_piege',
    title: 'Le micro tendu après la défaite',
    body: 'Défaite lourde à domicile. En zone mixte, un journaliste connu pour ses questions à tiroirs te tend son micro : « Certains disent que le coach a perdu le vestiaire. Tu confirmes ? » La caméra tourne, tes coéquipiers sont déjà partis. Une phrase maladroite fera la une demain. Mais la langue de bois, répétée semaine après semaine, commence aussi à agacer tout le monde.',
    category: 'media',
    tags: ['interview', 'defaite', 'coach'],
    rarity: 'common',
    weight: 14,
    ageMin: 17,
    ageMax: 39,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'franchise',
        label: 'Dire tout haut ce que le vestiaire murmure',
        stance: 'high_risk',
        riskPreview: 'Une phrase peut faire la une pendant des semaines.',
        immediate: [
          fx.relation('media', 6),
          fx.relation('coach', -10),
          fx.resource('discipline', -5),
          fx.flag('media_storm'),
        ],
        hidden: [fx.hidden('resistancePression', 2), fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'langue_bois',
        label: 'Dérouler la langue de bois habituelle',
        stance: 'prudent',
        riskPreview: 'Aucune vague, aucune saveur.',
        immediate: [
          fx.relation('coach', 4),
          fx.relation('media', -4),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_media_documentaire',
    title: 'Une caméra dans ton salon',
    body: 'Une grande plateforme veut produire un documentaire sur ta vie : ton enfance, tes doutes, ta famille, tout. Le montant proposé est réel, l’exposition aussi. Ton entourage est partagé : ta mère refuse d’apparaître à l’écran, ton agent parle d’une occasion unique de bâtir ta marque. Une équipe de tournage te suivra pendant des mois, jusque dans les moments que tu préférerais garder pour toi.',
    category: 'media',
    tags: ['documentaire', 'image', 'intimite'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 21,
    ageMax: 36,
    unique: true,
    choices: [
      choice({
        id: 'accepter',
        label: 'Ouvrir ta porte aux caméras',
        stance: 'ambitious',
        riskPreview: 'Notoriété énorme, intimité en vitrine.',
        immediate: [
          fx.cash(45000),
          fx.resource('popularite', 10),
          fx.relation('sponsors', 6),
          fx.relation('family', -8),
          fx.resource('bienEtre', -6),
        ],
        delayed: [fx.delayed(1, [fx.resource('popularite', 5), fx.relation('media', 4)])],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'refuser',
        label: 'Garder ta vie hors champ',
        stance: 'prudent',
        riskPreview: 'Intimité préservée, occasion envolée.',
        immediate: [
          fx.resource('bienEtre', 6),
          fx.relation('family', 6),
          fx.resource('popularite', -4),
          fx.relation('sponsors', -4),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_media_consultant_acharne',
    title: 'Le consultant ne te lâche plus',
    body: 'Depuis ta sortie médiatique, un consultant très écouté a fait de toi sa cible favorite : chaque semaine, il dissèque tes matchs, moque ton attitude, questionne ton niveau. Tes proches t’envoient les extraits, le vestiaire commence à en parler. Répondre publiquement, c’est lui offrir le duel qu’il cherche depuis le début. Te taire, c’est le laisser écrire ton histoire à ta place.',
    category: 'media',
    tags: ['consultant', 'polemique'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 18,
    ageMax: 38,
    cooldownSeasons: 3,
    prerequisites: [{ type: 'hasFlag', key: 'media_storm' }],
    choices: [
      choice({
        id: 'tacler',
        label: 'Le tacler en interview, nom compris',
        stance: 'individualist',
        riskPreview: 'Duel médiatique ouvert, issue incertaine.',
        immediate: [
          fx.skillCheck(
            'stat',
            'sangFroid',
            52,
            [
              fx.resource('popularite', 7),
              fx.relation('fans', 5),
              fx.resource('moral', 5),
            ],
            [fx.relation('media', -8), fx.resource('reputationSportive', -5)],
          ),
        ],
        hidden: [fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'terrain',
        label: 'Répondre uniquement sur le terrain',
        stance: 'prudent',
        riskPreview: 'Réponse lente, pression accumulée.',
        immediate: [fx.resource('moral', -4), fx.resource('discipline', 4)],
        delayed: [
          fx.delayed(1, [fx.resource('reputationSportive', 6), fx.relation('media', 4)]),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('resistancePression', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_media_coup_de_gueule',
    title: 'Le poste qui te brûle les doigts',
    body: 'Une décision arbitrale scandaleuse vient de coûter le match à ton équipe, et les images tournent en boucle. Ton poste est écrit, cinglant, prêt à partir : des milliers de partages garantis. Les fans attendent que quelqu’un dise tout haut leur colère. Mais la commission de discipline lit les réseaux, et ton club déteste les vagues qu’il ne contrôle pas.',
    category: 'media',
    tags: ['reseaux', 'arbitrage', 'colere'],
    rarity: 'common',
    weight: 13,
    ageMin: 17,
    ageMax: 38,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'publier',
        label: 'Publier le coup de gueule',
        stance: 'emotional',
        riskPreview: 'Les fans applaudissent, la commission lit.',
        immediate: [
          fx.relation('fans', 8),
          fx.resource('popularite', 6),
          fx.resource('discipline', -6),
          fx.chance(0.3, [fx.flag('media_storm'), fx.relation('media', -5)]),
        ],
        hidden: [fx.hidden('resistancePression', 1), fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'supprimer',
        label: 'Effacer le brouillon et laisser couler',
        stance: 'prudent',
        riskPreview: 'Zéro risque, colère rentrée.',
        immediate: [
          fx.resource('discipline', 4),
          fx.resource('moral', -4),
          fx.relation('fans', -3),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_media_ultras_geste',
    title: 'Les ultras réclament un geste',
    body: 'Le club traverse une passe difficile et les ultras t’ont choisi comme interlocuteur : ils veulent qu’un joueur monte au créneau, un geste fort et public, face à une direction qui laisse filer les cadres sans réagir. Une banderole à ton nom est déjà prête. T’engager, c’est devenir leur porte-voix et froisser tes dirigeants. Te défiler, c’est perdre le virage qui t’a toujours soutenu.',
    category: 'fans',
    tags: ['ultras', 'club', 'crise'],
    rarity: 'common',
    weight: 12,
    ageMin: 19,
    ageMax: 37,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'creneau',
        label: 'Monter au créneau avec eux',
        stance: 'emotional',
        riskPreview: 'Le kop avec toi, la direction contre toi.',
        immediate: [
          fx.relation('fans', 10),
          fx.resource('popularite', 5),
          fx.relation('sponsors', -5),
          fx.resource('confianceEntraineur', -4),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'neutre',
        label: 'Rester neutre, jouer et te taire',
        stance: 'prudent',
        riskPreview: 'Position confortable, kop refroidi.',
        immediate: [
          fx.relation('fans', -7),
          fx.resource('discipline', 3),
          fx.relation('coach', 3),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_media_chouchou_kop',
    title: 'Le kop chante ton nom',
    body: 'Depuis quelques matchs, le virage a composé un chant à ton nom. Après chaque victoire, le capo t’appelle pour mener la fête au pied de la tribune, mégaphone tendu. Certains anciens trouvent que tu en fais trop, que la fête appartient à l’équipe entière. Prendre le mégaphone, c’est sceller une histoire d’amour avec le kop. Le décliner, c’est rester dans le rang.',
    category: 'fans',
    tags: ['kop', 'celebration'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 18,
    ageMax: 36,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'megaphone',
        label: 'Prendre le mégaphone et mener la fête',
        stance: 'emotional',
        riskPreview: 'Idole du virage, vestiaire à ménager.',
        immediate: [
          fx.relation('fans', 10),
          fx.resource('popularite', 7),
          fx.relation('teammates', -4),
          fx.flag('fan_favorite'),
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'rang',
        label: 'Saluer de loin et rentrer avec le groupe',
        stance: 'loyal',
        riskPreview: 'Collectif préservé, histoire non écrite.',
        immediate: [
          fx.relation('teammates', 5),
          fx.resource('cohesionVestiaire', 4),
          fx.relation('fans', -4),
        ],
        hidden: [fx.hidden('loyaute', 2), fx.hidden('constance', 1)],
      }),
    ],
  }),
]
