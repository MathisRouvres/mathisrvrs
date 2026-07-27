import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes équipe nationale — emplacement 2.
 * 4 dilemmes. Pose les flags national_capped et national_declined.
 * Pays fictifs uniquement (Côte Brumeuse, Hauts Plateaux).
 */
export const selectionDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p5_nat_premiere_convocation',
    title: 'La première convocation',
    body: 'Le sélectionneur de la Côte Brumeuse vient d’annoncer sa liste : ton nom y figure, pour la première fois. Le rêve d’une vie — au pire moment. Ton corps sort d’une saison éreintante et le staff du club te supplie de te reposer pendant la trêve. Une première sélection ne se refuse pas, dit-on. Mais un organisme à bout finit toujours par présenter la facture.',
    category: 'national_team',
    tags: ['convocation', 'fatigue'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 18,
    ageMax: 30,
    unique: true,
    prerequisites: [{ type: 'minResource', id: 'reputationSportive', value: 35 }],
    choices: [
      choice({
        id: 'accepter',
        label: 'Répondre présent, quoi qu’il en coûte',
        stance: 'ambitious',
        riskPreview: 'Rêve accompli, corps en surrégime.',
        immediate: [
          fx.flag('national_capped'),
          fx.resource('reputationSportive', 7),
          fx.resource('popularite', 6),
          fx.resource('fatigue', 12),
          fx.chance(0.25, [fx.resource('sante', -8)]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('fragilitePhysique', 2)],
      }),
      choice({
        id: 'decliner',
        label: 'Décliner et soigner ton corps',
        stance: 'prudent',
        riskPreview: 'Corps préservé, train peut-être passé.',
        immediate: [
          fx.flag('national_declined'),
          fx.resource('sante', 8),
          fx.resource('fatigue', -10),
          fx.resource('reputationSportive', -5),
          fx.resource('moral', -4),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('ambition', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_nat_deux_drapeaux',
    title: 'Deux drapeaux, un seul choix',
    body: 'Deux fédérations te courtisent officiellement. La Côte Brumeuse, le pays qui t’a formé, propose une place à construire dans un groupe ambitieux. Les Hauts Plateaux, la terre de ta famille, t’offrent un rôle central et la ferveur de tout un peuple. Ta grand-mère en parle avec des trémolos, ton agent avec des statistiques. Une fois la décision actée, il n’y aura plus de retour possible.',
    category: 'national_team',
    tags: ['identite', 'famille'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 19,
    ageMax: 27,
    unique: true,
    prerequisites: [{ type: 'minResource', id: 'reputationSportive', value: 40 }],
    exclusions: [{ type: 'hasFlag', key: 'national_capped' }],
    choices: [
      choice({
        id: 'formation',
        label: 'Choisir la Côte Brumeuse qui t’a formé',
        stance: 'ambitious',
        riskPreview: 'Groupe huppé, place à arracher.',
        immediate: [
          fx.resource('reputationSportive', 6),
          fx.resource('moral', 4),
          fx.relation('family', -6),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'origines',
        label: 'Choisir les Hauts Plateaux de ta famille',
        stance: 'emotional',
        riskPreview: 'Ferveur immense, exposition moindre.',
        immediate: [
          fx.relation('family', 10),
          fx.resource('popularite', 6),
          fx.resource('reputationSportive', -3),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'attendre',
        label: 'Repousser la décision encore un peu',
        stance: 'prudent',
        riskPreview: 'Portes ouvertes, patience des fédérations limitée.',
        immediate: [
          fx.resource('moral', -4),
          fx.resource('reputationSportive', -2),
          fx.chance(0.35, [fx.resource('popularite', -4)]),
        ],
        hidden: [fx.hidden('adaptabilite', 1), fx.hidden('ambition', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_nat_poste_impose',
    title: 'Un autre poste sous le maillot national',
    body: 'En sélection, le sélectionneur te voit ailleurs : il veut t’aligner à un poste que tu n’as presque jamais occupé, au service de son système. « C’est ça ou le banc », résume son adjoint. Accepter, c’est apprendre en accéléré devant tout un pays, avec le risque d’être médiocre là où tu es d’habitude brillant. Refuser, c’est peut-être sortir des plans pour longtemps.',
    category: 'national_team',
    tags: ['tactique', 'sacrifice'],
    rarity: 'common',
    weight: 11,
    ageMin: 20,
    ageMax: 34,
    cooldownSeasons: 3,
    prerequisites: [
      { type: 'hasFlag', key: 'national_capped' },
      { type: 'minResource', id: 'reputationSportive', value: 45 },
    ],
    choices: [
      choice({
        id: 'apprendre',
        label: 'Apprendre le poste et servir le système',
        stance: 'loyal',
        riskPreview: 'Polyvalence gagnée, niveau exposé.',
        immediate: [
          fx.skillCheck(
            'hidden',
            'adaptabilite',
            50,
            [
              fx.stat('tactique', 2),
              fx.stat('placement', 1),
              fx.resource('reputationSportive', 5),
            ],
            [fx.resource('reputationSportive', -4), fx.resource('moral', -5)],
          ),
        ],
        hidden: [fx.hidden('adaptabilite', 3), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser : ton poste ou rien',
        stance: 'individualist',
        riskPreview: 'Identité préservée, place fragilisée.',
        immediate: [
          fx.resource('moral', 3),
          fx.resource('reputationSportive', -4),
          fx.chance(0.3, [fx.resource('popularite', -5)]),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('adaptabilite', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_nat_tournoi_diminue',
    title: 'Le grand tournoi, à moitié entier',
    body: 'Le grand tournoi continental commence dans trois semaines, et tu n’es pas entier : une gêne persistante, gérable mais réelle. Le staff médical de la sélection te fait confiance sur parole. Un jeune du championnat, en pleine forme, attend derrière toi. Partir diminué, c’est risquer de traverser le tournoi en fantôme et d’aggraver les choses. Céder ta place, c’est peut-être regarder à la télévision le sommet de ta génération.',
    category: 'national_team',
    tags: ['tournoi', 'corps'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 22,
    ageMax: 34,
    cooldownSeasons: 4,
    prerequisites: [
      { type: 'hasFlag', key: 'national_capped' },
      { type: 'minResource', id: 'reputationSportive', value: 50 },
    ],
    choices: [
      choice({
        id: 'partir',
        label: 'Partir au tournoi, serrer les dents',
        stance: 'high_risk',
        riskPreview: 'Gloire possible, corps en sursis.',
        immediate: [
          fx.resource('fatigue', 10),
          fx.skillCheck(
            'hidden',
            'grandsMatchs',
            55,
            [
              fx.resource('reputationSportive', 9),
              fx.resource('popularite', 8),
              fx.relation('fans', 6),
            ],
            [fx.resource('sante', -10), fx.resource('reputationSportive', -4)],
          ),
        ],
        hidden: [fx.hidden('fragilitePhysique', 3), fx.hidden('grandsMatchs', 2)],
      }),
      choice({
        id: 'ceder',
        label: 'Céder ta place au jeune en forme',
        stance: 'ethical',
        riskPreview: 'Geste salué, sommet peut-être manqué.',
        immediate: [
          fx.resource('sante', 6),
          fx.resource('moral', -6),
          fx.resource('reputationSportive', -3),
        ],
        delayed: [
          fx.delayed(1, [fx.resource('reputationSportive', 4), fx.relation('media', 4)]),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('loyaute', 2)],
      }),
    ],
  }),
]
