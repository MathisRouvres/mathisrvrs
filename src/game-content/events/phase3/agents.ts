import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes d'agent (Phase 3) — emplacement 2 (carrière).
 * Changer d'agent consomme l'un des deux dilemmes de la saison.
 */
export const agentDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p3_agent_offre_agressif',
    title: 'Un agent agressif te courtise',
    body: 'Un agent réputé pour arracher les plus gros salaires te fait les yeux doux. Il promet de faire exploser tes revenus, quitte à froisser ton club et à te pousser vers la sortie dès qu’une offre tombe. Ton agent actuel, plus calme, t’a toujours protégé sans jamais viser la lune.',
    category: 'agent',
    tags: ['agent', 'salaire'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 20,
    ageMax: 34,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'signer',
        label: 'Passer à l’agent agressif',
        stance: 'ambitious',
        riskPreview: 'Salaires dopés, relation au club fragilisée.',
        immediate: [
          fx.setAgent('agressif'),
          fx.res('reputationSportive', 2),
          fx.rel('coach', -4),
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'rester',
        label: 'Rester avec ton agent de confiance',
        stance: 'loyal',
        riskPreview: 'Sérénité gardée, occasion peut-être unique manquée.',
        immediate: [fx.res('moral', 3), fx.rel('coach', 2)],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'negocier',
        label: 'Exiger mieux sans le suivre',
        stance: 'prudent',
        riskPreview: 'Bras de fer, issue incertaine.',
        immediate: [fx.res('moral', -2), fx.cash(8000)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_agent_mediatique',
    title: 'L’agent qui vend ton image',
    body: 'Un agent médiatique veut faire de toi une marque : plateaux, réseaux, sponsors premium. Les revenus commerciaux grimperaient vite, mais ta vie privée passerait sous les projecteurs et la moindre erreur deviendrait virale. Ton entourage te met en garde contre le vertige.',
    category: 'agent',
    tags: ['agent', 'medias', 'sponsors'],
    rarity: 'uncommon',
    weight: 7,
    ageMin: 19,
    ageMax: 32,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'accepter',
        label: 'Confier ton image à l’agent médiatique',
        stance: 'media_savvy',
        riskPreview: 'Notoriété et sponsors, exposition maximale.',
        immediate: [
          fx.setAgent('mediatique'),
          fx.res('popularite', 6),
          fx.res('bienEtre', -4),
        ],
        hidden: [fx.hidden('ambition', 1)],
      }),
      choice({
        id: 'refuser',
        label: 'Protéger ta vie privée',
        stance: 'prudent',
        riskPreview: 'Tranquillité gardée, moins de retombées.',
        immediate: [fx.res('bienEtre', 4), fx.res('popularite', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_agent_commission_litige',
    title: 'Ton agent réclame une plus grosse part',
    body: 'Après une belle saison, ton agent estime mériter une commission relevée. Il rappelle tout ce qu’il a fait pour toi, sous-entend qu’il pourrait se lasser. Céder l’apaise mais entame tes gains ; refuser tend une relation jusqu’ici solide.',
    category: 'agent',
    tags: ['agent', 'argent'],
    rarity: 'common',
    weight: 9,
    ageMin: 20,
    ageMax: 36,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'ceder',
        label: 'Accepter la hausse de commission',
        stance: 'emotional',
        riskPreview: 'Paix préservée, part de gains en moins.',
        immediate: [fx.cash(-15000), fx.res('moral', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser et tenir bon',
        stance: 'financial',
        riskPreview: 'Économies protégées, tension avec l’agent.',
        immediate: [fx.res('financesPersonnelles', 4), fx.res('moral', -3)],
        hidden: [fx.hidden('constance', 2)],
      }),
      choice({
        id: 'changer',
        label: 'Prendre un agent prudent',
        stance: 'prudent',
        riskPreview: 'Repartir à zéro, réseau plus modeste.',
        immediate: [fx.setAgent('prudent'), fx.res('moral', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_agent_specialiste_jeunes',
    title: 'Un mentor pour tes débuts',
    body: 'Un agent spécialisé dans les jeunes talents veut te prendre sous son aile. Il connaît les clubs formateurs, sait négocier du temps de jeu plutôt que des chiffres, et parie sur ta progression. Moins de paillettes, mais un vrai plan de carrière.',
    category: 'agent',
    tags: ['agent', 'formation'],
    rarity: 'common',
    weight: 9,
    ageMin: 16,
    ageMax: 22,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'accepter',
        label: 'Confier ta carrière au spécialiste jeunes',
        stance: 'prudent',
        riskPreview: 'Progression cadrée, revenus modestes au début.',
        immediate: [
          fx.setAgent('specialiste_jeunes'),
          fx.res('confianceEntraineur', 4),
        ],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'garder',
        label: 'Rester libre de tes choix',
        stance: 'individualist',
        riskPreview: 'Indépendance, mais pilotage plus flou.',
        immediate: [fx.res('moral', 2), fx.res('confianceEntraineur', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_agent_fin_carriere',
    title: 'Préparer la dernière ligne droite',
    body: 'Un agent rompu aux fins de carrière te propose ses services : sécuriser un dernier gros contrat, penser la reconversion, éviter le transfert de trop. Ton agent historique, lui, refuse de te voir déjà comme un vétéran.',
    category: 'agent',
    tags: ['agent', 'fin_carriere', 'statut'],
    rarity: 'uncommon',
    weight: 7,
    ageMin: 31,
    ageMax: 39,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'accepter',
        label: 'Passer au spécialiste des fins de carrière',
        stance: 'professional',
        riskPreview: 'Dernier contrat optimisé, horizon court.',
        immediate: [
          fx.setAgent('specialiste_fins'),
          fx.res('financesPersonnelles', 4),
        ],
        hidden: [fx.hidden('professionnalisme', 1)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser de te voir en vétéran',
        stance: 'resilient',
        riskPreview: 'Fierté intacte, préparation moins nette.',
        immediate: [fx.res('moral', 3), fx.res('financesPersonnelles', -2)],
        hidden: [fx.hidden('ambition', 1)],
      }),
    ],
  }),
]
